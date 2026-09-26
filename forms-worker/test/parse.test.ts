import { describe, expect, it } from 'vitest'
import { FORMS } from '../src/forms.ts'
import { normalizeText, parseRequest, splitMulti, type ParsedInput } from '../src/parse.ts'
import { BASE, call, fakeImage, json, ORIGIN, postForm, postJson, QUOTE_FIELDS } from './helpers.ts'

const quote = FORMS.quote!
const LIMIT = 10 * 1024 * 1024

async function parseOk(request: Request, maxBytes = LIMIT): Promise<ParsedInput> {
  const result = await parseRequest(request, quote, maxBytes)
  if (!result.ok) throw new Error(`parse failed: ${result.error}`)
  return result.input
}

function streamOf(bytes: Uint8Array, chunk = 64 * 1024): ReadableStream<Uint8Array> {
  let offset = 0
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) return controller.close()
      controller.enqueue(bytes.slice(offset, offset + chunk))
      offset += chunk
    },
  })
}

describe('multiselect - trzy formy wejścia', () => {
  it('powtórzone klucze (multipart)', async () => {
    const input = await parseOk(postForm('quote', { terrain: ['slope', 'roots'] }))
    expect(input.values.terrain).toEqual(['slope', 'roots'])
  })

  it('string JSON z tablicą (multipart)', async () => {
    const input = await parseOk(postForm('quote', { terrain: '["slope","roots"]' }))
    expect(input.values.terrain).toEqual(['slope', 'roots'])
  })

  it('string z przecinkami - trim, bez pustych i powtórzeń', async () => {
    const input = await parseOk(postForm('quote', { terrain: ' slope, roots,, slope ,' }))
    expect(input.values.terrain).toEqual(['slope', 'roots'])
  })

  it('wariant klucza terrain[]', async () => {
    const input = await parseOk(postForm('quote', { 'terrain[]': ['flat', 'wet'] }))
    expect(input.values.terrain).toEqual(['flat', 'wet'])
  })

  it('JSON: tablica, string JSON i string z przecinkami', async () => {
    expect((await parseOk(postJson('quote', { terrain: ['flat', 'wet'] }))).values.terrain).toEqual(['flat', 'wet'])
    expect((await parseOk(postJson('quote', { terrain: '["flat","wet"]' }))).values.terrain).toEqual(['flat', 'wet'])
    expect((await parseOk(postJson('quote', { terrain: 'flat,wet' }))).values.terrain).toEqual(['flat', 'wet'])
  })

  it('pusty multiselect = brak klucza', async () => {
    const input = await parseOk(postForm('quote', { terrain: '' }))
    expect(input.values).not.toHaveProperty('terrain')
  })

  it('splitMulti: niepoprawny JSON traktowany jak lista po przecinkach', () => {
    expect(splitMulti(['["a",'])).toEqual(['["a"'])
    expect(splitMulti([42, null, 'a'])).toEqual(['a'])
  })
})

describe('pliki', () => {
  it('klucz pola i wariant photos[] są łączone', async () => {
    const input = await parseOk(
      postForm('quote', { photos: fakeImage('jpeg', 'a.jpg', 100), 'photos[]': fakeImage('png', 'b.png', 200) }),
    )
    expect(input.files.photos!.map((f) => f.size)).toEqual([100, 200])
    expect(input.files.photos![0]!.bytes[0]).toBe(0xff)
  })

  it('duplikaty (nazwa + rozmiar) usuwane przed liczeniem', async () => {
    const input = await parseOk(
      postForm('quote', {
        photos: [fakeImage('jpeg', 'a.jpg', 100), fakeImage('jpeg', 'a.jpg', 100)],
        'photos[]': [fakeImage('jpeg', 'a.jpg', 100), fakeImage('jpeg', 'a.jpg', 101)],
      }),
    )
    expect(input.files.photos!.map((f) => f.size)).toEqual([100, 101])
  })

  it('puste wpisy (rozmiar 0, pusta nazwa) i tekst pod kluczem pliku pomijane', async () => {
    const input = await parseOk(
      postForm('quote', {
        photos: [new File([], 'pusty.jpg'), new File([new Uint8Array(10)], ''), 'to-nie-plik', fakeImage('jpeg', 'ok.jpg')],
      }),
    )
    expect(input.files.photos).toHaveLength(1)
  })

  it('JSON nie przenosi plików', async () => {
    const input = await parseOk(postJson('quote', { photos: 'abc' }))
    expect(input.files.photos).toEqual([])
  })
})

describe('wartości tekstowe', () => {
  it('nieznane pola ignorowane, znane zostają', async () => {
    const input = await parseOk(postForm('quote', { ...QUOTE_FIELDS, admin: '1', 'name[]': 'x', unknown: 'y' }))
    expect(Object.keys(input.values).sort()).toEqual(Object.keys(QUOTE_FIELDS).sort())
    expect(input.values.name).toBe(QUOTE_FIELDS.name)
  })

  it('normalizacja: \\r\\n -> \\n, bez znaków kontrolnych (poza \\n i \\t), trim', () => {
    expect(normalizeText('  a\r\nb\rc\u0000d\u0007e\tf\u001bg\u007f\u0085h  \n')).toBe('a\nb\ncde\tfgh')
  })

  it('normalizacja stosowana do pól z multipart i JSON', async () => {
    expect((await parseOk(postForm('quote', { name: '  Jan\u0000 ' }))).values.name).toBe('Jan')
    expect((await parseOk(postJson('quote', { description: 'a\r\nb' }))).values.description).toBe('a\nb')
  })

  it('JSON: liczby zamieniane na tekst, obiekty pomijane', async () => {
    const input = await parseOk(postJson('quote', { phone: 123456789, location: { x: 1 } }))
    expect(input.values.phone).toBe('123456789')
    expect(input.values).not.toHaveProperty('location')
  })

  it('pierwsza wartość przy powtórzonym kluczu pola pojedynczego', async () => {
    const input = await parseOk(postForm('quote', { name: ['Pierwszy', 'Drugi'] }))
    expect(input.values.name).toBe('Pierwszy')
  })

  it('honeypot odczytany z _hp', async () => {
    expect((await parseOk(postForm('quote', { _hp: ' bot ' }))).honeypot).toBe('bot')
    expect((await parseOk(postForm('quote', {}))).honeypot).toBe('')
  })
})

describe('Content-Type i rozmiar', () => {
  const bad = (contentType: string | null, body: BodyInit) => {
    const headers: Record<string, string> = { Origin: ORIGIN }
    if (contentType) headers['Content-Type'] = contentType
    return new Request(`${BASE}/forms/quote`, { method: 'POST', headers, body })
  }

  it.each([
    ['text/plain', 'name=Jan'],
    ['application/x-www-form-urlencoded', 'name=Jan'],
    ['multipart/form-data', 'bez boundary'],
    ['multipart/form-data; boundary=xyz', 'uszkodzony multipart'],
    ['application/json', '{uszkodzony'],
    ['application/json', '["tablica"]'],
    ['application/json', 'null'],
  ])('%s + %j -> 400 bad_request', async (contentType, body) => {
    const response = await call(bad(contentType, body))
    expect(response.status).toBe(400)
    expect(await json(response)).toMatchObject({ ok: false, error: 'bad_request' })
  })

  it('brak Content-Type -> 400 bad_request', async () => {
    const response = await call(new Request(`${BASE}/forms/quote`, { method: 'POST', headers: { Origin: ORIGIN } }))
    expect(response.status).toBe(400)
  })

  it('za duże żądanie (Content-Length > 10 MiB) -> 413 payload_too_large', async () => {
    const big = fakeImage('jpeg', 'big.jpg', LIMIT + 1)
    const response = await call(postForm('quote', { ...QUOTE_FIELDS, photos: big }))
    expect(response.status).toBe(413)
    expect(await json(response)).toMatchObject({ ok: false, error: 'payload_too_large' })
  })

  it('strumień bez Content-Length: ponad limit -> 413, w limicie -> parsowany', async () => {
    const payload = new TextEncoder().encode(JSON.stringify({ name: 'Jan', description: 'x'.repeat(5000) }))
    const streamed = (maxBytes: number) =>
      parseRequest(
        new Request(`${BASE}/forms/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: streamOf(payload, 1000),
        }),
        quote,
        maxBytes,
      )
    expect(await streamed(4000)).toEqual({ ok: false, error: 'payload_too_large' })
    const ok = await streamed(LIMIT)
    expect(ok.ok && ok.input.values.name).toBe('Jan')
  })
})
