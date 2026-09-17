/**
 * MANIFEST MEDIÓW - jedyne miejsce, w którym opisujemy zdjęcia tego projektu.
 *
 * TRZY POZIOMY. Każdy odpowiada na inne pytanie:
 *
 *   sources - jaka to fotografia?
 *             plik w `media/img/source/`, jego oryginał w `_raw/`, domyślny
 *             tekst alternatywny, pochodzenie. Jedno zdjęcie = jeden wpis,
 *             niezależnie od tego, w ilu miejscach się pojawia.
 *
 *   crops   - jaki wycinek tej fotografii i w jakich szerokościach?
 *             JEDNOSTKA GENEROWANIA. Dwa miejsca potrzebujące tego samego
 *             kadru dzielą jeden komplet plików i jeden wpis w cache
 *             przeglądarki. Nazwa jest wyliczalna: `{źródło}-{proporcja}`.
 *
 *   uses    - gdzie w układzie to siedzi?
 *             `sizes`, priorytet ładowania, klasy, podpis, drugi kadr dla
 *             węższego okna. `sizes` opisuje UKŁAD, nie plik: ten sam kafelek
 *             ma inną szerokość na `/` i na `/uslugi`, więc wartość zapisana
 *             przy zdjęciu byłaby w jednym z tych miejsc zawsze błędna.
 *
 * DLACZEGO KADR, A NIE PRZEZNACZENIE: generowanie per miejsce na stronie daje
 * duplikaty. Jedno zdjęcie użyte w trzech miejscach, z czego dwa mają tę samą
 * proporcję, to dwa komplety plików o identycznej treści i drugie pobranie
 * tego samego obrazu przy przejściu między podstronami, bo adres jest inny.
 *
 * Ścieżka wyjściowa jest funkcją kadru, nigdy przeznaczenia:
 *   /assets/img/warsztat-16x9-1280.avif
 * Katalog jest płaski - podział wg sekcji był właśnie tym, co tworzyło duplikaty.
 *
 * Klucze `uses` są zarazem identyfikatorami w znaczniku:
 *   <Obraz use="galeria.01" />
 *
 * Reguły formatów, presetów, jakości i budżetu wagi:
 * `PRODUKCJA-media-przygotowanie.md` w dokumentacji Kodeleon. Progi liczbowe
 * żyją w `tools/media/presets.mjs` - to jest ich implementacja, nie kopia.
 */

import { PRESETS, PROFILES, BUDGETS } from '../tools/media/presets.mjs'
import { site as konfiguracjaSerwisu } from '../src/config/site.ts'

export { PRESETS, PROFILES, BUDGETS }

/* ------------------------------------------------------------------ */
/* Ustawienia projektu                                                 */
/* ------------------------------------------------------------------ */

/* Adres serwisu mieszka w `src/config/site.ts` - tam bierze go też HTML.
   Dwa miejsca z tym samym adresem rozjechałyby się przy zmianie domeny. */
export const site = { origin: konfiguracjaSerwisu.origin, name: konfiguracjaSerwisu.nazwa }

export const paths = {
  /** Oryginały. Poza repozytorium, nietykalne - skrypt tylko z nich czyta. */
  raw: 'media/img/_raw',
  /** Znormalizowane źródła. W repozytorium - jedyne zdjęcia, jakie tam są. */
  source: 'media/img/source',
  /** Prostokąty kadrów w układzie współrzędnych pliku z `source/`. */
  crops: 'media/crops.json',
  srcSvg: 'media/svg',
  outImg: 'public/assets/img',
  outLogo: 'public/assets/logo',
  outRoot: 'public/assets',
  cache: '.media-cache',
  /** Skanowane w poszukiwaniu użyć `<Obraz use="...">`. */
  pages: 'src',
}

/**
 * Parametry normalizacji `_raw/` → `source/`.
 * Skala liczona per zdjęcie z jego kadrów - patrz `npm run images:source:plan`.
 */
export const sourceProfile = {
  format: 'jpeg',
  quality: 90,
  chromaSubsampling: '4:4:4',
  colourspace: 'srgb',
  stripMetadata: true,
  applyOrientation: true,
  /** Sufit dłuższej krawędzi dla źródeł, których kadr otwiera powiększenie. */
  lightboxCeiling: 2560,
  /**
   * Zapas ponad minimum wyliczone z kadrów.
   *
   * Minimum wystarcza tylko wtedy, gdy człowiek zaznaczy dokładnie największy
   * możliwy prostokąt danej proporcji. Każde ciaśniejsze zaznaczenie schodzi
   * poniżej wymaganej szerokości, więc źródło zapisane co do piksela dałoby
   * werdykt CIASNY dla każdego kadru i zerową swobodę przy kadrowaniu.
   *
   * 1.15 to ~30% powierzchni zapasu - powyżej progu CIASNY (10%), a wciąż
   * daleko od bezmyślnego 2560 dla wszystkiego.
   */
  cropHeadroom: 1.15,
}

/**
 * Drabina powiększenia. Lightbox bierze z `source`, nie z kadru - zawsze pełna
 * klatka, zawsze największy dostępny rozmiar. Kliknięcie w kafelek 1:1 otwiera
 * pełne zdjęcie, a nie powiększony wycinek.
 */
export const lightboxWidths = [1280, 1920, 2560]

/**
 * Progi wykonalności kadru. Liczone jako udział powierzchni, jaka zostaje
 * po wycięciu, w powierzchni oryginału.
 *
 * Poniżej `badFit` nie ma o czym rozmawiać: pion wciskany w kadr 16:9 zawsze
 * da skrawek. To nie jest ostrzeżenie o rozmiarze pliku i nie ratuje tego
 * interpolacja - to znaczy „potrzebne inne zdjęcie".
 */
export const cropVerdicts = {
  /** Zostaje mniej niż 10% zapasu ponad wymaganą szerokość → CIASNY. */
  tightHeadroomPct: 10,
  /** Zostaje mniej niż 35% powierzchni oryginału → ZŁE DOPASOWANIE. */
  badFitAreaPct: 35,
}

/* ------------------------------------------------------------------ */
/* POWTARZALNE WARTOŚCI `sizes`                                        */
/*                                                                     */
/* ⚠️ Progi muszą odpowiadać CSS. `sizes` opisuje, ILE MIEJSCA element  */
/* zajmuje w układzie - nie jaki plik chcemy pobrać. Wartość `100vw`    */
/* przy kafelku szerokim na 380 px każe przeglądarce pobrać plik cztery */
/* razy za duży, a Lighthouse tego nie zgłosi jako błędu.               */
/*                                                                     */
/* Progi bazy: 640 px (sm) i 1024 px (lg), kontener 1200 px, margines   */
/* boczny 24 px poniżej 1024 px i 40 px powyżej - patrz tokens.css.     */
/* ------------------------------------------------------------------ */

export const SIZES = {
  /** Element na pełną szerokość okna. */
  pelna: '100vw',

  /** Treść w kontenerze: pełna szerokość minus marginesy, sufit 1200 px. */
  tresc: '(max-width:1024px) calc(100vw - 48px), min(1200px, calc(100vw - 80px))',

  /** Siatka kart: 1 kolumna → 2 → 3 (patrz `.siatka-kart` w tresc.css). */
  karta:
    '(max-width:640px) calc(100vw - 48px), (max-width:1024px) calc((100vw - 72px)/2), min(384px, calc((100vw - 160px)/3))',
}

/* ------------------------------------------------------------------ */
/* ŹRÓDŁA - jedna fotografia, jeden wpis                               */
/*                                                                     */
/* Pola:                                                               */
/*   raw     nazwa pliku w `media/img/_raw/` (poza repozytorium)        */
/*   file    nazwa pliku w `media/img/source/` (w repozytorium)         */
/*   alt     domyślny opis fotografii; `uses` może go nadpisać          */
/*   credit  pochodzenie: autor, licencja, odnośnik. `null` = nieustalone */
/*   planned true = pliku jeszcze nie ma i to jest znane                */
/*                                                                     */
/* `alt` opisuje TREŚĆ zdjęcia, nie nazwę pliku i nie frazę kluczową.   */
/* Zdjęcie dekoracyjne dostaje `alt: ''` w `uses`, nie brak atrybutu.   */
/* ------------------------------------------------------------------ */

const src = (nazwa, alt, extra = {}) => ({
  raw: `${nazwa}.jpg`,
  file: `${nazwa}.jpg`,
  alt,
  credit: null,
  ...extra,
})

export const sources = {
  // Pusto - baza nie niesie zdjęć klienta.
  //
  // Wzór wpisu:
  //   'warsztat-01': src('warsztat-01', 'Wnętrze warsztatu z podnośnikiem'),
  //   'zespol-anna': src('zespol-anna', 'Anna Kowalska, właścicielka'),
  //   'og-domyslny': src('og-domyslny', 'Nazwa Firmy - podgląd linku', { planned: true }),
}

/* ------------------------------------------------------------------ */
/* KADRY - jednostka generowania                                       */
/*                                                                     */
/* Nazwa wyliczana: `{źródło}-{proporcja}`, bez szerokości - szerokość  */
/* jest daną wariantu, nie kadru. Dwa `uses` na ten sam kadr = jeden    */
/* komplet plików.                                                     */
/*                                                                     */
/* Pola:                                                               */
/*   source    klucz z `sources`                                       */
/*   ratio     [w, h] w formie redakcyjnej (16:10 zostaje 16:10,        */
/*             nie skraca się do 8:5 - nazwa pliku ma być czytelna)     */
/*   widths    suma szerokości potrzebnych wszystkim `uses` tego kadru  */
/*   preset    profil jakości i budżet wagi (patrz presets.mjs)         */
/*   lightbox  true = kafelek otwiera powiększenie; warianty powiększenia */
/*             powstają ze ŹRÓDŁA (pełna klatka), nie z tego kadru      */
/* ------------------------------------------------------------------ */

/** Nazwa kadru. Jedyne miejsce, w którym ta reguła jest zapisana. */
export const cropName = (source, ratio) => `${source}-${ratio[0]}x${ratio[1]}`

const crop = (source, ratio, { widths, preset, lightbox = false, note } = {}) => ({
  name: cropName(source, ratio),
  source,
  ratio,
  widths,
  preset,
  lightbox,
  note,
})

const LISTA_KADROW = [
  // Wzór:
  //   crop('warsztat-01', [16, 9], { widths: PRESETS.hero.widths, preset: 'hero' }),
  //   crop('warsztat-01', [9, 16], { widths: PRESETS.heroPortrait.widths, preset: 'heroPortrait' }),
  //   crop('zespol-anna', [3, 4],  { widths: PRESETS.grid.widths, preset: 'grid', lightbox: true }),
]

export const crops = Object.fromEntries(LISTA_KADROW.map((c) => [c.name, c]))

/* ------------------------------------------------------------------ */
/* STREFY BEZPIECZNE - nakładki w narzędziu kadrowania                 */
/*                                                                     */
/* Wartości są ułamkami PROSTOKĄTA KADRU, nie źródła - przesuwają się   */
/* razem z zaznaczeniem.                                               */
/*                                                                     */
/*   margin  pas przy krawędzi kadru, poza którym ma nie być treści     */
/*   safe    prostokąt, w którym treść krytyczna musi się zmieścić      */
/*   cover   obszar, który w układzie coś przykryje (gradient, podpis)  */
/*   note    sama uwaga, bez geometrii                                  */
/*                                                                     */
/* Klucz `*` dotyczy każdego kadru.                                    */
/* ------------------------------------------------------------------ */

export const safeZones = {
  '*': [{ kind: 'margin', inset: 0.06, label: 'zapas 6%: odchylenie kontenera i powiększenie przy najechaniu' }],
}

/* ------------------------------------------------------------------ */
/* UŻYCIA - konkretne wystąpienia kadru w układzie                     */
/*                                                                     */
/* Pola:                                                               */
/*   crop      klucz z `crops`                                         */
/*   sizes     realna szerokość elementu w układzie (progi jak w CSS)   */
/*   alt       nadpisuje `alt` źródła w tym jednym miejscu             */
/*   priority  hero / LCP: fetchpriority="high", bez `loading="lazy"`   */
/*   art       drugi kadr dla węższego okna (inna PROPORCJA, nie rozmiar) */
/*   as        'picture' (domyślnie) albo 'figure'                      */
/*   class     klasy elementu opakowującego przy as:'figure'            */
/*   caption   treść <figcaption>                                       */
/*   lightbox  true = to wystąpienie otwiera powiększenie               */
/*   optional  brak pliku nie wstrzymuje wydania (og:image)             */
/* ------------------------------------------------------------------ */

export const uses = {
  // Pusto - baza nie niesie zdjęć klienta.
  //
  // Wzór:
  //   'hero.glowna': {
  //     crop: 'warsztat-01-16x9',
  //     sizes: SIZES.pelna,
  //     priority: true,
  //     art: [{ media: '(max-width:640px)', crop: 'warsztat-01-9x16', sizes: SIZES.pelna }],
  //   },
  //   'og.domyslny': { crop: 'og-domyslny-40x21', sizes: SIZES.pelna, optional: true },
}
