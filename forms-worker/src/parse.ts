// Parsowanie żądania: multipart/form-data albo application/json -> { values, files }.
//
// - bierzemy tylko pola z definicji formularza (+ honeypot); resztę ignorujemy,
// - każda wartość tekstowa: \r\n -> \n, bez znaków kontrolnych (poza \n i \t), trim,
// - multiselect: powtórzone klucze, string JSON z tablicą albo string z przecinkami,
// - pliki: pod kluczem pola albo `klucz[]`, bez pustych wpisów i duplikatów.

import type { FormDef } from './forms.ts'
import { HONEYPOT_FIELD } from './spam.ts'

export interface ParsedFile {
  size: number
  bytes: Uint8Array
}

export interface ParsedInput {
  /** text/email/tel/textarea/select -> string, multiselect -> string[]. Brak pola = brak klucza. */
  values: Record<string, string | string[]>
  files: Record<string, ParsedFile[]>
  honeypot: string
}

export type ParseResult =
  | { ok: true; input: ParsedInput }
  | { ok: false; error: 'bad_request' | 'payload_too_large' }

/** Wspólny interfejs odczytu dla FormData i obiektu JSON. */
interface RawSource {
  /** Wszystkie wartości pod kluczem, w kolejności z żądania. */
  all(key: string): unknown[]
}

export async function parseRequest(request: Request, form: FormDef, maxBytes: number): Promise<ParseResult> {
  const contentType = request.headers.get('Content-Type') ?? ''
  const mediaType = contentType.split(';')[0]!.trim().toLowerCase()
  const isMultipart = mediaType === 'multipart/form-data'
  if (!isMultipart && mediaType !== 'application/json') return { ok: false, error: 'bad_request' }

  // Limit rozmiaru PRZED parsowaniem. Przeglądarka zawsze wysyła Content-Length.
  // DECYZJA: bez Content-Length (chunked) nie odrzucamy z góry, tylko czytamy
  // strumień z licznikiem i przerywamy po przekroczeniu limitu (413).
  const declared = Number(request.headers.get('Content-Length') ?? NaN)
  let body: Request | Response = request
  if (Number.isFinite(declared)) {
    if (declared > maxBytes) return { ok: false, error: 'payload_too_large' }
  } else {
    const bytes = await readLimited(request.body, maxBytes)
    if (!bytes) return { ok: false, error: 'payload_too_large' }
    body = new Response(bytes, { headers: { 'Content-Type': contentType } })
  }

  let source: RawSource
  try {
    if (isMultipart) {
      const data = await body.formData()
      source = { all: (key) => data.getAll(key) }
    } else {
      const data: unknown = JSON.parse(await body.text())
      if (typeof data !== 'object' || data === null || Array.isArray(data)) return { ok: false, error: 'bad_request' }
      const record = data as Record<string, unknown>
      source = {
        all: (key) => {
          if (!Object.hasOwn(record, key)) return []
          const value = record[key]
          return Array.isArray(value) ? value : [value]
        },
      }
    }
  } catch {
    return { ok: false, error: 'bad_request' }
  }

  const input: ParsedInput = { values: {}, files: {}, honeypot: firstString(source.all(HONEYPOT_FIELD)) ?? '' }

  for (const [key, field] of Object.entries(form.fields)) {
    if (field.type === 'file') {
      input.files[key] = await collectFiles([...source.all(key), ...source.all(`${key}[]`)])
    } else if (field.type === 'multiselect') {
      // DECYZJA: wariant `klucz[]` przyjmowany jak przy plikach (częsta konwencja frontów).
      const values = splitMulti([...source.all(key), ...source.all(`${key}[]`)])
      if (values.length) input.values[key] = values
    } else {
      const value = firstString(source.all(key))
      if (value !== undefined) input.values[key] = value
    }
  }

  return { ok: true, input }
}

/** Normalizacja każdej wartości tekstowej. */
export function normalizeText(value: string): string {
  return value
    .toWellFormed() // samotne surogaty z JSON-a -> U+FFFD (encodeURIComponent by na nich rzucił)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim()
}

/** Pierwsza wartość tekstowa (liczby i boolean z JSON-a zamieniane na tekst). */
function firstString(raw: unknown[]): string | undefined {
  for (const item of raw) {
    if (typeof item === 'string') return normalizeText(item)
    if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  }
  return undefined
}

/**
 * Multiselect w trzech formach: powtórzone klucze (a, b), string JSON
 * ('["a","b"]') i string z przecinkami ('a,b'). Wynik bez pustych i powtórzeń.
 */
export function splitMulti(raw: unknown[]): string[] {
  const out = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const text = item.trim()
    let parts: unknown[] = text.split(',')
    if (text.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(text)
        if (Array.isArray(parsed)) parts = parsed
      } catch {
        // nie JSON - zostaje podział po przecinkach
      }
    }
    for (const part of parts) {
      if (typeof part !== 'string') continue
      const value = normalizeText(part)
      if (value) out.add(value)
    }
  }
  return [...out]
}

/**
 * Pliki: pomija wpisy, które nie są plikami, puste (rozmiar 0 albo pusta nazwa)
 * i duplikaty (nazwa + rozmiar). Nazwa od klienta służy tylko do deduplikacji.
 */
async function collectFiles(raw: unknown[]): Promise<ParsedFile[]> {
  const seen = new Set<string>()
  const files: ParsedFile[] = []
  for (const item of raw) {
    if (!(item instanceof File) || item.size === 0 || item.name === '') continue
    const id = `${item.size}:${item.name}`
    if (seen.has(id)) continue
    seen.add(id)
    files.push({ size: item.size, bytes: new Uint8Array(await item.arrayBuffer()) })
  }
  return files
}

/** Czyta strumień do bufora; null, gdy przekroczy limit. */
async function readLimited(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!stream) return new Uint8Array()
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}
