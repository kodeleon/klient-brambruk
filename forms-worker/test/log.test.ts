// Prywatność logów: żadna linia logu nie zawiera danych osobowych ze zgłoszenia
// (e-mail, imię, telefon, treść, IP, nazwy plików) - w żadnym scenariuszu.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { call, fakeImage, postForm } from './helpers.ts'

const SEND = { MAIL_DRY_RUN: 'false', RESEND_API_KEY: 're_test_key' }
const IP = '203.0.113.42'

const PERSONAL = {
  name: 'Zofia Prywatna',
  email: 'zofia.prywatna@example.com',
  phone: '+48 501 502 503',
  description: 'Sekretny opis działki przy ulicy Tajnej 7',
}
const FILE_NAME = 'dom-zofii-gps.jpg'

let logs: string[]

beforeEach(() => {
  logs = []
  for (const level of ['log', 'warn', 'error', 'info', 'debug'] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(' ')))
  }
})
afterEach(() => vi.restoreAllMocks())

function submission(extra: Record<string, string> = {}) {
  return postForm(
    'quote',
    {
      serviceType: 'ogrodzenia',
      ...PERSONAL,
      ...extra,
      photos: fakeImage('jpeg', FILE_NAME, 2000),
    },
    { Origin: 'https://brambruk.pl', 'CF-Connecting-IP': IP },
  )
}

function expectNoPersonalData() {
  expect(logs.length).toBeGreaterThan(0)
  const all = logs.join('\n').toLowerCase()
  for (const value of [...Object.values(PERSONAL), IP, FILE_NAME, 'zofia', 'prywatna', '501 502 503', 'tajnej']) {
    expect(all).not.toContain(value.toLowerCase())
  }
}

describe('log bez danych osobowych', () => {
  it('wysłano (sent)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'x' }))
    expect((await call(submission(), SEND)).status).toBe(200)
    expectNoPersonalData()
  })

  it('dry run', async () => {
    expect((await call(submission(), { MAIL_DRY_RUN: 'true' })).status).toBe(200)
    expectNoPersonalData()
  })

  it('błąd walidacji (w logu nazwy pól i kody, bez wartości)', async () => {
    const response = await call(submission({ phone: 'abc 501 502 503', description: `www.x.pl ${PERSONAL.description}` }), SEND)
    expect(response.status).toBe(400)
    expectNoPersonalData()
    expect(JSON.parse(logs.at(-1)!)).toMatchObject({ invalid: { phone: 'invalid_phone', description: 'links_blocked' } })
  })

  it('Resend odmówił z adresem w komunikacie', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ name: 'validation_error', message: `Invalid to/reply_to: ${PERSONAL.email}` }, { status: 422 }),
    )
    expect((await call(submission(), SEND)).status).toBe(502)
    expectNoPersonalData()
  })

  it('rate limit', async () => {
    const response = await call(submission(), { ...SEND, RL_IP: { limit: async () => ({ success: false }) } })
    expect(response.status).toBe(429)
    expectNoPersonalData()
  })

  it('honeypot', async () => {
    expect((await call(submission({ _hp: PERSONAL.name }), SEND)).status).toBe(200)
    expectNoPersonalData()
  })

  it('dokładnie jedna linia JSON na żądanie, z polami ze schematu', async () => {
    await call(submission(), { MAIL_DRY_RUN: 'true' })
    expect(logs).toHaveLength(1)
    const entry = JSON.parse(logs[0]!) as Record<string, unknown>
    expect(Object.keys(entry)).toEqual(['requestId', 'form', 'outcome', 'reason', 'status', 'files', 'bytes', 'ms'])
    expect(entry).toMatchObject({ form: 'quote', outcome: 'dry_run', reason: null, status: 200, files: 1, bytes: 2000 })
  })
})
