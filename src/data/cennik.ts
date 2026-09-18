/**
 * CENNIK - wszystkie kwoty używane w serwisie, w jednym pliku.
 *
 * Trzy eksporty odpowiadają trzem miejscom na stronie:
 *   cennikHubow  - tabela „Orientacyjne ceny" na podstronach kategorii,
 *   cennikUslug  - tabela „Orientacyjny cennik" na podstronach usług,
 *   kartyUslug   - kafelki z ceną na /uslugi/.
 *
 * Przeniesione bez zmian z `code/src/data/pricing.js`. Adresy zdjęć
 * zastąpione kluczami z manifestu mediów (`media/images.config.mjs`) -
 * plik nie wie, gdzie leży fotografia, i wiedzieć nie musi.
 *
 * Podgląd wszystkich kwot naraz: /cennik/ (widok administracyjny).
 */

export const cennikHubow = {
  ogrodzenia: {
    tytul: 'Ile kosztuje ogrodzenie?',
    pozycje: [
      { usluga: 'Ogrodzenie panelowe 2D (z montażem)', cena: '100–150 zł/mb' },
      { usluga: 'Ogrodzenie panelowe 3D (z montażem)', cena: '120–180 zł/mb' },
      { usluga: 'Podmurówka betonowa', cena: '30–70 zł/mb' },
      { usluga: 'Brama przesuwna (z montażem)', cena: '3 500–8 000 zł' },
      { usluga: 'Brama dwuskrzydłowa (z montażem)', cena: '3 000–7 000 zł' },
      { usluga: 'Furtka ogrodzeniowa (z montażem)', cena: '1 200–3 000 zł' },
    ],
  },
  brukarstwo: {
    tytul: 'Ile kosztuje brukarstwo?',
    pozycje: [
      { usluga: 'Układanie kostki brukowej (robocizna)', cena: '70–95 zł/m²' },
      { usluga: 'Podjazd z kostki brukowej (robocizna)', cena: '80–110 zł/m²' },
      { usluga: 'Chodnik / alejka (robocizna)', cena: '65–85 zł/m²' },
      { usluga: 'Taras z kostki (robocizna)', cena: '75–100 zł/m²' },
      { usluga: 'Materiał - kostka + podbudowa', cena: '30–80 zł/m²' },
    ],
  },
  budownictwo: {
    tytul: 'Ile kosztuje budowa?',
    pozycje: [
      { usluga: 'Altana drewniana 3×3 m', cena: '8 000–15 000 zł' },
      { usluga: 'Altana drewniana 4×4 m', cena: '12 000–22 000 zł' },
      { usluga: 'Altana z grillem murowanym', cena: '15 000–30 000 zł' },
      { usluga: 'Garaż blaszany (z montażem)', cena: '3 000–8 000 zł' },
      { usluga: 'Domek narzędziowy', cena: '4 000–12 000 zł' },
      { usluga: 'Wiata samochodowa', cena: '5 000–15 000 zł' },
    ],
  },
};

// ─── Service detail pricing ───────────────────────────────────
// Tabele cennika wyświetlane na stronach szczegółowych usług

export const cennikUslug = {

  // ── Ogrodzenia ────────────────────────────────────────────

  panelowe: [
    { usluga: 'Panel ogrodzeniowy 2D (materiał)', cena: '40–60 zł/mb' },
    { usluga: 'Panel ogrodzeniowy 3D (materiał)', cena: '50–80 zł/mb' },
    { usluga: 'Montaż ogrodzenia panelowego', cena: '100–150 zł/mb' },
    { usluga: 'Komplet z montażem', cena: '80–300 zł/mb' },
  ],

  murowane: [
    { usluga: 'Podmurówka wylewana', cena: '300–500 zł/mb' },
    { usluga: 'Słupki murowane', cena: '400–800 zł/szt.' },
    { usluga: 'Ogrodzenie murowane kompletne z wypełnieniem', cena: '1 300–2 100 zł/mb' },
  ],

  siatka: [
    { usluga: 'Siatka ogrodzeniowa (materiał)', cena: '15–30 zł/mb' },
    { usluga: 'Montaż siatki ze słupkami', cena: '40–60 zł/mb' },
    { usluga: 'Siatka komplet z montażem', cena: '40–80 zł/mb' },
  ],

  'bramy-przesuwne': [
    { usluga: 'Brama przesuwna (materiał)', cena: '5 000–11 000 zł' },
    { usluga: 'Montaż bramy przesuwnej', cena: '3 500–6 000 zł' },
    { usluga: 'Automatyka (napęd + akcesoria)', cena: '4000+ zł' },
    { usluga: 'Brama komplet z montażem i automatyką', cena: '12 000–21 000 zł' },
  ],

  'bramy-dwuskrzydlowe': [
    { usluga: 'Brama dwuskrzydłowa (materiał)', cena: '2 000–5 000 zł' },
    { usluga: 'Montaż bramy dwuskrzydłowej', cena: '1 400–3 500 zł' },
    { usluga: 'Automatyka (siłowniki + akcesoria)', cena: '4 000–6 000 zł' },
    { usluga: 'Brama komplet z montażem', cena: '7 000–12 000 zł' },
  ],

  furtki: [
    { usluga: 'Furtka panelowa', cena: '800–1 500 zł' },
    { usluga: 'Furtka stalowa/kuta', cena: '1 200–2 500 zł' },
    { usluga: 'Montaż furtki', cena: '300–600 zł' },
    { usluga: 'Furtka komplet z montażem', cena: '1 200–3 000 zł' },
  ],

  // ── Brukarstwo ────────────────────────────────────────────

  'kostka-brukowa': [
    { usluga: 'Układanie kostki brukowej (robocizna)', cena: '100–150 zł/m²' },
    { usluga: 'Korytowanie + podbudowa', cena: '30–50 zł/m²' },
    { usluga: 'Krawężniki / obrzeża', cena: '20–35 zł/mb' },
    { usluga: 'Kostka brukowa (materiał)', cena: '30–80 zł/m²' },
    { usluga: 'Komplet z materiałem', cena: '200–350 zł/m²' },
  ],

  podjazdy: [
    { usluga: 'Podjazd z kostki (robocizna)', cena: '100–150 zł/m²' },
    { usluga: 'Korytowanie + podbudowa wzmocniona', cena: '35–55 zł/m²' },
    { usluga: 'Krawężniki najazdowe', cena: '25–40 zł/mb' },
    { usluga: 'Odwodnienie liniowe', cena: '120–200 zł/mb' },
    { usluga: 'Podjazd komplet z materiałem', cena: '250–400 zł/m²' },
  ],

  'chodniki-tarasy': [
    { usluga: 'Chodnik / alejka (robocizna)', cena: '65–85 zł/m²' },
    { usluga: 'Taras z kostki (robocizna)', cena: '75–100 zł/m²' },
    { usluga: 'Schody terenowe', cena: '150–300 zł/mb' },
    { usluga: 'Obrzeża trawnikowe', cena: '15–25 zł/mb' },
    { usluga: 'Chodnik komplet z materiałem', cena: '95–160 zł/m²' },
  ],
};

// ─── Uslugi page cards ────────────────────────────────────────
// Karty usług wyświetlane na stronie /uslugi z etykietami cenowymi

export const kartyUslug = {

  ogrodzenia: [
    {
      tytul: 'Ogrodzenie panelowe 2D',
      cena: '100–300 zł/mb',
      nota: 'materiał + montaż',
      foto: 'karta.panelowe',
      href: '/ogrodzenia/panelowe/',
      opis: 'Panel ocynkowany malowany proszkowo RAL. Montaż na słupkach w gruncie lub na podmurówce.',
    },
    {
      tytul: 'Ogrodzenie panelowe 3D',
      cena: '120–320 zł/mb',
      nota: 'materiał + montaż',
      foto: 'karta.panelowe-3d',
      href: '/ogrodzenia/panelowe/',
      opis: 'Panel z przetłoczeniami - sztywniejszy, bardziej estetyczny. Idealny na ogrodzenie frontowe.',
    },
    {
      tytul: 'Ogrodzenie murowane',
      cena: '1 300–2 100 zł/mb',
      nota: 'prefabrykat lub wylewana',
      foto: 'karta.murowane',
      href: '/ogrodzenia/murowane/',
      opis: 'Betonowy cokół pod panel. Chroni przed wilgocią, podnosi estetykę ogrodzenia.',
    },
    {
      tytul: 'Ogrodzenie z siatki',
      cena: '100–200 zł/mb',
      nota: 'materiał + montaż',
      foto: 'karta.siatka-uslugi',
      href: '/ogrodzenia/',
      opis: 'Ekonomiczne ogrodzenie na działki i ogrody. Siatka ocynkowana lub powlekana PCV.',
    },
    {
      tytul: 'Brama przesuwna',
      cena: '8 500–17 000 zł',
      nota: 'z montażem',
      foto: 'karta.brama-przesuwna',
      href: '/ogrodzenia/bramy-przesuwne/',
      opis: 'Samonośna lub na szynie, szer. 3–6 m. Z automatyką: +4 000–5 000 zł.',
    },
    {
      tytul: 'Brama dwuskrzydłowa',
      cena: '7 000–12 000 zł',
      nota: 'z montażem',
      foto: 'karta.brama-dwuskrzydlowa',
      href: '/ogrodzenia/bramy-dwuskrzydlowe/',
      opis: 'Klasyczna brama wjazdowa, panelowa lub kuta. Z automatyką: +3 000–4 000 zł.',
    },
    {
      tytul: 'Furtka ogrodzeniowa',
      cena: '1 200–3 000 zł',
      nota: 'z montażem',
      foto: 'karta.furtka',
      href: '/ogrodzenia/furtki/',
      opis: 'Dopasowana do ogrodzenia - panel, stal, aluminium. Z zamkiem i samozamykaczem. Z videodomofonem +3 000-4 000 zł.',
    },
  ],

  brukarstwo: [
    {
      tytul: 'Kostka brukowa - układanie',
      cena: '200–350 zł/m²',
      nota: 'robocizna + materiał',
      foto: 'karta.kostka',
      href: '/brukarstwo/kostka-brukowa/',
      opis: 'Pełna realizacja: korytowanie, podbudowa, podsypka, kostka, fugowanie.',
    },
    {
      tytul: 'Podjazd z kostki brukowej',
      cena: '250–400 zł/m²',
      nota: 'robocizna + materiał',
      foto: 'karta.podjazd',
      href: '/brukarstwo/podjazdy/',
      opis: 'Wzmocniona podbudowa pod ruch samochodowy. Krawężniki i obrzeża w cenie.',
    },
    {
      tytul: 'Chodnik / alejka ogrodowa',
      cena: '95–160 zł/m²',
      nota: 'robocizna + materiał',
      foto: 'karta.chodnik',
      href: '/brukarstwo/chodniki-tarasy/',
      opis: 'Estetyczne alejki i chodniki - dopasowane do stylu ogrodu i elewacji.',
    },
    {
      tytul: 'Taras z kostki brukowej',
      cena: '110–180 zł/m²',
      nota: 'robocizna + materiał',
      foto: 'karta.kostka',
      href: '/brukarstwo/chodniki-tarasy/',
      opis: 'Przestrzeń wypoczynkowa przy domu. Odprowadzenie wody i wykończenie obrzeżami.',
    },
  ],

  budownictwo: [
    {
      tytul: 'Altana ogrodowa',
      cena: 'wycena indywidualna',
      nota: '',
      foto: 'karta.altana',
      href: '/budownictwo/',
      opis: 'Altany drewniane i stalowe w różnych wymiarach. Możliwość daszku, ławek i oświetlenia.',
    },
    {
      tytul: 'Garaż blaszany',
      cena: 'wycena indywidualna',
      nota: '',
      foto: 'karta.garaz',
      href: '/budownictwo/',
      opis: 'Garaże jednostanowiskowe i wielostanowiskowe. Montaż na gotowej wylewce.',
    },
    {
      tytul: 'Domek narzędziowy',
      cena: 'wycena indywidualna',
      nota: '',
      foto: 'karta.domek',
      href: '/budownictwo/',
      opis: 'Schowki ogrodowe i domki narzędziowe. Solidna konstrukcja odporna na warunki atmosferyczne.',
    },
  ],
};
