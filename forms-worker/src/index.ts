// Router. Tylko kolejność sprawdzeń i przekazanie do obsługi zgłoszenia.
//
//   POST    /forms/{slug}  -> zgłoszenie (src/submit.ts)
//   OPTIONS /forms/{slug}  -> preflight CORS
//   reszta                 -> 404 / 405

import { resolveOrigin, preflightHeaders } from './cors.ts'
import { FORMS } from './forms.ts'
import { failure, finish, type Outcome } from './response.ts'
import { handleSubmission } from './submit.ts'

const FORM_PATH = /^\/forms\/([^/]+)\/?$/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    const slug = FORM_PATH.exec(new URL(request.url).pathname)?.[1] ?? null
    // hasOwn: slug "constructor" czy "__proto__" nie może trafić w prototyp obiektu.
    const form = slug !== null && Object.hasOwn(FORMS, slug) ? FORMS[slug] : undefined
    const origin = resolveOrigin(request, env.ALLOWED_ORIGINS)

    let outcome: Outcome
    if (slug === null) {
      // DECYZJA: adres spoza /forms/* -> 404 "not_found" (kontrakt zna tylko
      // "unknown_form", który dotyczy nieznanego sluga formularza).
      outcome = failure(404, 'not_found')
    } else if (request.method === 'OPTIONS') {
      outcome = origin
        ? { status: 204, body: null, headers: preflightHeaders, log: { outcome: 'preflight' } }
        : failure(403, 'forbidden_origin')
    } else if (request.method !== 'POST') {
      outcome = failure(405, 'method_not_allowed', { headers: { Allow: 'POST, OPTIONS' } })
    } else if (!origin) {
      outcome = failure(403, 'forbidden_origin')
    } else if (!form) {
      outcome = failure(404, 'unknown_form')
    } else {
      try {
        outcome = await handleSubmission(request, env, slug, form, requestId)
      } catch (error) {
        // DECYZJA: nieprzewidziany wyjątek -> 500 "internal_error" (JSON + CORS
        // zamiast strony błędu Cloudflare). W logu tylko nazwa błędu - komunikat
        // mógłby zawierać fragment danych z formularza.
        outcome = failure(500, 'internal_error', {
          log: { warnings: [`exception:${error instanceof Error ? error.name : 'unknown'}`] },
        })
      }
    }

    return finish(outcome, { requestId, form: form ? slug : null, origin, startedAt })
  },
} satisfies ExportedHandler<Env>
