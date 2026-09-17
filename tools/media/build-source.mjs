#!/usr/bin/env node
/**
 * CLI normalizacji źródeł.
 *
 *   node tools/media/build-source.mjs             odtwórz source/ z _raw/
 *   node tools/media/build-source.mjs --force     ignoruj cache
 *   node tools/media/build-source.mjs --verbose --only=salon
 *   node tools/media/build-source.mjs --plan      sam plan rozmiarów, nic nie zapisuje
 *
 * `_raw/` jest wyłącznie czytane.
 */

import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { buildSources, formatSourceReport, planSourceSize, orientedSize } from './source.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=')[1] : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)

const config = await import(pathToFileURL(path.join(ROOT, 'media', 'images.config.mjs')).href)

if (flag('plan')) {
  // Sam plan: co by powstało i dlaczego. Nic nie zapisuje.
  const plans = []
  for (const [key, def] of Object.entries(config.sources)) {
    const raw = path.join(ROOT, config.paths.raw, def.raw)
    if (!existsSync(raw)) continue
    const crops = Object.values(config.crops).filter((c) => c.source === key)
    if (!crops.length) continue
    plans.push(planSourceSize({
      sourceKey: key,
      crops,
      raw: orientedSize(await sharp(raw).metadata()),
      sourceProfile: config.sourceProfile
    }))
  }
  console.log(formatSourceReport({
    created: 0, skipped: 0, missing: [], orphans: [], warnings: [],
    bytesIn: 0, bytesOut: 0, plans
  }))
  process.exit(0)
}

const t0 = Date.now()
const report = await buildSources({
  config,
  root: ROOT,
  force: flag('force'),
  only: arg('only', null),
  verbose: flag('verbose')
})
console.log(formatSourceReport(report))
console.log(`  czas: ${((Date.now() - t0) / 1000).toFixed(1)} s\n`)

// Brak oryginału dla źródła, które nie jest oznaczone jako planowane, to błąd.
const blocking = report.missing.filter((m) => !m.planned)
if (blocking.length) {
  console.error(`✗ Brak oryginału w _raw/: ${blocking.map((m) => m.file).join(', ')}\n`)
  process.exit(1)
}
