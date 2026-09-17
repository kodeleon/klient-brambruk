/**
 * SVG - sanityzacja, optymalizacja SVGO, favicony.
 *
 * Wejście  media/svg/**    (pliki tak, jak wyszły z Figmy albo od klienta)
 * Wyjście  public/assets/logo/**  + favicony PNG
 *
 * Sanityzacja wyprzedza optymalizację i jest logowana element po elemencie:
 * SVG dopuszcza <script>, atrybuty on*, odwołania zewnętrzne i osadzone rastry,
 * a każdy usunięty element bywa nośnikiem zamierzonego efektu.
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { optimize } from 'svgo'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const RULES = [
  { name: '<script>',            re: /<script[\s\S]*?<\/script>/gi },
  { name: 'atrybut on*',         re: /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi },
  { name: 'odwołanie zewnętrzne', re: /\s(?:xlink:href|href)\s*=\s*(?:"https?:[^"]*"|'https?:[^']*')/gi },
  { name: 'raster base64',       re: /<image[^>]*data:image\/(?:png|jpe?g|gif)[^>]*\/?>/gi },
  { name: '<foreignObject>',     re: /<foreignObject[\s\S]*?<\/foreignObject>/gi }
]

function sanitize(svg, file, log) {
  let out = svg
  for (const rule of RULES) {
    const hits = out.match(rule.re)
    if (hits?.length) {
      log(`    ! ${file}: usunięto ${hits.length}× ${rule.name}`)
      out = out.replace(rule.re, '')
    }
  }
  return out
}

const SVGO_CONFIG = {
  multipass: true,
  plugins: [
    // SVGO 4 nie usuwa już viewBox w preset-default, więc nic nie nadpisujemy.
    // Zostaje sam preset + usunięcie sztywnych width/height: rozmiar ustawia CSS.
    'preset-default',
    'removeDimensions'
  ]
}

async function walk(dir, base = dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...await walk(full, base))
    else if (e.name.endsWith('.svg')) out.push(path.relative(base, full).split(path.sep).join('/'))
  }
  return out
}

export async function buildSvg({ config, log = console.log } = {}) {
  const srcDir = path.join(ROOT, config.paths.srcSvg)
  const outRoot = path.join(ROOT, config.paths.outRoot)
  const report = { created: 0, bytesIn: 0, bytesOut: 0, warnings: [] }

  if (!existsSync(srcDir)) {
    report.warnings.push(`Brak katalogu ${config.paths.srcSvg}`)
    return report
  }

  for (const rel of await walk(srcDir)) {
    const raw = await readFile(path.join(srcDir, rel), 'utf8')
    report.bytesIn += Buffer.byteLength(raw)

    const clean = sanitize(raw, rel, log)
    const { data } = optimize(clean, { path: rel, ...SVGO_CONFIG })

    const dest = path.join(outRoot, rel)
    await mkdir(path.dirname(dest), { recursive: true })
    await writeFile(dest, data, 'utf8')
    report.bytesOut += Buffer.byteLength(data)
    report.created++
  }

  // Favicony z monogramu - rasteryzacja przez sharp (librsvg)
  const monogram = path.join(srcDir, 'logo', 'logo-monogram.svg')
  if (existsSync(monogram)) {
    const buf = await readFile(monogram)
    for (const size of [32, 180]) {
      const dest = path.join(outRoot, size === 180 ? 'apple-touch-icon.png' : `favicon-${size}.png`)
      await sharp(buf, { density: 384 }).resize(size, size, { fit: 'contain', background: { r: 18, g: 18, b: 18, alpha: 1 } }).png().toFile(dest)
      report.created++
    }
  } else {
    report.warnings.push('Brak logo-monogram.svg - favicony nie powstały')
  }

  return report
}
