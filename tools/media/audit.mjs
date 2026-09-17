/**
 * AUDYT MEDIÓW - analiza bez kodowania czegokolwiek.
 *
 * Raport per ŹRÓDŁO, z rozwinięciem na kadry. Grupowanie po źródle, nie po
 * typie problemu: naprawia się zdjęcie, nie kategorię, a jedno zdjęcie potrafi
 * mieć trzy kadry o trzech różnych statusach.
 *
 * Co wykrywa:
 *   · plik w `source/` nieobecny w konfiguracji            → nieużywany
 *   · wpis w konfiguracji bez pliku                        → brak
 *   · hash `source` inny niż zapisany przy kadrze          → ŹRÓDŁO PODMIENIONE
 *   · kadr bez wpisu w `crops.json`                        → do wykadrowania
 *   · werdykt wykonalności kadru                           → OK / CIASNY / ZŁE DOPASOWANIE
 *   · `use` nieobecne w żadnym HTML                        → martwy wpis
 *   · to samo źródło w kilku kadrach na jednej podstronie  → rekomendacja podmiany
 *
 * Używany w dwóch miejscach: `--check` (sam audyt) i na wejściu do budowania,
 * żeby diagnostyka wyglądała tak samo niezależnie od tego, co uruchomiłeś.
 */

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { PRESETS, PROFILES, BUDGETS } from './presets.mjs'
import { readCrops, sourceHash, validateRect } from './crops-store.mjs'
import { lightboxLadder, requiredSourceWidth, cropVerdict, VERDICT } from './geometry.mjs'
import { scanPages } from './pages.mjs'

const kb = (b) => `${(b / 1024).toFixed(1)} kB`
const OK = '✓'
const NO = '✗'

/** Status źródła, od najgorszego. Kolejność decyduje o kolejności w raporcie. */
export const STATUS = {
  BRAK:        { rank: 0, label: 'BRAK PLIKU',        mark: '✗' },
  WYMIANA:     { rank: 1, label: 'DO WYMIANY',        mark: '!' },
  PODMIENIONE: { rank: 2, label: 'ŹRÓDŁO PODMIENIONE', mark: '!' },
  KADR:        { rank: 3, label: 'DO KADROWANIA',     mark: '·' },
  UWAGI:       { rank: 4, label: 'DROBIAZGI',         mark: '·' },
  OK:          { rank: 5, label: 'OK',                mark: '✓' }
}


/**
 * Które kadry są niezbędne, a które tylko poprawiają wynik.
 * Wyliczane z konfiguracji, nie z ręcznej flagi: kadr wskazany przez `use.crop`
 * jest jedynym źródłem <img> i jego brak to dziura w układzie. Kadr występujący
 * wyłącznie w `art[]` albo w użyciu oznaczonym `optional` degraduje wygląd,
 * ale strona działa.
 */
function usageIndex(config) {
  const index = {}
  const add = (cropKey, useKey, required, note) => {
    ;(index[cropKey] ??= { uses: [], required: false })
    index[cropKey].uses.push({ useKey, note })
    if (required) index[cropKey].required = true
  }
  for (const [useKey, use] of Object.entries(config.uses)) {
    add(use.crop, useKey, !use.optional, use.note ?? null)
    for (const art of use.art ?? []) {
      add(art.crop, useKey, false, `kadr alternatywny dla ${art.media}`)
    }
  }
  return index
}

export { maxInscribed, cropVerdict, VERDICT } from './geometry.mjs'


/* ------------------------------------------------------------------ */
/* Przebieg                                                            */
/* ------------------------------------------------------------------ */

export async function auditImages({ config, root, profileName = 'full' } = {}) {
  const profile = PROFILES[profileName]
  const srcDir = path.join(root, config.paths.source)
  const usage = usageIndex(config)
  const thresholds = config.cropVerdicts
  const store = await readCrops(root, config.paths)
  const { pages, all: usedInHtml } = await scanPages({
    root, dir: config.paths.pages, uses: config.uses
  })

  let state = {}
  try {
    state = JSON.parse(await readFile(path.join(root, config.paths.cache, 'state.json'), 'utf8'))
  } catch { /* brak poprzedniego przebiegu - waga po prostu nieznana */ }

  const rows = []

  for (const [key, def] of Object.entries(config.sources)) {
    const crops = Object.values(config.crops).filter((c) => c.source === key)
    const file = path.posix.join(config.paths.source, def.file)
    const abs = path.join(srcDir, def.file)

    const row = {
      key, file, def, crops: [],
      planned: Boolean(def.planned),
      required: crops.some((c) => usage[c.name]?.required),
      notes: [],
      status: STATUS.OK
    }

    if (!existsSync(abs)) {
      row.exists = false
      row.status = STATUS.BRAK
      row.crops = crops.map((c) => ({
        crop: c,
        uses: usage[c.name]?.uses ?? [],
        required: usage[c.name]?.required ?? false,
        state: 'brak-zrodla'
      }))
      rows.push(row)
      continue
    }

    row.exists = true
    const buf = await readFile(abs)
    const hash = sourceHash(buf)
    const meta = await sharp(buf).metadata()
    const size = { w: meta.width, h: meta.height }
    row.size = size
    row.bytes = buf.length
    row.hash = hash

    if (meta.exif) row.notes.push('źródło niesie metadane EXIF - powinno wyjść z images:source bez nich')
    if (meta.space && meta.space !== 'srgb') row.notes.push(`przestrzeń barw ${meta.space}, oczekiwane sRGB`)

    for (const crop of crops) {
      const use = usage[crop.name] ?? { uses: [], required: false }
      const saved = store.crops[crop.name]
      const rejected = store.rejected?.[crop.name]
      const preset = PRESETS[crop.preset] ?? {}

      const entry = {
        crop,
        uses: use.uses,
        required: use.required,
        saved: saved ?? null,
        rejected: rejected ?? null,
        problems: []
      }

      // Kadr zapisany na innym pliku źródłowym niż aktualny.
      entry.stale = Boolean(saved && saved.sourceHash && saved.sourceHash !== hash)

      if (rejected) entry.state = 'odrzucony'
      else if (!saved) entry.state = 'do-kadrowania'
      else if (entry.stale) entry.state = 'do-weryfikacji'
      else entry.state = 'zdefiniowany'

      // Prostokąt z crops.json musi trzymać proporcję i mieścić się w źródle.
      if (saved?.rect && !entry.stale) {
        entry.problems.push(...validateRect(saved.rect, crop.ratio, size))
      }

      const v = cropVerdict({
        crop,
        size,
        rect: entry.stale ? null : saved?.rect,
        thresholds
      })
      Object.assign(entry, v)
      entry.onMaxRect = !saved?.rect || entry.stale

      // Warianty, jakie z tego kadru wyjdą.
      entry.variants = crop.widths.map((w) => ({ w, ok: w <= v.box.w }))
      // Drabina powiększenia liczona z proporcji źródła - sufit dotyczy
      // dłuższej krawędzi, więc pion ma inne szerokości niż poziom.
      entry.lightbox = crop.lightbox
        ? lightboxLadder(size, config.lightboxWidths ?? []).map((w) => ({ w, ok: true }))
        : null

      // W nowym modelu rozmiar źródła jest WYLICZANY z kadrów, więc
      // `preset.minMaster` nie ma tu zastosowania - źródło jest poprawne
      // z definicji. Realnym sygnałem jest tylko sytuacja, w której oryginał
      // w `_raw/` nie miał tylu pikseli, ile kadr wymaga.
      const wants = requiredSourceWidth({
        sourceSize: size,
        ratio: crop.ratio,
        width: Math.max(...crop.widths),
        headroom: config.sourceProfile?.cropHeadroom ?? 1
      })
      if (size.w < wants) {
        entry.problems.push(`źródło ma ${size.w} px, ten kadr chciałby ${wants} px - oryginał w _raw/ nie ma tylu pikseli`)
      }

      // Waga z ostatniego przebiegu generatora, jeśli był.
      const limit = preset.budget ? BUDGETS[preset.budget] : null
      const byWidth = new Map()
      for (const [rel, st] of Object.entries(state)) {
        if (rel.startsWith('#')) continue
        const m = rel.match(/^(.*)-(\d+)\.(avif|webp|jpg)$/)
        if (!m || m[1] !== crop.name) continue
        byWidth.set(Number(m[2]), Math.min(byWidth.get(Number(m[2])) ?? Infinity, st.bytes))
      }
      const smallest = [...byWidth.keys()].sort((a, b) => a - b)[0]
      entry.weight = smallest
        ? { w: smallest, bytes: byWidth.get(smallest), limit, ok: !limit || byWidth.get(smallest) <= limit }
        : null

      row.crops.push(entry)
    }

    // Status źródła = najgorszy status jego kadrów.
    const worst = row.crops.reduce((acc, c) => Math.min(acc, c.verdict.rank), 9)
    // Kadr odrzucony ręcznie to świadoma decyzja człowieka „to zdjęcie tu nie
    // pasuje" - musi ważyć tyle samo co werdykt ZŁE DOPASOWANIE, inaczej
    // wylądowałby w „bez zastrzeżeń".
    if (row.crops.some((c) => c.stale)) row.status = STATUS.PODMIENIONE
    else if (worst === VERDICT.ZLE.rank || row.crops.some((c) => c.state === 'odrzucony')) row.status = STATUS.WYMIANA
    else if (row.crops.some((c) => c.state === 'do-kadrowania')) row.status = STATUS.KADR
    else if (worst === VERDICT.CIASNY.rank || row.notes.length || row.crops.some((c) => c.problems.length || (c.weight && !c.weight.ok))) row.status = STATUS.UWAGI
    else row.status = STATUS.OK

    rows.push(row)
  }

  rows.sort((a, b) => a.status.rank - b.status.rank || a.key.localeCompare(b.key))

  /* --- wykrycia poza pojedynczym źródłem --------------------------- */

  // Pliki w source/, których żadne źródło nie zadeklarowało.
  const declared = new Set(Object.values(config.sources).map((s) => s.file))
  const onDisk = existsSync(srcDir)
    ? (await import('node:fs/promises')).readdir(srcDir).then((l) => l.filter((f) => !f.startsWith('.')))
    : Promise.resolve([])
  const unused = (await onDisk).filter((f) => !declared.has(f))

  // Użycia zadeklarowane, ale nieobecne w żadnym HTML.
  const dead = Object.keys(config.uses).filter((k) => !usedInHtml.has(k))

  // To samo źródło w kilku kadrach na jednej podstronie.
  const collisions = []
  for (const [page, keys] of pages) {
    const bySource = new Map()
    for (const k of keys) {
      const crop = config.crops[config.uses[k].crop]
      if (!crop) continue
      const list = bySource.get(crop.source) ?? []
      list.push({ use: k, crop: crop.name, ratio: crop.ratio.join(':') })
      bySource.set(crop.source, list)
    }
    for (const [source, list] of bySource) {
      if (list.length > 1) collisions.push({ page, source, list })
    }
  }

  return { rows, unused, dead, collisions, pages, profileName, store }
}

/* ------------------------------------------------------------------ */
/* Raport                                                              */
/* ------------------------------------------------------------------ */

const L = (name) => `      ${name.padEnd(9)} - `
const L2 = (name) => `          ${name.padEnd(9)} - `

const variantList = (list) => list.map((v) => `${v.w} ${v.ok ? OK : NO}`).join(', ')

const STATE_LABEL = {
  'do-kadrowania': 'DO WYKADROWANIA',
  'do-weryfikacji': 'DO WERYFIKACJI',
  'odrzucony': 'ODRZUCONY',
  'zdefiniowany': null,
  'brak-zrodla': 'BRAK ŹRÓDŁA'
}

function cropBlock(entry) {
  const out = []
  const c = entry.crop
  const stateLabel = STATE_LABEL[entry.state]
  const tag = [entry.verdict.label, stateLabel].filter(Boolean).join(' · ')
  const head = `        ${entry.verdict === VERDICT.OK && !stateLabel ? OK : entry.verdict === VERDICT.ZLE ? '!' : '·'} ${c.name}`
  out.push(`${head.padEnd(56)}${tag}`)

  const basis = entry.onMaxRect ? 'przy największym możliwym prostokącie' : 'wg zapisanego kadru'
  out.push(L2('KADR') + `${c.ratio.join(':')}${c.lightbox ? ' + powiększenie' : ''}, ${entry.state === 'zdefiniowany' ? 'prostokąt zapisany' : basis}`)
  out.push(L2('PO KADRZE') + `${entry.box.w}×${entry.box.h} - ${entry.areaPct.toFixed(0)}% powierzchni źródła, potrzeba ${entry.need} px, zapas ${entry.headroomPct.toFixed(0)}%`)

  const lb = entry.lightbox?.length ? ` | powiększenie: ${variantList(entry.lightbox)}` : ''
  out.push(L2('WARIANTY') + variantList(entry.variants) + lb)

  if (entry.weight) {
    const b = entry.weight
    out.push(L2('WAGA') + (b.limit
      ? `${kb(b.bytes)} przy ${b.w} px, budżet ${kb(b.limit)} ${b.ok ? OK : NO}`
      : `${kb(b.bytes)} przy ${b.w} px, bez budżetu`))
  }

  out.push(L2('UŻYCIE') + (entry.uses.length
    ? entry.uses.map((u) => u.note ? `${u.useKey} (${u.note})` : u.useKey).join(', ')
    : 'nigdzie - kadr bez użycia'))

  if (entry.why) out.push(L2('WERDYKT') + entry.why)
  if (entry.rejected) out.push(L2('ODRZUCONY') + (entry.rejected.why ?? 'oznaczony do wymiany w narzędziu kadrowania'))
  if (entry.stale) out.push(L2('UWAGA') + 'kadr zapisany na innej wersji pliku źródłowego - prostokąt pokazuje co innego, wykadruj ponownie')
  for (const p of entry.problems) out.push(L2('UWAGA') + p)
  return out.join('\n')
}

function sourceBlock(row) {
  const out = []
  const head = `  ${row.status.mark} ${row.key}`
  out.push(`${head.padEnd(56)}${row.status.label}`)

  if (!row.exists) {
    out.push(L('PLIK') + `${row.file} nie istnieje (oryginał: ${row.def.raw})`)
    out.push(L('KADRY') + `${row.crops.length}: ${row.crops.map((c) => c.crop.name).join(', ')}`)
    out.push(L('UŻYCIE') + row.crops.flatMap((c) => c.uses.map((u) => u.useKey)).join(', '))
    out.push(L('SKUTEK') + (row.required
      ? 'wymagane: bez niego w układzie zostaje puste miejsce, wydanie wstrzymane'
      : row.planned
        ? 'planowane: brak jest znany i świadomy, wydanie przechodzi'
        : 'opcjonalne: bez niego strona działa, ale traci ten element'))
    return out.join('\n')
  }

  out.push(L('PLIK') + `${row.file}  ${row.size.w}×${row.size.h}  ${kb(row.bytes)}`)
  const counts = row.crops.reduce((a, c) => { a[c.state] = (a[c.state] ?? 0) + 1; return a }, {})
  const summary = Object.entries(counts)
    .map(([s, n]) => `${n} ${STATE_LABEL[s] ? STATE_LABEL[s].toLowerCase() : 'zdefiniowanych'}`)
    .join(', ')
  out.push(L('KADRY') + `${row.crops.length} (${summary})`)
  for (const n of row.notes) out.push(L('UWAGA') + n)
  out.push('')
  for (const c of [...row.crops].sort((a, b) => a.verdict.rank - b.verdict.rank || a.crop.name.localeCompare(b.crop.name))) {
    out.push(cropBlock(c))
    out.push('')
  }
  return out.join('\n').replace(/\n+$/, '')
}

export function formatAudit(result, { mode = 'check' } = {}) {
  const { rows, unused, dead, collisions, profileName } = result
  const out = []
  const problems = rows.filter((r) => r.status !== STATUS.OK)
  const fine = rows.filter((r) => r.status === STATUS.OK)

  out.push('')
  out.push(mode === 'check'
    ? `▸ media: weryfikacja bez budowania (profil ${profileName})`
    : `▸ media: stan materiałów (profil ${profileName})`)
  out.push('')

  for (const row of problems) {
    out.push(sourceBlock(row))
    out.push('')
  }

  if (fine.length) {
    out.push(`  ${OK} bez zastrzeżeń (${fine.length}): ${fine.map((r) => r.key).join(', ')}`)
    out.push('')
  }

  const allCrops = rows.flatMap((r) => r.crops)
  const count = (s) => rows.filter((r) => r.status === s).length
  const cropCount = (state) => allCrops.filter((c) => c.state === state).length
  const verdictCount = (v) => allCrops.filter((c) => c.verdict === v).length
  const blocking = rows.filter((r) => r.status === STATUS.BRAK && r.required).length

  out.push('  PODSUMOWANIE')
  const useCount = new Set(allCrops.flatMap((c) => c.uses.map((u) => u.useKey))).size
  out.push(`    źródeł: ${rows.length} · kadrów: ${allCrops.length} · użyć: ${useCount} · podstron: ${result.pages.size}`)
  out.push('')
  out.push('    ŹRÓDŁA')
  out.push(`      ${OK} gotowe:              ${count(STATUS.OK)}`)
  out.push(`      · drobiazgi:            ${count(STATUS.UWAGI)}`)
  out.push(`      · do kadrowania:        ${count(STATUS.KADR)}`)
  out.push(`      ! źródło podmienione:   ${count(STATUS.PODMIENIONE)}`)
  out.push(`      ! do wymiany materiału: ${count(STATUS.WYMIANA)}`)
  out.push(`      ${NO} brak pliku:           ${count(STATUS.BRAK)}   (w tym blokujących wydanie: ${blocking})`)
  out.push('')
  out.push('    KADRY')
  out.push(`      ${OK} OK:                  ${verdictCount(VERDICT.OK)}`)
  out.push(`      · CIASNY:               ${verdictCount(VERDICT.CIASNY)}`)
  out.push(`      ! ZŁE DOPASOWANIE:      ${verdictCount(VERDICT.ZLE)}`)
  out.push(`      · bez wpisu w crops.json: ${cropCount('do-kadrowania')}`)
  out.push(`      · do weryfikacji:       ${cropCount('do-weryfikacji')}`)
  out.push(`      · odrzucone ręcznie:    ${cropCount('odrzucony')}`)
  out.push('')

  if (unused.length) {
    out.push('  NIEUŻYWANE PLIKI W source/')
    for (const f of unused) out.push(`    · ${f} - żadne źródło go nie deklaruje`)
    out.push('')
  }

  if (dead.length) {
    out.push('  MARTWE WPISY - zdefiniowane w konfiguracji, nieobecne w żadnym HTML')
    for (const k of dead) out.push(`    · ${k}`)
    out.push('')
  }

  if (collisions.length) {
    out.push('  REKOMENDACJA PODMIANY - to samo źródło w kilku kadrach na jednej podstronie')
    for (const c of collisions) {
      out.push(`    · ${c.page}`)
      out.push(`        ${c.source}: ${c.list.map((x) => `${x.use} (${x.ratio})`).join(' + ')}`)
    }
    out.push('    Akceptowane tymczasowo - strona wygląda na powtórzoną, choć kadry są różne.')
    out.push('')
  }

  const shopping = rows.filter((r) => r.status === STATUS.WYMIANA || r.status === STATUS.BRAK)
  if (shopping.length && mode === 'check') {
    out.push('  DO ZDOBYCIA - minimalne wymiary pliku źródłowego')
    for (const r of shopping) {
      for (const c of r.crops) {
        if (r.exists && c.verdict !== VERDICT.ZLE && c.state !== 'odrzucony') continue
        const need = Math.max(...c.crop.widths)
        out.push(`    ${c.crop.name.padEnd(38)} ${need}×${Math.round(need * c.crop.ratio[1] / c.crop.ratio[0])}  (${c.crop.ratio.join(':')})`)
      }
    }
    out.push('')
  }

  out.push(`  legenda: ${OK} da się utworzyć z tego kadru · ${NO} nie da się, za mało pikseli`)
  out.push('')
  return out.join('\n')
}

/** Blokuje wydanie tylko brak źródła dla kadru wymaganego w układzie. */
export function auditExitCode({ rows }) {
  return rows.some((r) => r.status === STATUS.BRAK && r.required) ? 1 : 0
}
