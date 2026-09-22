/**
 * ODMIANA LICZEBNIKÓW - `Intl.PluralRules` z Node, zero zależności.
 *
 * Dane pochodzą z CLDR wbudowanego w Node, więc reguła na 12-14 („12 lat",
 * nie „12 lata") wychodzi sama i nie trzeba jej pisać ręcznie. Sprawdzone
 * na Node 22.23: 1→one, 2,3,4→few, 5,6,12,13,25→many, 22,102→few.
 *
 * ⚠️ KATEGORIA LICZBY MNOGIEJ TO NIE PRZYPADEK GRAMATYCZNY.
 * `2 lata na rynku` (mianownik) i `od 2 lat` (dopełniacz) to ta sama liczba
 * w dwóch formach. `Intl.PluralRules` odpowiada wyłącznie na pytanie
 * „która z trzech form", a nie „w którym przypadku" - stąd dwie tabele
 * poniżej i dwa osobne znaczniki w treści.
 */

const REGULY = new Intl.PluralRules('pl-PL')

export interface FormyRzeczownika {
  readonly one: string
  readonly few: string
  readonly many: string
}

/** Mianownik: „6 lat doświadczenia", „3 realizacje". */
export const MIANOWNIK = {
  rok: { one: 'rok', few: 'lata', many: 'lat' },
  realizacja: { one: 'realizacja', few: 'realizacje', many: 'realizacji' },
  opinia: { one: 'opinia', few: 'opinie', many: 'opinii' },
} as const satisfies Record<string, FormyRzeczownika>

/** Dopełniacz: „na rynku od 6 lat", „od roku". */
export const DOPELNIACZ = {
  rok: { one: 'roku', few: 'lat', many: 'lat' },
  realizacja: { one: 'realizacji', few: 'realizacji', many: 'realizacji' },
  opinia: { one: 'opinii', few: 'opinii', many: 'opinii' },
} as const satisfies Record<string, FormyRzeczownika>

export type NazwaRzeczownika = keyof typeof MIANOWNIK

/** Sama forma rzeczownika, bez liczby. */
export function forma(
  ile: number,
  rzeczownik: NazwaRzeczownika,
  tabela: Record<NazwaRzeczownika, FormyRzeczownika> = MIANOWNIK
): string {
  const formy = tabela[rzeczownik]
  const kategoria = REGULY.select(ile)
  if (kategoria === 'one') return formy.one
  if (kategoria === 'few') return formy.few
  // `other` w polszczyźnie dotyczy ułamków („0,5 litra") - w tym serwisie
  // nie występuje, ale forma dopełniaczowa jest tu poprawnym domknięciem.
  return formy.many
}

/** Liczba plus rzeczownik w mianowniku: `6 lat`, `1 rok`, `2 lata`. */
export function odmien(ile: number, rzeczownik: NazwaRzeczownika): string {
  return `${ile} ${forma(ile, rzeczownik)}`
}

/**
 * Liczba plus rzeczownik w dopełniaczu: `6 lat`, `2 lat`, ale samo `roku`.
 *
 * Przy jedynce liczba wypada: „na rynku od roku" jest poprawne, a „od 1 roku"
 * brzmi jak formularz.
 */
export function odmienDopelniacz(ile: number, rzeczownik: NazwaRzeczownika): string {
  const slowo = forma(ile, rzeczownik, DOPELNIACZ)
  return ile === 1 ? slowo : `${ile} ${slowo}`
}
