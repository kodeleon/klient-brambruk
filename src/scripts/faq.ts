/**
 * FAQ - płynne rozwijanie odpowiedzi.
 *
 * Akordeon działa BEZ tego modułu: to natywny `<details name="faq">`, więc
 * rozwijanie, „tylko jedna otwarta naraz" i obsługa klawiatury są wbudowane
 * w przeglądarkę. Moduł dokłada wyłącznie animację wysokości, bo natywny
 * `<details>` otwiera się skokowo.
 *
 * Mechanizm: przy otwieraniu ustawiamy `max-height` na zmierzoną wysokość
 * treści, przy zamykaniu wracamy do zera i dopiero po przejściu zdejmujemy
 * atrybut `open` - inaczej przeglądarka schowałaby treść, zanim cokolwiek
 * zdąży się ruszyć.
 */

import { ograniczonyRuch } from './ruch'

const CZAS = 350

export function faq() {
  const pozycje = document.querySelectorAll<HTMLDetailsElement>('.faq-pozycja')
  if (!pozycje.length) return
  if (ograniczonyRuch()) return

  for (const pozycja of pozycje) {
    const przycisk = pozycja.querySelector<HTMLElement>('.faq-przycisk')
    const tresc = pozycja.querySelector<HTMLElement>('.faq-tresc')
    if (!przycisk || !tresc) continue

    const ustawWysokosc = () => {
      tresc.style.maxHeight = `${tresc.scrollHeight}px`
    }

    przycisk.addEventListener('click', (zdarzenie) => {
      zdarzenie.preventDefault()

      if (pozycja.open) {
        // zamykanie: najpierw zjazd do zera, `open` zdejmujemy na końcu
        ustawWysokosc()
        requestAnimationFrame(() => {
          tresc.style.maxHeight = '0px'
        })
        window.setTimeout(() => {
          pozycja.open = false
          tresc.style.maxHeight = ''
        }, CZAS)
        return
      }

      // Otwarcie jednej pozycji zamyka pozostałe w tej samej grupie -
      // robi to przeglądarka przez atrybut `name`, ale wtedy zostaje im
      // ustawiony `max-height`, więc trzeba go sprzątnąć.
      for (const inna of pozycje) {
        if (inna === pozycja) continue
        const innaTresc = inna.querySelector<HTMLElement>('.faq-tresc')
        if (innaTresc) innaTresc.style.maxHeight = ''
      }

      pozycja.open = true
      tresc.style.maxHeight = '0px'
      requestAnimationFrame(ustawWysokosc)
      window.setTimeout(() => {
        // Po animacji zdejmujemy ograniczenie - inaczej dłuższa odpowiedź
        // po zmianie szerokości okna zostałaby przycięta.
        if (pozycja.open) tresc.style.maxHeight = ''
      }, CZAS)
    })
  }
}
