/**
 * GALERIA - powiększanie zdjęć.
 *
 * Kafelki są przyciskami, okno to natywny `<dialog>`. Ten moduł robi trzy
 * rzeczy: wstawia do okna zdjęcie klikniętego kafelka, przestawia je
 * strzałkami i pilnuje licznika. Blokadę tła, Escape, pułapkę na fokus
 * i powrót fokusu do kafelka robi przeglądarka.
 *
 * Zdjęcie w oknie to PEŁNA KLATKA ŹRÓDŁA z zestawu powiększenia, który potok
 * zdjęć wypisuje na `<img>` kafelka (`data-lb-*`, patrz
 * `tools/media/markup.mjs`). Kopia znacznika kafelka zostaje wyłącznie jako
 * ścieżka awaryjna - dla kafelka bez zestawu albo z zaślepką.
 *
 * Bez tego modułu okno się nie otwiera, a zdjęcia i tak są widoczne
 * w siatce - żadna treść nie ginie.
 */

/**
 * Szerokość obrazu w oknie powiększenia - opis UKŁADU, nie życzenie co do
 * pliku. Obraz stoi w `<div class="relative mx-4 md:mx-8 max-w-5xl">`
 * (`GaleriaSiatka.astro`): do 768 px okno minus 2 × 16 px, od 768 px
 * okno minus 2 × 32 px, ale nie więcej niż 1024 px. Zmiana tych klas
 * wymaga zmiany tej wartości.
 */
const ROZMIAR_W_OKNIE = '(min-width:768px) min(1024px, calc(100vw - 64px)), calc(100vw - 32px)'

/**
 * `sizes` konkretnej klatki. Obraz w oknie ma też sufit wysokości
 * (`max-height: 82vh` w `styles/components/galeria.css`), a pudełko okna
 * dopasowuje się do obrazu - zdjęcie pionowe ma więc szerokość 82vh razy
 * proporcje, nie szerokość okna. Na komputerze to ok. 312 px zamiast
 * 1024 px: sam `ROZMIAR_W_OKNIE` kazałby pobrać plik dwa razy za szeroki.
 * Proporcje znamy z `data-lb-w` / `data-lb-h`. Zmiana 82vh w arkuszu
 * wymaga zmiany tutaj.
 */
function rozmiarKlatki(lb: Powiekszenie): string {
  const proporcja = Number(lb.szerokosc) / Number(lb.wysokosc)
  if (!Number.isFinite(proporcja) || proporcja <= 0) return ROZMIAR_W_OKNIE
  const zWysokosci = `calc(82vh * ${proporcja.toFixed(4)})`
  return `(min-width:768px) min(1024px, calc(100vw - 64px), ${zWysokosci}), min(calc(100vw - 32px), ${zWysokosci})`
}

/** Zestaw powiększenia z atrybutów `data-lb-*` na `<img>` kafelka. */
type Powiekszenie = {
  avif?: string
  webp?: string
  jpg?: string
  szerokosc?: string
  wysokosc?: string
}

type Kafelek = {
  przycisk: HTMLButtonElement
  /** Znacznik zdjęcia kafelka - używany tylko, gdy nie ma `powiekszenie`. */
  zrodlo: string
  powiekszenie: Powiekszenie | null
  alt: string
  tytul: string
}

function zbierz(siatka: HTMLElement): Kafelek[] {
  return [...siatka.querySelectorAll<HTMLButtonElement>('[data-galeria-kafelek]')].map((przycisk) => {
    const obraz = przycisk.querySelector('picture, .foto-zaslepka, img')
    const img = przycisk.querySelector<HTMLImageElement>('img')
    const lb = img?.dataset
    const maZestaw = Boolean(lb && (lb.lbAvif || lb.lbWebp || lb.lbJpg))
    return {
      przycisk,
      zrodlo: obraz?.outerHTML ?? '',
      powiekszenie:
        lb && maZestaw
          ? { avif: lb.lbAvif, webp: lb.lbWebp, jpg: lb.lbJpg, szerokosc: lb.lbW, wysokosc: lb.lbH }
          : null,
      alt: img?.alt ?? '',
      tytul: przycisk.dataset.tytul ?? '',
    }
  })
}

/** Adres największego kandydata z `srcset` z deskryptorami `w`. */
function najwiekszy(srcset: string): string {
  const kandydaci = srcset.split(',').map((kandydat) => {
    const [adres = '', opis = ''] = kandydat.trim().split(/\s+/)
    return { adres, szerokosc: Number.parseInt(opis, 10) || 0 }
  })
  return kandydaci.reduce((a, b) => (b.szerokosc > a.szerokosc ? b : a)).adres
}

/**
 * Nowe `<picture>` z zestawu powiększenia. `<img>` trafia do `<picture>`
 * PRZED ustawieniem adresów: obraz dostaje wtedy od razu wybór spośród
 * `<source>`, zamiast ruszyć po JPEG, zanim zobaczy AVIF i WebP.
 *
 * Bez `loading` - zdjęcie w oknie jest jedyną rzeczą na ekranie. Bez klas
 * kafelka - wygląd obrazu w oknie opisuje `styles/components/galeria.css`.
 */
function zbudujPowiekszenie(lb: Powiekszenie, alt: string): HTMLPictureElement {
  const sizes = rozmiarKlatki(lb)
  const picture = document.createElement('picture')
  for (const [typ, srcset] of [
    ['image/avif', lb.avif],
    ['image/webp', lb.webp],
  ] as const) {
    if (!srcset) continue
    const source = document.createElement('source')
    source.setAttribute('type', typ)
    source.setAttribute('sizes', sizes)
    source.setAttribute('srcset', srcset)
    picture.appendChild(source)
  }

  const img = document.createElement('img')
  picture.appendChild(img)
  img.setAttribute('alt', alt)
  img.setAttribute('decoding', 'async')
  // Wymiary pełnej klatki: rezerwują proporcje, zanim plik dojdzie.
  if (lb.szerokosc && lb.wysokosc) {
    img.setAttribute('width', lb.szerokosc)
    img.setAttribute('height', lb.wysokosc)
  }
  if (lb.jpg) {
    img.setAttribute('sizes', sizes)
    img.setAttribute('srcset', lb.jpg)
  }
  const zapas = lb.jpg ?? lb.webp ?? lb.avif
  if (zapas) img.setAttribute('src', najwiekszy(zapas))
  return picture
}

export function galeria() {
  const siatki = document.querySelectorAll<HTMLElement>('[data-galeria]')
  if (!siatki.length) return

  for (const siatka of siatki) {
    const idOkna = siatka.dataset.galeria
    if (!idOkna) continue
    const okno = document.getElementById(idOkna) as HTMLDialogElement | null
    if (!okno || typeof okno.showModal !== 'function') continue

    const kafelki = zbierz(siatka)
    if (!kafelki.length) continue

    const miejsceObrazu = okno.querySelector<HTMLElement>('[data-galeria-obraz]')
    const tytul = okno.querySelector<HTMLElement>('[data-galeria-tytul]')
    const licznik = okno.querySelector<HTMLElement>('[data-galeria-licznik]')
    if (!miejsceObrazu) continue

    let biezacy = 0

    const pokaz = (indeks: number) => {
      biezacy = (indeks + kafelki.length) % kafelki.length
      const kafelek = kafelki[biezacy]

      /* Zestaw powiększenia pochodzi z manifestu zdjęć: drabina szerokości
         liczona ze ŹRÓDŁA (`lightboxWidths` w `media/images.config.mjs`),
         pełna klatka, do 2560 px na dłuższej krawędzi. Warianty kafelka się
         do tego nie nadają: największy ma 1200 px, a dla zdjęć pionowych
         820 px - na telefonie o trzykrotnej gęstości to ten sam plik, który
         już był w kafelku, czyli miniatura rozciągnięta na cały ekran.
         Do tego kafelek 16:10 z pionu pokazuje ~29% klatki. */
      if (kafelek.powiekszenie) {
        miejsceObrazu.replaceChildren(zbudujPowiekszenie(kafelek.powiekszenie, kafelek.alt))
      } else {
        // Ścieżka awaryjna: kopia znacznika kafelka, ale z `sizes` opisującym
        // okno, nie kafelek - inaczej przeglądarka zostałaby przy miniaturze.
        miejsceObrazu.innerHTML = kafelek.zrodlo
        miejsceObrazu.querySelector('img')?.removeAttribute('loading')
        for (const el of miejsceObrazu.querySelectorAll<HTMLElement>('source, img')) {
          if (el.hasAttribute('srcset')) el.setAttribute('sizes', ROZMIAR_W_OKNIE)
        }
      }

      if (tytul) tytul.textContent = kafelek.tytul
      if (licznik) licznik.textContent = `${biezacy + 1} / ${kafelki.length}`
    }

    kafelki.forEach((kafelek, indeks) => {
      kafelek.przycisk.addEventListener('click', () => {
        pokaz(indeks)
        okno.showModal()
      })
    })

    okno.querySelector('[data-galeria-zamknij]')?.addEventListener('click', () => okno.close())
    okno.querySelector('[data-galeria-poprzednie]')?.addEventListener('click', () => pokaz(biezacy - 1))
    okno.querySelector('[data-galeria-nastepne]')?.addEventListener('click', () => pokaz(biezacy + 1))

    okno.addEventListener('keydown', (zdarzenie) => {
      if (zdarzenie.key === 'ArrowLeft') pokaz(biezacy - 1)
      if (zdarzenie.key === 'ArrowRight') pokaz(biezacy + 1)
    })

    // Kliknięcie w tło zamyka okno. `<dialog>` nie ma na to zdarzenia,
    // więc sprawdzamy, czy kliknięcie padło poza obszar treści.
    okno.addEventListener('click', (zdarzenie) => {
      const cel = zdarzenie.target as HTMLElement
      if (cel === okno) okno.close()
    })

    okno.addEventListener('close', () => {
      // Zwolnienie pamięci: okno może trzymać zdjęcie w pełnej rozdzielczości.
      miejsceObrazu.innerHTML = ''
    })
  }
}
