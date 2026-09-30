// Testy przez worker.fetch: routing, CORS, honeypot, pliki w multipart.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_REQUEST_BYTES } from '../src/forms.ts'
import { BASE, call, CONTACT_FIELDS, fakeImage, json, ORIGIN, postForm, postJson, QUOTE_FIELDS } from './helpers.ts'

const MiB = 1024 * 1024
const DRY = { MAIL_DRY_RUN: 'true' }

afterEach(() => vi.restoreAllMocks())

describe('routing', () => {
  it('nieznana ścieżka -> 404 not_found', async () => {
    const response = await call(new Request(`${BASE}/xyz`))
    expect(response.status).toBe(404)
    expect(await json(response)).toMatchObject({ ok: false, error: 'not_found' })
  })

  it.each(['nieznany', 'constructor', '__proto__', 'toString'])('POST /forms/%s -> 404 unknown_form', async (slug) => {
    const response = await call(postForm(slug, CONTACT_FIELDS))
    expect(response.status).toBe(404)
    expect(await json(response)).toMatchObject({ ok: false, error: 'unknown_form' })
  })

  it.each(['GET', 'PUT', 'DELETE'])('%s -> 405 method_not_allowed z Allow', async (method) => {
    const response = await call(new Request(`${BASE}/forms/contact`, { method, headers: { Origin: ORIGIN } }))
    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST, OPTIONS')
    expect(await json(response)).toMatchObject({ ok: false, error: 'method_not_allowed' })
  })

  it('każda odpowiedź JSON ma requestId (UUID)', async () => {
    const body = await json(await call(new Request(`${BASE}/xyz`)))
    expect(body.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('CORS', () => {
  it('preflight z dozwolonego originu -> 204 z nagłówkami', async () => {
    const response = await call(
      new Request(`${BASE}/forms/quote`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://www.brambruk.pl', 'Access-Control-Request-Method': 'POST' },
      }),
    )
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://www.brambruk.pl')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('preflight z obcego originu -> 403 bez Allow-Origin', async () => {
    const response = await call(new Request(`${BASE}/forms/quote`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }))
    expect(response.status).toBe(403)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('POST z dozwolonego originu -> Allow-Origin = dokładnie ten origin (nigdy *)', async () => {
    const response = await call(postForm('contact', CONTACT_FIELDS), DRY)
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it.each([
    ['obcy origin', { Origin: 'https://evil.example' }],
    ['podobny origin', { Origin: 'https://brambruk.pl.evil.example' }],
    ['http zamiast https', { Origin: 'http://brambruk.pl' }],
    ['Origin: null', { Origin: 'null' }],
    ['brak Origin', {}],
  ])('%s -> 403 forbidden_origin', async (_, headers: Record<string, string>) => {
    const response = await call(postForm('contact', CONTACT_FIELDS, headers), DRY)
    expect(response.status).toBe(403)
    expect(await json(response)).toMatchObject({ ok: false, error: 'forbidden_origin' })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('nagłówki CORS także na błędach (400, 404)', async () => {
    const bad = await call(postForm('contact', { ...CONTACT_FIELDS, email: 'x' }))
    expect(bad.status).toBe(400)
    expect(bad.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    const unknown = await call(postForm('nieznany', {}))
    expect(unknown.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
  })

  it('końcowy ukośnik i wielkość liter w ALLOWED_ORIGINS nie przeszkadzają', async () => {
    const response = await call(postForm('contact', CONTACT_FIELDS), { ...DRY, ALLOWED_ORIGINS: ' HTTPS://BRAMBRUK.PL/ ' })
    expect(response.status).toBe(200)
  })
})

describe('honeypot', () => {
  it('wypełniony _hp -> 200 ok, bez wysyłki (nawet przy błędnych danych)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await call(postForm('contact', { _hp: 'http://spam', email: 'zly' }), { MAIL_DRY_RUN: 'false' })
    expect(response.status).toBe(200)
    expect(await json(response)).toMatchObject({ ok: true })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('walidacja przez HTTP', () => {
  it('400 validation_failed ze wszystkimi polami', async () => {
    const response = await call(postJson('contact', { name: '', email: 'x', message: 'www.spam.example' }))
    expect(response.status).toBe(400)
    expect(await json(response)).toMatchObject({
      ok: false,
      error: 'validation_failed',
      fields: { name: 'required', email: 'invalid_format', message: 'links_blocked' },
    })
  })

  it('poprawny kontakt jako JSON -> 200', async () => {
    const response = await call(postJson('contact', CONTACT_FIELDS), DRY)
    expect(response.status).toBe(200)
  })
})

describe('pliki przez multipart', () => {
  const send = (photos: File[]) => call(postForm('quote', { ...QUOTE_FIELDS, photos }), DRY)

  it('2 zdjęcia (JPEG + WebP) -> 200', async () => {
    const response = await send([fakeImage('jpeg', 'a.jpg', 300_000), fakeImage('webp', 'b.webp', 200_000)])
    expect(response.status).toBe(200)
  })

  it('PNG przemianowany na .jpg przechodzi (typ z sygnatury)', async () => {
    const response = await send([fakeImage('png', 'zdjecie.jpg')])
    expect(response.status).toBe(200)
  })

  it('plik tekstowy z rozszerzeniem .jpg i typem image/jpeg -> invalid_file_type', async () => {
    const response = await send([fakeImage('text', 'zdjecie.jpg')])
    expect(response.status).toBe(400)
    expect(await json(response)).toMatchObject({ fields: { photos: 'invalid_file_type' } })
  })

  it('3 pliki -> too_many_files', async () => {
    const response = await send([fakeImage('jpeg', '1.jpg'), fakeImage('jpeg', '2.jpg'), fakeImage('jpeg', '3.jpg')])
    expect(await json(response)).toMatchObject({ fields: { photos: 'too_many_files' } })
  })

  it('3 wpisy, w tym duplikat -> liczone 2, przechodzi', async () => {
    const a = fakeImage('jpeg', 'a.jpg', 500)
    const response = await send([a, fakeImage('jpeg', 'a.jpg', 500), fakeImage('png', 'b.png', 600)])
    expect(response.status).toBe(200)
  })

  it('plik 1,1 MiB -> file_too_large', async () => {
    const response = await send([fakeImage('jpeg', 'duzy.jpg', Math.round(1.1 * MiB))])
    expect(await json(response)).toMatchObject({ fields: { photos: 'file_too_large' } })
  })

  it('żądanie ponad MAX_REQUEST_BYTES -> 413 payload_too_large jako JSON z nagłówkami CORS', async () => {
    const half = Math.ceil(MAX_REQUEST_BYTES / 2)
    const response = await send([fakeImage('jpeg', 'a.jpg', half), fakeImage('jpeg', 'b.jpg', half)])
    expect(response.status).toBe(413)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(response.headers.get('Vary')).toBe('Origin')
    expect(await json(response)).toMatchObject({ ok: false, error: 'payload_too_large' })
  })
})
