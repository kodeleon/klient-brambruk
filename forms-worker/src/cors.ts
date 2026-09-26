// CORS: dokładne dopasowanie originu do listy ALLOWED_ORIGINS.
// Nigdy "*" - brak originu albo origin spoza listy kończy się 403.

const ALLOW_METHODS = 'POST, OPTIONS'
const ALLOW_HEADERS = 'Content-Type'
// Chrome i tak ogranicza cache preflightu do 2 h.
const PREFLIGHT_MAX_AGE = '7200'

export function parseOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim().toLowerCase().replace(/\/+$/, ''))
    .filter(Boolean)
}

/** Zwraca origin żądania, jeśli jest na liście; w przeciwnym razie null. */
export function resolveOrigin(request: Request, allowedOrigins: string | undefined): string | null {
  const origin = request.headers.get('Origin')
  if (!origin) return null
  return parseOrigins(allowedOrigins).includes(origin.toLowerCase()) ? origin : null
}

/**
 * Nagłówki CORS dla każdej odpowiedzi. Allow-Origin tylko dla originu z listy -
 * obcy origin dostaje 403 bez możliwości odczytania treści w przeglądarce.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': ALLOW_METHODS,
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
    // Retry-After nie jest na liście nagłówków czytelnych domyślnie.
    'Access-Control-Expose-Headers': 'Retry-After',
  }
  if (origin) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

export const preflightHeaders: Record<string, string> = {
  'Access-Control-Max-Age': PREFLIGHT_MAX_AGE,
}
