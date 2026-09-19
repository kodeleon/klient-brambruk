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
 *   /assets/img/podjazd-16x10-820.avif
 * Katalog jest płaski - podział wg sekcji był właśnie tym, co tworzyło duplikaty.
 *
 * Klucze `uses` są zarazem identyfikatorami w znaczniku:
 *   <Obraz use="galeria.01" />
 *
 * Reguły formatów, presetów, jakości i budżetu wagi:
 * `PRODUKCJA-media-przygotowanie.md` w dokumentacji Kodeleon. Progi liczbowe
 * żyją w `tools/media/presets.mjs` - to jest ich implementacja, nie kopia.
 *
 * ┌── STAN MATERIAŁU (18.09.2026) ──────────────────────────────────────┐
 * │ 14 fotografii od klienta plus obraz podglądu linku. Serwis potrzebuje│
 * │ ~40 miejsc, więc zdjęcia SIĘ POWTARZAJĄ - świadomie, przez wspólne   │
 * │ kadry, a nie przez kopiowanie plików.                                │
 * │                                                                      │
 * │ Sześć zdjęć to kadry telefonem w pionie 1154×2560 (kostka ×2, garaż, │
 * │ domek, furtka). Kafelek 16:10 wycina z nich ~25% powierzchni, czyli  │
 * │ poniżej progu ZŁE DOPASOWANIE z `cropVerdicts`. `npm run images:check`│
 * │ wypisze je po nazwie - to nie jest usterka potoku, tylko informacja, │
 * │ że w tych miejscach potrzebne są zdjęcia poziome.                    │
 * │                                                                      │
 * │ Kadry nie są jeszcze zaznaczone ręcznie: `media/crops.json` jest      │
 * │ pusty, więc potok bierze największy możliwy prostokąt od lewego      │
 * │ górnego rogu i ostrzega o tym przy każdym kadrze. Docelowe kadrowanie│
 * │ to `npm run images:crop` - kolejka obejmie dokładnie te kadry.        │
 * └──────────────────────────────────────────────────────────────────────┘
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
/* Kontener serwisu: `max-w-7xl mx-auto px-5 lg:px-10`, czyli 1280 px   */
/* z marginesem 20 px poniżej 1024 px i 40 px powyżej. Progi Tailwinda  */
/* użyte niżej: md 768, lg 1024.                                       */
/* ------------------------------------------------------------------ */

export const SIZES = {
  /** Element na pełną szerokość okna (tło sekcji głównej). */
  pelna: '100vw',

  /** Treść w kontenerze: pełna szerokość minus marginesy, sufit 1200 px. */
  tresc: '(max-width:1024px) calc(100vw - 40px), min(1200px, calc(100vw - 80px))',

  /** Kolumna połowy kontenera: układ 1 → 2 kolumny od 1024 px, odstęp 40-64 px. */
  polowa: '(max-width:1024px) calc(100vw - 40px), min(568px, calc((100vw - 144px)/2))',

  /** Siatka kart: 1 kolumna → 2 od 768 px → 3 od 1024 px, odstęp 24 px. */
  karta:
    '(max-width:768px) calc(100vw - 40px), (max-width:1024px) calc((100vw - 64px)/2), min(384px, calc((100vw - 128px)/3))',

  /** Kafelek galerii: ta sama siatka co karty, odstęp 16 px. */
  kafelek:
    '(max-width:768px) calc(100vw - 40px), (max-width:1024px) calc((100vw - 56px)/2), min(389px, calc((100vw - 112px)/3))',

  /* Kolaż w sekcji głównej pokazuje się dopiero od 1024 px - poniżej
     kolumna jest ukryta, więc `sizes` deklaruje 1 px i przeglądarka
     pobiera najmniejszy wariant zamiast największego. */
  kolazDuze: '(max-width:1024px) 1px, 320px',
  kolazSrednie: '(max-width:1024px) 1px, 240px',
  kolazMale: '(max-width:1024px) 1px, 260px',
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

const src = (nazwa, alt, extra = {}) => {
  const { plik, ...reszta } = extra
  return {
    raw: plik ?? `${nazwa}.jpg`,
    // Znormalizowane źródło zawsze jest JPEG-iem - tak działa `images:source`.
    file: `${nazwa}.jpg`,
    alt,
    credit: null,
    ...reszta,
  }
}

/** Fotografia klienta: materiał własny BramBruk, bez ograniczeń licencyjnych. */
const KLIENT = 'BramBruk - materiał własny klienta'

export const sources = {
  // --- ogrodzenia i bramy ---
  'ogrodzenie-panelowe-3d': src('ogrodzenie-panelowe-3d', 'Ogrodzenie panelowe 3D z bramą przy posesji', { credit: KLIENT }),
  'ogrodzenie-panelowe-2': src('ogrodzenie-panelowe-2', 'Ogrodzenie panelowe od strony podjazdu', { credit: KLIENT }),
  'brama-przesuwna': src('brama-przesuwna', 'Brama przesuwna w ogrodzeniu panelowym', { credit: KLIENT }),
  'brama-dwuskrzydlowa': src('brama-dwuskrzydlowa', 'Brama dwuskrzydłowa przy wjeździe na posesję', { credit: KLIENT, plik: 'brama-dwuskrzydlowa.jpeg' }),
  furtka: src('furtka', 'Furtka ogrodzeniowa dopasowana do bramy', { credit: KLIENT }),
  podmurowka: src('podmurowka', 'Betonowa podmurówka pod ogrodzeniem panelowym', { credit: KLIENT }),
  siatka: src('siatka', 'Ogrodzenie z siatki na słupkach', { credit: KLIENT }),
  'ogrodzenia-bramy': src('ogrodzenia-bramy', 'Ogrodzenie panelowe z bramą wjazdową - ujęcie z drogi', { credit: KLIENT }),

  // --- brukarstwo ---
  'kostka-brukowa': src('kostka-brukowa', 'Nawierzchnia z kostki brukowej przy domu', { credit: KLIENT }),
  'kostka-brukowa-2': src('kostka-brukowa-2', 'Kostka brukowa - ujęcie z bliska, wzór ułożenia', { credit: KLIENT }),
  podjazd: src('podjazd', 'Podjazd z kostki brukowej do garażu', { credit: KLIENT }),

  // --- budownictwo ---
  altana: src('altana', 'Drewniana altana ogrodowa', { credit: KLIENT }),
  garaz: src('garaz', 'Garaż blaszany na posesji', { credit: KLIENT }),
  domek: src('domek', 'Domek narzędziowy w ogrodzie', { credit: KLIENT }),

  /* --- obraz podglądu linku ---
     Grafika złożona: fotografia, znak firmowy i ikony. Pochodzenie ikon
     jest wypisane na podstronie /credits/ - to warunek licencji Flaticona,
     nie ozdobnik. Źródłem prawdy jest `credits.txt` w katalogu projektu. */
  'og-image': src('og-image', 'BramBruk - ogrodzenia, bramy, brukarstwo i budownictwo', {
    plik: 'og-image.png',
    credit: 'Kompozycja BramBruk; ikony: Flaticon (Magnific, orvipixel) - atrybucja na /credits/',
  }),

  /* --- do przygotowania ---
     Do czasu wgrania plików `<Foto>` rysuje zaślepkę o właściwych
     wymiarach. Patrz MIGRACJA-braki.md, punkt 3. */
  'mapa-dojazd': src('mapa-dojazd', 'Mapa dojazdu do siedziby BramBruk w Bohukałach', { planned: true }),
  'mapa-region': src('mapa-region', 'Mapa obszaru działania: województwo lubelskie, podlaskie i mazowieckie', { planned: true }),
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
/*                                                                     */
/* ┌── DLACZEGO GALERIA MA JEDEN KADR, A NIE DWA ──────────────────────┐ */
/* │ Siatka kafelków stoi na `aspect-[16/11]`, karuzela na `16/10`.    │ */
/* │ To 9% różnicy, którą `object-cover` zjada niewidocznie, a oba     │ */
/* │ komponenty renderują TEN SAM klucz. Rozbicie na `art` dałoby dwa  │ */
/* │ komplety plików na zdjęcie (18 zamiast 9) w zamian za różnicę,    │ */
/* │ której nikt nie zobaczy. Kadr 16:10 obsługuje oba. Przy realnej   │ */
/* │ różnicy proporcji (pion na telefonie, poziom na komputerze) `art` │ */
/* │ wraca - i wtedy jest tego wart.                                   │ */
/* └────────────────────────────────────────────────────────────────────┘ */
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

/* Szerokości liczone z realnego układu, nie przepisane z presetu w całości:
   kafelek ma 384-389 px w siatce trzykolumnowej, więc 820 px pokrywa ekran
   o podwójnej gęstości, a 1200 px zostaje na powiększenie w galerii. */
const W_KAFELEK = [420, 820, 1200]
const W_KARTA = [420, 820]
const W_HERO_TLO = [1200, 1440, 1920]
const W_HERO_OBOK = [640, 1200]
const W_KOLAZ = [420, 820]

const LISTA_KADROW = [
  // ── 16:10 - karty usług, kafelki galerii, karuzela ───────────────
  crop('ogrodzenia-bramy', [16, 10], { widths: W_KAFELEK, preset: 'grid' }),
  crop('podjazd', [16, 10], { widths: W_KAFELEK, preset: 'grid' }),
  crop('altana', [16, 10], { widths: W_KAFELEK, preset: 'grid' }),
  crop('brama-przesuwna', [16, 10], { widths: W_KAFELEK, preset: 'grid' }),
  crop('brama-dwuskrzydlowa', [16, 10], { widths: W_KARTA, preset: 'grid' }),
  crop('siatka', [16, 10], { widths: W_KARTA, preset: 'grid' }),
  crop('ogrodzenie-panelowe-2', [16, 10], { widths: W_KARTA, preset: 'grid' }),
  crop('ogrodzenie-panelowe-3d', [16, 10], { widths: W_KARTA, preset: 'grid' }),
  crop('podmurowka', [16, 10], {
    widths: W_KARTA,
    preset: 'grid',
    note: 'źródło 1069×567 - wariant 820 px jest ostatnim, który ma pokrycie w pikselach',
  }),
  crop('furtka', [16, 10], {
    widths: W_KAFELEK,
    preset: 'grid',
    note: 'pion 1194×2560: kadr poziomy zostawia ~29% klatki - potrzebne zdjęcie poziome',
  }),
  crop('kostka-brukowa', [16, 10], { widths: W_KAFELEK, preset: 'grid', note: 'pion 1154×2560 - jak wyżej' }),
  crop('kostka-brukowa-2', [16, 10], { widths: W_KAFELEK, preset: 'grid', note: 'pion 1154×2560 - jak wyżej' }),
  crop('garaz', [16, 10], { widths: W_KAFELEK, preset: 'grid', note: 'pion 1154×2560 - jak wyżej' }),
  crop('domek', [16, 10], { widths: W_KAFELEK, preset: 'grid', note: 'pion 1154×2560 - jak wyżej' }),

  // ── 16:9 - tło sekcji głównej pod gradientem ─────────────────────
  crop('ogrodzenia-bramy', [16, 9], { widths: W_HERO_TLO, preset: 'hero' }),
  crop('brama-przesuwna', [16, 9], { widths: W_HERO_TLO, preset: 'hero' }),
  crop('podjazd', [16, 9], { widths: W_HERO_TLO, preset: 'hero' }),
  crop('altana', [16, 9], { widths: W_HERO_TLO, preset: 'hero' }),

  // ── 3:2 - zdjęcie obok treści w sekcjach głównych podstron ───────
  crop('ogrodzenie-panelowe-3d', [3, 2], { widths: W_HERO_OBOK, preset: 'content' }),
  crop('siatka', [3, 2], { widths: W_HERO_OBOK, preset: 'content' }),
  crop('brama-przesuwna', [3, 2], { widths: W_HERO_OBOK, preset: 'content' }),
  crop('brama-dwuskrzydlowa', [3, 2], { widths: W_HERO_OBOK, preset: 'content' }),
  crop('podjazd', [3, 2], { widths: W_HERO_OBOK, preset: 'content' }),
  crop('ogrodzenia-bramy', [3, 2], { widths: W_HERO_OBOK, preset: 'content' }),
  crop('altana', [3, 2], { widths: W_HERO_OBOK, preset: 'content' }),
  crop('podmurowka', [3, 2], { widths: [640], preset: 'content', note: 'źródło 1069×567 - powyżej 850 px nie ma z czego' }),
  crop('furtka', [3, 2], { widths: [640, 1194], preset: 'content', note: 'pion - kadr poziomy zostawia ~31% klatki' }),
  crop('kostka-brukowa', [3, 2], { widths: [640, 1154], preset: 'content', note: 'pion - jak wyżej' }),
  crop('kostka-brukowa-2', [3, 2], { widths: [640, 1154], preset: 'content', note: 'pion - jak wyżej' }),

  // ── 2:1 - kafelki wyboru typu usługi w kreatorze wyceny ──────────
  crop('ogrodzenia-bramy', [2, 1], { widths: W_KARTA, preset: 'grid' }),
  crop('podjazd', [2, 1], { widths: W_KARTA, preset: 'grid' }),
  crop('altana', [2, 1], { widths: W_KARTA, preset: 'grid' }),

  // ── kolaż w sekcji głównej: trzy proporcje, trzy zdjęcia ─────────
  crop('ogrodzenie-panelowe-3d', [4, 5], { widths: W_KOLAZ, preset: 'grid' }),
  crop('podjazd', [1, 1], { widths: W_KOLAZ, preset: 'grid' }),
  crop('kostka-brukowa-2', [4, 3], {
    widths: W_KOLAZ,
    preset: 'grid',
    note: 'pion 1154×2560 - kadr 4:3 zostawia ~39% klatki, tuż nad progiem',
  }),

  // ── obraz podglądu linku ─────────────────────────────────────────
  crop('og-image', [40, 21], { widths: [1200], preset: 'social' }),

  /* ── mapy ─────────────────────────────────────────────────────────
     ŚWIADOMIE BEZ KADRU. Kadr wskazujący na plik, którego nie ma,
     wstrzymuje build, a `uses` bez wariantów przerywa renderowanie.
     Dopóki obrazów nie ma, klucze `mapa.*` NIE MOGĄ istnieć w `uses` -
     wtedy `<Foto>` rysuje zaślepkę o właściwych wymiarach i to jest
     jedyny stan, w którym serwis się buduje. Po wgraniu plików:
     dopisz tu dwa kadry 4:3 i dwa użycia niżej, nic więcej.          */
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

const GRADIENT_OD_LEWEJ = [
  { kind: 'cover', x: 0, y: 0, w: 0.45, h: 1, label: 'gradient sekcji głównej - tu zdjęcia praktycznie nie widać' },
]
const PODPIS_KAFELKA = [
  { kind: 'cover', x: 0, y: 0.78, w: 1, h: 0.22, label: 'podpis kafelka galerii przy najechaniu' },
]

export const safeZones = {
  '*': [{ kind: 'margin', inset: 0.06, label: 'zapas 6%: odchylenie kontenera i powiększenie przy najechaniu' }],

  'ogrodzenia-bramy-16x9': GRADIENT_OD_LEWEJ,
  'brama-przesuwna-16x9': GRADIENT_OD_LEWEJ,
  'podjazd-16x9': GRADIENT_OD_LEWEJ,
  'altana-16x9': GRADIENT_OD_LEWEJ,

  'ogrodzenia-bramy-16x10': PODPIS_KAFELKA,
  'podjazd-16x10': PODPIS_KAFELKA,
  'altana-16x10': PODPIS_KAFELKA,
  'brama-przesuwna-16x10': PODPIS_KAFELKA,
  'furtka-16x10': PODPIS_KAFELKA,
  'kostka-brukowa-16x10': PODPIS_KAFELKA,
  'kostka-brukowa-2-16x10': PODPIS_KAFELKA,
  'garaz-16x10': PODPIS_KAFELKA,
  'podmurowka-16x10': PODPIS_KAFELKA,
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
/*                                                                     */
/* ⚠️ `alt` zostaje pusty tam, gdzie podstrona i tak go nadpisuje       */
/* (karty usług): opis zależy od podpisu obok zdjęcia, a ten mieszka    */
/* w danych podstrony, nie w manifeście.                               */
/* ------------------------------------------------------------------ */

const uzycie = (kadr, sizes, extra = {}) => ({ crop: kadr, sizes, ...extra })

export const uses = {
  /* ── sekcja główna strony startowej ───────────────────────────── */
  'hero.glowna': uzycie('ogrodzenia-bramy-16x9', SIZES.pelna, { alt: '', priority: true }),
  'hero.glowna-kolaz-1': uzycie('ogrodzenie-panelowe-3d-4x5', SIZES.kolazDuze, {
    alt: 'Ogrodzenie panelowe 3D z bramą - realizacja BramBruk',
  }),
  'hero.glowna-kolaz-2': uzycie('podjazd-1x1', SIZES.kolazSrednie, {
    alt: 'Podjazd z kostki brukowej - realizacja BramBruk',
  }),
  'hero.glowna-kolaz-3': uzycie('kostka-brukowa-2-4x3', SIZES.kolazMale, {
    alt: 'Kostka brukowa ułożona we wzór - realizacja BramBruk',
  }),

  /* ── sekcje główne pozostałych podstron ───────────────────────── */
  'hero.ogrodzenia': uzycie('brama-przesuwna-16x9', SIZES.pelna, { alt: '', priority: true }),
  'hero.brukarstwo': uzycie('podjazd-16x9', SIZES.pelna, { alt: '', priority: true }),
  'hero.budownictwo': uzycie('altana-16x9', SIZES.pelna, { alt: '', priority: true }),

  'hero.ogrodzenia-obok': uzycie('brama-przesuwna-3x2', SIZES.polowa, {
    alt: 'Brama przesuwna w ogrodzeniu panelowym - realizacja BramBruk',
  }),
  'hero.brukarstwo-obok': uzycie('podjazd-3x2', SIZES.polowa, {
    alt: 'Podjazd z kostki brukowej - realizacja BramBruk',
  }),
  'hero.budownictwo-obok': uzycie('altana-3x2', SIZES.polowa, {
    alt: 'Drewniana altana ogrodowa - realizacja BramBruk',
  }),
  'hero.uslugi-obok': uzycie('ogrodzenia-bramy-3x2', SIZES.polowa, {
    alt: 'Ogrodzenie panelowe z bramą wjazdową - realizacja BramBruk',
  }),
  'hero.realizacje-obok': uzycie('siatka-3x2', SIZES.polowa, {
    alt: 'Ogrodzenie z siatki na słupkach - realizacja BramBruk',
  }),

  /* ── karty typów usług na stronie startowej ───────────────────── */
  'karta.glowna-ogrodzenia': uzycie('ogrodzenia-bramy-16x10', SIZES.karta),
  'karta.glowna-brukarstwo': uzycie('podjazd-16x10', SIZES.karta),
  'karta.glowna-budownictwo': uzycie('altana-16x10', SIZES.karta),

  /* ── karty rodzajów usług (huby, /uslugi/) ────────────────────── */
  'karta.panelowe': uzycie('ogrodzenie-panelowe-2-16x10', SIZES.karta),
  'karta.panelowe-3d': uzycie('ogrodzenie-panelowe-3d-16x10', SIZES.karta),
  'karta.murowane': uzycie('podmurowka-16x10', SIZES.karta),
  'karta.siatka-hub': uzycie('siatka-16x10', SIZES.karta),
  'karta.siatka-uslugi': uzycie('siatka-16x10', SIZES.karta),
  'karta.brama-przesuwna': uzycie('brama-przesuwna-16x10', SIZES.karta),
  'karta.brama-dwuskrzydlowa': uzycie('brama-dwuskrzydlowa-16x10', SIZES.karta),
  'karta.furtka': uzycie('furtka-16x10', SIZES.karta),
  'karta.kostka': uzycie('kostka-brukowa-16x10', SIZES.karta),
  'karta.podjazd': uzycie('podjazd-16x10', SIZES.karta),
  'karta.chodnik': uzycie('kostka-brukowa-2-16x10', SIZES.karta),
  'karta.altana': uzycie('altana-16x10', SIZES.karta),
  'karta.garaz': uzycie('garaz-16x10', SIZES.karta),
  'karta.domek': uzycie('domek-16x10', SIZES.karta),

  /* ── sekcje główne dziewięciu podstron usług ──────────────────── */
  'usluga.panelowe': uzycie('ogrodzenie-panelowe-3d-3x2', SIZES.polowa),
  'usluga.murowane': uzycie('podmurowka-3x2', SIZES.polowa),
  'usluga.siatka': uzycie('siatka-3x2', SIZES.polowa),
  'usluga.brama-przesuwna': uzycie('brama-przesuwna-3x2', SIZES.polowa),
  'usluga.brama-dwuskrzydlowa': uzycie('brama-dwuskrzydlowa-3x2', SIZES.polowa),
  'usluga.furtka': uzycie('furtka-3x2', SIZES.polowa),
  'usluga.kostka': uzycie('kostka-brukowa-3x2', SIZES.polowa),
  'usluga.podjazd': uzycie('podjazd-3x2', SIZES.polowa),
  'usluga.chodnik': uzycie('kostka-brukowa-2-3x2', SIZES.polowa),

  /* ── kafelki wyboru typu usługi w kreatorze wyceny ────────────── */
  'wycena.ogrodzenia': uzycie('ogrodzenia-bramy-2x1', SIZES.karta),
  'wycena.brukarstwo': uzycie('podjazd-2x1', SIZES.karta),
  'wycena.budownictwo': uzycie('altana-2x1', SIZES.karta),

  /* ── galeria realizacji ───────────────────────────────────────────
     Klucz `realizacja.NN` jest KANONICZNY: jeden numer = jedno zdjęcie
     = jeden temat. Przed wgraniem zdjęć ten sam numer miał w różnych
     podstronach różne podpisy (`realizacja.06` był raz chodnikiem, raz
     garażem) - z zaślepkami tego nie było widać, ze zdjęciami owszem.
     Podpisy w `src/data/` są dociągnięte do tej listy.                */
  'realizacja.01': uzycie('ogrodzenia-bramy-16x10', SIZES.kafelek, { alt: 'Ogrodzenie panelowe z bramą wjazdową' }),
  'realizacja.02': uzycie('podjazd-16x10', SIZES.kafelek, { alt: 'Podjazd z kostki brukowej' }),
  'realizacja.03': uzycie('kostka-brukowa-2-16x10', SIZES.kafelek, { alt: 'Taras z kostki brukowej' }),
  'realizacja.04': uzycie('altana-16x10', SIZES.kafelek, { alt: 'Drewniana altana ogrodowa' }),
  'realizacja.05': uzycie('podmurowka-16x10', SIZES.kafelek, { alt: 'Ogrodzenie panelowe na betonowej podmurówce' }),
  'realizacja.06': uzycie('garaz-16x10', SIZES.kafelek, { alt: 'Garaż blaszany na posesji' }),
  'realizacja.07': uzycie('furtka-16x10', SIZES.kafelek, { alt: 'Furtka i przęsła ogrodzeniowe' }),
  'realizacja.08': uzycie('brama-przesuwna-16x10', SIZES.kafelek, { alt: 'Brama przesuwna z automatyką' }),
  'realizacja.09': uzycie('kostka-brukowa-16x10', SIZES.kafelek, { alt: 'Chodnik z kostki brukowej z obrzeżami' }),
  'realizacja.10': uzycie('domek-16x10', SIZES.kafelek, { alt: 'Domek narzędziowy w ogrodzie' }),

  /* Kluczy `mapa.dojazd` i `mapa.region` tu nie ma celowo - patrz uwaga
     przy kadrach wyżej. `<Foto klucz="mapa.dojazd">` rysuje zaślepkę. */

  /* ── obraz podglądu linku ─────────────────────────────────────── */
  'og.domyslny': uzycie('og-image-40x21', null, {
    alt: 'BramBruk - ogrodzenia, bramy, brukarstwo i budownictwo, Biała Podlaska i okolice',
  }),
}

/* ------------------------------------------------------------------ */
/* LOGOTYPY - rastry poza potokiem fotografii                          */
/*                                                                     */
/* ┌── DLACZEGO OSOBNA ŚCIEŻKA, A NIE `sources` ────────────────────┐   */
/* │ `npm run images:source` normalizuje KAŻDE źródło do JPEG-a -   │   */
/* │ tak jest opisane w `sourceProfile` i tak ma zostać dla zdjęć.   │   */
/* │ Znak firmowy ma przezroczyste tło; JPEG zamieniłby je na czarny │   */
/* │ prostokąt w nagłówku i stopce. Baza przewiduje dla logo ścieżkę │   */
/* │ `media/svg/` → `public/assets/logo/`, ale klient nie ma wersji   │   */
/* │ wektorowej - są tylko pliki PNG.                                │   */
/* │                                                                 │   */
/* │ Stąd `tools/media/build-logo.mjs`: ta sama zasada co przy       │   */
/* │ krojach (`npm run fonts`) - plik źródłowy w repozytorium, wynik  │   */
/* │ generowany, nigdy ręcznie dokładany do `public/`. Wchodzi w tym  │   */
/* │ samym miejscu potoku co SVG, więc `npm run images`, `predev`     │   */
/* │ i `prebuild` obsługują go bez dodatkowej komendy.               │   */
/* │                                                                 │   */
/* │ ⚠️ ODEJŚCIE OD BAZY. Gdy pojawi się wektor, ten blok znika:      │   */
/* │ plik ląduje w `media/svg/logo/`, a `<Logo>` zamienia `<picture>` │   */
/* │ na `<img src="/assets/logo/....svg">`.                          │   */
/* └─────────────────────────────────────────────────────────────────┘   */
/*                                                                     */
/* `pelne-jasne.png` jest WYPROWADZONY z `pelne.png`: antracytowy napis */
/* przemalowany na `brand-bg`, znak graficzny nietknięty (jego ciemne   */
/* obrysy wtapiają się w `brand-dark` - tak samo wygląda znak na        */
/* obrazie podglądu linku). Nie jest to plik od klienta.                */
/* ------------------------------------------------------------------ */

export const logoPaths = {
  /** Źródła PNG. W repozytorium - są małe i nie da się ich odtworzyć. */
  src: 'media/logo',
  /** Wynik. Generowany, nigdy nie edytowany ręcznie. */
  out: 'public/assets/logo',
}

export const logos = {
  /** Sam znak, kwadrat 1:1. Nagłówek i stopka, 48 px. */
  znak: {
    file: 'znak.png',
    alt: 'Znak firmowy BramBruk',
    widths: [48, 96, 144],
  },
  /** Znak plus napis, wariant na jasne tło. Sekcja „O firmie". */
  pelne: {
    file: 'pelne.png',
    alt: 'BramBruk Rafał Wasyluk',
    widths: [420, 640, 1136],
  },
  /** Znak plus napis, wariant na ciemne tło. Sekcja główna /o-nas/. */
  'pelne-jasne': {
    file: 'pelne-jasne.png',
    alt: 'BramBruk Rafał Wasyluk',
    widths: [420, 640, 1136],
  },
}
