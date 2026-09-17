/**
 * GENERATOR WARIANTÓW - z `source/` + `crops.json` + manifestu.
 *
 * KADR JEST JEDNOSTKĄ GENEROWANIA. Jeden komplet plików na kadr, niezależnie
 * od tego, w ilu miejscach kadr jest użyty. Dwa `uses` na ten sam kadr dzielą
 * pliki i wpis w cache przeglądarki - to jest cały powód tej przebudowy.
 *
 * Ścieżka wyjściowa jest funkcją kadru, nigdy przeznaczenia:
 *   /assets/img/salon-02-16x9-1280.avif
 * Powiększenie idzie z ŹRÓDŁA, nie z kadru - pełna klatka, jeden komplet na
 * źródło, drabina liczona z proporcji źródła:
 *   /assets/img/salon-00-lightbox-1280.avif
 *
 * Właściwości wymagane przez `PRODUKCJA-media-przygotowanie.md` (sekcja 10):
 *   powtarzalność   - to samo źródło + ten sam kadr + ta sama konfiguracja
 *                     = ten sam wynik
 *   idempotencja    - pomija to, co się nie zmieniło; do stanu wchodzi hash
 *                     parametrów Z PROSTOKĄTEM KADRU, więc przekadrowanie
 *                     wymusza regenerację, a sama obecność pliku nie wystarcza
 *   nietykalność    - `media/` nigdy nie jest zapisywane
 *   odtwarzalność   - `public/assets/` można skasować w całości
 *   ostrzeganie     - brak kadru, budżet wagi: raport, nie cicha korekta
 *
 * ZERO PAR PLIKÓW O IDENTYCZNEJ TREŚCI jest zagwarantowane konstrukcyjnie,
 * nie sprawdzane po fakcie: każdy wariant ma „przepis" (źródło + prostokąt +
 * szerokość + format + parametry kodera). Dwa identyczne przepisy dostają
 * jeden plik i dwa odnośniki do niego.
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { PRESETS, PROFILES, AVIF_RULES, BUDGETS, EXT } from './presets.mjs'
import { readCrops, sourceHash } from './crops-store.mjs'
import { maxInscribed, lightboxLadder } from './geometry.mjs'

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16)
const kb = (b) => `${(b / 1024).toFixed(1)} kB`

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch { return fallback }
}

/* ------------------------------------------------------------------ */
/* Planowanie                                                          */
/* ------------------------------------------------------------------ */

/**
 * Szerokości, które w ogóle mają prawo powstać.
 * Odfiltrowuje większe od kadru - interpolacja nie dodaje informacji,
 * dokłada tylko bajtów.
 */
function planWidths(requested, availableWidth, profile) {
  const fitting = requested.filter((w) => w <= availableWidth)
  const dropped = requested.filter((w) => w > availableWidth)
  let widths = fitting
  if (profile.maxVariants !== Infinity && fitting.length > profile.maxVariants) {
    // profil szybki: skrajne szerokości wystarczą do oceny układu
    widths = [fitting[0], fitting[fitting.length - 1]].filter((v, i, a) => a.indexOf(v) === i)
  }
  return { widths, dropped }
}

const outName = (base, width, format) => `${base}-${width}.${EXT[format]}`

function encoderFor(pipeline, format, profile) {
  if (format === 'avif') return pipeline.avif(profile.avif)
  if (format === 'webp') return pipeline.webp(profile.webp)
  return pipeline.jpeg(profile.jpeg)
}

/**
 * Prostokąt kadru: z `crops.json`, a bez wpisu - największy możliwy.
 *
 * Awaryjny prostokąt jest świadomy i głośny. Bez niego `npm run dev` nie
 * pokazałby ani jednego zdjęcia, dopóki nie zostanie wykadrowany komplet,
 * a to jest dokładnie ten moment, w którym kadry się dobiera.
 */
export function resolveRect({ crop, size, store }) {
  const saved = store.crops[crop.name]
  if (saved?.rect) return { rect: saved.rect, defined: true, stale: false }
  return { rect: { x: 0, y: 0, ...maxInscribed(size, crop.ratio) }, defined: false, stale: false }
}

/**
 * Pełny plan przebiegu: co powstanie, z czego i pod jaką nazwą.
 * Rozdzielony od kodowania, bo dev-server potrzebuje samego planu (manifest
 * bez plików), a `renderOnDemand` - pojedynczego przepisu.
 */
export async function planRun({ config, root, profileName = 'full' }) {
  const profile = PROFILES[profileName]
  if (!profile) throw new Error(`Nieznany profil: ${profileName}`)

  const srcDir = path.join(root, config.paths.source)
  const store = await readCrops(root, config.paths)

  const sources = {}   // klucz źródła → { file, buf?, size, hash, lightbox }
  const crops = []     // plan per kadr
  const missing = []

  for (const [key, def] of Object.entries(config.sources)) {
    const abs = path.join(srcDir, def.file)
    if (!existsSync(abs)) continue
    const buf = await readFile(abs)
    const meta = await sharp(buf).metadata()
    sources[key] = {
      key, def, abs,
      size: { w: meta.width, h: meta.height },
      hash: sourceHash(buf),
      bytes: buf.length,
      needsLightbox: false
    }
  }

  for (const crop of Object.values(config.crops)) {
    const src = sources[crop.source]
    if (!src) { missing.push(crop.name); continue }
    if (crop.lightbox) src.needsLightbox = true

    const { rect, defined } = resolveRect({ crop, size: src.size, store })
    const plan = planWidths(crop.widths, rect.w, profile)
    const preset = PRESETS[crop.preset] ?? {}
    const formats = (crop.formats ?? preset.formats ?? profile.formats)
      .filter((f) => profile.formats.includes(f))

    crops.push({
      crop, src, rect, defined,
      base: crop.name,
      widths: plan.widths,
      dropped: plan.dropped,
      formats,
      preset
    })
  }

  const lightboxes = Object.values(sources)
    .filter((s) => s.needsLightbox)
    .map((src) => {
      const widths = lightboxLadder(src.size, config.lightboxWidths ?? [])
      const plan = planWidths(widths, src.size.w, profile)
      return {
        src,
        base: `${src.key}-lightbox`,
        rect: { x: 0, y: 0, w: src.size.w, h: src.size.h },   // pełna klatka
        widths: plan.widths,
        dropped: plan.dropped,
        formats: PROFILES[profileName].formats,
        preset: PRESETS.lightbox ?? {}
      }
    })

  return { profile, profileName, sources, crops, lightboxes, missing, store }
}

/* ------------------------------------------------------------------ */
/* Główny przebieg                                                     */
/* ------------------------------------------------------------------ */

export async function buildImages({ config, root, profileName = 'full', force = false, only = null, verbose = false, log = console.log } = {}) {
  const plan = await planRun({ config, root, profileName })
  const { profile } = plan
  const outDir = path.join(root, config.paths.outImg)
  const cacheDir = path.join(root, config.paths.cache)

  await mkdir(outDir, { recursive: true })
  await mkdir(cacheDir, { recursive: true })
  const stateFile = path.join(cacheDir, 'state.json')
  const state = force ? {} : await readJson(stateFile, {})
  const nextState = {}

  const report = {
    created: 0, skipped: 0, dropped: 0, reused: 0,
    warnings: [], errors: [...plan.missing],
    bytesIn: 0, bytesOut: 0, undefinedCrops: []
  }

  // Stan zapisujemy w trakcie: przerwany przebieg (Ctrl+C, timeout CI) nie może
  // kasować pracy, którą już wykonał.
  let sinceFlush = 0
  const flush = async (curKey) => {
    await writeFile(stateFile, JSON.stringify({ ...state, ...nextState }, null, 2))
    sinceFlush = 0
    if (curKey) log(`  … ${curKey}`)
  }

  const manifest = {
    profile: profileName,
    generatedAt: new Date().toISOString(),
    crops: {}, lightbox: {}, missing: plan.missing
  }

  /**
   * Przepis → ścieżka. Klucz opisuje BAJTY, jakie powstaną. Dwa identyczne
   * przepisy dostają jeden plik i dwa odnośniki - stąd gwarancja braku par
   * plików o identycznej treści.
   */
  const byRecipe = new Map()

  // Jedno dekodowanie na źródło, nie jedno na kadr: źródło o trzech kadrach
  // dekodowałoby się trzy razy bez powodu.
  const decoded = new Map()
  const decode = async (src) => {
    if (decoded.has(src.key)) return decoded.get(src.key)
    const buf = await readFile(src.abs)
    report.bytesIn += buf.length
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
    const out = { data, raw: { width: info.width, height: info.height, channels: info.channels } }
    decoded.set(src.key, out)
    return out
  }

  const jobs = [
    ...plan.crops.map((c) => ({ ...c, kind: 'crop' })),
    ...plan.lightboxes.map((l) => ({ ...l, kind: 'lightbox' }))
  ]

  for (const job of jobs) {
    if (only && !job.base.includes(only)) continue
    report.dropped += job.dropped.length

    if (job.kind === 'crop' && !job.defined) {
      report.undefinedCrops.push(job.base)
      report.warnings.push(`KADR NIEZDEFINIOWANY ${job.base}: użyto największego możliwego prostokąta ${job.rect.w}×${job.rect.h} - uruchom "npm run images:crop"`)
    }
    for (const w of job.dropped) {
      report.warnings.push(`WARIANT POMINIĘTY ${job.base} ${w} px: kadr daje ${job.rect.w} px, interpolacja nie doda informacji`)
    }

    let formats = [...job.formats]

    // Decyzja „AVIF się nie opłaca" musi być trwała. Bez zapamiętania każdy
    // przebieg kodowałby AVIF tylko po to, żeby go zaraz skasować.
    const avifKey = `#avif:${job.base}`
    const avifParams = sha(Buffer.from(JSON.stringify(profile.avif ?? null)))
    const rectHash = sha(Buffer.from(JSON.stringify(job.rect)))
    const prevAvif = state[avifKey]
    if (!force && prevAvif?.srcHash === job.src.hash && prevAvif?.rectHash === rectHash && prevAvif?.avifParams === avifParams && prevAvif.rejected) {
      formats = formats.filter((f) => f !== 'avif')
      nextState[avifKey] = prevAvif
      report.warnings.push(`AVIF POMINIĘTY ${job.base}: ${prevAvif.why} (decyzja z cache)`)
    }

    const produced = Object.fromEntries(formats.map((f) => [f, []]))
    let work = null
    const ensureWork = async () => {
      if (work) return work
      const { data, raw } = await decode(job.src)
      const target = Math.min(Math.max(...job.widths, 1), job.rect.w)
      const { data: out, info } = await sharp(data, { raw })
        .extract({ left: job.rect.x, top: job.rect.y, width: job.rect.w, height: job.rect.h })
        .resize({ width: target, withoutEnlargement: true })
        .raw().toBuffer({ resolveWithObject: true })
      work = { data: out, raw: { width: info.width, height: info.height, channels: info.channels } }
      return work
    }

    for (const w of job.widths) {
      for (const format of formats) {
        const recipe = sha(Buffer.from(JSON.stringify({
          s: job.src.hash, r: job.rect, w, f: format, o: profile[format]
        })))

        // Ten sam przepis już policzony - jeden plik, drugi odnośnik.
        const twin = byRecipe.get(recipe)
        if (twin) { produced[format].push(twin); report.reused++; continue }

        const rel = outName(job.base, w, format)
        const abs = path.join(outDir, rel)
        const paramsHash = recipe
        const prev = state[rel]

        // Profil szybki akceptuje plik wygenerowany dowolnym profilem -
        // podgląd nie potrzebuje wyższej jakości, a wpis w stanie zostaje
        // nietknięty, żeby późniejsze wydanie nie kodowało od nowa.
        const relaxed = profileName === 'fast' && prev && prev.srcHash === job.src.hash && prev.rectHash === rectHash && existsSync(abs)
        const exact = prev && prev.paramsHash === paramsHash && existsSync(abs)

        if (!force && (exact || relaxed)) {
          report.skipped++
          report.bytesOut += prev.bytes
          nextState[rel] = prev
          const v = { w: prev.width, h: prev.height, bytes: prev.bytes, url: `/assets/img/${rel}` }
          produced[format].push(v)
          byRecipe.set(recipe, v)
          continue
        }

        const { data, raw } = await ensureWork()
        const pipe = sharp(data, { raw }).resize({ width: w, withoutEnlargement: true })
        const info = await encoderFor(pipe, format, profile).toFile(abs)
        report.created++
        report.bytesOut += info.size
        if (verbose) log(`  + ${rel} ${info.width}×${info.height} ${kb(info.size)}`)
        if (++sinceFlush >= 12) await flush()

        nextState[rel] = { srcHash: job.src.hash, rectHash, paramsHash, bytes: info.size, width: info.width, height: info.height }
        const v = { w: info.width, h: info.height, bytes: info.size, url: `/assets/img/${rel}` }
        produced[format].push(v)
        byRecipe.set(recipe, v)
      }
    }
    for (const f of formats) produced[f]?.sort((a, b) => a.w - b.w)

    /* --- czy AVIF w ogóle się opłacił (sekcja 1 dokumentu) ---------- */
    if (produced.avif?.length && produced.webp?.length) {
      const maxW = Math.max(...produced.avif.map((v) => v.w))
      const avifBytes = produced.avif.reduce((s, v) => s + v.bytes, 0)
      const webpBytes = produced.webp.reduce((s, v) => s + v.bytes, 0)
      const gain = ((webpBytes - avifBytes) / webpBytes) * 100

      const tooSmall = maxW <= AVIF_RULES.skipAtOrBelowWidth
      const allTiny = produced.avif.every((v) => v.bytes <= AVIF_RULES.skipIfAllUnderBytes)
      const notWorth = maxW <= AVIF_RULES.alwaysAboveWidth && gain < AVIF_RULES.minGainPct

      if (tooSmall || allTiny || notWorth) {
        const why = tooSmall ? `wariant ≤ ${AVIF_RULES.skipAtOrBelowWidth} px`
          : allTiny ? `wszystkie warianty ≤ ${AVIF_RULES.skipIfAllUnderBytes / 1024} kB`
          : `zysk ${gain.toFixed(1)}% < ${AVIF_RULES.minGainPct}%`
        report.warnings.push(`AVIF POMINIĘTY ${job.base}: ${why}`)
        nextState[avifKey] = { srcHash: job.src.hash, rectHash, avifParams, rejected: true, why }
        for (const v of produced.avif) {
          const rel = v.url.replace('/assets/img/', '')
          // Plik mógł być współdzielony przez dwa przepisy - kasujemy raz.
          if (nextState[rel]) { report.bytesOut -= v.bytes; delete nextState[rel] }
          await unlink(path.join(outDir, rel)).catch(() => {})
        }
        delete produced.avif
      }
    }

    /* --- budżet wagi ------------------------------------------------ */
    const limit = job.preset.budget ? BUDGETS[job.preset.budget] : null
    if (limit) {
      const lightest = Object.values(produced).flat().reduce((m, v) => (m && m.bytes <= v.bytes ? m : v), null)
      const smallestW = Math.min(...Object.values(produced).flat().map((v) => v.w))
      const atSmallest = Object.values(produced).flat().filter((v) => v.w === smallestW)
      const best = atSmallest.reduce((m, v) => (m && m.bytes <= v.bytes ? m : v), null)
      if (best && best.bytes > limit) {
        report.warnings.push(`BUDŻET ${job.base}: ${kb(best.bytes)} przy ${best.w} px, limit ${kb(limit)}`)
      }
      void lightest
    }

    const entry = {
      source: job.src.key,
      alt: job.src.def.alt ?? '',
      sourceSize: job.src.size,
      formats: produced
    }
    if (job.kind === 'crop') {
      entry.ratio = job.crop.ratio
      entry.rect = job.rect
      entry.defined = job.defined
      entry.lightbox = job.crop.lightbox ? job.src.key : null
      manifest.crops[job.base] = entry
    } else {
      manifest.lightbox[job.src.key] = entry
    }
    if (sinceFlush) await flush(job.base)
  }

  // Przebieg częściowy (--only, profil szybki) nie widzi wszystkich wariantów,
  // więc nie może kasować wpisów, których nie dotknął - inaczej każde przejście
  // dev → build kodowałoby od nowa to, co już jest na dysku.
  const partial = Boolean(only) || profileName === 'fast'
  await writeFile(stateFile, JSON.stringify(partial ? { ...state, ...nextState } : nextState, null, 2))
  await writeFile(path.join(cacheDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  return { report, manifest }
}

/* ------------------------------------------------------------------ */
/* Dev: manifest bez kodowania + dogenerowanie na żądanie              */
/* ------------------------------------------------------------------ */

/**
 * Manifest policzony bez tworzenia ani jednego pliku. Dev-server składa z niego
 * markup od razu po starcie, a warianty powstają dopiero przy pierwszym żądaniu.
 */
export async function planManifest({ config, root, profileName = 'fast' }) {
  const plan = await planRun({ config, root, profileName })
  const manifest = { profile: profileName, generatedAt: null, crops: {}, lightbox: {}, missing: plan.missing }

  const entryFor = (job, base) => {
    const formats = {}
    for (const f of job.formats) {
      formats[f] = job.widths.map((w) => {
        const h = Math.max(1, Math.round(w * job.rect.h / job.rect.w))
        return { w, h, bytes: 0, url: `/assets/img/${outName(base, w, f)}` }
      })
    }
    return formats
  }

  for (const job of plan.crops) {
    manifest.crops[job.base] = {
      source: job.src.key,
      alt: job.src.def.alt ?? '',
      sourceSize: job.src.size,
      ratio: job.crop.ratio,
      rect: job.rect,
      defined: job.defined,
      lightbox: job.crop.lightbox ? job.src.key : null,
      formats: entryFor(job, job.base)
    }
  }
  for (const job of plan.lightboxes) {
    manifest.lightbox[job.src.key] = {
      source: job.src.key,
      alt: job.src.def.alt ?? '',
      sourceSize: job.src.size,
      formats: entryFor(job, job.base)
    }
  }
  return manifest
}

/**
 * Jeden wariant na żądanie, po nazwie pliku. Używane przez dev-server:
 * po podmianie zdjęcia albo zmianie kadru wystarczy odświeżyć stronę.
 */
export async function renderOnDemand({ config, root, profileName = 'fast', relPath }) {
  const m = relPath.match(/^(.*)-(\d+)\.(avif|webp|jpg)$/)
  if (!m) return null
  const [, base, widthText, ext] = m
  const width = Number(widthText)
  const format = ext === 'jpg' ? 'jpeg' : ext
  const profile = PROFILES[profileName]

  const plan = await planRun({ config, root, profileName })
  const job = base.endsWith('-lightbox')
    ? plan.lightboxes.find((l) => l.base === base)
    : plan.crops.find((c) => c.base === base)
  if (!job) return null

  const buf = await readFile(job.src.abs)
  const pipe = sharp(buf)
    .extract({ left: job.rect.x, top: job.rect.y, width: job.rect.w, height: job.rect.h })
    .resize({ width, withoutEnlargement: true })
  return encoderFor(pipe, format, profile).toBuffer()
}

/* ------------------------------------------------------------------ */
/* Raport                                                              */
/* ------------------------------------------------------------------ */

export function formatReport({ report }, profileName) {
  const lines = ['']
  lines.push(`  kodowanie (${profileName}): utworzone ${report.created} · bez zmian ${report.skipped} · współdzielone ${report.reused} · pominięte warianty ${report.dropped}`)
  lines.push(`  źródła ${kb(report.bytesIn)} → warianty ${kb(report.bytesOut)}`)
  if (report.undefinedCrops.length) {
    lines.push(`  kadry bez wpisu w crops.json: ${report.undefinedCrops.length} - użyto największego możliwego prostokąta`)
  }
  for (const w of report.warnings) lines.push(`    · ${w}`)
  lines.push('')
  return lines.join('\n')
}
