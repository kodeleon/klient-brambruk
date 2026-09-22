/**
 * WARTOŚCI ZNACZNIKÓW - płaski indeks `grupa.klucz[.wariant]` → gotowy tekst.
 *
 * Grupowanie w plikach treści (cennik: typ → rodzaj → pozycje) jest DLA
 * CZŁOWIEKA, żeby dało się coś znaleźć ręcznie. Znacznik jest płaski, bo
 * w zdaniu nie ma miejsca na ścieżkę. Ten plik jest tłumaczem między jednym
 * a drugim i to jedyne miejsce, które zna obie strony.
 *
 * ⚠️ WARTOŚCI POCHODNE LICZY TEN PLIK, nie treść. W zdaniu nie ma wyrażeń
 * (żadnego `{(min+max)/2}`) - tak samo jak w ICU MessageFormat, gdzie
 * arytmetyki w komunikacie nie ma z założenia. Wariant pochodny dochodzi
 * dopiero wtedy, gdy jest realnie używany.
 */

import firma from '../content/firma.json'
import dowody from '../content/dowody.json'
import { cena, razem, wszystkiePozycje } from './cennik'
import { odmien, odmienDopelniacz } from './odmiana'

/**
 * Lata na rynku LICZONE, nie przechowywane.
 *
 * Wcześniej w danych stało `statystyki.lata: 6` obok `2020` wpisanego
 * w trzech miejscach prozy. Cztery wartości mówiące to samo, z których
 * każda starzeje się osobno. Zostaje rok założenia; reszta wychodzi z niego.
 *
 * ⚠️ Ta liczba zmienia się sama w Nowy Rok - dlatego `{firma.lata}`
 * i `{firma.latOd}` są poza białą listą znaczników dopuszczonych w polach
 * indeksowanych (patrz `znaczniki.ts`).
 */
const lata = new Date().getFullYear() - firma.rokZalozenia

export const WARTOSCI: Record<string, string> = {
  // --- dane firmy: niezmienne, wolno ich używać w polach indeksowanych ---
  'firma.nazwa': firma.nazwa,
  'firma.nazwaPelna': firma.nazwaPelna,
  'firma.opis': firma.opis,
  'firma.region': firma.region,
  'firma.adres': firma.adres,
  'firma.nip': firma.nip,
  'firma.regon': firma.regon,
  'firma.telefon': firma.telefon,
  'firma.email': firma.email,
  'firma.rokZalozenia': String(firma.rokZalozenia),
  'firma.administrator': firma.administrator,
  'firma.emailRodo': firma.emailRodo,

  // --- dowody: liczby i ocena, zmieniane ręcznie razem z treścią ---
  'firma.realizacje': dowody.statystyki.realizacje,
  'firma.miejscowosci': String(dowody.statystyki.miejscowosci),
  'firma.zasieg': dowody.statystyki.zasieg,
  'firma.ocenaFixly': dowody.fixly.ocena,
  'firma.opinieFixly': String(dowody.fixly.opinie),

  /**
   * Mianownik: „{firma.lata} pracy w regionie" → „6 lat pracy w regionie".
   * Dopełniacz: „na rynku od {firma.latOd}" → „na rynku od 6 lat", a przy
   * jedynce „na rynku od roku". Ta sama liczba, dwie formy - wariant wybiera
   * Kodeleon przy pisaniu zdania, nie klient i nie przeglądarka.
   */
  'firma.lata': odmien(lata, 'rok'),
  'firma.latOd': odmienDopelniacz(lata, 'rok'),
}

/**
 * CENY - sześć wariantów na pozycję, wszystkie liczone z jednego źródła.
 *
 *   {cena.panel-2d.zakres}    → 140–210 zł/mb   (materiał + robocizna)
 *   {cena.panel-2d.od}        → od 140 zł/mb
 *   {cena.panel-2d.min}       → 140 zł/mb
 *   {cena.panel-2d.max}       → 210 zł/mb
 *   {cena.panel-2d.material}  → 40–60 zł/mb
 *   {cena.panel-2d.montaz}    → 100–150 zł/mb
 *
 * Cztery pierwsze warianty pokazują CENĘ CAŁKOWITĄ, której w pliku nie ma -
 * liczy ją `cennik.ts` z materiału i montażu. Zdanie w prozie nie ma jak
 * rozjechać się z tabelą, bo obie strony biorą tę samą sumę.
 *
 * Wariant, który nie ma sensu, NIE POWSTAJE: `.max` przy pozycji bez górnego
 * krańca, `.material` i `.montaz` przy pozycji wyliczanej z innej. Nieznany
 * znacznik przerywa budowanie - to jest tańsze niż kwota wzięta znikąd.
 */
for (const pozycja of wszystkiePozycje()) {
  WARTOSCI[`cena.${pozycja.id}.zakres`] = cena(pozycja.id, 'zakres')
  WARTOSCI[`cena.${pozycja.id}.od`] = cena(pozycja.id, 'od')
  WARTOSCI[`cena.${pozycja.id}.min`] = cena(pozycja.id, 'min')
  if (razem(pozycja.id).max !== null) WARTOSCI[`cena.${pozycja.id}.max`] = cena(pozycja.id, 'max')
  if (!pozycja.wyliczenie) {
    WARTOSCI[`cena.${pozycja.id}.material`] = cena(pozycja.id, 'material')
    WARTOSCI[`cena.${pozycja.id}.montaz`] = cena(pozycja.id, 'montaz')
  }
}
