// Rate limit przez binding Cloudflare Rate Limiting (licznik w pamięci, nic nie
// jest zapisywane). Sprawdzany PO honeypocie i walidacji, PRZED wysyłką.
//
//   RL_IP    klucz {form}:{CF-Connecting-IP}    limit w wrangler.jsonc
//   RL_EMAIL klucz {form}:{e-mail małymi literami}
//
// IP i e-mail są tu wyłącznie kluczem licznika - nie trafiają do logu.
// Brak bindingu = ostrzeżenie w logu i przepuszczenie żądania.
// DECYZJA: wyjątek z bindingu traktujemy tak samo (fail-open) - awaria licznika
// nie może blokować zapytań od klientów.

export interface RateLimitResult {
  limited: boolean
  warnings: string[]
}

export async function checkRateLimit(
  env: Env,
  keys: { form: string; ip: string | null; email: string | undefined },
): Promise<RateLimitResult> {
  const checks: [name: string, binding: RateLimit | undefined, key: string | null][] = [
    ['RL_IP', env.RL_IP as RateLimit | undefined, `${keys.form}:${keys.ip ?? 'unknown'}`],
    ['RL_EMAIL', env.RL_EMAIL as RateLimit | undefined, keys.email ? `${keys.form}:${keys.email.toLowerCase()}` : null],
  ]

  const warnings: string[] = []
  const outcomes = await Promise.all(
    checks.map(async ([name, binding, key]) => {
      if (key === null) return true
      if (!binding) {
        warnings.push(`rate_limit_missing:${name}`)
        return true
      }
      try {
        return (await binding.limit({ key })).success
      } catch {
        warnings.push(`rate_limit_error:${name}`)
        return true
      }
    }),
  )
  return { limited: outcomes.includes(false), warnings }
}
