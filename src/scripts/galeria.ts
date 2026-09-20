/**
 * GALERIA - powiększanie zdjęć.
 *
 * Kafelki są przyciskami, okno to natywny `<dialog>`. Ten moduł robi trzy
 * rzeczy: kopiuje zdjęcie z klikniętego kafelka do okna, przestawia je
 * strzałkami i pilnuje licznika. Blokadę tła, Escape, pułapkę na fokus
 * i powrót fokusu do kafelka robi przeglądarka.
 *
 * Bez tego modułu okno się nie otwiera, a zdjęcia i tak są widoczne
 * w siatce - żadna treść nie ginie.
 */

type Kafelek = {
  przycisk: HTMLButtonElement
  zrodlo: string
  tytul: string
  lokalizacja: string
}

function zbierz(siatka: HTMLElement): Kafelek[] {
  return [...siatka.querySelectorAll<HTMLButtonElement>('[data-galeria-kafelek]')].map((przycisk) => {
    const obraz = przycisk.querySelector('picture, .foto-zaslepka, img')
    return {
      przycisk,
      zrodlo: obraz?.outerHTML ?? '',
      tytul: przycisk.dataset.tytul ?? '',
      lokalizacja: przycisk.dataset.lokalizacja ?? '',
    }
  })
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
    const lokalizacja = okno.querySelector<HTMLElement>('[data-galeria-lokalizacja]')
    const lokalizacjaTekst = okno.querySelector<HTMLElement>('[data-galeria-lokalizacja-tekst]')
    const licznik = okno.querySelector<HTMLElement>('[data-galeria-licznik]')
    if (!miejsceObrazu) continue

    let biezacy = 0

    const pokaz = (indeks: number) => {
      biezacy = (indeks + kafelki.length) % kafelki.length
      const kafelek = kafelki[biezacy]

      miejsceObrazu.innerHTML = kafelek.zrodlo
      // Zdjęcie w oknie nie jest już leniwe - jest jedyną rzeczą na ekranie.
      miejsceObrazu.querySelector('img')?.removeAttribute('loading')

      /* ⚠️ `sizes` PRZEPISANY NA `100vw`.
         Kafelek galerii deklaruje szerokość ~389 px, więc przeglądarka
         dobiera z `srcset` najmniejszy wariant. Skopiowany do okna
         powiększenia ten sam `<picture>` zachowywał tamtą deklarację
         i okno na pełnym ekranie pokazywało MINIATURĘ rozciągniętą do
         1200 px. Tutaj element zajmuje całą szerokość okna i dokładnie
         to musi mówić `sizes` - wtedy przeglądarka sięga po największy
         dostępny wariant kadru. */
      for (const el of miejsceObrazu.querySelectorAll<HTMLElement>('source, img')) {
        if (el.hasAttribute('srcset')) el.setAttribute('sizes', '100vw')
      }

      if (tytul) tytul.textContent = kafelek.tytul
      if (lokalizacja && lokalizacjaTekst) {
        lokalizacjaTekst.textContent = kafelek.lokalizacja
        lokalizacja.hidden = !kafelek.lokalizacja
      }
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
