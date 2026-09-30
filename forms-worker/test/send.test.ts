// Wysyłka, dry run, konfiguracja, rate limit. Resend zawsze mockowany (spy na fetch).

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import type { RenderedEmail } from '../src/email/render.ts'
import type { Attachment } from '../src/files.ts'
import { buildBody, buildPayload, type MailConfig, type ResendPayload } from '../src/resend.ts'
import { call, CONTACT_FIELDS, fakeImage, json, postForm, QUOTE_FIELDS, realRateLimits } from './helpers.ts'

const SEND = { MAIL_DRY_RUN: 'false', RESEND_API_KEY: 're_test_key', MAIL_TO: 'kontakt@brambruk.pl' }

let fetchSpy: MockInstance<typeof fetch>
let logs: string[]
let levels: string[]

function resendReplies(response: Response | Error) {
  fetchSpy.mockImplementation(async () => {
    if (response instanceof Error) throw response
    return response
  })
}

function lastLog(): Record<string, unknown> {
  return JSON.parse(logs.at(-1)!) as Record<string, unknown>
}

beforeEach(() => {
  logs = []
  levels = []
  fetchSpy = vi.spyOn(globalThis, 'fetch')
  resendReplies(Response.json({ id: 'resend-id-123' }))
  for (const level of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, level).mockImplementation((line: unknown) => {
      logs.push(String(line))
      levels.push(level)
    })
  }
})

afterEach(() => vi.restoreAllMocks())

/** Unikalny adres, żeby liczniki rate limitu z różnych testów się nie mieszały. */
const uniqueEmail = () => `Test.${crypto.randomUUID().slice(0, 8)}@Example.com`

describe('payload do Resend', () => {
  it('wycena z 2 zdjęciami: from, to, reply_to, subject, tags, attachments, Idempotency-Key', async () => {
    const jpg = fakeImage('jpeg', 'IMG_0001.JPG', 3000, 0x41)
    const png = fakeImage('png', 'plan.png', 2000, 0x42)
    const response = await call(postForm('quote', { ...QUOTE_FIELDS, photos: [jpg, png] }), SEND)
    const body = await json(response)
    expect(response.status).toBe(200)
    expect(body).toMatchObject({ ok: true })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]!
    expect(url).toBe('https://api.resend.com/emails')
    expect(init?.method).toBe('POST')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    const headers = new Headers(init?.headers)
    expect(headers.get('Authorization')).toBe('Bearer re_test_key')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Idempotency-Key')).toBe(body.requestId)

    const payload = JSON.parse(init!.body as string) as ResendPayload
    expect(payload.from).toBe('Brambruk - Kontakt <kontakt@brambruk.pl>')
    expect(payload.to).toEqual(['kontakt@brambruk.pl'])
    expect(payload.reply_to).toBe(QUOTE_FIELDS.email)
    expect(payload.subject).toBe('Nowe zapytanie o wycenę - Ogrodzenie / brama')
    expect(payload.tags).toEqual([{ name: 'form', value: 'quote' }])
    expect(payload.html).toContain('<!DOCTYPE html>')
    expect(payload.text).toContain(`Imię: ${QUOTE_FIELDS.name}`)
    expect(payload.html).toContain(String(body.requestId))

    expect(payload.attachments!.map((a) => a.filename)).toEqual(['zdjecie-1.jpg', 'zdjecie-2.png'])
    const decoded = payload.attachments!.map((a) => Uint8Array.fromBase64(a.content))
    expect(decoded[0]).toEqual(new Uint8Array(await jpg.arrayBuffer()))
    expect(decoded[1]).toEqual(new Uint8Array(await png.arrayBuffer()))
    expect(JSON.stringify(payload)).not.toContain('IMG_0001') // nazwa od klienta nie trafia dalej

    expect(lastLog()).toMatchObject({ outcome: 'sent', status: 200, resendStatus: 200, files: 2, bytes: 5000 })
  })

  it('kontakt bez plików: bez pola attachments; MAIL_TO z kilkoma adresami', async () => {
    const response = await call(postForm('contact', CONTACT_FIELDS), {
      ...SEND,
      MAIL_TO: 'kontakt@brambruk.pl, biuro@brambruk.pl ,',
    })
    expect(response.status).toBe(200)
    const payload = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string) as ResendPayload
    expect(payload.to).toEqual(['kontakt@brambruk.pl', 'biuro@brambruk.pl'])
    expect(payload.attachments).toBeUndefined()
    expect(payload.subject).toBe(`Nowe zapytanie od ${CONTACT_FIELDS.name}`)
    expect(payload.tags).toEqual([{ name: 'form', value: 'contact' }])
  })

  it('logo z LOGO_URL', async () => {
    await call(postForm('contact', CONTACT_FIELDS), { ...SEND, LOGO_URL: 'https://cdn.example/logo.png' })
    const payload = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string) as ResendPayload
    expect(payload.html).toContain('src="https://cdn.example/logo.png"')
  })

  it('body jako string z jawnym Content-Type: application/json (bez niego fetch wysłałby text/plain)', async () => {
    await call(postForm('quote', { ...QUOTE_FIELDS, photos: [fakeImage('jpeg', 'a.jpg', 1500)] }), SEND)
    const init = fetchSpy.mock.calls[0]![1]!
    expect(typeof init.body).toBe('string')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })
})

describe('buildBody - body składane z fragmentów', () => {
  const config: MailConfig = {
    from: 'Brambruk - Kontakt <kontakt@brambruk.pl>',
    to: ['kontakt@brambruk.pl', 'biuro@brambruk.pl'],
    logoUrl: undefined,
    dryRun: false,
    apiKey: 're_test_key',
  }
  // Treść z cudzysłowami, ukośnikami, nowymi liniami, U+2028 i polskimi znakami -
  // tę część nadal escapuje JSON.stringify.
  const email: RenderedEmail = {
    subject: 'Nowe zapytanie od "Jan" \\ Łódź',
    html: '<p>Zażółć "gęślą" jaźń</p>\n<p>\u2028</p>',
    text: 'Linia 1\nLinia 2\t\\koniec "cytat"',
  }
  // Rozmiary dają base64 bez dopełnienia, z "==" i z "="; bajt 0xfb daje w base64 znaki + i /.
  const attachment = (filename: string, size: number): Attachment => ({
    filename,
    mime: 'image/jpeg',
    bytes: new Uint8Array(size).fill(0xfb),
  })
  const attachments = [attachment('zdjecie-1.jpg', 3000), attachment('zdjecie-2.png', 2002), attachment('zdjecie-3.webp', 2003)]

  it.each([0, 1, 2, 3])('%i załączników: JSON.parse(body) = obiekt w starym kształcie', (count) => {
    const options = { replyTo: 'jan@example.com', form: 'quote', attachments: attachments.slice(0, count) }
    const body = buildBody(config, email, options)
    expect(JSON.parse(body)).toStrictEqual(buildPayload(config, email, options))
    expect(body).toBe(JSON.stringify(buildPayload(config, email, options)))
  })

  it('bez reply_to: pole pominięte tak samo jak w buildPayload', () => {
    const options = { replyTo: undefined, form: 'contact', attachments: attachments.slice(0, 1) }
    const payload = JSON.parse(buildBody(config, email, options)) as ResendPayload
    expect(payload).not.toHaveProperty('reply_to')
    expect(payload).toStrictEqual(buildPayload(config, email, options))
  })

  it('nazwa pliku z ", \\, nową linią i polskimi znakami -> poprawny JSON, nazwa odzyskana 1:1', () => {
    const filename = 'zdjęcie "ogród"\\C:\\tmp\nŻółw źdźbło.jpg'
    const body = buildBody(config, email, { replyTo: undefined, form: 'quote', attachments: [attachment(filename, 10)] })
    const payload = JSON.parse(body) as ResendPayload
    expect(payload.attachments).toEqual([{ filename, content: new Uint8Array(10).fill(0xfb).toBase64() }])
  })
})

describe('błędy Resend -> 502 bez szczegółów', () => {
  const secretMessage = `Invalid reply_to: ${QUOTE_FIELDS.email}`

  it.each([
    [422, 'validation_error'],
    [403, 'invalid_api_key'],
    [429, 'rate_limit_exceeded'],
    [500, 'internal_server_error'],
  ])('Resend %i (%s) -> 502 mail_failed', async (status, name) => {
    resendReplies(Response.json({ statusCode: status, name, message: secretMessage }, { status }))
    const response = await call(postForm('quote', QUOTE_FIELDS), SEND)
    const text = await response.text()
    expect(response.status).toBe(502)
    expect(JSON.parse(text)).toEqual({ ok: false, error: 'mail_failed', requestId: expect.any(String) })
    expect(text).not.toContain(name)
    expect(text).not.toContain('Invalid')
    expect(lastLog()).toMatchObject({ outcome: 'failed', reason: 'mail_failed', status: 502, resendStatus: status, resendError: name })
    expect(logs.join('\n')).not.toContain(secretMessage)
  })

  it('odpowiedź nie-JSON -> resendError "unknown"', async () => {
    resendReplies(new Response('<html>Bad gateway</html>', { status: 503 }))
    const response = await call(postForm('contact', CONTACT_FIELDS), SEND)
    expect(response.status).toBe(502)
    expect(lastLog()).toMatchObject({ resendStatus: 503, resendError: 'unknown' })
  })

  it('pole name o podejrzanym kształcie nie trafia do logu', async () => {
    resendReplies(Response.json({ name: 'Zła wartość jan@example.com' }, { status: 422 }))
    await call(postForm('contact', CONTACT_FIELDS), SEND)
    expect(lastLog()).toMatchObject({ resendError: 'unknown' })
  })

  it('timeout (AbortSignal.timeout) -> 502, resendError "timeout"', async () => {
    resendReplies(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
    const response = await call(postForm('contact', CONTACT_FIELDS), SEND)
    expect(response.status).toBe(502)
    expect(await json(response)).toMatchObject({ error: 'mail_failed' })
    expect(lastLog()).toMatchObject({ resendStatus: 0, resendError: 'timeout' })
  })

  it('błąd sieci -> 502, resendError "network_error"', async () => {
    resendReplies(new TypeError('fetch failed'))
    const response = await call(postForm('contact', CONTACT_FIELDS), SEND)
    expect(response.status).toBe(502)
    expect(lastLog()).toMatchObject({ resendStatus: 0, resendError: 'network_error' })
  })
})

describe('MAIL_DRY_RUN i konfiguracja', () => {
  it('dry run: pełna ścieżka, 200, bez fetch, log dry_run z plikami', async () => {
    const photos = [fakeImage('jpeg', 'a.jpg', 4000), fakeImage('webp', 'b.webp', 1000)]
    const response = await call(postForm('quote', { ...QUOTE_FIELDS, photos }), { ...SEND, MAIL_DRY_RUN: 'true' })
    expect(response.status).toBe(200)
    expect(await json(response)).toMatchObject({ ok: true })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(lastLog()).toMatchObject({ outcome: 'dry_run', status: 200, files: 2, bytes: 5000 })
  })

  // DECYZJA: zamiast spy na module resend.ts (eksport ESM w workerd nie daje się
  // podmienić, a submit.ts i tak trzyma własne powiązanie) - spy na metodzie
  // prototypu, której body używa. Sprawdza to, co ważne dla pomiaru CPU:
  // base64 załączników liczy się także w dry run.
  it('dry run buduje body: base64 każdego załącznika policzone mimo braku wysyłki', async () => {
    const toBase64 = vi.spyOn(Uint8Array.prototype, 'toBase64')
    const photos = [fakeImage('jpeg', 'a.jpg', 4000), fakeImage('webp', 'b.webp', 1000)]
    const response = await call(postForm('quote', { ...QUOTE_FIELDS, photos }), { ...SEND, MAIL_DRY_RUN: 'true' })
    expect(response.status).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(toBase64).toHaveBeenCalledTimes(2)
  })

  it('dry run bez sekretu MAIL_TO -> 500 not_configured', async () => {
    const response = await call(postForm('contact', CONTACT_FIELDS), { MAIL_DRY_RUN: 'true', MAIL_TO: undefined })
    expect(response.status).toBe(500)
    expect(await json(response)).toMatchObject({ ok: false, error: 'not_configured' })
  })

  it('dry run nie wymaga klucza Resend', async () => {
    const response = await call(postForm('contact', CONTACT_FIELDS), { MAIL_DRY_RUN: 'true', RESEND_API_KEY: '' })
    expect(response.status).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it.each([
    ['brak RESEND_API_KEY', { RESEND_API_KEY: undefined }],
    ['pusty RESEND_API_KEY', { RESEND_API_KEY: '  ' }],
    ['brak MAIL_FROM', { MAIL_FROM: '' }],
    ['brak sekretu MAIL_TO', { MAIL_TO: undefined }],
    ['pusta lista MAIL_TO', { MAIL_TO: ' , ' }],
  ])('%s przy MAIL_DRY_RUN=false -> 500 not_configured', async (_, overrides) => {
    const response = await call(postForm('contact', CONTACT_FIELDS), { ...SEND, ...overrides })
    expect(response.status).toBe(500)
    expect(await json(response)).toMatchObject({ ok: false, error: 'not_configured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('nieprzewidziany wyjątek -> 500 internal_error, w logu tylko nazwa błędu', async () => {
    const MAIL_FROM = {
      trim() {
        throw new TypeError(`boom ${CONTACT_FIELDS.email}`)
      },
    }
    const response = await call(postForm('contact', CONTACT_FIELDS), { ...SEND, MAIL_FROM } as never)
    expect(response.status).toBe(500)
    expect(await json(response)).toMatchObject({ ok: false, error: 'internal_error' })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://brambruk.pl')
    expect(lastLog()).toMatchObject({ outcome: 'failed', warnings: ['exception:TypeError'] })
    expect(logs.join('\n')).not.toContain(CONTACT_FIELDS.email)
  })
})

describe('rate limit', () => {
  const limiter = (success: boolean, keys: string[] = []) => ({
    limit: async ({ key }: { key: string }) => {
      keys.push(key)
      return { success }
    },
  })

  it('klucze: {form}:{IP} i {form}:{e-mail małymi literami}', async () => {
    const ipKeys: string[] = []
    const emailKeys: string[] = []
    const request = postForm('quote', { ...QUOTE_FIELDS, email: 'Jan.Testowy@Example.COM' }, {
      Origin: 'https://brambruk.pl',
      'CF-Connecting-IP': '203.0.113.7',
    })
    const response = await call(request, { ...SEND, RL_IP: limiter(true, ipKeys), RL_EMAIL: limiter(true, emailKeys) })
    expect(response.status).toBe(200)
    expect(ipKeys).toEqual(['quote:203.0.113.7'])
    expect(emailKeys).toEqual(['quote:jan.testowy@example.com'])
  })

  it.each(['RL_IP', 'RL_EMAIL'])('%s przekroczony -> 429 rate_limited, Retry-After: 60, bez wysyłki', async (name) => {
    const response = await call(postForm('contact', CONTACT_FIELDS), { ...SEND, [name]: limiter(false) })
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(response.headers.get('Access-Control-Expose-Headers')).toContain('Retry-After')
    expect(await json(response)).toMatchObject({ ok: false, error: 'rate_limited' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rate limit sprawdzany po walidacji: błędne dane nie zużywają limitu', async () => {
    const keys: string[] = []
    const response = await call(postForm('contact', { ...CONTACT_FIELDS, email: 'zly' }), {
      ...SEND,
      RL_IP: limiter(false, keys),
    })
    expect(response.status).toBe(400)
    expect(keys).toEqual([])
  })

  it('prawdziwy binding (miniflare): 4. zgłoszenie z tym samym e-mailem w minucie -> 429', async () => {
    const email = uniqueEmail()
    const statuses: number[] = []
    for (let i = 0; i < 4; i++) {
      const request = postForm('contact', { ...CONTACT_FIELDS, email }, {
        Origin: 'https://brambruk.pl',
        'CF-Connecting-IP': `198.51.100.${i + 1}`,
      })
      statuses.push((await call(request, { ...SEND, ...realRateLimits() })).status)
    }
    expect(statuses).toEqual([200, 200, 200, 429])
  })

  it('brak bindingów -> ostrzeżenie w logu, zgłoszenie przechodzi', async () => {
    const response = await call(postForm('contact', CONTACT_FIELDS), { ...SEND, RL_IP: undefined, RL_EMAIL: undefined })
    expect(response.status).toBe(200)
    expect(lastLog()).toMatchObject({ outcome: 'sent', warnings: ['rate_limit_missing:RL_IP', 'rate_limit_missing:RL_EMAIL'] })
    expect(levels.at(-1)).toBe('warn')
  })

  it('błąd bindingu -> ostrzeżenie w logu, zgłoszenie przechodzi', async () => {
    const broken = { limit: async () => Promise.reject(new Error('binding down')) }
    const response = await call(postForm('contact', CONTACT_FIELDS), { ...SEND, RL_IP: broken })
    expect(response.status).toBe(200)
    expect(lastLog()).toMatchObject({ warnings: ['rate_limit_error:RL_IP'] })
  })
})
