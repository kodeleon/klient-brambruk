/**
 * PUNKT WEJŚCIA SKRYPTÓW.
 *
 * Trzy zasady, wszystkie wprost z checklisty przedwdrożeniowej:
 *
 * 1. MODUŁY SĄ ODIZOLOWANE. Każdy startuje we własnym `try`, więc wyjątek
 *    w jednym nie zabija pozostałych. Bez tego literówka w galerii wyłącza
 *    formularz, a to już jest bloker.
 *
 * 2. ŻADEN MODUŁ NIE JEST WARUNKIEM CZYTELNOŚCI STRONY. Skrypty dokładają
 *    zachowanie do gotowego dokumentu, nigdy go nie budują. Wyłączony
 *    JavaScript ma dać stronę uboższą o ruch, nie stronę pustą.
 *
 * 3. MODUŁ, KTÓRY NIE MA CO ROBIĆ, WYCHODZI OD RAZU. Każdy zaczyna od
 *    `querySelector` i wraca, jeśli nie znalazł swojego elementu. Dzięki temu
 *    lista poniżej jest wspólna dla całego serwisu.
 *
 * Nowe zachowanie dopisujesz jako osobny plik w `src/scripts/` i jedną
 * pozycję w tablicy niżej. Nie dopisuj logiki do tego pliku.
 */

import { ruch } from './ruch'
import { tlo } from './tlo'
import { naglowek } from './naglowek'
import { faq } from './faq'
import { galeria } from './galeria'
import { karuzela } from './karuzela'
import { filtry } from './filtry'
import { cta } from './cta'
import { formularz } from './formularz'
import { wycena } from './wycena'

type Modul = { nazwa: string; start: () => void | Promise<void> }

const moduly: Modul[] = [
  { nazwa: 'ruch', start: ruch },
  { nazwa: 'tlo', start: tlo },
  { nazwa: 'naglowek', start: naglowek },
  { nazwa: 'faq', start: faq },
  { nazwa: 'galeria', start: galeria },
  { nazwa: 'karuzela', start: karuzela },
  { nazwa: 'filtry', start: filtry },
  { nazwa: 'cta', start: cta },
  { nazwa: 'formularz', start: formularz },
  { nazwa: 'wycena', start: wycena },
]

for (const modul of moduly) {
  try {
    const wynik = modul.start()
    if (wynik instanceof Promise) {
      wynik.catch((err) => console.error(`[${modul.nazwa}]`, err))
    }
  } catch (err) {
    console.error(`[${modul.nazwa}]`, err)
  }
}
