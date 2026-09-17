/**
 * POWIĘKSZANIE ZDJĘĆ - moduł opcjonalny (`moduly.galeria`).
 *
 * Działa na `<figure>` z atrybutami `data-lb-*`, które wstawia potok zdjęć
 * dla użyć z `lightbox: true`. Powiększenie bierze się ze ŹRÓDŁA, nie z kadru
 * kafelka: kliknięcie w kwadratowy kafelek otwiera pełną klatkę, nie
 * powiększony wycinek.
 *
 * ┌── DLACZEGO NATYWNY `<dialog>` ────────────────────────────────────────┐
 * │ Checklista wymaga od okna modalnego kompletu: `role="dialog"`,        │
 * │ `aria-modal`, pułapki fokusu, obsługi Escape, powrotu fokusu do       │
 * │ elementu wywołującego i wyłączenia tła (`inert` na rodzeństwie).      │
 * │ `<dialog>.showModal()` daje WSZYSTKIE te rzeczy natywnie. Wersja      │
 * │ ręczna to ~200 linii, z których połowa to pułapka fokusu napisana     │
 * │ od nowa - i to ona najczęściej ma błędy.                              │
 * │ Zostaje nam blokada przewijania tła, której `<dialog>` nie robi sam.  │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Bez skryptu galeria nadal działa jako galeria - kafelki są widoczne,
 * tylko się nie powiększają. Żadna treść nie jest za tym schowana.
 */

import { ograniczonyRuch } from './ruch'

type Pozycja = { avif: string; webp: string; jpg: string; alt: string; podpis: string }

export function lightbox() {
  const figury = [...document.querySelectorAll<HTMLElement>('figure[data-lb-jpg]')]
  if (!figury.length) return

  const pozycje: Pozycja[] = figury.map((f) => ({
    avif: f.dataset.lbAvif ?? '',
    webp: f.dataset.lbWebp ?? '',
    jpg: f.dataset.lbJpg ?? '',
    alt: f.querySelector('img')?.alt ?? '',
    podpis: f.querySelector('figcaption')?.textContent?.trim() ?? '',
  }))

  // --- okno ----------------------------------------------------------
  const okno = document.createElement('dialog')
  okno.className = 'lightbox'
  okno.setAttribute('aria-label', 'Powiększone zdjęcie')

  const zamknij = document.createElement('button')
  zamknij.type = 'button'
  zamknij.className = 'lightbox__zamknij'
  zamknij.setAttribute('aria-label', 'Zamknij powiększenie')
  zamknij.textContent = '×'

  const poprzednie = document.createElement('button')
  poprzednie.type = 'button'
  poprzednie.className = 'lightbox__nawigacja lightbox__nawigacja--wstecz'
  poprzednie.setAttribute('aria-label', 'Poprzednie zdjęcie')
  poprzednie.textContent = '‹'

  const nastepne = document.createElement('button')
  nastepne.type = 'button'
  nastepne.className = 'lightbox__nawigacja lightbox__nawigacja--dalej'
  nastepne.setAttribute('aria-label', 'Następne zdjęcie')
  nastepne.textContent = '›'

  const obraz = document.createElement('img')
  obraz.className = 'lightbox__obraz'
  obraz.decoding = 'async'

  const zrodloAvif = document.createElement('source')
  zrodloAvif.type = 'image/avif'
  const zrodloWebp = document.createElement('source')
  zrodloWebp.type = 'image/webp'

  const picture = document.createElement('picture')
  picture.append(zrodloAvif, zrodloWebp, obraz)

  const podpis = document.createElement('p')
  podpis.className = 'lightbox__podpis'

  const licznik = document.createElement('p')
  licznik.className = 'lightbox__licznik'

  const ramka = document.createElement('div')
  ramka.className = 'lightbox__ramka'
  ramka.append(picture, podpis, licznik)

  okno.append(zamknij, poprzednie, ramka, nastepne)
  document.body.append(okno)

  if (ograniczonyRuch()) okno.dataset.bezRuchu = 'tak'

  // --- stan ----------------------------------------------------------
  let indeks = 0
  let wywolal: HTMLElement | null = null

  function pokaz(i: number) {
    indeks = (i + pozycje.length) % pozycje.length
    const p = pozycje[indeks]
    zrodloAvif.srcset = p.avif
    zrodloWebp.srcset = p.webp
    obraz.srcset = p.jpg
    obraz.src = p.jpg.split(',').pop()?.trim().split(' ')[0] ?? ''
    obraz.sizes = '100vw'
    obraz.alt = p.alt
    podpis.textContent = p.podpis
    podpis.hidden = !p.podpis
    licznik.textContent = `${indeks + 1} z ${pozycje.length}`
    const wiele = pozycje.length > 1
    poprzednie.hidden = !wiele
    nastepne.hidden = !wiele
    licznik.hidden = !wiele
  }

  function otworz(i: number, zrodlo: HTMLElement) {
    wywolal = zrodlo
    pokaz(i)
    okno.showModal()
    // `<dialog>` nie blokuje przewijania strony pod spodem.
    document.documentElement.style.overflow = 'hidden'
  }

  okno.addEventListener('close', () => {
    document.documentElement.style.overflow = ''
    // Powrót fokusu tam, skąd wyszedł. `<dialog>` robi to sam, gdy element
    // wywołujący nadal istnieje - jawne wywołanie domyka przypadek, w którym
    // kafelek został w międzyczasie podmieniony.
    wywolal?.focus()
  })

  zamknij.addEventListener('click', () => okno.close())
  poprzednie.addEventListener('click', () => pokaz(indeks - 1))
  nastepne.addEventListener('click', () => pokaz(indeks + 1))

  // Kliknięcie w tło zamyka. Sprawdzamy cel, żeby kliknięcie w samo zdjęcie
  // albo w przycisk nie zamykało okna przypadkiem.
  okno.addEventListener('click', (e) => {
    if (e.target === okno) okno.close()
  })

  okno.addEventListener('keydown', (e) => {
    if (pozycje.length < 2) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      pokaz(indeks - 1)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      pokaz(indeks + 1)
    }
  })

  // --- wyzwalacze ----------------------------------------------------
  figury.forEach((figura, i) => {
    // Kafelek musi być kontrolką, nie klikalnym `<figure>`: inaczej nie łapie
    // fokusu, nie reaguje na Enter i nie ma roli dla czytnika ekranu.
    const przycisk = document.createElement('button')
    przycisk.type = 'button'
    przycisk.className = 'lightbox__wyzwalacz'
    const alt = pozycje[i].alt
    przycisk.setAttribute('aria-label', alt ? `Powiększ: ${alt}` : 'Powiększ zdjęcie')

    figura.parentNode?.insertBefore(przycisk, figura)
    przycisk.append(figura)
    przycisk.addEventListener('click', () => otworz(i, przycisk))
  })
}
