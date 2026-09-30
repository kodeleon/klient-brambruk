// Wysyłka przez Resend API: zwykły fetch, bez SDK.
// https://resend.com/docs/api-reference/emails/send-email

import type { Attachment } from './files.ts'
import type { RenderedEmail } from './email/render.ts'

const RESEND_URL = 'https://api.resend.com/emails'
const TIMEOUT_MS = 10_000

export interface MailConfig {
  from: string
  to: string[]
  logoUrl: string | undefined
  dryRun: boolean
  /** null tylko w trybie dry run. */
  apiKey: string | null
}

/** Konfiguracja z env; null = brak czegoś niezbędnego (-> 500 not_configured). */
export function readMailConfig(env: Env): MailConfig | null {
  const from = env.MAIL_FROM?.trim()
  const to = (env.MAIL_TO ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean)
  const dryRun = env.MAIL_DRY_RUN?.trim().toLowerCase() === 'true'
  // Sekrety (MAIL_TO, RESEND_API_KEY) mogą nie istnieć (np. przed
  // `wrangler secret put`), mimo typu string - stąd `?? ''` i rzutowanie.
  const apiKey = (env.RESEND_API_KEY as string | undefined)?.trim() || null

  if (!from || to.length === 0) return null
  if (!dryRun && !apiKey) return null
  return { from, to, logoUrl: env.LOGO_URL?.trim() || undefined, dryRun, apiKey }
}

export interface ResendPayload {
  from: string
  to: string[]
  reply_to?: string
  subject: string
  html: string
  text: string
  tags: { name: string; value: string }[]
  attachments?: { filename: string; content: string }[]
}

export function buildPayload(
  config: MailConfig,
  email: RenderedEmail,
  options: { replyTo: string | undefined; form: string; attachments: Attachment[] },
): ResendPayload {
  const payload: ResendPayload = {
    from: config.from,
    to: config.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    tags: [{ name: 'form', value: options.form }],
  }
  if (options.replyTo) payload.reply_to = options.replyTo
  if (options.attachments.length) {
    payload.attachments = options.attachments.map((a) => ({ filename: a.filename, content: toBase64(a.bytes) }))
  }
  return payload
}

/**
 * Base64 załącznika. Uint8Array.prototype.toBase64 (TC39, natywnie w V8/workerd
 * przy compatibility_date 2026-09-14, bez flagi nodejs_compat): jedno wywołanie
 * w C++, bez pętli w JS. Alternatywy są droższe w CPU: Buffer wymaga
 * nodejs_compat i warstwy polyfilli, a btoa(String.fromCharCode(...)) tworzy
 * pośredni "binarny" string i kopiuje dane dwa razy.
 */
function toBase64(bytes: Uint8Array): string {
  return bytes.toBase64()
}

export type SendResult = { ok: true; status: number } | { ok: false; status: number; name: string }

/**
 * Jedno wywołanie Resend, bez ponowień. Idempotency-Key = requestId, więc
 * ewentualne ponowienie tego samego zgłoszenia nie wyśle drugiego maila.
 * Z błędu zwracamy tylko status i pole `name` - treść błędu może zawierać adres.
 */
export async function sendEmail(body: string, apiKey: string, idempotencyKey: string): Promise<SendResult> {
  let response: Response
  try {
    response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    const name = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network_error'
    return { ok: false, status: 0, name }
  }

  if (response.ok) {
    await response.body?.cancel()
    return { ok: true, status: response.status }
  }

  let name = 'unknown'
  try {
    const data = (await response.json()) as { name?: unknown }
    // Tylko identyfikator typu błędu (np. "validation_error"), nigdy komunikat.
    if (typeof data.name === 'string' && /^[a-z_]{1,64}$/.test(data.name)) name = data.name
  } catch {
    // treść nie jest JSON-em - zostaje "unknown"
  }
  return { ok: false, status: response.status, name }
}
