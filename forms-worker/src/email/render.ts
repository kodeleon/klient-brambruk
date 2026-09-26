// Generyczny renderer maila: { subject, html, text } dla dowolnego formularza
// z forms.ts. Przechodzi po sekcjach `mail.sections` i polach w podanej kolejności.
// Nie zna nazw pól - tylko ich typy.

import type { FieldDef, FormDef } from '../forms.ts'
import type { ValidData } from '../validate.ts'
import { allowedOptions } from '../validate.ts'
import { layoutHtml, layoutText, rowsTable, sectionCard, textBlock, type Row } from './layout.ts'
import type { SafeHtml } from './html.ts'

export interface RenderContext {
  requestId: string
  logoUrl: string
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

/** Pusty parametr opcjonalny. Zwykły łącznik, nie pauza. */
const EMPTY = '-'
/** Pusty multiselect i brak plików. */
const NONE = 'Brak'
const SUBJECT_MAX = 150

export function renderEmail(form: FormDef, data: ValidData, ctx: RenderContext): RenderedEmail {
  const subject = renderSubject(form, data)
  const htmlSections: SafeHtml[] = []
  const textSections: string[] = []

  for (const section of form.mail.sections) {
    const fields = section.fields.flatMap((key) => {
      const field = form.fields[key]
      return field ? [{ key, field, value: displayValue(field, key, data) }] : []
    })
    // Etykieta textarea zbędna, gdy to jedyne pole sekcji (tytuł sekcji wystarcza).
    const labelBlocks = fields.length > 1

    const htmlParts: SafeHtml[] = []
    const textLines: string[] = [section.title, '-'.repeat(section.title.length)]
    let rows: Row[] = []
    const flushRows = () => {
      if (rows.length) htmlParts.push(rowsTable(rows))
      rows = []
    }

    for (const { field, value } of fields) {
      if (field.type === 'textarea') {
        flushRows()
        htmlParts.push(textBlock(value, labelBlocks ? field.label : undefined))
        textLines.push(...(labelBlocks ? [`${field.label}:`] : []), value)
      } else {
        rows.push({ label: field.label, value, mailto: field.type === 'email' && value !== EMPTY })
        textLines.push(`${field.label}: ${value}`)
      }
    }
    flushRows()
    if (section.note) textLines.push(`(${section.note})`)

    htmlSections.push(sectionCard(section.title, htmlParts, section.note))
    textSections.push(textLines.join('\n'))
  }

  const common = {
    subject,
    heading: form.mail.heading,
    intro: form.mail.intro,
    formName: form.name,
    requestId: ctx.requestId,
  }
  return {
    subject,
    html: layoutHtml({ ...common, logoUrl: ctx.logoUrl, sections: htmlSections }),
    text: layoutText({ ...common, sections: textSections }),
  }
}

/** Temat: `{pole}` -> wartość do wyświetlenia, bez \r i \n, maks. 150 znaków. */
export function renderSubject(form: FormDef, data: ValidData): string {
  const filled = form.subject.replace(/\{(\w+)\}/g, (_, key: string) => {
    const field = Object.hasOwn(form.fields, key) ? form.fields[key] : undefined
    return field ? displayValue(field, key, data) : ''
  })
  const oneLine = filled.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  // Po znakach Unicode, nie jednostkach UTF-16 - bez rozcinania emoji.
  return Array.from(oneLine).slice(0, SUBJECT_MAX).join('').trim()
}

/** Wartość pola w mailu: etykiety opcji, liczba zdjęć, "-" albo "Brak" dla pustych. */
export function displayValue(field: FieldDef, key: string, data: ValidData): string {
  if (field.type === 'file') {
    const count = data.files[key]?.length ?? 0
    return count ? `${count} ${pluralPl(count, field.countWords)} w załączniku` : NONE
  }

  const value = data.values[key]
  if (field.type === 'multiselect') {
    const options = allowedOptions(field, data.values)
    const keys = Array.isArray(value) ? value : []
    return keys.length ? keys.map((k) => options[k] ?? k).join(', ') : NONE
  }
  if (typeof value !== 'string' || value === '') return EMPTY
  if (field.type === 'select') return allowedOptions(field, data.values)[value] ?? value
  return value
}

/** Odmiana polska: 1 zdjęcie, 2-4 zdjęcia (poza 12-14), 5+ zdjęć. */
export function pluralPl(n: number, [one, few, many]: readonly [string, string, string]): string {
  if (n === 1) return one
  const lastDigit = n % 10
  const lastTwo = n % 100
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many
}
