import { describe, expect, it } from 'vitest'
import { escapeHtml, html, multiline, trustedHtml } from '../src/email/html.ts'
import { displayValue, pluralPl, renderEmail, renderSubject } from '../src/email/render.ts'
import { FORMS, type FormDef } from '../src/forms.ts'
import type { ParsedFile } from '../src/parse.ts'
import { validate, type ValidData } from '../src/validate.ts'
import { CONTACT_FIELDS, QUOTE_FIELDS } from './helpers.ts'

const contact = FORMS.contact!
const quote = FORMS.quote!
const CTX = { requestId: '11111111-2222-4333-8444-555555555555', logoUrl: 'https://brambruk.pl/assets/logo/znak-144.png' }

const jpeg = (): ParsedFile => ({ size: 1000, bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) })

function valid(form: FormDef, values: Record<string, string | string[]>, photos = 0): ValidData {
  const files: Record<string, ParsedFile[]> = photos ? { photos: Array.from({ length: photos }, jpeg) } : {}
  const result = validate(form, { values, files, honeypot: '' })
  if (!result.ok) throw new Error(JSON.stringify(result.fields))
  return result.data
}

const fullQuote = valid(quote, QUOTE_FIELDS, 2)
const fullContact = valid(contact, { ...CONTACT_FIELDS, message: 'Dzień dobry,\nproszę o kontakt.' })

describe('html.ts - escapowanie', () => {
  it('escapeHtml: & < > " \'', () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;',
    )
  })

  it('html`` escapuje każdą wstawioną wartość domyślnie', () => {
    const evil = '"><img src=x onerror=alert(1)>'
    expect(html`<a title="${evil}">${evil}</a>`.value).toBe(
      '<a title="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;">&quot;&gt;&lt;img src=x onerror=alert(1)&gt;</a>',
    )
  })

  it('zagnieżdżone fragmenty i tablice nie są escapowane podwójnie', () => {
    const items = ['a&b', 'c'].map((x) => html`<li>${x}</li>`)
    expect(html`<ul>${items}</ul>`.value).toBe('<ul><li>a&amp;b</li><li>c</li></ul>')
  })

  it('null, undefined i false dają pusty tekst; liczby wstawiane', () => {
    expect(html`${null}${undefined}${false}${0}`.value).toBe('0')
  })

  it('trustedHtml wstawia surowo (tylko dla stałych z kodu)', () => {
    expect(html`${trustedHtml('&nbsp;')}`.value).toBe('&nbsp;')
  })

  it('multiline: escapuje i zamienia \\n na <br>', () => {
    expect(multiline('a<b\nc&d').value).toBe('a&lt;b<br>c&amp;d')
  })
})

describe('render - bezpieczeństwo', () => {
  const xss = valid(contact, {
    name: '<script>alert("xss")</script>',
    email: `a"><img/src=x/onerror=alert(1)>@x.pl`,
    message: `</td></tr></table><script>alert('x')</script> & "cudzysłów"`,
  })
  const email = renderEmail(contact, xss, CTX)

  it('dane z formularza nie wstrzykują tagów ani atrybutów', () => {
    expect(email.html).not.toContain('<script')
    expect(email.html).not.toContain('<img/src')
    expect(email.html.match(/<img /g)).toHaveLength(1) // tylko logo
    expect(email.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(email.html).toContain('&amp; &quot;cudzysłów&quot;')
  })

  it('mailto: koduje znaki specjalne adresu (?, &, ", <)', () => {
    const tricky = renderEmail(contact, valid(contact, { ...CONTACT_FIELDS, email: 'x@y.pl?cc=z@w.pl&subject=a' }), CTX)
    expect(tricky.html).toContain('href="mailto:x@y.pl%3Fcc%3Dz@w.pl%26subject%3Da"')
    expect(email.html).toContain('href="mailto:a%22%3E%3Cimg%2Fsrc%3Dx%2Fonerror%3Dalert(1)%3E@x.pl"')
  })

  it('wersja tekstowa zawiera dane dosłownie (bez encji)', () => {
    expect(email.text).toContain('Imię: <script>alert("xss")</script>')
  })
})

describe('render - treść', () => {
  const emails = [renderEmail(quote, fullQuote, CTX), renderEmail(contact, fullContact, CTX)]
  const minimal = [
    renderEmail(quote, valid(quote, { serviceType: 'brukarstwo', name: 'Jan', email: 'jan@example.com' }), CTX),
    renderEmail(contact, valid(contact, { name: 'Jan', email: 'jan@example.com', message: 'Hej' }), CTX),
  ]

  it('brak pauzy (—) w tematach, HTML i tekście', () => {
    for (const email of [...emails, ...minimal]) {
      expect(email.subject).not.toContain('—')
      expect(email.html).not.toContain('—')
      expect(email.html).not.toContain('&mdash;')
      expect(email.html).not.toContain('&#8212;')
      expect(email.text).not.toContain('—')
    }
  })

  it('brak wp-content w HTML; logo z kontekstu', () => {
    for (const email of emails) {
      expect(email.html).not.toContain('wp-content')
      expect(email.html).toContain(`src="${CTX.logoUrl}"`)
    }
  })

  it('tematy wg forms.ts: etykieta opcji, nie klucz', () => {
    expect(emails[0]!.subject).toBe('Nowe zapytanie o wycenę - Ogrodzenie / brama')
    expect(emails[1]!.subject).toBe(`Nowe zapytanie od ${CONTACT_FIELDS.name}`)
  })

  it('temat bez \\r i \\n, maks. 150 znaków', () => {
    const form: FormDef = { ...contact, subject: 'Temat {name} / {message}' }
    const data = valid(contact, { name: 'Jan\r\nKowalski', email: 'j@x.pl', message: `a\nb ${'ż'.repeat(1990)}` })
    const subject = renderSubject(form, data)
    expect(subject).not.toMatch(/[\r\n]/)
    expect(Array.from(subject).length).toBeLessThanOrEqual(150)
    expect(subject.startsWith('Temat Jan Kowalski / a b ż')).toBe(true)
  })

  it('stopka: tekst automatyczny, nazwa formularza i ID zgłoszenia (HTML i tekst)', () => {
    for (const email of emails) {
      for (const body of [email.html, email.text]) {
        expect(body).toContain('Ta wiadomość została wygenerowana automatycznie.')
        expect(body).toContain(`ID zgłoszenia: ${CTX.requestId}`)
      }
    }
    expect(emails[0]!.text).toContain('Formularz: Formularz wyceny · ID zgłoszenia:')
  })

  it('wersja tekstowa zawiera wszystkie wypełnione pola (etykieta + wartość)', () => {
    const text = emails[0]!.text
    for (const line of [
      `Imię: ${QUOTE_FIELDS.name}`,
      `E-mail: ${QUOTE_FIELDS.email}`,
      `Telefon: ${QUOTE_FIELDS.phone}`,
      'Typ usługi: Ogrodzenie / brama',
      'Rodzaj: Panelowe 2D/3D',
      `Wymiary: ${QUOTE_FIELDS.amount}`,
      `Lokalizacja: ${QUOTE_FIELDS.location}`,
      'Teren: Spadek / pochyłość, Korzenie drzew / pnie',
      'Termin: W ciągu miesiąca',
      'Budżet: 5 000 – 15 000 zł',
      'Zdjęcia: 2 zdjęcia w załączniku',
      QUOTE_FIELDS.description,
    ]) {
      expect(text).toContain(line)
    }
    expect(emails[1]!.text).toContain('Dzień dobry,\nproszę o kontakt.')
  })

  it('kolejność sekcji i pól zgodna z forms.ts (HTML i tekst)', () => {
    for (const [form, email] of [
      [quote, emails[0]!],
      [contact, emails[1]!],
    ] as const) {
      for (const body of [email.html, email.text]) {
        const titles = form.mail.sections.map((s) => body.indexOf(s.title))
        expect(titles.every((i) => i >= 0)).toBe(true)
        expect([...titles].sort((a, b) => a - b)).toEqual(titles)
      }
      const labels = form.mail.sections
        .flatMap((s) => s.fields)
        .filter((key) => form.fields[key]!.type !== 'textarea')
        .map((key) => email.text.indexOf(`${form.fields[key]!.label}:`))
      expect(labels.every((i) => i >= 0)).toBe(true)
      expect([...labels].sort((a, b) => a - b)).toEqual(labels)
    }
  })

  it('każde pole formularza jest w dokładnie jednej sekcji maila', () => {
    for (const form of Object.values(FORMS)) {
      const inSections = form.mail.sections.flatMap((s) => s.fields)
      expect([...inSections].sort()).toEqual(Object.keys(form.fields).sort())
    }
  })

  it('e-mail jako link mailto:', () => {
    expect(emails[0]!.html).toContain(`href="mailto:${QUOTE_FIELDS.email}"`)
  })

  it('opis jako blok z akcentem lewej krawędzi, \\n -> <br>', () => {
    expect(emails[0]!.html).toContain('border-left:6px solid #b5cc1c')
    expect(emails[0]!.html).toContain('Ogrodzenie panelowe od strony ulicy.<br>Brama przesuwna 4 m.')
  })
})

describe('render - wartości do wyświetlenia', () => {
  const minimalQuote = valid(quote, { serviceType: 'budownictwo', name: 'Jan', email: 'jan@example.com' })
  const field = (key: string) => quote.fields[key]!

  it('pusty parametr opcjonalny -> "-" (łącznik)', () => {
    for (const key of ['subtype', 'amount', 'location', 'timeline', 'budget', 'description', 'phone']) {
      expect(displayValue(field(key), key, minimalQuote)).toBe('-')
    }
  })

  it('pusty multiselect i brak zdjęć -> "Brak"', () => {
    expect(displayValue(field('terrain'), 'terrain', minimalQuote)).toBe('Brak')
    expect(displayValue(field('photos'), 'photos', minimalQuote)).toBe('Brak')
  })

  it('select -> etykieta, także zależny', () => {
    const data = valid(quote, { ...QUOTE_FIELDS, serviceType: 'budownictwo', subtype: 'garaz', budget: 'up_to_5k' })
    expect(displayValue(field('serviceType'), 'serviceType', data)).toBe('Budownictwo lekkie')
    expect(displayValue(field('subtype'), 'subtype', data)).toBe('Garaż')
    expect(displayValue(field('budget'), 'budget', data)).toBe('do 5 000 zł')
  })

  it('zdjęcia: 1 zdjęcie / 2 zdjęcia w załączniku', () => {
    expect(displayValue(field('photos'), 'photos', valid(quote, QUOTE_FIELDS, 1))).toBe('1 zdjęcie w załączniku')
    expect(displayValue(field('photos'), 'photos', valid(quote, QUOTE_FIELDS, 2))).toBe('2 zdjęcia w załączniku')
  })

  it('odmiana polska', () => {
    const words = ['zdjęcie', 'zdjęcia', 'zdjęć'] as const
    expect([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 112, 122].map((n) => pluralPl(n, words))).toEqual([
      'zdjęcie',
      'zdjęcia',
      'zdjęcia',
      'zdjęć',
      'zdjęć',
      'zdjęć',
      'zdjęć',
      'zdjęć',
      'zdjęcia',
      'zdjęć',
      'zdjęć',
      'zdjęcia',
    ])
  })
})
