// Walidacja generyczna: reguły wynikają z typu pola i jego definicji w forms.ts,
// nie z nazw pól. Zwraca WSZYSTKIE błędy naraz (jeden kod na pole).

import type { FieldDef, FormDef, Options } from './forms.ts'
import { checkFiles, toAttachments, type Attachment } from './files.ts'
import type { ParsedInput } from './parse.ts'
import { containsLink } from './spam.ts'

/** Kody błędów pól - kontrakt z frontem (INTEGRATION.md). */
export type FieldError =
  | 'required'
  | 'invalid_format'
  | 'invalid_phone'
  | 'too_long'
  | 'invalid_option'
  | 'too_many_files'
  | 'file_too_large'
  | 'invalid_file_type'
  | 'links_blocked'

export interface ValidData {
  /** Tylko pola niepuste. */
  values: Record<string, string | string[]>
  files: Record<string, Attachment[]>
}

export type ValidationResult = { ok: true; data: ValidData } | { ok: false; fields: Record<string, FieldError> }

// DECYZJA: wzorzec e-maila zakotwiczony (^...$). Bez kotwic /\S+@\S+\.\S+/
// przepuszcza np. "Jan jan@wp.pl", a taki adres w reply_to odrzuca Resend -
// zgłoszenie przepada z błędem 502 zamiast czytelnego 400 przy polu.
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
const PHONE_PATTERN = /^[+\d\s\-()]{3,}$/

/** Opcje dozwolone dla pola select/multiselect przy danych wartościach formularza. */
export function allowedOptions(field: FieldDef, values: Record<string, string | string[]>): Options {
  if (field.type === 'multiselect') return field.options
  if (field.type !== 'select') return {}
  if ('options' in field) return field.options
  const parent = values[field.dependsOn.field]
  // DECYZJA: bez poprawnej wartości pola nadrzędnego żadna opcja pola zależnego
  // nie jest dozwolona (np. subtype bez serviceType -> invalid_option).
  return typeof parent === 'string' && Object.hasOwn(field.dependsOn.options, parent)
    ? field.dependsOn.options[parent]!
    : {}
}

export function validate(form: FormDef, input: ParsedInput): ValidationResult {
  const errors: Record<string, FieldError> = {}
  const data: ValidData = { values: {}, files: {} }

  for (const [key, field] of Object.entries(form.fields)) {
    if (field.type === 'file') {
      const files = input.files[key] ?? []
      const error = files.length === 0 ? (field.required ? 'required' : null) : checkFiles(files, field)
      if (error) errors[key] = error
      else if (files.length) data.files[key] = toAttachments(files, field)
      continue
    }

    const raw = input.values[key]
    const empty = raw === undefined || raw.length === 0
    if (empty) {
      if (field.required) errors[key] = 'required'
      continue
    }

    const error = checkValue(field, raw, input.values, form.blockLinks)
    if (error) errors[key] = error
    else data.values[key] = raw
  }

  return Object.keys(errors).length ? { ok: false, fields: errors } : { ok: true, data }
}

function checkValue(
  field: Exclude<FieldDef, { type: 'file' }>,
  value: string | string[],
  values: Record<string, string | string[]>,
  blockLinks: boolean,
): FieldError | null {
  if (field.type === 'select' || field.type === 'multiselect') {
    const options = allowedOptions(field, values)
    const keys = typeof value === 'string' ? [value] : value
    if (field.type === 'select' && keys.length !== 1) return 'invalid_option'
    return keys.every((key) => Object.hasOwn(options, key)) ? null : 'invalid_option'
  }

  if (typeof value !== 'string') return 'invalid_format'
  if (value.length > field.maxLength) return 'too_long'
  if (field.type === 'email' && !EMAIL_PATTERN.test(value)) return 'invalid_format'
  if (field.type === 'tel' && !PHONE_PATTERN.test(value)) return 'invalid_phone'
  if (field.type === 'textarea' && blockLinks && containsLink(value)) return 'links_blocked'
  return null
}
