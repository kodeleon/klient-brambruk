/**
 * NAGŁÓWEK - przyklejenie po przewinięciu.
 *
 * Jedyne, co ten moduł robi: ustawia `data-przewiniete` na nagłówku po
 * przewinięciu strony o ponad 20 px. Resztę (tło, rozmycie, cień) opisuje
 * `src/styles/components/naglowek.css`.
 *
 * Bez tego modułu pasek jest po prostu zawsze nieprzezroczysty - czyli
 * wygląda tak, jak stary projekt wyglądał na górze strony.
 */

import { wKlatce } from './ruch'

const PROG = 20

export function naglowek() {
  const element = document.querySelector<HTMLElement>('[data-naglowek]')
  if (!element) return

  let ostatni: boolean | null = null

  const sprawdz = () => {
    const przewiniete = window.scrollY > PROG
    if (przewiniete === ostatni) return
    ostatni = przewiniete
    if (przewiniete) element.setAttribute('data-przewiniete', '')
    else element.removeAttribute('data-przewiniete')
  }

  sprawdz()
  // Zdarzenie przewijania potrafi lecieć kilkadziesiąt razy na sekundę -
  // faktyczna zmiana klasy dzieje się raz na klatkę, we wspólnej pętli.
  window.addEventListener('scroll', () => wKlatce(sprawdz), { passive: true })
}
