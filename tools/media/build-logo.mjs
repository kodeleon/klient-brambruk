/**
 * LOGOTYPY RASTROWE - `media/logo/*.png` → `public/assets/logo/*.{webp,png}`
 *
 * Powód istnienia tego pliku jest opisany przy `logos` w
 * `media/images.config.mjs` - w skrócie: potok fotografii normalizuje
 * wszystko do JPEG-a, a znak firmowy ma przezroczyste tło.
 *
 * Zasada jest ta sama, co przy krojach pisma: źródło leży w repozytorium,
 * wynik jest generowany i nigdy nie dokładany do `public/` ręcznie. Katalog
 * `public/assets/logo/` można skasować w całości i odtworzyć tą komendą.
 *
 * Cache: pliki mają w nazwie szerokość, a nie hasz, więc obowiązuje je
 * reguła `/assets/` z `tools/build/headers.mjs` (doba plus rewalidacja),
 * nie „rok i immutable". Podmiana logo pod tą samą nazwą jest bezpieczna.
 *
 * Pliki zaczynające się od podkreślenia są pomijane - to miejsce na podglądy
 * robocze, których nie chcemy w wydaniu.
 */

import { readFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'

/**
 * Jeden format: PNG z paletą.
 *
 * Zmierzone na tym logo: WebP bezstratny wychodzi o 40% WIĘKSZY od PNG-a
 * z paletą (45 kB wobec 32 kB przy 1136 px), bo to płaskie plamy koloru,
 * a nie fotografia - dokładnie przypadek, do którego PNG został zrobiony.
 * WebP stratny dokłada obwódkę na krawędziach napisu. Drugi format byłby
 * tu dwoma plikami do pobrania zamiast jednego, bez żadnego zysku.
 */
const PNG = { compressionLevel: 9, palette: true }

export async function buildLogo({ config, root, force = false } = {}) {
  const report = { created: 0, skipped: 0, bytesOut: 0, warnings: [] }

  const { logos, logoPaths } = config
  if (!logos || !logoPaths) {
    report.warnings.push('Brak `logos` w media/images.config.mjs - pomijam logotypy')
    return report
  }

  const srcDir = path.join(root, logoPaths.src)
  const outDir = path.join(root, logoPaths.out)
  if (!existsSync(srcDir)) {
    report.warnings.push(`Brak katalogu ${logoPaths.src}`)
    return report
  }
  await mkdir(outDir, { recursive: true })

  // Pliki w źródle, których nikt nie zadeklarował: cicho pominięte logo to
  // dokładnie ten rodzaj braku, który wychodzi dopiero na produkcji.
  const naDysku = (await readdir(srcDir)).filter((f) => f.endsWith('.png') && !f.startsWith('_'))
  const zadeklarowane = new Set(Object.values(logos).map((l) => l.file))
  for (const f of naDysku) {
    if (!zadeklarowane.has(f)) report.warnings.push(`${logoPaths.src}/${f}: plik bez wpisu w \`logos\` - nic z nim nie robię`)
  }

  for (const [nazwa, def] of Object.entries(logos)) {
    const plik = path.join(srcDir, def.file)
    if (!existsSync(plik)) {
      report.warnings.push(`${nazwa}: brak pliku ${logoPaths.src}/${def.file}`)
      continue
    }

    const buf = await readFile(plik)
    const meta = await sharp(buf).metadata()

    for (const w of def.widths) {
      if (w > meta.width) {
        report.warnings.push(`${nazwa}: wariant ${w} px przekracza źródło (${meta.width} px) - pomijam`)
        continue
      }
      const cel = path.join(outDir, `${nazwa}-${w}.png`)
      if (!force && existsSync(cel)) {
        report.skipped++
        continue
      }
      const info = await sharp(buf).resize({ width: w, withoutEnlargement: true }).png(PNG).toFile(cel)
      report.created++
      report.bytesOut += info.size
    }
  }
  return report
}

/**
 * Wymiary źródła. `<Logo>` bierze z nich `width` i `height`, żeby układ nie
 * skakał przy ładowaniu obrazu. Czytane z pliku źródłowego, nie z wyniku:
 * komponent nie może zależeć od tego, czy generator zdążył się wykonać.
 *
 * Pamięć podręczna jest na poziomie modułu - przy budowaniu serwisu każdy
 * plik czytamy raz, niezależnie od liczby wystąpień `<Logo>`.
 */
const pamiec = new Map()

export async function wymiaryLogo({ config, root, nazwa }) {
  if (pamiec.has(nazwa)) return pamiec.get(nazwa)

  const def = config.logos?.[nazwa]
  if (!def) throw new Error(`<Logo nazwa="${nazwa}">: nie ma takiego wpisu w \`logos\` w media/images.config.mjs`)

  const plik = path.join(root, config.logoPaths.src, def.file)
  if (!existsSync(plik)) throw new Error(`<Logo nazwa="${nazwa}">: brak pliku ${config.logoPaths.src}/${def.file}`)

  const meta = await sharp(await readFile(plik)).metadata()
  const wynik = { w: meta.width, h: meta.height, alt: def.alt, widths: def.widths.filter((w) => w <= meta.width) }
  pamiec.set(nazwa, wynik)
  return wynik
}

/* ------------------------------------------------------------------ */
/* Uruchomienie wprost: `npm run logo`                                 */
/*                                                                     */
/* Normalnie logotypy robi `npm run images` (a przez nie `predev`      */
/* i `prebuild`). Ta ścieżka jest do iteracji nad samym logo, żeby nie  */
/* czekać na przekodowanie wszystkich fotografii.                      */
/* ------------------------------------------------------------------ */

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
  const config = await import(pathToFileURL(path.join(ROOT, 'media', 'images.config.mjs')).href)
  const report = await buildLogo({ config, root: ROOT, force: process.argv.includes('--force') })
  console.log(`LOGO: ${report.created} plików nowych, ${report.skipped} bez zmian, ${(report.bytesOut / 1024).toFixed(1)} kB`)
  for (const w of report.warnings) console.log(`  · ${w}`)
}
