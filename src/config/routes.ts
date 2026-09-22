/**
 * ŚCIEŻKI PODSTRON - jedno źródło adresów w całym serwisie.
 *
 * ┌── PO CO ────────────────────────────────────────────────────────────┐
 * │ Przed rozdziałem treści od techniki ta sama ścieżka była wpisana     │
 * │ w pięciu miejscach: `nawigacja`, `nawigacjaStopki`, `kartyUslug.href`│
 * │ `huby.uslugi[].href` i `okruszekNadrzedny.href`. Pięć miejsc, które  │
 * │ muszą się zgadzać z `src/pages/` i między sobą - a nic tego nie      │
 * │ pilnowało. Zmiana adresu podstrony oznaczała pięć poprawek i jedną   │
 * │ zapomnianą.                                                          │
 * │                                                                      │
 * │ Teraz treść trzyma KLUCZ (`panelowe`), a ścieżkę zna wyłącznie ten   │
 * │ plik. Zły klucz w treści wywala build, bo schemat kolekcji sprawdza  │
 * │ go względem tej mapy.                                                │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * UKOŚNIK NA KOŃCU jest obowiązkowy - tak serwuje Cloudflare
 * (`html_handling: auto-trailing-slash`) i tak deklaruje `canonical`.
 * Odnośnik bez ukośnika kosztuje przekierowanie przy każdym kliknięciu.
 *
 * NAZWY KLUCZY PO POLSKU, zgodnie z resztą tego projektu. W bazie projektowej
 * obowiązuje angielski - tutaj przemianowanie się nie opłaca (DO-BAZY A).
 */

export const trasy = {
  glowna: '/',

  // podstrony ogólne
  uslugi: '/uslugi/',
  realizacje: '/realizacje/',
  'o-nas': '/o-nas/',
  kontakt: '/kontakt/',
  wycena: '/wycena/',
  credits: '/credits/',
  'polityka-prywatnosci': '/polityka-prywatnosci/',
  /** Widok administracyjny: nielinkowany z nawigacji, poza mapą strony. */
  cennik: '/cennik/',

  // huby kategorii
  ogrodzenia: '/ogrodzenia/',
  brukarstwo: '/brukarstwo/',
  budownictwo: '/budownictwo/',

  // podstrony rodzajów usług
  panelowe: '/ogrodzenia/panelowe/',
  murowane: '/ogrodzenia/murowane/',
  siatka: '/ogrodzenia/siatka/',
  'bramy-przesuwne': '/ogrodzenia/bramy-przesuwne/',
  'bramy-dwuskrzydlowe': '/ogrodzenia/bramy-dwuskrzydlowe/',
  furtki: '/ogrodzenia/furtki/',
  'kostka-brukowa': '/brukarstwo/kostka-brukowa/',
  podjazdy: '/brukarstwo/podjazdy/',
  'chodniki-tarasy': '/brukarstwo/chodniki-tarasy/',
} as const

export type KluczTrasy = keyof typeof trasy

/** Lista kluczy - do schematów zod, żeby zły klucz w treści wywalił build. */
export const KLUCZE_TRAS = Object.keys(trasy) as [KluczTrasy, ...KluczTrasy[]]

/**
 * Ścieżka spod klucza. Nieznany klucz PRZERYWA budowanie, zamiast wstawić
 * `undefined` w atrybut `href` - odnośnik donikąd wygląda na stronie
 * dokładnie tak samo jak działający.
 *
 * Przyjmuje `string`, bo klucze przychodzą z plików JSON, gdzie typ jest
 * szerszy. Zawężeniem zajmuje się schemat kolekcji (`z.enum(KLUCZE_TRAS)`),
 * a to sprawdzenie jest siatką na wszystko, co ten schemat omija.
 */
export function trasa(klucz: string): string {
  const sciezka = (trasy as Record<string, string>)[klucz]
  if (!sciezka) throw new Error(`Nieznany klucz trasy "${klucz}" - patrz src/config/routes.ts`)
  return sciezka
}

/** Kształt pozycji nawigacji po stronie odczytu (JSON nie niesie typów). */
export interface PozycjaNawigacji {
  etykieta: string
  trasa: string
  podmenu?: { etykieta: string; trasa: string }[]
}
