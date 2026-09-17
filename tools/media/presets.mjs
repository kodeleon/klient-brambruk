/**
 * PRESETY I PROFILE JAKOŚCI - część przenośna między projektami.
 *
 * Odwzorowanie tabel z `PRODUKCJA-media-przygotowanie.md` (sekcje 1, 2, 7).
 * Projekt może nadpisać każdą wartość w swoim `images.config.mjs`;
 * tutaj mieszka wyłącznie standard, nie decyzje jednego zlecenia.
 */

/** Preset = profil parametrów, nie miejsce w drzewie katalogów. */
export const PRESETS = {
  avatar:       { widths: [220, 420],            minMaster: 800,  budget: 'grid' },
  grid:         { widths: [420, 820],            minMaster: 1200, budget: 'grid' },
  content:      { widths: [840, 1280, 1920],     minMaster: 1920, budget: 'content' },
  hero:         { widths: [1200, 1440, 1920, 2560], minMaster: 2560, budget: 'hero' },
  heroPortrait: { widths: [840, 1280],           minMaster: 1280, budget: 'hero' },
  lightbox:     { widths: [1280, 1920, 2560],    minMaster: 2560, budget: null },
  /* Podgląd linku: 1200×630 to rozmiar podawany przez Open Graph, Slacka
     i LinkedIn. Popularne „1.91:1" jest zaokrągleniem tego rozmiaru
     (1200/630 = 1.905), więc proporcja kadru to 40:21, nie 191:100. */
  social:       { widths: [1200], formats: ['jpeg'], minMaster: 1200, budget: null }
}

/**
 * Dwa profile, zgodnie z wymogiem powtarzalności i szybkiej pracy bieżącej.
 *   fast - praca i podgląd: bez AVIF, mniej wariantów, niski wysiłek kodera
 *   full - wydanie: pełna triada, wysoki wysiłek
 *
 * Jakości u górnej granicy widełek z dokumentu. Zysk 10-20 kB nie jest wart
 * widocznej utraty jakości na zdjęciu portfolio.
 */
export const PROFILES = {
  fast: {
    formats: ['webp', 'jpeg'],
    maxVariants: 2,
    webp: { quality: 78, effort: 2 },
    jpeg: { quality: 82, mozjpeg: false, progressive: true }
  },
  full: {
    formats: ['avif', 'webp', 'jpeg'],
    maxVariants: Infinity,
    // effort 3 to punkt, w którym krzywa się łamie: pomiar na tym projekcie dał
    // 422 kB / 2,7 s przy effort 3 wobec 418 kB / 14,9 s przy effort 4.
    // 1% wagi nie jest wart pięciokrotnego czasu każdego wydania.
    // chroma 4:4:4 zostaje świadomie - 4:2:0 daje ~2% mniej, ale gubi detal barwny.
    avif: { quality: 55, effort: 3, chromaSubsampling: '4:4:4' },
    webp: { quality: 80, effort: 5, smartSubsample: true },
    jpeg: { quality: 84, mozjpeg: true, progressive: true }
  }
}

/**
 * Kiedy AVIF się nie opłaca (sekcja 1 dokumentu).
 * Decyzja zapada dla całego zdjęcia, nie dla pojedynczej szerokości -
 * dziura w środku `srcset` byłaby gorsza niż brak całego `<source>`.
 */
export const AVIF_RULES = {
  alwaysAboveWidth: 800,
  skipAtOrBelowWidth: 220,
  skipIfAllUnderBytes: 20 * 1024,
  minGainPct: 10
}

/** Budżet wagi liczony dla najlżejszego dostępnego formatu (sekcja 7). */
export const BUDGETS = {
  hero: 150 * 1024,
  content: 120 * 1024,
  grid: 60 * 1024,
  aboveFold: 200 * 1024,
  page: 1.5 * 1024 * 1024
}

/** Dopuszczalne odchylenie proporcji mastera od deklarowanej. */
export const RATIO_TOLERANCE = 0.01

/** Kolejność formatów w <picture>: od najlepiej kompresującego. */
export const FORMAT_ORDER = ['avif', 'webp', 'jpeg']

export const MIME = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png'
}

export const EXT = { avif: 'avif', webp: 'webp', jpeg: 'jpg', png: 'png' }
