/**
 * NORMALIZACJA `_raw/` → `source/`.
 *
 * `source/` to jedyne zdjęcia, jakie trafiają do repozytorium, więc ich rozmiar
 * jest decyzją o wadze repozytorium na zawsze. Liczymy go per zdjęcie z kadrów,
 * które z niego wychodzą, a nie ze stałej reguły „wszystko 2560".
 *
 * Reguła (TODO sekcja 3):
 *
 *   docelowy prostokąt = max po wszystkich kadrach tego źródła z:
 *     · prostokąta potrzebnego, by wyciąć dany kadr przy jego największej szerokości
 *     · dla kadrów z lightboxem: sufit 2560 px na dłuższej krawędzi
 *   ograniczony rozmiarem pliku w `_raw/`
 *
 * Ile pikseli potrzeba na kadr. Źródło ma proporcję A = Ws/Hs, kadr proporcję
 * a = rw/rh. Największy prostokąt o proporcji `a` mieszczący się w źródle ma
 * szerokość min(Ws, Hs·a), więc żeby wyciąć kadr o szerokości W:
 *
 *   kadr szerszy od źródła (a ≥ A) → ogranicza szerokość → Ws ≥ W
 *   kadr węższy od źródła (a < A)  → ogranicza wysokość  → Ws ≥ W · A/a
 *
 *   Ws ≥ W · max(1, A/a)
 *
 * ZAPAS. Powyższe daje minimum, przy którym kadr jest w ogóle możliwy - ale
 * tylko wtedy, gdy człowiek zaznaczy dokładnie największy możliwy prostokąt.
 * Każde ciaśniejsze zaznaczenie schodzi poniżej wymaganej szerokości, więc
 * źródło zapisane co do piksela wg wzoru dałoby werdykt CIASNY dla każdego
 * kadru i zerową swobodę kadrowania w etapie 4. Stąd mnożnik `cropHeadroom`.
 * Nie dotyczy sufitu lightboxa - sufit jest już z definicji zapasem.
 *
 * Ten plik nie zna nazwy ani jednego zdjęcia z projektu. Wszystko przychodzi
 * w obiekcie konfiguracji.
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { requiredSourceWidth } from './geometry.mjs'

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16)
const kb = (b) => `${(b / 1024).toFixed(1)} kB`

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch { return fallback }
}

/**
 * Wymiary oryginału po zastosowaniu orientacji EXIF, w kształcie {w, h} -
 * jeden kształt wymiarów w całej bibliotece.
 * Bez tego pion zapisany jako poziom z flagą obrotu policzyłby się na opak.
 */
export function orientedSize(meta) {
  const swap = meta.orientation >= 5 && meta.orientation <= 8
  return {
    w: swap ? meta.height : meta.width,
    h: swap ? meta.width : meta.height
  }
}

/**
 * Docelowy prostokąt dla jednego źródła.
 * Zwraca też uzasadnienie - który kadr wymusił rozmiar. Bez tego nie da się
 * odpowiedzieć na pytanie „dlaczego to zdjęcie waży w repo tyle, ile waży".
 */
export function planSourceSize({ sourceKey, crops, raw, sourceProfile }) {
  const A = raw.w / raw.h
  const headroom = sourceProfile.cropHeadroom ?? 1
  const ceiling = sourceProfile.lightboxCeiling ?? Infinity

  const demands = []
  for (const crop of crops) {
    const maxWidth = Math.max(...crop.widths)

    demands.push({
      crop: crop.name,
      why: `kadr ${crop.ratio.join(':')} przy ${maxWidth} px`,
      width: requiredSourceWidth({ sourceSize: raw, ratio: crop.ratio, width: maxWidth, headroom })
    })

    if (crop.lightbox) {
      // Sufit dotyczy dłuższej krawędzi źródła, nie kadru.
      demands.push({
        crop: crop.name,
        why: `powiększenie, sufit ${ceiling} px na dłuższej krawędzi`,
        width: Math.ceil(A >= 1 ? ceiling : ceiling * A)
      })
    }
  }

  const wanted = demands.length ? Math.max(...demands.map((d) => d.width)) : 0
  const width = Math.min(wanted, raw.w)
  const height = Math.max(1, Math.round(width / A))

  return {
    sourceKey,
    width,
    height,
    wanted,
    cappedByRaw: wanted > raw.w,
    raw,
    /** Kadr, który wymusił ten rozmiar. */
    driver: demands.find((d) => d.width === wanted) ?? null,
    demands: demands.sort((x, y) => y.width - x.width)
  }
}

/** Kadry danego źródła. */
const cropsOf = (config, key) => Object.values(config.crops).filter((c) => c.source === key)

/* ------------------------------------------------------------------ */
/* Przebieg                                                            */
/* ------------------------------------------------------------------ */

export async function buildSources({ config, root, force = false, only = null, verbose = false, log = console.log } = {}) {
  const { paths, sources, sourceProfile } = config
  const rawDir = path.join(root, paths.raw)
  const outDir = path.join(root, paths.source)
  const cacheDir = path.join(root, paths.cache)

  await mkdir(outDir, { recursive: true })
  await mkdir(cacheDir, { recursive: true })

  const stateFile = path.join(cacheDir, 'source-state.json')
  const state = force ? {} : await readJson(stateFile, {})
  const nextState = {}

  const report = {
    created: 0, skipped: 0, missing: [], plans: [],
    bytesIn: 0, bytesOut: 0, warnings: []
  }

  const paramsBase = {
    q: sourceProfile.quality,
    chroma: sourceProfile.chromaSubsampling,
    cs: sourceProfile.colourspace,
    strip: sourceProfile.stripMetadata,
    orient: sourceProfile.applyOrientation
  }

  for (const [key, def] of Object.entries(sources)) {
    if (only && !key.includes(only)) continue

    const rawFile = path.join(rawDir, def.raw)
    if (!existsSync(rawFile)) {
      report.missing.push({ key, file: def.raw, planned: Boolean(def.planned) })
      continue
    }

    const crops = cropsOf(config, key)
    if (!crops.length) {
      report.warnings.push(`${key}: źródło bez ani jednego kadru - nic nie generuję`)
      continue
    }

    // `_raw/` jest tylko czytane. Nigdy, w żadnej gałęzi tego kodu, nie zapisujemy tam.
    const rawBuf = await readFile(rawFile)
    const rawHash = sha(rawBuf)
    report.bytesIn += rawBuf.length

    const meta = await sharp(rawBuf).metadata()
    const raw = orientedSize(meta)
    const plan = planSourceSize({ sourceKey: key, crops, raw, sourceProfile })
    report.plans.push(plan)

    const outRel = def.file
    const outAbs = path.join(outDir, outRel)
    const paramsHash = sha(Buffer.from(JSON.stringify({ ...paramsBase, w: plan.width, h: plan.height })))
    const prev = state[outRel]

    if (!force && prev && prev.rawHash === rawHash && prev.paramsHash === paramsHash && existsSync(outAbs)) {
      report.skipped++
      report.bytesOut += prev.bytes
      nextState[outRel] = prev
      continue
    }

    let pipe = sharp(rawBuf)
    if (sourceProfile.applyOrientation) pipe = pipe.rotate()
    pipe = pipe.resize({ width: plan.width, withoutEnlargement: true })
    if (sourceProfile.colourspace) pipe = pipe.withIccProfile(sourceProfile.colourspace)
    // sharp domyślnie nie przenosi metadanych - EXIF znika sam, nie trzeba go usuwać.
    const info = await pipe
      .jpeg({
        quality: sourceProfile.quality,
        chromaSubsampling: sourceProfile.chromaSubsampling,
        mozjpeg: true,
        progressive: true
      })
      .toFile(outAbs)

    report.created++
    report.bytesOut += info.size
    if (verbose) log(`  + ${outRel} ${info.width}×${info.height} ${kb(info.size)}`)
    nextState[outRel] = {
      rawHash, paramsHash, bytes: info.size,
      width: info.width, height: info.height
    }
  }

  // Przebieg częściowy nie widzi wszystkich źródeł, więc nie może kasować
  // wpisów, których nie dotknął.
  await writeFile(stateFile, JSON.stringify(only ? { ...state, ...nextState } : nextState, null, 2))

  // Pliki w `source/`, których żadne źródło nie zadeklarowało.
  const onDisk = existsSync(outDir)
    ? (await readdir(outDir)).filter((f) => !f.startsWith('.'))
    : []
  const declared = new Set(Object.values(sources).map((s) => s.file))
  report.orphans = onDisk.filter((f) => !declared.has(f))

  return report
}

export function formatSourceReport(report) {
  const lines = ['']
  lines.push(`  źródła: utworzone ${report.created} · bez zmian ${report.skipped}`)
  lines.push(`  _raw ${kb(report.bytesIn)} → source ${kb(report.bytesOut)}`)

  if (report.plans.length) {
    lines.push('')
    lines.push('  ŹRÓDŁO                 ORYGINAŁ      → SOURCE        CO WYMUSIŁO ROZMIAR')
    for (const p of [...report.plans].sort((a, b) => a.sourceKey.localeCompare(b.sourceKey))) {
      const from = `${p.raw.w}×${p.raw.h}`
      const to = `${p.width}×${p.height}`
      const why = p.cappedByRaw
        ? `ograniczone oryginałem (chciało ${p.wanted} px)`
        : p.driver?.why ?? ''
      lines.push(`  ${p.sourceKey.padEnd(22)} ${from.padEnd(13)} → ${to.padEnd(13)} ${why}`)
    }
  }

  for (const m of report.missing) {
    lines.push(`    · BRAK ${m.file}${m.planned ? ' (planowane, nie blokuje)' : ''}`)
  }
  for (const o of report.orphans ?? []) {
    lines.push(`    · NIEUŻYWANY plik w source/: ${o}`)
  }
  for (const w of report.warnings) lines.push(`    · ${w}`)
  lines.push('')
  return lines.join('\n')
}
