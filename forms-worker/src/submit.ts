// Obsługa zgłoszenia - kolejne kroki z CLAUDE.md sekcja 2:
// konfiguracja -> limit rozmiaru i parsowanie -> honeypot -> walidacja (z linkami
// i plikami) -> rate limit -> render maila -> body z base64 -> wysyłka.

import { renderEmail } from './email/render.ts'
import { BRAND } from './email/layout.ts'
import { MAX_REQUEST_BYTES, type FormDef } from './forms.ts'
import { parseRequest } from './parse.ts'
import { checkRateLimit } from './ratelimit.ts'
import { buildBody, readMailConfig, sendEmail } from './resend.ts'
import { failure, success, type Outcome } from './response.ts'
import { isHoneypotTripped } from './spam.ts'
import { validate } from './validate.ts'

export async function handleSubmission(
  request: Request,
  env: Env,
  slug: string,
  form: FormDef,
  requestId: string,
): Promise<Outcome> {
  // Najpierw konfiguracja: bez niej nie ma sensu parsować żądania ze zdjęciami.
  const config = readMailConfig(env)
  if (!config) return failure(500, 'not_configured')

  const parsed = await parseRequest(request, form, MAX_REQUEST_BYTES)
  if (!parsed.ok) return failure(parsed.error === 'payload_too_large' ? 413 : 400, parsed.error)

  // Bot dostaje sukces - nie ma się dowiedzieć, że wpadł w pułapkę.
  if (isHoneypotTripped(parsed.input.honeypot)) return success('honeypot')

  const result = validate(form, parsed.input)
  if (!result.ok) return failure(400, 'validation_failed', { fields: result.fields, log: { invalid: result.fields } })
  const data = result.data

  // Adres nadawcy zgłoszenia: pierwsze pole typu email (reply_to i klucz rate limitu).
  const emailKey = Object.keys(form.fields).find((key) => form.fields[key]!.type === 'email')
  const senderEmail = emailKey ? (data.values[emailKey] as string | undefined) : undefined

  const attachments = Object.values(data.files).flat()
  const stats = { files: attachments.length, bytes: attachments.reduce((sum, a) => sum + a.bytes.byteLength, 0) }

  const rate = await checkRateLimit(env, {
    form: slug,
    ip: request.headers.get('CF-Connecting-IP'),
    email: senderEmail,
  })
  const warnings = rate.warnings.length ? rate.warnings : undefined
  if (rate.limited) {
    return failure(429, 'rate_limited', { headers: { 'Retry-After': '60' }, log: { ...stats, warnings } })
  }

  const email = renderEmail(form, data, { requestId, logoUrl: config.logoUrl ?? BRAND.defaultLogoUrl })
  // Kolejność celowa: body (z base64 załączników) powstaje PRZED gałęzią dry run.
  // Dry run służy do pomiaru CPU, więc wykonuje całą pracę poza wywołaniem Resend.
  const body = buildBody(config, email, { replyTo: senderEmail, form: slug, attachments })

  if (config.dryRun || !config.apiKey) return success('dry_run', { ...stats, warnings })

  const sent = await sendEmail(body, config.apiKey, requestId)
  if (!sent.ok) {
    return failure(502, 'mail_failed', {
      log: { ...stats, warnings, resendStatus: sent.status, resendError: sent.name },
    })
  }
  return success('sent', { ...stats, warnings, resendStatus: sent.status })
}
