// Jedna linia JSON na żądanie. Trafia do Workers Logs (observability).
//
// BEZ DANYCH OSOBOWYCH: żadnego IP, e-maila (także zamaskowanego), imienia,
// telefonu, treści, nazw plików ani pełnej odpowiedzi Resend. Z błędu Resend
// tylko status HTTP i pole `name`. Pilnuje tego test w test/log.test.ts.

export type LogOutcome =
  | 'sent' // mail przyjęty przez Resend
  | 'dry_run' // pełna ścieżka bez wysyłki (MAIL_DRY_RUN)
  | 'honeypot' // bot - udajemy sukces
  | 'preflight' // OPTIONS
  | 'rejected' // odpowiedź 4xx
  | 'failed' // odpowiedź 5xx

export interface LogEntry {
  requestId: string
  /** Slug formularza albo null, gdy adres nie wskazuje znanego formularza. */
  form: string | null
  outcome: LogOutcome
  /** Kod `error` z odpowiedzi albo null przy sukcesie. */
  reason: string | null
  status: number
  resendStatus?: number
  resendError?: string
  /** Liczba załączników. */
  files: number
  /** Łączny rozmiar załączników w bajtach (przed base64). */
  bytes: number
  /** Czas ściany w ms. W Workers zegar stoi podczas pracy CPU - to głównie czas I/O. */
  ms: number
  // DECYZJA: dwa pola spoza listy z CLAUDE.md, oba bez danych osobowych:
  /** Przy validation_failed: nazwa pola -> kod błędu (bez wartości). */
  invalid?: Record<string, string>
  /** Np. brak bindingu rate limit. */
  warnings?: string[]
}

export function writeLog(entry: LogEntry): void {
  // Stała kolejność kluczy - łatwiej czytać w Workers Logs. undefined znika.
  const line = JSON.stringify({
    requestId: entry.requestId,
    form: entry.form,
    outcome: entry.outcome,
    reason: entry.reason,
    status: entry.status,
    resendStatus: entry.resendStatus,
    resendError: entry.resendError,
    files: entry.files,
    bytes: entry.bytes,
    ms: entry.ms,
    invalid: entry.invalid,
    warnings: entry.warnings,
  } satisfies LogEntry)
  if (entry.status >= 500) console.error(line)
  else if (entry.warnings?.length) console.warn(line)
  else console.log(line)
}
