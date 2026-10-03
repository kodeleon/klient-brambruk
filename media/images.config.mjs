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
 * │ Kadry zapisane są w `media/crops.json`. Kadr, którego tam brakuje,   │
 * │ potok bierze jako największy prostokąt od lewego górnego rogu i      │
 * │ ostrzega o tym przy każdym takim kadrze; poprawia się go przez       │
 * │ `npm run images:crop`.                                               │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * ┌── DOKŁADKA DO GALERII (03.10.2026) ─────────────────────────────────┐
 * │ 17 zdjęć z telefonu, z czego 14 to nowe fotografie (klucze `opis-    │
 * │ RRRRMMDD` w `sources`), a 3 to ujęcia, które serwis już miał jako    │
 * │ `ogrodzenie-panelowe-2`, `ogrodzenie-panelowe-3d` i                  │
 * │ `brama-dwuskrzydlowa` - te dostały tylko kafelek (`realizacja.24-26`)│
 * │ i znacznik `lightbox` na istniejącym kadrze 16:10.                   │
 * │                                                                      │
 * │ Osiem nowych zdjęć to piony ok. 9:20. Kadr 16:10 zostawia z nich     │
 * │ ok. 28% klatki, więc `images:check` wypisze je jako ZŁE DOPASOWANIE. │
 * │ To nie usterka potoku: kafelek pokazuje wycinek, a okno powiększenia │
 * │ pełną klatkę. Wycinki dobrano po obejrzeniu zdjęć (`crops.json`).    │
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
  /**
   * Tło sekcji głównej.
   *
   * ⚠️ PRÓG 1024 px NIE JEST OPTYMALIZACJĄ, TYLKO OPISEM UKŁADU.
   * Od 1024 px sekcja główna nie ma zdjęcia w tle - fotografia stoi obok
   * treści, a tłem jest czysta płaszczyzna (`SekcjaHero.astro`). Zdjęcie
   * zostaje w dokumencie, bo opakowanie chowa je regułą `lg:hidden`,
   * a przeglądarka i tak pobiera obraz ukrytego elementu. Deklaracja
   * `1px` powyżej progu każe jej sięgnąć po NAJMNIEJSZY wariant kadru
   * zamiast po plik na pełną szerokość ekranu.
   */
  pelna: '(min-width:1024px) 1px, 100vw',

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

  /* Mapa dojazdu (`MapaKontakt`). Tu `sizes` NIE jest szerokością pudełka,
     bo obraz ma `object-cover`: na telefonie pudełko 290-350×362 px pokrywa
     obraz 3:2 szeroki na 544 px (362 × 1,5), a boki są ucięte. Przeglądarka
     ma pobrać plik na tę szerokość, nie na szerokość pudełka.
     Pomiar: `maps/dojazd/README.md`, sekcja Stan.
       do 1023 px  jedna kolumna: pudełko 100vw - 40 px, co najmniej 544 px
       od 1024 px  siatka: pudełko 426-576 × 362-420 px → obraz 555-630 px */
  mapa: '(max-width:1023px) max(544px, calc(100vw - 40px)), 640px',
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

  /* Zdjęcia z telefonu (03.10.2026), tylko do galerii realizacji. Klucz to
     opis plus data zdjęcia (RRRRMMDD) - ten sam opis powtarza się przy kilku
     zdjęciach, a data pozwala wrócić do pliku w `_raw/`. Końcówka a/b: dwa
     zdjęcia tego samego dnia. */
  'furtka-brama-metalowa-20230206': src('furtka-brama-metalowa-20230206', 'Furtka z poziomych przęseł metalowych w ścianie drewnianego budynku, przed nią kostka brukowa', { credit: KLIENT, plik: '20230206_112140.jpg' }),
  'ogrodzenie-metalowe-20230916': src('ogrodzenie-metalowe-20230916', 'Furtka i przęsła z poziomych lameli metalowych między słupkami z kamiennych płyt, przy wjeździe z kostki', { credit: KLIENT, plik: '20230916_151403.jpg' }),
  'ogrodzenie-metalowe-20240217a': src('ogrodzenie-metalowe-20240217a', 'Ogrodzenie z poziomych przęseł metalowych na słupkach z kamienia, widok wzdłuż trawnika', { credit: KLIENT, plik: '20240217_120947.jpg' }),
  'ogrodzenie-metalowe-20240217b': src('ogrodzenie-metalowe-20240217b', 'Brama przesuwna i przęsła metalowe na kamiennych słupkach przed nowym domem z panelami fotowoltaicznymi', { credit: KLIENT, plik: '20240217_121027.jpg' }),
  'brama-przesuwna-metalowa-20240604': src('brama-przesuwna-metalowa-20240604', 'Brama przesuwna z poziomych przęseł metalowych przy domu, przed nią żwirowy podjazd', { credit: KLIENT, plik: '20240604_141423.jpg' }),
  'ogrodzenie-metalowe-20250821': src('ogrodzenie-metalowe-20250821', 'Ogrodzenie z kutych przęseł z ozdobnym zwieńczeniem na niskiej podmurówce, wzdłuż chodnika z szarej kostki', { credit: KLIENT, plik: '20250821_191130.jpg' }),
  'ogrodzenie-metalowe-20250828': src('ogrodzenie-metalowe-20250828', 'Mur z płyt w kolorze łupka i metalowe przęsła w kolorze drewna, obok chodnik z czerwonej kostki', { credit: KLIENT, plik: '20250828_113242.jpg' }),
  'ogrodzenie-drewniane-20260125': src('ogrodzenie-drewniane-20260125', 'Ogrodzenie z szerokich ciemnych desek zimą, przed nim słup i ośnieżona droga', { credit: KLIENT, plik: '20260125_110516.jpg' }),
  'furtka-drewniana-20260125': src('furtka-drewniana-20260125', 'Furtka z ciemnych drewnianych desek w stalowej ramie, z klamką i zamkiem', { credit: KLIENT, plik: '20260125_110632.jpg' }),
  'ogrodzenie-metalowe-brama-20260125': src('ogrodzenie-metalowe-brama-20260125', 'Brama przesuwna i ogrodzenie z poziomych przęseł metalowych między kamiennymi słupkami, zimą', { credit: KLIENT, plik: '20260125_114035.jpg' }),

  // --- brukarstwo ---
  'kostka-brukowa': src('kostka-brukowa', 'Nawierzchnia z kostki brukowej przy domu', { credit: KLIENT }),
  'kostka-brukowa-2': src('kostka-brukowa-2', 'Kostka brukowa - ujęcie z bliska, wzór ułożenia', { credit: KLIENT }),
  podjazd: src('podjazd', 'Podjazd z kostki brukowej do garażu', { credit: KLIENT }),
  'chodnik-taras-kostka-20230522': src('chodnik-taras-kostka-20230522', 'Taras i chodnik z szarej kostki brukowej obok trawnika, w tle drewniane ogrodzenie i wiata', { credit: KLIENT, plik: '20230522_124515.jpg' }),
  /* To zdjęcie zastępuje `podjazd` WYŁĄCZNIE w kafelku galerii
     (`realizacja.02`). `podjazd` zostaje: sekcja główna brukarstwa, kolaż,
     karty i kreator wyceny mają w nim swoje kadry. */
  'podjazd-brama-przesuwna-20250710': src('podjazd-brama-przesuwna-20250710', 'Podjazd z kostki brukowej przed parterowym domem, po bokach furtka i brama przesuwna z poziomych przęseł', { credit: KLIENT, plik: '20250710_164916.jpg' }),

  // --- budownictwo ---
  altana: src('altana', 'Drewniana altana ogrodowa', { credit: KLIENT }),
  garaz: src('garaz', 'Garaż blaszany na posesji', { credit: KLIENT }),
  domek: src('domek', 'Domek narzędziowy w ogrodzie', { credit: KLIENT }),
  'dom-blizniak-20250110': src('dom-blizniak-20250110', 'Strop nad parterem domu bliźniaka w budowie, widok z góry na belki i pustaki', { credit: KLIENT, plik: '20250110_092033.jpg' }),
  'dom-blizniak-20250423': src('dom-blizniak-20250423', 'Dom bliźniak w budowie: ściany z pustaków ceramicznych i drewniana więźba dachowa', { credit: KLIENT, plik: '20250423_074117.jpg' }),

  /* --- obraz podglądu linku ---
     Grafika złożona: fotografia, znak firmowy i ikony. Pochodzenie ikon
     jest wypisane na podstronie /credits/ - to warunek licencji Flaticona,
     nie ozdobnik. Źródłem prawdy jest `credits.txt` w katalogu projektu. */
  'og-image': src('og-image', 'BramBruk - ogrodzenia, bramy, brukarstwo i budownictwo', {
    plik: 'og-image.png',
    credit: 'Kompozycja BramBruk; ikony: Flaticon (Magnific, orvipixel) - atrybucja na /credits/',
  }),

  /* --- mapy: render z danych OpenStreetMap, `maps/dojazd/` ---
     Dwa pliki tej samej mapy, różne tylko zestawem podpisów (szeroki:
     wszystkie, wąski: bez skrajnych) - patrz kadry i użycie `mapa.dojazd`.
     Oryginał to PNG z `silnik/render.py`; źródło jak każde inne jest
     normalizowane do JPEG-a q90 4:4:4, tekst to przeżywa. */
  'mapa-dojazd-szeroki': src('mapa-dojazd-szeroki', 'Mapa dojazdu do siedziby BramBruk w Bohukałach', {
    plik: 'mapa-dojazd-szeroki.png',
    credit: '© OpenStreetMap contributors, ODbL 1.0 - render: maps/dojazd',
  }),
  'mapa-dojazd-waski': src('mapa-dojazd-waski', 'Mapa dojazdu do siedziby BramBruk w Bohukałach', {
    plik: 'mapa-dojazd-waski.png',
    credit: '© OpenStreetMap contributors, ODbL 1.0 - render: maps/dojazd',
  }),

  /* Mapa obszaru działania (`maps/region/`): region ~100 km wokół
     Białej Podlaskiej. Trzy pliki - kwadrat na telefon, dwa 3:2 różniące się
     skalą podpisów (pudełko 600-983 px na tablecie, 440-568 px w siatce). */
  'mapa-region-kwadrat': src('mapa-region-kwadrat', 'Mapa obszaru działania BramBruk wokół Białej Podlaskiej', {
    plik: 'mapa-region-kwadrat.png',
    credit: '© OpenStreetMap contributors, ODbL 1.0 - render: maps/region',
  }),
  'mapa-region-tablet': src('mapa-region-tablet', 'Mapa obszaru działania BramBruk wokół Białej Podlaskiej', {
    plik: 'mapa-region-tablet.png',
    credit: '© OpenStreetMap contributors, ODbL 1.0 - render: maps/region',
  }),
  'mapa-region-karta': src('mapa-region-karta', 'Mapa obszaru działania BramBruk wokół Białej Podlaskiej', {
    plik: 'mapa-region-karta.png',
    credit: '© OpenStreetMap contributors, ODbL 1.0 - render: maps/region',
  }),
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
   o podwójnej gęstości, a 1200 px - jedną kolumnę (do 728 px) poniżej 768 px.
   Powiększenie w galerii NIE sięga po te warianty: ma własną drabinę liczoną
   ze źródła (`lightboxWidths`, flaga `lightbox` na kadrze i na użyciu). */
const W_KAFELEK = [420, 820, 1200]
const W_KARTA = [420, 820]
/* Kadr tła sekcji głównej pracuje wyłącznie poniżej 1024 px, więc 420
   i 820 px to warianty, które faktycznie trafiają na telefon i tablet;
   1200-1920 px zostaje dla ekranów o podwójnej gęstości. */
const W_HERO_TLO = [420, 820, 1200, 1440, 1920]
const W_HERO_OBOK = [640, 1200]
const W_KOLAZ = [420, 820]
const W_MAPA = [640, 1088, 1632]

const LISTA_KADROW = [
  // ── 16:10 - karty usług, kafelki galerii, karuzela ───────────────
  crop('ogrodzenia-bramy', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('podjazd', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('altana', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('brama-przesuwna', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('brama-dwuskrzydlowa', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('siatka', [16, 10], { widths: W_KARTA, preset: 'grid' }),
  crop('ogrodzenie-panelowe-2', [16, 10], { widths: W_KARTA, preset: 'grid', lightbox: true, note: 'pion 1080×1440, źródło nie sięga 1200 px - kafelek galerii dostaje 820 px' }),
  crop('ogrodzenie-panelowe-3d', [16, 10], { widths: W_KARTA, preset: 'grid', lightbox: true, note: 'pion 1080×1440, źródło nie sięga 1200 px - kafelek galerii dostaje 820 px' }),
  crop('podmurowka', [16, 10], {
    widths: W_KARTA,
    preset: 'grid',
    lightbox: true,
    note: 'źródło 1069×567 - wariant 820 px jest ostatnim, który ma pokrycie w pikselach',
  }),
  crop('furtka', [16, 10], {
    widths: W_KAFELEK,
    preset: 'grid',
    lightbox: true,
    note: 'pion 1194×2560: kadr poziomy zostawia ~29% klatki - potrzebne zdjęcie poziome',
  }),
  crop('kostka-brukowa', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion 1154×2560 - jak wyżej' }),
  crop('kostka-brukowa-2', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion 1154×2560 - jak wyżej' }),
  crop('garaz', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion 1154×2560 - jak wyżej' }),
  crop('domek', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion 1154×2560 - jak wyżej' }),

  // ── 16:10 - kafelki galerii ze zdjęć z telefonu (03.10.2026) ─────
  crop('ogrodzenie-metalowe-20230916', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('dom-blizniak-20250423', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('podjazd-brama-przesuwna-20250710', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('ogrodzenie-metalowe-20250828', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('ogrodzenie-drewniane-20260125', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('ogrodzenie-metalowe-brama-20260125', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true }),
  crop('furtka-brama-metalowa-20230206', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion ~9:20: kadr poziomy zostawia ok. 28% klatki, pełna klatka w oknie powiększenia' }),
  crop('chodnik-taras-kostka-20230522', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion ~9:20: kadr poziomy zostawia ok. 28% klatki, pełna klatka w oknie powiększenia' }),
  crop('ogrodzenie-metalowe-20240217a', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion ~9:20: kadr poziomy zostawia ok. 28% klatki, pełna klatka w oknie powiększenia' }),
  crop('ogrodzenie-metalowe-20240217b', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion ~9:20: kadr poziomy zostawia ok. 28% klatki, pełna klatka w oknie powiększenia' }),
  crop('brama-przesuwna-metalowa-20240604', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion ~9:20: kadr poziomy zostawia ok. 28% klatki, pełna klatka w oknie powiększenia' }),
  crop('dom-blizniak-20250110', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion ~9:20: kadr poziomy zostawia ok. 28% klatki, pełna klatka w oknie powiększenia' }),
  crop('ogrodzenie-metalowe-20250821', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion ~9:20: kadr poziomy zostawia ok. 28% klatki, pełna klatka w oknie powiększenia' }),
  crop('furtka-drewniana-20260125', [16, 10], { widths: W_KAFELEK, preset: 'grid', lightbox: true, note: 'pion ~9:20: kadr poziomy zostawia ok. 28% klatki, pełna klatka w oknie powiększenia' }),

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

  /* ── 3:2 - mapa dojazdu ───────────────────────────────────────────
     Kadr = cały render (render ma dokładnie 3:2). Szerokości z `SIZES.mapa`:
     1088 i 1632 px to 544 px obrazu na telefonie przy DPR 2 i 3, a 1632 px
     pokrywa też 640-728 px przy DPR 2.
 */
  crop('mapa-dojazd-szeroki', [3, 2], { widths: W_MAPA, preset: 'content' }),
  crop('mapa-dojazd-waski', [3, 2], { widths: W_MAPA, preset: 'content' }),

  /* ── mapa obszaru działania: kadr = cały render ───────────────────
     Szerokości z pudełek (`SIZES.polowa`) przy DPR 2: kwadrat 320-599 px,
     tablet 600-983 px, karta 440-568 px. Sufit każdej drabiny to render
     z zapasem potoku (~15%), a nie więcej: powyżej potok by powiększał. */
  crop('mapa-region-kwadrat', [1, 1], { widths: [400, 800, 1200], preset: 'content' }),
  crop('mapa-region-tablet', [3, 2], { widths: [800, 1400, 1900], preset: 'content' }),
  crop('mapa-region-karta', [3, 2], { widths: [600, 1140, 1460], preset: 'content' }),
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
  { kind: 'cover', x: 0, y: 0.78, w: 1, h: 0.22, label: 'podpis kafelka galerii (bez JS i na dotyku zawsze, na komputerze przy najechaniu)' },
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
  'furtka-brama-metalowa-20230206-16x10': PODPIS_KAFELKA,
  'chodnik-taras-kostka-20230522-16x10': PODPIS_KAFELKA,
  'ogrodzenie-metalowe-20230916-16x10': PODPIS_KAFELKA,
  'ogrodzenie-metalowe-20240217a-16x10': PODPIS_KAFELKA,
  'ogrodzenie-metalowe-20240217b-16x10': PODPIS_KAFELKA,
  'brama-przesuwna-metalowa-20240604-16x10': PODPIS_KAFELKA,
  'dom-blizniak-20250110-16x10': PODPIS_KAFELKA,
  'dom-blizniak-20250423-16x10': PODPIS_KAFELKA,
  'podjazd-brama-przesuwna-20250710-16x10': PODPIS_KAFELKA,
  'ogrodzenie-metalowe-20250821-16x10': PODPIS_KAFELKA,
  'ogrodzenie-metalowe-20250828-16x10': PODPIS_KAFELKA,
  'ogrodzenie-drewniane-20260125-16x10': PODPIS_KAFELKA,
  'furtka-drewniana-20260125-16x10': PODPIS_KAFELKA,
  'ogrodzenie-metalowe-brama-20260125-16x10': PODPIS_KAFELKA,
  'ogrodzenie-panelowe-2-16x10': PODPIS_KAFELKA,
  'ogrodzenie-panelowe-3d-16x10': PODPIS_KAFELKA,
  'brama-dwuskrzydlowa-16x10': PODPIS_KAFELKA,
}

/* ------------------------------------------------------------------ */
/* UŻYCIA - konkretne wystąpienia kadru w układzie                     */
/*                                                                     */
/* Pola:                                                               */
/*   crop      klucz z `crops`                                         */
/*   sizes     realna szerokość elementu w układzie (progi jak w CSS)   */
/*   alt       nadpisuje `alt` źródła w tym jednym miejscu             */
/*   priority  hero / LCP: fetchpriority="high", bez `loading="lazy"`   */
/*   art       drugi kadr dla innego okna: inna PROPORCJA albo inna      */
/*             TREŚĆ (mapa), nigdy sam rozmiar - od tego jest `srcset`  */
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
  'realizacja.01': uzycie('ogrodzenia-bramy-16x10', SIZES.kafelek, { alt: 'Ogrodzenie panelowe z bramą wjazdową', lightbox: true }),
  'realizacja.02': uzycie('podjazd-brama-przesuwna-20250710-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.03': uzycie('kostka-brukowa-2-16x10', SIZES.kafelek, { alt: 'Zagęszczanie świeżo ułożonej kostki brukowej zagęszczarką płytową przed garażem', lightbox: true }),
  'realizacja.04': uzycie('altana-16x10', SIZES.kafelek, { alt: 'Drewniana altana ogrodowa', lightbox: true }),
  'realizacja.05': uzycie('podmurowka-16x10', SIZES.kafelek, { alt: 'Ogrodzenie panelowe na betonowej podmurówce', lightbox: true }),
  'realizacja.06': uzycie('garaz-16x10', SIZES.kafelek, { alt: 'Garaż blaszany na posesji', lightbox: true }),
  'realizacja.07': uzycie('furtka-16x10', SIZES.kafelek, { alt: 'Furtka i przęsła ogrodzeniowe', lightbox: true }),
  'realizacja.08': uzycie('brama-przesuwna-16x10', SIZES.kafelek, { alt: 'Brama przesuwna z automatyką', lightbox: true }),
  'realizacja.09': uzycie('kostka-brukowa-16x10', SIZES.kafelek, { alt: 'Chodnik z kostki brukowej z obrzeżami', lightbox: true }),
  'realizacja.10': uzycie('domek-16x10', SIZES.kafelek, { alt: 'Domek narzędziowy w ogrodzie', lightbox: true }),

  /* 11-23: zdjęcia z telefonu (03.10.2026), `alt` bierze się ze źródła.
     24-26: te same fotografie co karty usług (`ogrodzenie-panelowe-2`,
     `-3d`, `brama-dwuskrzydlowa`) - jedno zdjęcie, jedno źródło, więc kafelek
     ma własny `alt` zamiast własnego pliku. */
  'realizacja.11': uzycie('furtka-brama-metalowa-20230206-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.12': uzycie('chodnik-taras-kostka-20230522-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.13': uzycie('ogrodzenie-metalowe-20230916-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.14': uzycie('ogrodzenie-metalowe-20240217a-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.15': uzycie('ogrodzenie-metalowe-20240217b-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.16': uzycie('brama-przesuwna-metalowa-20240604-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.17': uzycie('dom-blizniak-20250110-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.18': uzycie('dom-blizniak-20250423-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.19': uzycie('ogrodzenie-metalowe-20250821-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.20': uzycie('ogrodzenie-metalowe-20250828-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.21': uzycie('ogrodzenie-drewniane-20260125-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.22': uzycie('furtka-drewniana-20260125-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.23': uzycie('ogrodzenie-metalowe-brama-20260125-16x10', SIZES.kafelek, { lightbox: true }),
  'realizacja.24': uzycie('ogrodzenie-panelowe-2-16x10', SIZES.kafelek, { alt: 'Ogrodzenie panelowe z czarną podmurówką widziane wzdłuż, za siatką kostka brukowa', lightbox: true }),
  'realizacja.25': uzycie('ogrodzenie-panelowe-3d-16x10', SIZES.kafelek, { alt: 'Ogrodzenie panelowe z czarną podmurówką od frontu, za siatką kwitnące malwy', lightbox: true }),
  'realizacja.26': uzycie('brama-dwuskrzydlowa-16x10', SIZES.kafelek, { alt: 'Brama dwuskrzydłowa z łukowymi przęsłami przy wjeździe, obok furtka', lightbox: true }),

  /* ── mapa dojazdu (`MapaKontakt`, /kontakt/ i /o-nas/) ─────────────
     Art direction po TREŚCI, nie po proporcji: oba pliki są 3:2 i mają ten
     sam zasięg, różnią się podpisami. Pudełko ma `object-cover`, więc tam,
     gdzie jest węższe niż obraz, ucina boki - i ucinało skrajne podpisy
     w pół słowa. Wąski plik ma tylko podpisy, które mieszczą się w całości
     w najwęższym pudełku (290×362).
       do 639 px       telefon, `min-h-[360px]` - pudełko węższe niż obraz
       640-1023 px     jedna kolumna, wysokość wyznacza obraz - widać całość
       1024-1279 px    siatka, pudełko 426-575 px - boki ucięte
       od 1280 px      siatka, 554-576 px - widać wszystkie podpisy
     Ta sama proporcja obu plików jest warunkiem: `<source>` nie niesie
     `width`/`height`, a wysokość pudełka w jednej kolumnie wyznacza obraz.
  */
  'mapa.dojazd': uzycie('mapa-dojazd-szeroki-3x2', SIZES.mapa, {
    art: [{ crop: 'mapa-dojazd-waski-3x2', media: '(max-width:639px), (min-width:1024px) and (max-width:1279px)' }],
  }),

  /* ── mapa obszaru działania (/o-nas/, sekcja „Obszar działania") ────
     Art direction po PROPORCJI i skali podpisów. Pudełko ma proporcję
     obrazu (`aspect-square sm:aspect-[3/2]` w `o-nas.astro`), więc nic nie
     jest przycinane, a brak `width`/`height` na `<source>` nie przesuwa
     układu - wysokość wyznacza CSS, nie plik. */
  'mapa.region': uzycie('mapa-region-karta-3x2', SIZES.polowa, {
    art: [
      { crop: 'mapa-region-kwadrat-1x1', media: '(max-width:639px)' },
      { crop: 'mapa-region-tablet-3x2', media: '(min-width:640px) and (max-width:1023px)' },
    ],
  }),

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
