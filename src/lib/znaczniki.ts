/**
 * ZNACZNIKI W TREŚCI - `{grupa.klucz.wariant}` rozwijane przy budowaniu.
 *
 * ┌── PO CO ────────────────────────────────────────────────────────────┐
 * │ Kwota, telefon albo rok założenia to wartość, która NIE PODLEGA      │
 * │ ODMIANIE i musi być identyczna wszędzie. Wpisana ręcznie w dwudziestu│
 * │ zdaniach rozjeżdża się przy pierwszej poprawce - i tak właśnie brama │
 * │ przesuwna miała na tym serwisie cztery różne ceny.                   │
 * │                                                                      │
 * │ Tekst, który się odmienia („lubelskiego, podlaskiego i mazowieckiego"│
 * │ kontra „Lubelszczyzna"), znacznikiem NIE JEST: nie ma jednej wartości │
 * │ do wstawienia, więc klient pisze pełne zdanie.                       │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * BEZ WYRAŻEŃ. Żadnego `{(min+max)/2}`. Wartości pochodne liczy TypeScript
 * i wystawia pod nazwą - tak samo jak ICU MessageFormat, gdzie arytmetyki
 * w komunikacie nie ma z założenia.
 *
 * NIEZNANY KLUCZ PRZERYWA BUDOWANIE. Cichy pusty łańcuch oznaczałby stronę
 * wydaną z dziurą w zdaniu, o której nikt się nie dowie.
 *
 * ⚠️ MODUŁ WYŁĄCZNIE SERWEROWY (przez `indeks.ts` sięga po `node:fs`) -
 * nie wolno go importować z `src/scripts/`. Skrypt przeglądarki, który
 * potrzebuje danych firmy, importuje `src/content/firma.json` wprost.
 */

import { zarejestruj } from './indeks'
import { WARTOSCI } from './wartosci'

/**
 * Klucz: litery, cyfry, kropka, dywiz. Dywiz jest konieczny, bo identyfikatory
 * pozycji cennika są w formie `panel-2d`.
 *
 * WARIANTY CEN po przebudowie cennika - sześć na pozycję:
 *
 *   {cena.<id>.zakres}    → 140–210 zł/mb   (materiał + robocizna)
 *   {cena.<id>.od}        → od 140 zł/mb
 *   {cena.<id>.min}       → 140 zł/mb
 *   {cena.<id>.max}       → 210 zł/mb
 *   {cena.<id>.material}  → 40–60 zł/mb
 *   {cena.<id>.montaz}    → 100–150 zł/mb
 *
 * Cztery pierwsze to CENA CAŁKOWITA, której w pliku treści nie ma: liczy ją
 * `cennik.ts` z materiału i montażu. Warianty powstają w `wartosci.ts`, tutaj
 * jest tylko rozwijanie - i świadomie, bo ten moduł nie ma wiedzieć, skąd
 * bierze się wartość pod kluczem.
 */
const WZORZEC = /\{([a-z0-9][a-z0-9.\-]*)\}/gi

/**
 * ⚠️ BIAŁA LISTA ZNACZNIKÓW DOPUSZCZONYCH W POLACH INDEKSOWANYCH.
 *
 * Do `<title>`, `meta description`, danych strukturalnych i `og:*` wolno
 * wyłącznie to, co się nie zmienia samo. Wartość liczona przy budowaniu
 * (liczba lat, liczba realizacji) po nowym roku zmieni opis bez niczyjej
 * decyzji, a strona straci sygnał, na którym była indeksowana.
 *
 * Ceny też tu nie wchodzą: zmieniają się częściej niż raz na rok i nie ma
 * powodu, żeby ciągnęły za sobą przepisanie opisów dwudziestu podstron.
 */
export const ZNACZNIKI_STATYCZNE: ReadonlySet<string> = new Set([
  'firma.nazwa',
  'firma.nazwaPelna',
  'firma.opis',
  'firma.region',
  'firma.adres',
  'firma.telefon',
  'firma.email',
  'firma.nip',
  'firma.regon',
  'firma.rokZalozenia',
])

/* ------------------------------------------------------------------ */
/* Rozwijanie                                                           */
/* ------------------------------------------------------------------ */

/** Same klucze znalezione w tekście, bez rozwijania. */
export function klucze(tekst: string): string[] {
  return [...tekst.matchAll(WZORZEC)].map((t) => t[1])
}

/**
 * Wartość jednego znacznika. Używana wprost w szablonach `.astro`, gdzie
 * klamry należą do Astro i literalne `{firma.email}` zostałoby potraktowane
 * jak wyrażenie JavaScriptu.
 */
export function znacznik(klucz: string, gdzie = 'szablon'): string {
  const wartosc = WARTOSCI[klucz]
  if (wartosc === undefined) {
    throw new Error(
      `Nieznany znacznik {${klucz}} w ${gdzie}. ` +
        'Dopisz wartość w src/lib/wartosci.ts albo popraw klucz w treści.'
    )
  }
  zarejestruj(klucz, gdzie)
  return wartosc
}

/** Rozwija wszystkie znaczniki w jednym łańcuchu. */
export function rozwin(tekst: string, gdzie: string): string {
  if (!tekst.includes('{')) return tekst
  return tekst.replace(WZORZEC, (_dopasowanie, klucz: string) => znacznik(klucz, gdzie))
}

/**
 * Rozwija znaczniki w całym rekordzie treści - łańcuchy w tablicach
 * i zagnieżdżonych obiektach też. Rekord wchodzi w jednym kawałku, więc nie
 * ma pola, o którym ktoś zapomni.
 */
export function rozwinGleboko<T>(dane: T, gdzie: string): T {
  if (typeof dane === 'string') return rozwin(dane, gdzie) as T
  if (Array.isArray(dane)) return dane.map((pozycja) => rozwinGleboko(pozycja, gdzie)) as T
  if (dane && typeof dane === 'object') {
    const wynik: Record<string, unknown> = {}
    for (const [klucz, wartosc] of Object.entries(dane as Record<string, unknown>)) {
      wynik[klucz] = rozwinGleboko(wartosc, `${gdzie} → ${klucz}`)
    }
    return wynik as T
  }
  return dane
}
