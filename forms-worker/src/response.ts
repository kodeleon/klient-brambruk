// Kształt odpowiedzi (kontrakt z frontem) i zamiana wyniku na Response + log.

import { corsHeaders } from './cors.ts'
import { writeLog, type LogEntry, type LogOutcome } from './log.ts'

export type ErrorCode =
  | 'validation_failed'
  | 'unknown_form'
  | 'not_found'
  | 'method_not_allowed'
  | 'forbidden_origin'
  | 'payload_too_large'
  | 'bad_request'
  | 'rate_limited'
  | 'mail_failed'
  | 'not_configured'
  | 'internal_error'

/** Wynik obsługi żądania, zanim stanie się Response. */
export interface Outcome {
  status: number
  /** null = odpowiedź bez treści (preflight 204). */
  body: { ok: true } | { ok: false; error: ErrorCode; fields?: Record<string, string> } | null
  headers?: Record<string, string>
  log: Omit<LogEntry, 'requestId' | 'form' | 'status' | 'ms' | 'files' | 'bytes' | 'reason'> &
    Partial<Pick<LogEntry, 'files' | 'bytes'>>
}

export function success(outcome: LogOutcome, extra: Partial<Outcome['log']> = {}): Outcome {
  return { status: 200, body: { ok: true }, log: { ...extra, outcome } }
}

export function failure(
  status: number,
  error: ErrorCode,
  extra: { headers?: Record<string, string>; fields?: Record<string, string>; log?: Partial<Outcome['log']> } = {},
): Outcome {
  return {
    status,
    body: extra.fields ? { ok: false, error, fields: extra.fields } : { ok: false, error },
    headers: extra.headers,
    log: { ...extra.log, outcome: status >= 500 ? 'failed' : 'rejected' },
  }
}

interface RequestContext {
  requestId: string
  form: string | null
  origin: string | null
  startedAt: number
}

/** Buduje Response (JSON + CORS na każdej odpowiedzi) i zapisuje linię logu. */
export function finish(outcome: Outcome, ctx: RequestContext): Response {
  const headers: Record<string, string> = {
    ...corsHeaders(ctx.origin),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...outcome.headers,
  }
  let body: string | null = null
  if (outcome.body) {
    headers['Content-Type'] = 'application/json; charset=utf-8'
    body = JSON.stringify({ ...outcome.body, requestId: ctx.requestId })
  }

  const { files = 0, bytes = 0, ...rest } = outcome.log
  writeLog({
    requestId: ctx.requestId,
    form: ctx.form,
    ...rest,
    reason: outcome.body && !outcome.body.ok ? outcome.body.error : null,
    status: outcome.status,
    files,
    bytes,
    ms: Date.now() - ctx.startedAt,
  })

  return new Response(body, { status: outcome.status, headers })
}
