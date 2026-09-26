// Podgląd maili: renderuje oba formularze w kilku wariantach do dev/out/.
//   npm run preview:emails  ->  dev/out/*.html, dev/out/*.txt, dev/out/index.html
// Otwórz pliki w przeglądarce albo przez `npm run dev:page` -> http://localhost:4321/out/

import { mkdir, writeFile } from 'node:fs/promises'
import { renderEmail } from '../src/email/render.ts'
import { escapeHtml } from '../src/email/html.ts'
import { BRAND } from '../src/email/layout.ts'
import { FORMS } from '../src/forms.ts'
import type { ParsedFile, ParsedInput } from '../src/parse.ts'
import { validate } from '../src/validate.ts'

const OUT = new URL('./out/', import.meta.url)
const REQUEST_ID = '3f2b8c1e-7d4a-4e6b-9c2d-1a5f0e8b7c64'

const jpeg = (size: number): ParsedFile => {
  const bytes = new Uint8Array(16)
  bytes.set([0xff, 0xd8, 0xff, 0xe0])
  return { size, bytes }
}

const longWord = 'Bardzodługiesłowobezspacjiktóremożerozjechaćukładmaila'.repeat(4)
const longText = Array.from(
  { length: 60 },
  (_, i) => `Wiersz ${i + 1}: ogrodzenie panelowe, podmurówka, brama przesuwna 4 m, furtka z elektrozaczepem.`,
).join('\n')

interface Variant {
  name: string
  values: Record<string, string | string[]>
  files?: Record<string, ParsedFile[]>
}

const VARIANTS: Record<string, Variant[]> = {
  contact: [
    {
      name: 'pelny',
      values: {
        name: 'Anna Kowalska',
        email: 'anna.kowalska@example.com',
        phone: '+48 123 456 789',
        message: 'Dzień dobry,\nproszę o kontakt w sprawie ogrodzenia działki.\n\nPozdrawiam\nAnna',
      },
    },
    {
      name: 'minimalny',
      values: { name: 'Jan', email: 'jan@example.com', message: 'Proszę o telefon.' },
    },
    {
      name: 'xss',
      values: {
        name: '<script>alert("xss")</script> & "Kowalski"',
        email: `a"><img/src=x/onerror=alert(1)>@x.pl`,
        phone: '(83) 343-11-22',
        message: `<b>pogrubienie?</b> <img src=x onerror="alert('x')"> & 'apostrof' "cudzysłów"\n</td></tr></table>`,
      },
    },
    {
      name: 'dlugi',
      values: {
        name: 'Ż'.repeat(100),
        email: `${'a'.repeat(180)}@example.com`,
        phone: '+48 600 700 800 900',
        message: `${longWord}\n${longText}`.slice(0, 2000),
      },
    },
  ],
  quote: [
    {
      name: 'pelny',
      values: {
        serviceType: 'ogrodzenia',
        subtype: 'brama-przesuwna',
        amount: '40 mb, wys. 1,5 m',
        location: 'Biała Podlaska, ul. Testowa 1',
        terrain: ['slope', 'roots', 'neighbor'],
        timeline: 'month',
        budget: '5k_15k',
        description: 'Ogrodzenie panelowe od strony ulicy.\nBrama przesuwna 4 m i furtka.\n\nProszę o wycenę z montażem.',
        name: 'Jan Nowak',
        email: 'jan.nowak@example.com',
        phone: '600 700 800',
      },
      files: { photos: [jpeg(512_000), jpeg(480_000)] },
    },
    {
      name: 'minimalny',
      values: { serviceType: 'budownictwo', name: 'Jan', email: 'jan@example.com' },
    },
    {
      name: 'xss',
      values: {
        serviceType: 'brukarstwo',
        subtype: 'podjazd',
        amount: '<i>50 m2</i>',
        location: '"><script>alert(1)</script>',
        description: '</div><h1>Wstrzyknięty nagłówek</h1> & <!-- komentarz -->',
        name: `<img src=x onerror=alert(1)>`,
        email: 'x@y.pl?cc=inny@example.com&subject=zmieniony',
      },
      files: { photos: [jpeg(300_000)] },
    },
    {
      name: 'dlugi',
      values: {
        serviceType: 'ogrodzenia',
        subtype: 'inne-ogrodzenia',
        amount: 'x'.repeat(50),
        location: `${longWord}`.slice(0, 200),
        terrain: Object.keys((FORMS.quote!.fields.terrain as { options: object }).options),
        timeline: 'later',
        budget: 'over_30k',
        description: `${longWord}\n${longText}`.repeat(3).slice(0, 5000),
        name: 'Ł'.repeat(100),
        email: `${'b'.repeat(180)}@example.com`,
        phone: '+48 (83) 343-11-22',
      },
      files: { photos: [jpeg(4_000_000), jpeg(3_900_000)] },
    },
  ],
}

await mkdir(OUT, { recursive: true })
const links: string[] = []

for (const [slug, variants] of Object.entries(VARIANTS)) {
  const form = FORMS[slug]!
  for (const variant of variants) {
    const input: ParsedInput = { values: variant.values, files: variant.files ?? {}, honeypot: '' }
    const result = validate(form, input)
    if (!result.ok) throw new Error(`${slug}/${variant.name}: dane nie przechodzą walidacji: ${JSON.stringify(result.fields)}`)

    const email = renderEmail(form, result.data, { requestId: REQUEST_ID, logoUrl: BRAND.defaultLogoUrl })
    const base = `${slug}-${variant.name}`
    await writeFile(new URL(`${base}.html`, OUT), email.html)
    await writeFile(new URL(`${base}.txt`, OUT), `Temat: ${email.subject}\n\n${email.text}`)
    links.push(
      `<li><a href="${base}.html">${base}.html</a> · <a href="${base}.txt">.txt</a> - <code>${escapeHtml(email.subject)}</code></li>`,
    )
    console.log(`${base}: ${email.subject} (${email.html.length} B html, ${email.text.length} B text)`)
  }
}

await writeFile(
  new URL('index.html', OUT),
  `<!doctype html><meta charset="utf-8"><title>Podgląd maili</title><body style="font-family:system-ui;padding:20px"><h1>Podgląd maili</h1><ul>${links.join('')}</ul></body>`,
)
console.log(`\nGotowe: ${new URL('index.html', OUT).pathname}`)
