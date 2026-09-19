#!/usr/bin/env node
/**
 * CLI pipeline'u mediów.
 *
 *   node tools/media/build-images.mjs --check     sam audyt, nic nie tworzy
 *   node tools/media/build-images.mjs             audyt + pełne kodowanie
 *   node tools/media/build-images.mjs --profile=fast
 *   node tools/media/build-images.mjs --force --verbose --only=salon
 *
 * Kod wyjścia 1, gdy brakuje źródła kadru, który jest jedynym źródłem <img>
 * w układzie. Brak kadru opcjonalnego (kadr alternatywny, og:image) to
 * ostrzeżenie - strona bez niego działa.
 */

import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildImages, formatReport } from './pipeline.mjs'
import { auditImages, formatAudit, auditExitCode } from './audit.mjs'
// `svg.mjs` ciągnie SVGO, a SVGO to setki plików do wczytania. `--check` nic
// z nim nie robi, więc import jest leniwy - audyt nie ma powodu za to płacić.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=')[1] : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)

const profileName = arg('profile', 'full')
const check = flag('check')
const config = await import(pathToFileURL(path.join(ROOT, 'media', 'images.config.mjs')).href)

const result = await auditImages({ config, root: ROOT, profileName })
console.log(formatAudit(result, { mode: check ? 'check' : 'build' }))

if (check) process.exit(auditExitCode(result))

const t0 = Date.now()
const { buildSvg } = await import('./svg.mjs')
const svg = await buildSvg({ config, log: console.log })
console.log(`  SVG: ${svg.created} plików, ${(svg.bytesIn / 1024).toFixed(1)} kB → ${(svg.bytesOut / 1024).toFixed(1)} kB`)
for (const w of svg.warnings) console.log(`    · ${w}`)

// Logotypy rastrowe. Osobna ścieżka od fotografii - uzasadnienie przy
// `logos` w media/images.config.mjs. Stoi tu, a nie w osobnej komendzie,
// żeby `predev` i `prebuild` obsługiwały je bez dokładania kroku.
const { buildLogo } = await import('./build-logo.mjs')
const logo = await buildLogo({ config, root: ROOT, force: flag('force') })
console.log(`  LOGO: ${logo.created} plików nowych, ${logo.skipped} bez zmian, ${(logo.bytesOut / 1024).toFixed(1)} kB`)
for (const w of logo.warnings) console.log(`    · ${w}`)

const built = await buildImages({
  config,
  root: ROOT,
  profileName,
  force: flag('force'),
  only: arg('only', null),
  verbose: flag('verbose')
})
console.log(formatReport(built, profileName))
console.log(`  czas: ${((Date.now() - t0) / 1000).toFixed(1)} s\n`)

if (auditExitCode(result) && !flag('allow-missing')) {
  console.error('✗ Wydanie wstrzymane: brakuje źródła wymaganego w układzie (patrz wyżej).')
  console.error('  Świadomie pomijasz brak na czas pracy? --allow-missing + MEDIA_ALLOW_MISSING=1\n')
  process.exit(1)
}
