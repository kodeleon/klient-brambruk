/**
 * FORMATER KWOT - jedno miejsce na to, jak wygląda cena w całym serwisie.
 *
 * Przed rozdziałem treści od techniki w plikach stało obok siebie
 * `3 500–8 000 zł` i `4000+ zł`: ta sama informacja w dwóch zapisach,
 * bo każdą wpisywał człowiek osobno. Teraz w treści są liczby, a zapis
 * powstaje tutaj.
 *
 * Trzy decyzje zapisane w kodzie, nie w głowie:
 *   · PÓŁPAUZA (–, U+2013) w zakresach, nie dywiz i nie pauza,
 *   · tysiące rozdzielone ZWYKŁĄ SPACJĄ - tak jak w treści zastanej,
 *   · jednostka dopisywana raz, na końcu, nie przy obu liczbach.
 */

const POLPAUZA = '–'

/** `3500` → `3 500`. Setki i mniejsze zostają bez zmian. */
export function liczba(wartosc: number): string {
  return String(wartosc).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Jedna kwota z jednostką: `100 zł/mb`. */
export function kwota(wartosc: number, jednostka: string): string {
  return `${liczba(wartosc)} ${jednostka}`
}

/** Widełki: `100–150 zł/mb`. Przy równych krańcach zwraca jedną kwotę. */
export function zakres(min: number, max: number, jednostka: string): string {
  if (min === max) return kwota(min, jednostka)
  return `${liczba(min)}${POLPAUZA}${liczba(max)} ${jednostka}`
}

/** Dolny próg bez górnego: `od 4 000 zł`. */
export function od(min: number, jednostka: string): string {
  return `od ${kwota(min, jednostka)}`
}
