/**
 * CENNIK - odczyt jednego źródła kwot.
 *
 * ┌── CO TO ZAMYKA ─────────────────────────────────────────────────────┐
 * │ Wcześniej komplety były PRZECHOWYWANE obok swoich składowych i żaden │
 * │ nie zgadzał się z sumą: `panel-2d-komplet` stał jako 100-150 zł/mb,  │
 * │ a materiał (40-60) plus montaż (100-150) dawał 140-210. Sześć takich │
 * │ par naraz, każda spójna wewnątrz swojej podstrony - czyli rozjazd    │
 * │ był niewidoczny przy czytaniu jednej strony.                         │
 * │                                                                      │
 * │ [decyzja] CENA CAŁKOWITA NIE JEST PRZECHOWYWANA. Plik niesie         │
 * │ wyłącznie `material` i `montaz`; `razem` liczy ten moduł. Rozjazd    │
 * │ przestaje być wykrywalny - nie ma go gdzie wpisać.                   │
 * │                                                                      │
 * │ [decyzja] Transport, dojazd, drobny osprzęt i narzut mieszczą się    │
 * │ w tych dwóch wartościach. Trzeciego składnika nie ma i nie dodajemy. │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * [decyzja] PODZIAŁ PLIKU IDZIE PO PODSTRONACH, nie po typach usług.
 * Klucz strony = klucz trasy z `src/config/routes.ts`. Klient otwiera
 * podstronę i widzi dokładnie te pozycje, które edytuje w formularzu -
 * wcześniej podział typ → rodzaj nie odpowiadał niczemu, co widać w
 * przeglądarce, więc nie dało się sprawdzić, co się właśnie zmienia.
 *
 * [decyzja] Przydział: hub dostaje to, co wspólne dla co najmniej dwóch
 * usług w tym hubie albo zbiorcze; podstrona usługi to, co dotyczy
 * wyłącznie jej, plus jej usługi dodatkowe.
 *
 * `przeglad` to LISTA IDENTYFIKATORÓW z innych stron, nigdy kwot. Pozycja
 * ma wartości w dokładnie jednym miejscu.
 */

import zrodlo from '../content/cennik.json'
import { KLUCZE_TRAS } from '../config/routes'
import { zarejestruj } from './indeks'
import { kwota, od, zakres } from './kwoty'

/** Widełki jednego składnika. `max: null` znaczy „od X w górę". */
export interface Skladnik {
  min: number
  max: number | null
}

/** Pozycja liczona z innej: `razem` źródła przemnożone przez `mnoznik`. */
export interface Wyliczenie {
  z: string
  mnoznik: number
}

export interface PozycjaCennika {
  id: string
  usluga: string
  jednostka: string
  material?: Skladnik
  montaz?: Skladnik
  wyliczenie?: Wyliczenie
}

export interface StronaCennika {
  etykieta: string
  /** Nagłówek tabeli na hubie. Podstrona usługi buduje własny z nazwy usługi. */
  tytulPrzegladu?: string
  pozycje: PozycjaCennika[]
  /** Identyfikatory pozycji z INNYCH stron, doklejane do tabeli tej strony. */
  przeglad?: string[]
}

interface PlikCennika {
  wersja: number
  strony: Record<string, StronaCennika>
}

export type WariantCeny = 'zakres' | 'od' | 'min' | 'max' | 'material' | 'montaz'

/** Wiersz gotowy do tabeli. */
export interface WierszCennika {
  id: string
  usluga: string
  /** `null` przy pozycji wyliczanej - nie ma czego rozbijać. */
  material: string | null
  montaz: string | null
  razem: string
}

const PLIK = zrodlo as unknown as PlikCennika
const STRONY = PLIK.strony

/* ------------------------------------------------------------------ */
/* Indeks i kontrola spójności - wykonywane raz, przy budowaniu        */
/* ------------------------------------------------------------------ */

/**
 * Płaski indeks pozycji. Identyfikator jest unikalny GLOBALNIE, bo w zdaniu
 * nie ma miejsca na ścieżkę - `{cena.panel-2d.zakres}` musi wskazywać jedną
 * pozycję niezależnie od tego, na której stronie stoi.
 */
const POZYCJE = new Map<string, PozycjaCennika>()
/** Strona, na której pozycja stoi - żeby błąd o powtórce wskazał oba miejsca. */
const STRONA_POZYCJI = new Map<string, string>()

const ZNANE_TRASY = new Set<string>(KLUCZE_TRAS)

for (const [kluczStrony, strona] of Object.entries(STRONY)) {
  if (!ZNANE_TRASY.has(kluczStrony)) {
    throw new Error(
      `Klucz strony cennika "${kluczStrony}" nie istnieje w src/config/routes.ts. ` +
        'Podział cennika idzie po podstronach - klucz musi być kluczem trasy.'
    )
  }
  for (const pozycja of strona.pozycje) {
    const gdzieJuz = STRONA_POZYCJI.get(pozycja.id)
    if (gdzieJuz) {
      throw new Error(
        `Powtórzony identyfikator pozycji cennika "${pozycja.id}" ` +
          `(strony "${gdzieJuz}" i "${kluczStrony}") - identyfikator jest unikalny globalnie.`
      )
    }
    POZYCJE.set(pozycja.id, pozycja)
    STRONA_POZYCJI.set(pozycja.id, kluczStrony)
  }
}

for (const [kluczStrony, strona] of Object.entries(STRONY)) {
  for (const id of strona.przeglad ?? []) {
    if (!POZYCJE.has(id)) {
      throw new Error(
        `Przegląd strony "${kluczStrony}" wskazuje nieistniejącą pozycję "${id}" ` +
          '- patrz src/content/cennik.json.'
      )
    }
  }
  for (const pozycja of strona.pozycje) {
    const w = pozycja.wyliczenie
    if (!w) continue
    const zrodloPozycji = POZYCJE.get(w.z)
    if (!zrodloPozycji) {
      throw new Error(
        `Pozycja "${pozycja.id}" liczy się z nieistniejącej pozycji "${w.z}" ` +
          '- patrz src/content/cennik.json.'
      )
    }
    if (zrodloPozycji.wyliczenie) {
      throw new Error(
        `Pozycja "${pozycja.id}" liczy się z "${w.z}", która sama jest wyliczana. ` +
          'Łańcuch wyliczeń jest zabroniony - wskaż pozycję z materiałem i montażem.'
      )
    }
  }
}

/* ------------------------------------------------------------------ */
/* Odczyt pojedynczej pozycji                                          */
/* ------------------------------------------------------------------ */

export function pozycja(id: string): PozycjaCennika {
  const znaleziona = POZYCJE.get(id)
  if (!znaleziona) {
    throw new Error(`Nieznana pozycja cennika "${id}" - patrz src/content/cennik.json`)
  }
  return znaleziona
}

/**
 * CENA CAŁKOWITA - materiał plus montaż, albo `razem` źródła razy mnożnik.
 *
 * `null` w którymkolwiek górnym krańcu daje `null` w wyniku: „od 5 000 zł"
 * plus „3 500-6 000 zł" to nadal „od 8 500 zł", a nie zakres z wymyślonym
 * górnym krańcem.
 */
export function razem(id: string): Skladnik {
  const p = pozycja(id)

  if (p.wyliczenie) {
    const podstawa = razem(p.wyliczenie.z)
    return {
      min: podstawa.min * p.wyliczenie.mnoznik,
      max: podstawa.max === null ? null : podstawa.max * p.wyliczenie.mnoznik,
    }
  }

  if (!p.material || !p.montaz) {
    throw new Error(
      `Pozycja "${id}" nie ma ani pary materiał + montaż, ani wyliczenia. ` +
        'Schemat w content.config.ts przepuścił coś, czego nie umiem policzyć.'
    )
  }
  return {
    min: p.material.min + p.montaz.min,
    max: p.material.max === null || p.montaz.max === null ? null : p.material.max + p.montaz.max,
  }
}

/** Widełki składnika sformatowane; `null`, gdy pozycja jest wyliczana. */
function skladnik(p: PozycjaCennika, ktory: 'material' | 'montaz'): string | null {
  const s = p[ktory]
  if (!s) return null
  return s.max === null ? od(s.min, p.jednostka) : zakres(s.min, s.max, p.jednostka)
}

/** Sformatowana kwota pozycji. Zapis w całości po stronie `kwoty.ts`. */
export function cena(id: string, wariant: WariantCeny = 'zakres'): string {
  const p = pozycja(id)

  if (wariant === 'material' || wariant === 'montaz') {
    const wynik = skladnik(p, wariant)
    if (wynik === null) {
      throw new Error(
        `Pozycja "${id}" jest wyliczana i nie ma rozbicia - ` +
          `wariant {cena.${id}.${wariant}} nie istnieje.`
      )
    }
    return wynik
  }

  const suma = razem(id)
  switch (wariant) {
    case 'od':
      return od(suma.min, p.jednostka)
    case 'min':
      return kwota(suma.min, p.jednostka)
    case 'max':
      if (suma.max === null) {
        throw new Error(
          `Pozycja "${id}" nie ma górnego krańca - wariant {cena.${id}.max} nie istnieje.`
        )
      }
      return kwota(suma.max, p.jednostka)
    default:
      return suma.max === null ? od(suma.min, p.jednostka) : zakres(suma.min, suma.max, p.jednostka)
  }
}

/* ------------------------------------------------------------------ */
/* Odczyt strony                                                       */
/* ------------------------------------------------------------------ */

export function strona(klucz: string): StronaCennika {
  const znaleziona = STRONY[klucz]
  if (!znaleziona) {
    throw new Error(`Brak cennika dla strony "${klucz}" - patrz src/content/cennik.json`)
  }
  return znaleziona
}

/**
 * Identyfikatory do pokazania na stronie: własne pozycje w kolejności z pliku,
 * potem doklejony `przeglad`.
 *
 * Przy powtórzeniu decyduje WYSTĄPIENIE PÓŹNIEJSZE, czyli `przeglad`: skoro
 * strona wymienia pozycję na swojej liście przeglądu, to ta lista mówi, gdzie
 * ma ona stać. Bez tego hub ogrodzeń zaczynałby tabelę od automatyki, bo
 * automatyka jest jego jedyną własną pozycją - a wymienia ją na końcu
 * przeglądu, za bramami, do których jest dopłatą.
 */
function identyfikatoryStrony(klucz: string): string[] {
  const s = strona(klucz)
  const kolejne = [...s.pozycje.map((p) => p.id), ...(s.przeglad ?? [])]
  return kolejne.filter((id, i) => kolejne.lastIndexOf(id) === i)
}

/** Jeden wiersz tabeli. Melduje użycie kwoty w indeksie dla narzędzia korekty. */
function wiersz(id: string, gdzie: string): WierszCennika {
  const p = pozycja(id)
  zarejestruj(`cena.${id}.zakres`, gdzie)
  return {
    id,
    usluga: p.usluga,
    material: skladnik(p, 'material'),
    montaz: skladnik(p, 'montaz'),
    razem: cena(id),
  }
}

/** Wiersze tabeli cennika na podstronie o tym kluczu trasy. */
export function pozycjeStrony(klucz: string): WierszCennika[] {
  return identyfikatoryStrony(klucz).map((id) => wiersz(id, `tabela cennika: ${klucz}`))
}

/** Nagłówek tabeli na hubie. Podstrona usługi ma własny, z nazwy usługi. */
export function tytulPrzegladu(klucz: string): string {
  const tytul = strona(klucz).tytulPrzegladu
  if (!tytul) {
    throw new Error(
      `Strona cennika "${klucz}" nie ma "tytulPrzegladu", a szablon go wymaga ` +
        '- dopisz go w src/content/cennik.json.'
    )
  }
  return tytul
}

/* ------------------------------------------------------------------ */
/* Widok administracyjny i indeks znaczników                           */
/* ------------------------------------------------------------------ */

/** Wszystko naraz, w kolejności z pliku - dla widoku `/cennik/`. */
export function cennikPelny(): { klucz: string; strona: StronaCennika }[] {
  return Object.entries(STRONY).map(([klucz, strona]) => ({ klucz, strona }))
}

export function wszystkiePozycje(): PozycjaCennika[] {
  return [...POZYCJE.values()]
}
