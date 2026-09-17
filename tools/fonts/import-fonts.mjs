#!/usr/bin/env node
/**
 * IMPORT KROJÓW PISMA.
 *
 *   npm run fonts
 *
 * Trzy rzeczy naraz, bo rozdzielone rozjechałyby się przy pierwszej podmianie:
 *
 *   1. kopiuje woff2 z paczek fontsource do `public/fonts/`, z numerem wersji
 *      w nazwie (reguła cache `immutable` wymaga nowej nazwy przy podmianie),
 *   2. przepisuje licencję OFL obok pliku - checklista wymaga udokumentowanego
 *      źródła i licencji dla zasobów, które wybraliśmy my,
 *   3. liczy METRYKI KROJU ZASTĘPCZEGO i pisze `src/styles/fonts.css`.
 *
 * Po co punkt 3: `font-display: swap` maluje tekst krojem systemowym, potem
 * podmienia go na nasz. Kroje mają inną wysokość x i inną średnią szerokość
 * znaku, więc w chwili podmiany akapity zmieniają wysokość i strona podskakuje.
 * Lighthouse liczy to jako CLS, a CLS to ćwierć wyniku. `size-adjust`
 * i `*-override` dobrane z realnych metryk sprawiają, że krój systemowy
 * zajmuje dokładnie tyle samo miejsca i podmiana przestaje ruszać układem.
 *
 * Metryki liczymy RAZ, przy imporcie, i zapisujemy do repozytorium. Wersja
 * z wtyczką liczącą je przy każdym buildzie działa tak samo, ale dokłada
 * zależność do procesu budowania i jedno miejsce, w którym build może paść
 * u klienta. Tutaj wynik jest plikiem, który da się przeczytać i zacommitować.
 */

import { mkdir, writeFile, readFile, copyFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readMetrics, generateFontFace, getMetricsForFamily } from 'fontaine'
import { kroje, katalogWyjsciowy, arkusz } from './fonts.config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = path.join(ROOT, katalogWyjsciowy)

/** Nazwa rodziny zastępczej. Musi trafić do stosu `--font-*` w tokens.css. */
const nazwaZapasowa = (rodzina) => `${rodzina} zapas`

/** `Shantell Sans` → `shantell-sans` */
const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

async function main() {
  await mkdir(OUT, { recursive: true })

  // Czyścimy tylko woff2 i licencje - katalog może zawierać pliki wrzucone ręcznie
  for (const f of existsSync(OUT) ? await readdir(OUT) : []) {
    if (f.endsWith('.woff2') || f.startsWith('LICENCJA-')) await rm(path.join(OUT, f))
  }

  const blokiFontFace = []
  const blokiZapasowe = []
  const raport = []

  for (const krój of kroje) {
    const pakietDir = krój.pakiet ? path.join(ROOT, 'node_modules', krój.pakiet) : null
    const zakresy = pakietDir
      ? JSON.parse(await readFile(path.join(pakietDir, 'unicode.json'), 'utf8'))
      : {}

    let pierwszyPlik = null

    for (const podzbior of krój.podzbiory) {
      const zrodlo = pakietDir
        ? path.join(pakietDir, 'files', krój.plik.replace('{subset}', podzbior))
        : path.join(OUT, krój.plik.replace('{subset}', podzbior))

      if (!existsSync(zrodlo)) {
        console.error(`  ✗ brak pliku źródłowego: ${path.relative(ROOT, zrodlo)}`)
        process.exitCode = 1
        continue
      }

      const nazwa = `${slug(krój.rodzina)}-${podzbior}-${krój.wersja}.woff2`
      const cel = path.join(OUT, nazwa)
      await copyFile(zrodlo, cel)
      pierwszyPlik ??= cel

      const zakres = zakresy[podzbior]
      blokiFontFace.push(
        [
          '@font-face {',
          `  font-family: '${krój.rodzina}';`,
          `  font-style: ${krój.styl};`,
          `  font-weight: ${krój.waga};`,
          '  font-display: swap;',
          `  src: url('/fonts/${nazwa}') format('woff2');`,
          zakres ? `  unicode-range: ${zakres};` : null,
          '}',
        ]
          .filter(Boolean)
          .join('\n')
      )

      raport.push(`  ${krój.rodzina} · ${podzbior} → /fonts/${nazwa}`)
    }

    // --- metryki kroju zastępczego -----------------------------------
    if (pierwszyPlik) {
      const metryki = await readMetrics(`file://${pierwszyPlik.split(path.sep).join('/')}`)
      // Metryki kroju SYSTEMOWEGO, nie naszego - to one są punktem odniesienia,
      // względem którego liczy się `size-adjust`. Podanie tu naszych metryk
      // daje `size-adjust: 100%`, czyli deklarację bez żadnego skutku.
      const metrykiZastepcze = await getMetricsForFamily(krój.zastepczy[0])

      if (metryki && metrykiZastepcze) {
        const face = generateFontFace(metryki, {
          name: nazwaZapasowa(krój.rodzina),
          font: krój.zastepczy[0],
          metrics: metrykiZastepcze,
        })
        blokiZapasowe.push(face.trim())
      } else if (!metrykiZastepcze) {
        console.warn(
          `  ! krój zastępczy „${krój.zastepczy[0]}" nie ma metryk w bazie fontaine - ` +
            `${krój.rodzina} zostaje bez rodziny zapasowej. Wybierz krój systemowy z bazy (np. Arial, Georgia, Times New Roman).`
        )
      } else {
        console.warn(`  ! nie udało się odczytać metryk dla ${krój.rodzina}`)
      }
    }

    // --- licencja ----------------------------------------------------
    if (pakietDir && existsSync(path.join(pakietDir, 'LICENSE'))) {
      const meta = JSON.parse(await readFile(path.join(pakietDir, 'metadata.json'), 'utf8'))
      const tresc = await readFile(path.join(pakietDir, 'LICENSE'), 'utf8')
      await writeFile(
        path.join(OUT, `LICENCJA-${slug(krój.rodzina)}.txt`),
        `Krój: ${meta.family}\n` +
          `Licencja: ${meta.license?.type ?? 'OFL-1.1'}\n` +
          `Źródło: ${meta.source ?? 'https://github.com/google/fonts'}\n` +
          `${meta.license?.attribution ?? ''}\n\n` +
          '-----\n\n' +
          tresc,
        'utf8'
      )
    }
  }

  const naglowek = [
    '/**',
    ' * PLIK GENEROWANY - nie edytować ręcznie.',
    ' * Źródło: tools/fonts/fonts.config.mjs · odtworzenie: npm run fonts',
    ' *',
    ' * Rodziny „<nazwa> zapas" to kroje systemowe z podmienionymi metrykami.',
    ' * Stoją w stosie `--font-*` w tokens.css POMIĘDZY krojem docelowym',
    ' * a zwykłym fallbackiem. Bez nich podmiana kroju rusza układem (CLS).',
    ' */',
    '',
  ].join('\n')

  await writeFile(
    path.join(ROOT, arkusz),
    `${naglowek}\n${blokiFontFace.join('\n\n')}\n\n/* --- kroje zastępcze z dopasowanymi metrykami --- */\n\n${blokiZapasowe.join('\n\n')}\n`,
    'utf8'
  )

  console.log('\nKroje pisma:')
  console.log(raport.join('\n'))
  console.log(`\n  arkusz: ${arkusz}`)
  console.log(`  rodziny zastępcze: ${kroje.map((k) => `'${nazwaZapasowa(k.rodzina)}'`).join(', ')}`)
  console.log('  ↑ te nazwy muszą stać w stosach --font-* w src/styles/tokens.css\n')
}

await main()
