/**
 * RUCH - odsłanianie przy przewijaniu i jedna pętla animacji na stronę.
 *
 * KOLEJNOŚĆ JEST ISTOTNA. Element oznaczony `data-odslon` jest w dokumencie
 * WIDOCZNY. Dopiero ten skrypt ustawia mu `data-rv="czeka"` (czyli chowa go)
 * i zwalnia przy wejściu w widok. Odwrotna kolejność - chowanie w CSS,
 * odsłanianie skryptem - zostawia treść niewidoczną na zawsze, gdy skrypt
 * nie wystartuje. Checklista klasyfikuje to jako bloker.
 *
 * OGRANICZONY RUCH: przy `prefers-reduced-motion: reduce` nie chowamy niczego
 * i nie zakładamy obserwatora. Sama reguła w CSS nie wystarczy - skrócony czas
 * przejścia to nadal ruch, a tutaj po prostu go nie ma. To jest warstwa
 * JavaScriptu wymagana przez punkt 🧱 „prefers-reduced-motion obsłużone
 * w CSS i w JavaScripcie".
 */

const OGRANICZONY_RUCH = '(prefers-reduced-motion: reduce)'

/** Jedna pętla klatek na stronę, nie jedna na moduł. */
const zadaniaKlatki = new Set<() => void>()
let klatkaZamowiona = false

function klatka() {
  klatkaZamowiona = false
  for (const zadanie of zadaniaKlatki) {
    try {
      zadanie()
    } catch (err) {
      console.error('[ruch] zadanie klatki', err)
    }
  }
}

/**
 * Zamawia wykonanie w najbliższej klatce.
 * Używaj tego zamiast własnego `requestAnimationFrame` w module - kilka
 * niezależnych pętli to kilka razy ten sam koszt w tej samej klatce.
 */
export function wKlatce(zadanie: () => void) {
  zadaniaKlatki.add(zadanie)
  if (!klatkaZamowiona) {
    klatkaZamowiona = true
    requestAnimationFrame(klatka)
  }
}

export function ograniczonyRuch(): boolean {
  return window.matchMedia(OGRANICZONY_RUCH).matches
}

export function ruch() {
  const elementy = document.querySelectorAll<HTMLElement>('[data-odslon]')
  if (!elementy.length) return

  if (ograniczonyRuch() || !('IntersectionObserver' in window)) return

  const obserwator = new IntersectionObserver(
    (wpisy) => {
      for (const wpis of wpisy) {
        if (!wpis.isIntersecting) continue
        const el = wpis.target as HTMLElement
        el.dataset.rv = 'widoczny'
        obserwator.unobserve(el)
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
  )

  for (const el of elementy) {
    // Kaskada: kolejny element w grupie startuje o `--rv-zwloka` później.
    // Wartość ustawiamy właściwością CSS, nie atrybutem `style` w znaczniku -
    // atrybut `style` wymagałby `'unsafe-inline'` w `style-src`.
    const zwloka = Number(el.dataset.odslon)
    if (Number.isFinite(zwloka) && zwloka > 0) {
      el.style.setProperty('--rv-zwloka', `${zwloka}ms`)
    }
    el.dataset.rv = 'czeka'
    obserwator.observe(el)
  }

  // Elementy widoczne od razu po załadowaniu nie mogą czekać na przewinięcie.
  requestAnimationFrame(() => {
    for (const el of elementy) {
      if (el.dataset.rv !== 'czeka') continue
      const prostokat = el.getBoundingClientRect()
      if (prostokat.top < window.innerHeight) {
        el.dataset.rv = 'widoczny'
        obserwator.unobserve(el)
      }
    }
  })
}
