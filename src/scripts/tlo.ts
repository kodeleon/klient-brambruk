/**
 * FAKTURA TŁA - przesunięcie powiązane WYŁĄCZNIE z przewijaniem.
 *
 * Moduł nie animuje niczego w czasie: nie ma tu `setInterval`, nie ma pętli
 * biegnącej w tle i nie ma klatek, gdy strona stoi. Jedyne wejście to
 * położenie sekcji w oknie, jedyne wyjście to właściwość `--tlo-przesuw`,
 * którą `styles/components/tlo.css` zamienia na przesunięcie wzoru.
 *
 * ┌── DLACZEGO NIELINIOWO ──────────────────────────────────────────────┐
 * │ Liniowe przesunięcie wprost proporcjonalne do przewinięcia czyta się│
 * │ jako parallaksa: tło wyraźnie „jedzie" względem treści i przyciąga  │
 * │ wzrok. Wygładzenie (`smoothstep`) sprawia, że ruch przyspiesza       │
 * │ w środku przejścia sekcji przez okno i wygasza się na jego końcach, │
 * │ więc faktura oddycha zamiast sunąć.                                  │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * KOSZT: jedna właściwość CSS na widoczną sekcję i jedna klatka na
 * zdarzenie przewijania, wspólna z resztą serwisu (`wKlatce` z `ruch.ts`).
 * Sekcje poza oknem są odpięte od obliczeń przez `IntersectionObserver`.
 * Bez tego modułu faktura jest po prostu nieruchoma - nic nie znika.
 */

import { ograniczonyRuch, wKlatce } from './ruch'

/** Pełny zakres przesunięcia warstwy, w pikselach. Warstwa ma 20% zapasu. */
const AMPLITUDA = 56

/** Wygładzenie Hermite'a: 0 i 1 na końcach, największa zmiana w środku. */
const wygladz = (t: number) => t * t * (3 - 2 * t)

export function tlo() {
  const sekcje = document.querySelectorAll<HTMLElement>('.tlo-siatka, .tlo-ciemne')
  if (!sekcje.length) return
  if (ograniczonyRuch() || !('IntersectionObserver' in window)) return

  const widoczne = new Set<HTMLElement>()

  const przelicz = () => {
    const okno = window.innerHeight
    for (const sekcja of widoczne) {
      const prostokat = sekcja.getBoundingClientRect()
      /* Postęp przejścia sekcji przez okno: 0 = dolna krawędź okna dotyka
         jej góry, 1 = górna krawędź okna minęła jej dół. */
      const zakres = okno + prostokat.height
      const postep = zakres > 0 ? (okno - prostokat.top) / zakres : 0.5
      const ograniczony = postep < 0 ? 0 : postep > 1 ? 1 : postep
      const przesuw = (wygladz(ograniczony) - 0.5) * AMPLITUDA
      sekcja.style.setProperty('--tlo-przesuw', `${przesuw.toFixed(1)}px`)
    }
  }

  const obserwator = new IntersectionObserver(
    (wpisy) => {
      for (const wpis of wpisy) {
        const el = wpis.target as HTMLElement
        if (wpis.isIntersecting) widoczne.add(el)
        else widoczne.delete(el)
      }
      if (widoczne.size) wKlatce(przelicz)
    },
    { rootMargin: '10% 0px' }
  )

  for (const sekcja of sekcje) obserwator.observe(sekcja)

  const naZdarzenie = () => {
    if (widoczne.size) wKlatce(przelicz)
  }

  addEventListener('scroll', naZdarzenie, { passive: true })
  addEventListener('resize', naZdarzenie, { passive: true })
  wKlatce(przelicz)
}
