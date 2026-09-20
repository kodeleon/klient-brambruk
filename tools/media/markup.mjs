/**
 * MARKUP - budowa <picture> z manifestu.
 *
 * Łańcuch jest trzystopniowy i w tej kolejności:
 *   dyrektywa w HTML  →  `uses`  →  kadr  →  warianty
 *
 * Dyrektywa nie zna pliku ani kadru. `uses` opisuje UKŁAD (`sizes`, priorytet,
 * klasy, podpis) i wskazuje kadr. Kadr opisuje PLIKI. Dzięki temu dwa miejsca
 * o różnej szerokości elementu mogą dzielić jeden kadr, a każde ma swoje
 * `sizes` - wartość zapisana przy pliku byłaby w jednym z nich zawsze błędna.
 *
 * Powiększenie nie idzie z kadru, tylko ze ŹRÓDŁA: kafel 1:1 otwiera pełną
 * klatkę, a nie powiększony wycinek. Zestaw `lightbox` w manifeście jest
 * kluczowany źródłem, więc dwa kafle z tego samego zdjęcia dzielą jeden
 * komplet plików powiększenia.
 *
 * Nieznany klucz kończy budowanie błędem - cicho pominięte zdjęcie jest
 * gorsze niż zatrzymany build.
 */

import { FORMAT_ORDER, MIME } from './presets.mjs'

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const srcset = (list) => list.map((v) => `${v.url} ${v.w}w`).join(', ')

/** Placeholder w dev - widoczny, opisany, nigdy nie udaje zdjęcia. */
function placeholder(key, reason) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><rect width="40" height="30" fill="%231d1b19"/><path d="M0 0l40 30M40 0L0 30" stroke="%23443f3a" stroke-width=".5"/></svg>`
  return `<img src="data:image/svg+xml;charset=utf-8,${svg}" alt="" width="800" height="600" data-placeholder="${esc(key)}" title="${esc(reason)}">`
}

function resolveCrop(manifest, cropKey) {
  const entry = manifest.crops?.[cropKey]
  if (!entry) return null
  if (!Object.values(entry.formats ?? {}).some((l) => l?.length)) return null
  return entry
}

function sourcesFor(entry, sizes, media) {
  const out = []
  for (const format of FORMAT_ORDER) {
    const list = entry.formats?.[format]
    if (!list?.length) continue
    if (format === 'jpeg' && !media) continue // JPEG jedzie na <img>, nie na <source>
    const attrs = [
      media ? `media="${esc(media)}"` : null,
      `type="${MIME[format]}"`,
      `srcset="${srcset(list)}"`,
      sizes ? `sizes="${esc(sizes)}"` : null
    ].filter(Boolean)
    out.push(`<source ${attrs.join(' ')}>`)
  }
  return out
}

/**
 * Atrybuty powiększenia. Zestaw bierzemy z `manifest.lightbox`, kluczowanego
 * ŹRÓDŁEM kadru - pełna klatka, nie wycinek.
 */
function lightboxAttrs(manifest, entry) {
  const lb = entry.lightbox ? manifest.lightbox?.[entry.lightbox]?.formats : null
  if (!lb) return ''
  const map = { avif: 'data-lb-avif', webp: 'data-lb-webp', jpeg: 'data-lb-jpg' }
  return Object.entries(map)
    .filter(([f]) => lb[f]?.length)
    .map(([f, attr]) => ` ${attr}="${esc(srcset(lb[f]))}"`)
    .join('')
}

/**
 * @param {string} useKey     klucz z `uses`
 * @param {object} ctx        { config, manifest, strict }
 * @param {object} overrides  atrybuty podane przy dyrektywie w HTML
 */
export function renderUse(useKey, { config, manifest, strict = true }, overrides = {}) {
  const use = config.uses[useKey]
  if (!use) throw new Error(`images: nieznane użycie "${useKey}" - brak wpisu w media/images.config.mjs`)

  const crop = config.crops[use.crop]
  if (!crop) throw new Error(`images: użycie "${useKey}" wskazuje na nieznany kadr "${use.crop}"`)

  const entry = resolveCrop(manifest, use.crop)
  // `alt` domyślny mieszka przy źródle, użycie może go nadpisać.
  const alt = overrides.alt ?? use.alt ?? entry?.alt ?? config.sources[crop.source]?.alt ?? ''

  if (!entry) {
    const reason = `brak wygenerowanych wariantów kadru "${use.crop}" - uruchom: npm run images`
    if (strict) throw new Error(`images: ${reason}`)
    return placeholder(use.crop, reason)
  }

  const parts = []

  // 1. Kadry alternatywne (art direction) - pełna triada pod każdym `media`,
  //    inaczej stara przeglądarka dostanie kadr poziomy na telefonie.
  for (const art of use.art ?? []) {
    const artEntry = resolveCrop(manifest, art.crop)
    if (!artEntry) {
      if (strict) throw new Error(`images: brak wariantów kadru "${art.crop}" (użycie "${useKey}")`)
      continue
    }
    parts.push(...sourcesFor(artEntry, art.sizes ?? use.sizes, art.media))
  }

  // 2. Kadr podstawowy
  parts.push(...sourcesFor(entry, use.sizes))

  // 3. <img> - nośnik atrybutów: wymiary, ładowanie, alt
  const jpeg = entry.formats?.jpeg ?? []
  const fallback = jpeg.find((v) => v.w >= 800) ?? jpeg[jpeg.length - 1]
  const largest = jpeg[jpeg.length - 1] ?? Object.values(entry.formats).find((l) => l?.length)?.slice(-1)[0]

  /* Klasy z miejsca użycia jadą na <img>, nie na opakowanie: `<picture>`
     ma `display: contents` (base.css), więc to OBRAZ jest elementem układu.
     Bez tego `w-full h-full object-cover` i `rounded-2xl` podane przy
     `<Foto>` ginęły po cichu - stąd tła sekcji głównych, które nie
     wypełniały sekcji, jasne pasy w kafelkach galerii i zdjęcia bez
     zaokrąglonych rogów. */
  const klasy = use.as === 'figure' ? null : [use.class, overrides.class].filter(Boolean).join(' ')

  const imgAttrs = [
    `src="${fallback?.url ?? largest.url}"`,
    jpeg.length > 1 ? `srcset="${srcset(jpeg)}"` : null,
    jpeg.length > 1 && use.sizes ? `sizes="${esc(use.sizes)}"` : null,
    `width="${largest.w}"`,
    `height="${largest.h}"`,
    use.priority ? 'fetchpriority="high"' : 'loading="lazy"',
    'decoding="async"',
    klasy ? `class="${esc(klasy)}"` : null,
    `alt="${esc(alt)}"`
  ].filter(Boolean)

  const picture = `<picture>${parts.join('')}<img ${imgAttrs.join(' ')}></picture>`

  if (use.as !== 'figure') return picture

  const cls = [use.class, overrides.class].filter(Boolean).join(' ')
  const style = overrides.style ?? use.style
  const figAttrs = [
    cls ? `class="${esc(cls)}"` : null,
    style ? `style="${esc(style)}"` : null,
    use.lightbox ? lightboxAttrs(manifest, entry).trim() : null
  ].filter(Boolean)

  const caption = use.caption ? `<figcaption>${esc(use.caption)}</figcaption>` : ''
  return `<figure ${figAttrs.join(' ')}>${picture}${caption}</figure>`
}

/** <link rel=preload> dla zdjęcia LCP. Jeden na kadr. */
export function renderPreload(useKey, { config, manifest, strict = true }) {
  const use = config.uses[useKey]
  if (!use) throw new Error(`images: nieznane użycie "${useKey}" w preload`)

  const links = []
  const emit = (cropKey, sizes, media) => {
    const entry = resolveCrop(manifest, cropKey)
    if (!entry) {
      if (strict) throw new Error(`images: preload bez wariantów kadru "${cropKey}"`)
      return
    }
    const format = FORMAT_ORDER.find((f) => entry.formats?.[f]?.length)
    const attrs = [
      'rel="preload"', 'as="image"', `type="${MIME[format]}"`,
      `imagesrcset="${esc(srcset(entry.formats[format]))}"`,
      `imagesizes="${esc(sizes)}"`,
      // Bez tego przeglądarka traktuje preload zdjęcia jak zasób zwykłego
      // priorytetu i potrafi puścić przed nim arkusz albo skrypt. Atrybut
      // musi stać i tu, i na samym <img> - to dwa różne żądania w oczach
      // audytu „LCP request discovery".
      'fetchpriority="high"',
      media ? `media="${esc(media)}"` : null
    ].filter(Boolean)
    links.push(`<link ${attrs.join(' ')}>`)
  }

  for (const art of use.art ?? []) emit(art.crop, art.sizes ?? use.sizes, art.media)
  emit(use.crop, use.sizes, use.art?.length ? '(min-width:901px)' : null)
  return links.join('\n')
}

/** og:image - wymaga adresu bezwzględnego. */
export function renderOg(useKey, { config, manifest, strict = true }) {
  const use = config.uses[useKey]
  if (!use) throw new Error(`images: nieznane użycie "${useKey}" w og:image`)
  const entry = resolveCrop(manifest, use.crop)
  if (!entry) {
    // og:image degraduje się łagodnie: bez niego link traci miniaturę,
    // ale strona wygląda i działa tak samo. `optional` to przesądza.
    if (strict && !use.optional) throw new Error(`images: og:image bez wariantów kadru "${use.crop}"`)
    return '<meta name="twitter:card" content="summary_large_image">'
  }
  const v = (entry.formats.jpeg ?? Object.values(entry.formats).find((l) => l?.length)).slice(-1)[0]
  const url = new URL(v.url, config.site.origin).href
  const crop = config.crops[use.crop]
  return [
    `<meta property="og:image" content="${esc(url)}">`,
    `<meta property="og:image:width" content="${v.w}">`,
    `<meta property="og:image:height" content="${v.h}">`,
    `<meta property="og:image:alt" content="${esc(use.alt ?? config.sources[crop.source]?.alt ?? '')}">`,
    '<meta name="twitter:card" content="summary_large_image">'
  ].join('\n')
}
