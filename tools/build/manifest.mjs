#!/usr/bin/env node
/**
 * MANIFEST HASZY PLIKÓW WYJŚCIOWYCH.
 *
 *   npm run manifest                       → manifest-lokalny.txt
 *   npm run manifest -- --out=manifest-klon.txt
 *   npm run manifest:compare -- a.txt b.txt
 *
 * ODPOWIADA NA JEDNO PYTANIE: czy build ze świeżego klonu repozytorium daje
 * te same pliki wyjściowe, co build u mnie. Klient dostaje repozytorium i ma
 * zbudować dokładnie tę stronę, którą ma wdrożoną - inaczej „działa u mnie"
 * przestaje cokolwiek znaczyć.
 *
 * ZAKRES: wyłącznie pliki katalogu wyjściowego, czyli to, co realnie trafia
 * na serwer. Bez wersji zależności, bez wersji środowiska, bez zawartości
 * repozytorium - te rzeczy sprawdza się inaczej i mieszanie ich tutaj
 * zamazałoby odpowiedź.
 *
 * CZEGO NIE ROBI: nie ocenia, czy różnica jest istotna. Zwraca listę
 * rozbieżnych plików. Analizę - czy to inna treść, czy tylko data budowania -
 * przeprowadza człowiek. Automat, który sam odsiewa „nieistotne" różnice,
 * prędzej czy później odsieje tę jedną istotną.
 *
 * SPOSÓB UŻYCIA PRZY WYDANIU:
 *   1. `npm ci && npm run build && npm run manifest -- --out=manifest-lokalny.txt`
 *   2. świeży klon w innym katalogu, to samo, `--out=manifest-klon.txt`
 *   3. `npm run manifest:compare -- manifest-lokalny.txt manifest-klon.txt`
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const arg = (nazwa, domyslna = null) => {
  const trafienie = process.argv.find((a) => a.startsWith(`--${nazwa}=`))
  return trafienie ? trafienie.slice(nazwa.length + 3) : domyslna
}

async function wszystkiePliki(katalog, baza = katalog) {
  const out = []
  for (const wpis of await readdir(katalog, { withFileTypes: true })) {
    const p = path.join(katalog, wpis.name)
    if (wpis.isDirectory()) out.push(...(await wszystkiePliki(p, baza)))
    else out.push(path.relative(baza, p).split(path.sep).join('/'))
  }
  return out
}

async function zbudujManifest(katalog) {
  const pliki = (await wszystkiePliki(katalog)).sort()
  const linie = []
  for (const wzgledna of pliki) {
    const dane = await readFile(path.join(katalog, wzgledna))
    linie.push(`${createHash('sha256').update(dane).digest('hex')}  ${wzgledna}`)
  }
  return linie.join('\n') + '\n'
}

function wczytajManifest(tekst) {
  const mapa = new Map()
  for (const linia of tekst.split('\n')) {
    const m = /^([0-9a-f]{64})\s\s(.+)$/.exec(linia.trim())
    if (m) mapa.set(m[2], m[1])
  }
  return mapa
}

async function compare(plikA, plikB) {
  for (const p of [plikA, plikB]) {
    if (!existsSync(p)) {
      console.error(`✗ brak pliku: ${p}`)
      process.exitCode = 1
      return
    }
  }

  const a = wczytajManifest(await readFile(plikA, 'utf8'))
  const b = wczytajManifest(await readFile(plikB, 'utf8'))

  const tylkoA = [...a.keys()].filter((k) => !b.has(k)).sort()
  const tylkoB = [...b.keys()].filter((k) => !a.has(k)).sort()
  const rozne = [...a.keys()].filter((k) => b.has(k) && a.get(k) !== b.get(k)).sort()

  console.log(`\nPorównanie manifestów`)
  console.log(`  A: ${plikA} (${a.size} plików)`)
  console.log(`  B: ${plikB} (${b.size} plików)\n`)

  if (!tylkoA.length && !tylkoB.length && !rozne.length) {
    console.log('  ✓ Buildy identyczne: te same pliki, te same hasze.\n')
    return
  }

  if (rozne.length) {
    console.log(`  RÓŻNA TREŚĆ (${rozne.length}):`)
    for (const p of rozne) console.log(`    · ${p}`)
    console.log('')
  }
  if (tylkoA.length) {
    console.log(`  TYLKO W A (${tylkoA.length}):`)
    for (const p of tylkoA) console.log(`    · ${p}`)
    console.log('')
  }
  if (tylkoB.length) {
    console.log(`  TYLKO W B (${tylkoB.length}):`)
    for (const p of tylkoB) console.log(`    · ${p}`)
    console.log('')
  }

  console.log('  Narzędzie nie ocenia, czy te różnice są istotne.')
  console.log('  Przejrzyj je plik po pliku: inna treść i inny kod to problem,')
  console.log('  data budowania i kolejność bez znaczenia - nie.\n')
}

const tryb = process.argv[2]

if (tryb === 'compare') {
  const [, , , a, b] = process.argv
  if (!a || !b) {
    console.error('\nUżycie: npm run manifest:compare -- <manifest-a.txt> <manifest-b.txt>\n')
    process.exitCode = 1
  } else {
    await compare(path.resolve(ROOT, a), path.resolve(ROOT, b))
  }
} else {
  const katalog = path.join(ROOT, arg('katalog', 'dist'))
  if (!existsSync(katalog)) {
    console.error(`\n✗ brak katalogu ${path.relative(ROOT, katalog)}. Uruchom \`npm run build\`.\n`)
    process.exitCode = 1
  } else {
    const manifest = await zbudujManifest(katalog)
    const docelowy = path.resolve(ROOT, arg('out', 'manifest-lokalny.txt'))
    await writeFile(docelowy, manifest, 'utf8')
    const ile = manifest.trim().split('\n').length
    console.log(`\n  manifest: ${path.relative(ROOT, docelowy)} · ${ile} plików\n`)
  }
}
