import { env } from 'cloudflare:workers'
import worker from '../src/index.ts'

export const ORIGIN = 'https://brambruk.pl'
export const BASE = 'https://api.brambruk.pl'

type FormValue = string | File | Array<string | File>

export function formData(fields: Record<string, FormValue>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item)
  }
  return data
}

export function postForm(
  slug: string,
  fields: Record<string, FormValue>,
  headers: Record<string, string> = { Origin: ORIGIN },
): Request {
  return new Request(`${BASE}/forms/${slug}`, { method: 'POST', headers, body: formData(fields) })
}

export function postJson(slug: string, body: unknown, headers: Record<string, string> = { Origin: ORIGIN }): Request {
  return new Request(`${BASE}/forms/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

/** Limiter, który zawsze przepuszcza - żeby liczniki nie przenosiły się między testami. */
export const ALLOW_ALL = { limit: async () => ({ success: true }) }

/**
 * Wywołuje worker z env testowym (vitest.config.ts) i opcjonalnymi nadpisaniami.
 * Rate limit domyślnie wyłączony (ALLOW_ALL); prawdziwe bindingi: `realRateLimits`.
 */
export function call(request: Request, overrides: Record<string, unknown> = {}): Promise<Response> {
  return worker.fetch(request, { ...env, RL_IP: ALLOW_ALL, RL_EMAIL: ALLOW_ALL, ...overrides } as Env)
}

export const realRateLimits = () => ({ RL_IP: env.RL_IP, RL_EMAIL: env.RL_EMAIL })

export async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

// --- Pliki testowe: prawdziwe sygnatury bajtowe + wypełnienie do zadanego rozmiaru ---

const SIGNATURES = {
  jpeg: [0xff, 0xd8, 0xff, 0xe0],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  webp: [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
  text: [...new TextEncoder().encode('to nie jest obraz')],
} as const

export function fakeImage(kind: keyof typeof SIGNATURES, name: string, size = 1024, fill = 0x20): File {
  const bytes = new Uint8Array(Math.max(size, SIGNATURES[kind].length)).fill(fill)
  bytes.set(SIGNATURES[kind])
  return new File([bytes], name, { type: kind === 'text' ? 'image/jpeg' : `image/${kind}` })
}

/** Poprawne, kompletne zgłoszenie wyceny (bez plików). */
export const QUOTE_FIELDS = {
  serviceType: 'ogrodzenia',
  subtype: 'panelowe',
  amount: '40 mb, wys. 1,5 m',
  location: 'Biała Podlaska, ul. Testowa 1',
  terrain: ['slope', 'roots'],
  timeline: 'month',
  budget: '5k_15k',
  description: 'Ogrodzenie panelowe od strony ulicy.\nBrama przesuwna 4 m.',
  name: 'Jan Testowy',
  email: 'jan.testowy@example.com',
  phone: '+48 123 456 789',
}

export const CONTACT_FIELDS = {
  name: 'Anna Kontaktowa',
  email: 'anna.kontaktowa@example.com',
  phone: '(83) 343-11-22',
  message: 'Dzień dobry,\r\nproszę o kontakt w sprawie podjazdu.',
}
