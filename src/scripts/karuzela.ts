/**
 * KARUZELA - automatyczne przewijanie, strzałki i kropki.
 *
 * Pas slajdów przewija się sam, natywnym `scroll-snap` - palcem działa bez
 * ani jednej linii kodu. Ten moduł dokłada to, czego CSS nie umie:
 * automatyczne przechodzenie co 4,5 s (jak w starym projekcie), zatrzymanie
 * przy najechaniu i wskaźniki.
 *
 * Strzałki i kropki są w HTML z atrybutem `hidden` - odsłaniamy je dopiero
 * tutaj, żeby bez JavaScriptu nie stały martwe kontrolki.
 */

import { ograniczonyRuch } from './ruch'

const ODSTEP = 4500

export function karuzela() {
  const karuzele = document.querySelectorAll<HTMLElement>('[data-karuzela]')
  if (!karuzele.length) return

  for (const element of karuzele) {
    const tor = element.querySelector<HTMLElement>('[data-karuzela-tor]')
    if (!tor) continue

    const slajdy = [...tor.querySelectorAll<HTMLElement>('[data-karuzela-slajd]')]
    if (slajdy.length < 2) continue

    const poprzednie = element.querySelector<HTMLButtonElement>('[data-karuzela-poprzednie]')
    const nastepne = element.querySelector<HTMLButtonElement>('[data-karuzela-nastepne]')
    // Kropki są rodzeństwem karuzeli, nie jej dzieckiem (tak wyglądał układ
    // w starym projekcie: pasek kropek pod kartą).
    const kropki = element.nextElementSibling?.matches('[data-karuzela-kropki]')
      ? (element.nextElementSibling as HTMLElement)
      : null

    if (poprzednie) poprzednie.hidden = false
    if (nastepne) nastepne.hidden = false
    if (kropki) kropki.hidden = false

    let biezacy = 0
    let zatrzymana = false

    const idzDo = (indeks: number) => {
      biezacy = (indeks + slajdy.length) % slajdy.length
      tor.scrollTo({ left: slajdy[biezacy].offsetLeft - tor.offsetLeft, behavior: 'smooth' })
    }

    const oznacz = () => {
      if (!kropki) return
      const przyciski = kropki.querySelectorAll<HTMLElement>('[data-karuzela-kropka]')
      przyciski.forEach((przycisk, i) => {
        const aktywna = i === biezacy
        przycisk.classList.toggle('w-5', aktywna)
        przycisk.classList.toggle('bg-brand-sage', aktywna)
        przycisk.classList.toggle('w-2', !aktywna)
        przycisk.classList.toggle('bg-brand-text-xlight', !aktywna)
        przycisk.classList.toggle('hover:bg-brand-text-light', !aktywna)
        przycisk.setAttribute('aria-current', aktywna ? 'true' : 'false')
      })
    }

    poprzednie?.addEventListener('click', () => idzDo(biezacy - 1))
    nastepne?.addEventListener('click', () => idzDo(biezacy + 1))

    kropki?.querySelectorAll<HTMLElement>('[data-karuzela-kropka]').forEach((przycisk, i) => {
      przycisk.addEventListener('click', () => idzDo(i))
    })

    // Przewinięcie palcem też musi przestawić kropki.
    let czekaNaKoniec: number | undefined
    tor.addEventListener(
      'scroll',
      () => {
        window.clearTimeout(czekaNaKoniec)
        czekaNaKoniec = window.setTimeout(() => {
          const szerokosc = slajdy[0].offsetWidth || 1
          biezacy = Math.round(tor.scrollLeft / szerokosc)
          oznacz()
        }, 120)
      },
      { passive: true }
    )

    element.addEventListener('mouseenter', () => {
      zatrzymana = true
    })
    element.addEventListener('mouseleave', () => {
      zatrzymana = false
    })

    oznacz()

    // Automatyczne przewijanie tylko wtedy, gdy użytkownik nie prosił
    // o ograniczenie ruchu i gdy karta jest widoczna.
    if (ograniczonyRuch()) continue

    window.setInterval(() => {
      if (zatrzymana || document.hidden) return
      idzDo(biezacy + 1)
    }, ODSTEP)
  }
}
