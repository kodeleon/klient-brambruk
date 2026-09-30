/**
 * ZDJĘCIA W KREATORZE WYCENY - kompresja w przeglądarce w chwili dodania.
 *
 * Wymóg z `forms-worker/INTEGRATION.md`, pkt 4 (wzorzec: `forms-worker/dev/
 * test-page.html`, sekcja „KOMPRESJA ZDJĘĆ"). Zdjęcie z telefonu waży 3-12 MB,
 * a Worker przyjmuje najwyżej 4 MiB na plik i ma 10 ms CPU na żądanie - więc
 * zmniejsza je przeglądarka, nie serwer:
 *
 *   - dłuższy bok maks. 2000 px (bez powiększania), JPEG ~0,82,
 *     przezroczystość PNG na białym tle,
 *   - ponowne kodowanie usuwa EXIF, w tym GPS - zamierzone,
 *   - wynik większy od oryginału, który i tak się mieści -> oryginał,
 *   - nie da się zdekodować (np. HEIC w przeglądarce bez obsługi) ->
 *     oryginał, jeśli Worker go przyjmie; inaczej komunikat,
 *   - liczba i typ plików sprawdzane PRZED kompresją, rozmiar PO niej.
 *
 * Moduł nie jest rejestrowany w `main.ts` - używa go `wycena.ts`.
 */

import { ZDJECIA } from '../config/formularze'
import teksty from '../content/formularze.json'
import { komunikatPola, wypelnij } from './formularz'

const MAKS_BOK = 2000
const JAKOSC = 0.82

interface Zdjecie {
  oryginal: File
  stan: 'trwa' | 'gotowe'
  plik?: Blob
  podglad?: string
}

type Przetworzone = { ok: true; plik: Blob } | { ok: false; kod: 'photo_failed' | 'file_too_large' }

function waga(bajty: number): string {
  if (bajty < 1024 * 1024) return `${Math.max(1, Math.round(bajty / 1024))} KB`
  return `${(bajty / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

const przyjmowany = (plik: File) =>
  (ZDJECIA.typyWejscia as readonly string[]).includes(plik.type) ||
  (!plik.type && ZDJECIA.rozszerzeniaWejscia.test(plik.name))

const workerPrzyjmie = (plik: Blob) => (ZDJECIA.typyWorkera as readonly string[]).includes(plik.type)

/** To samo zdjęcie wybrane drugi raz ma tę samą nazwę, wagę i datę zmiany. */
const tozsamosc = (plik: File) => `${plik.name}:${plik.size}:${plik.lastModified}`

async function doJpeg(bitmapa: ImageBitmap, szer: number, wys: number): Promise<Blob> {
  const maluj = (ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D) => {
    // JPEG nie ma kanału alfa - przezroczystość PNG ląduje na białym tle.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, szer, wys)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmapa, 0, 0, szer, wys)
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    const plotno = new OffscreenCanvas(szer, wys)
    const ctx = plotno.getContext('2d')
    if (ctx) {
      maluj(ctx)
      return plotno.convertToBlob({ type: 'image/jpeg', quality: JAKOSC })
    }
  }

  const plotno = document.createElement('canvas')
  plotno.width = szer
  plotno.height = wys
  const ctx = plotno.getContext('2d')
  if (!ctx) throw new Error('brak kontekstu 2d')
  maluj(ctx)
  return new Promise((gotowe, blad) =>
    plotno.toBlob((b) => (b ? gotowe(b) : blad(new Error('toBlob'))), 'image/jpeg', JAKOSC)
  )
}

async function kompresuj(plik: File): Promise<Blob> {
  const bitmapa = await createImageBitmap(plik, { imageOrientation: 'from-image' })
  const { width, height } = bitmapa
  const skala = Math.min(1, MAKS_BOK / Math.max(width, height))
  let wynik: Blob
  try {
    wynik = await doJpeg(bitmapa, Math.round(width * skala), Math.round(height * skala))
  } finally {
    bitmapa.close()
  }
  return skala === 1 && workerPrzyjmie(plik) && wynik.size >= plik.size ? plik : wynik
}

async function przetworz(plik: File): Promise<Przetworzone> {
  let wynik: Blob
  try {
    wynik = await kompresuj(plik)
  } catch {
    // Bez dekodera (HEIC poza Safari, stara przeglądarka): oryginał, jeśli Worker go przyjmie.
    if (!workerPrzyjmie(plik)) return { ok: false, kod: 'photo_failed' }
    wynik = plik
  }
  return wynik.size > ZDJECIA.maksRozmiar ? { ok: false, kod: 'file_too_large' } : { ok: true, plik: wynik }
}

export interface Zdjecia {
  /** Gotowe pliki do `FormData`, z nazwą - bez niej przeglądarka wysłałaby „blob". */
  pliki(): { plik: Blob; nazwa: string }[]
  liczba(): number
  /** Czy któreś zdjęcie jest jeszcze w kompresji (wtedy wysyłka jest zablokowana). */
  trwa(): boolean
  wyczysc(): void
}

export function zdjecia(opcje: {
  formularz: HTMLFormElement
  pole: HTMLInputElement
  lista: HTMLElement
  komunikaty: HTMLElement
  przycisk: HTMLElement | null
  /** Po każdej zmianie listy albo stanu kompresji. */
  poZmianie: () => void
}): Zdjecia {
  const { formularz, pole, lista, komunikaty, przycisk, poZmianie } = opcje
  const tekstPrzycisku = przycisk?.textContent?.trim() ?? ''
  let zdjecia: Zdjecie[] = []

  const pokazKomunikaty = (tresci: string[]) => {
    komunikaty.replaceChildren(
      ...[...new Set(tresci)].map((tresc) => {
        const wiersz = document.createElement('p')
        wiersz.className = 'text-xs text-amber-700'
        wiersz.textContent = tresc
        return wiersz
      })
    )
  }

  const usun = (zdjecie: Zdjecie) => {
    if (zdjecie.podglad) URL.revokeObjectURL(zdjecie.podglad)
    zdjecia = zdjecia.filter((z) => z !== zdjecie)
    odswiez()
  }

  const odswiez = () => {
    lista.replaceChildren(
      ...zdjecia.map((zdjecie) => {
        const karta = document.createElement('div')
        karta.className = 'flex items-center gap-2 bg-brand-card border border-brand-border rounded-lg px-3 py-2'

        const podglad = document.createElement(zdjecie.podglad ? 'img' : 'span')
        podglad.className = 'w-8 h-8 rounded object-cover bg-brand-section shrink-0'
        if (podglad instanceof HTMLImageElement && zdjecie.podglad) {
          // Nazwa stoi obok - podgląd jest ozdobą.
          podglad.alt = ''
          podglad.src = zdjecie.podglad
        }

        const nazwa = document.createElement('span')
        nazwa.className = 'text-xs text-brand-text truncate max-w-[120px]'
        nazwa.textContent = zdjecie.oryginal.name

        const stan = document.createElement('span')
        stan.className = 'text-[10px] text-brand-text-light whitespace-nowrap'
        stan.textContent = zdjecie.plik ? waga(zdjecie.plik.size) : teksty.zdjecia.przetwarzanie

        const przyciskUsun = document.createElement('button')
        przyciskUsun.type = 'button'
        przyciskUsun.className = 'p-0.5 text-brand-text-light hover:text-brand-text transition-colors'
        przyciskUsun.setAttribute('aria-label', wypelnij(teksty.zdjecia.usun, { nazwa: zdjecie.oryginal.name }))
        przyciskUsun.textContent = '✕'
        przyciskUsun.addEventListener('click', () => usun(zdjecie))

        karta.append(podglad, nazwa, stan, przyciskUsun)
        return karta
      })
    )

    const pelno = zdjecia.length >= ZDJECIA.maksPlikow
    // Wyłączone pole = etykieta przestaje otwierać okno wyboru plików.
    pole.disabled = pelno
    if (przycisk) {
      przycisk.textContent = pelno ? wypelnij(teksty.zdjecia.pelno, { maks: ZDJECIA.maksPlikow }) : tekstPrzycisku
      przycisk.classList.toggle('bg-brand-border/50', pelno)
      przycisk.classList.toggle('text-brand-text-light', pelno)
      przycisk.classList.toggle('cursor-not-allowed', pelno)
      przycisk.classList.toggle('bg-brand-olive', !pelno)
      przycisk.classList.toggle('text-brand-dark', !pelno)
      przycisk.classList.toggle('cursor-pointer', !pelno)
    }
    poZmianie()
  }

  pole.addEventListener('change', () => {
    const wybrane = [...(pole.files ?? [])]
    // Czyszczenie pozwala wybrać ten sam plik ponownie po usunięciu.
    pole.value = ''
    const tresci: string[] = []

    for (const plik of wybrane) {
      if (!przyjmowany(plik)) {
        tresci.push(komunikatPola(formularz, 'photos', 'invalid_file_type'))
        continue
      }
      if (zdjecia.some((z) => tozsamosc(z.oryginal) === tozsamosc(plik))) {
        tresci.push(wypelnij(teksty.bledyPol.photo_duplicate, { nazwa: plik.name }))
        continue
      }
      if (zdjecia.length >= ZDJECIA.maksPlikow) {
        tresci.push(komunikatPola(formularz, 'photos', 'too_many_files'))
        continue
      }

      const zdjecie: Zdjecie = { oryginal: plik, stan: 'trwa' }
      zdjecia.push(zdjecie)
      void przetworz(plik).then((wynik) => {
        // Usunięte w trakcie kompresji - wynik nikogo już nie obchodzi.
        if (!zdjecia.includes(zdjecie)) return
        if (!wynik.ok) {
          zdjecia = zdjecia.filter((z) => z !== zdjecie)
          const tresc =
            wynik.kod === 'photo_failed'
              ? wypelnij(teksty.bledyPol.photo_failed, { nazwa: plik.name })
              : komunikatPola(formularz, 'photos', wynik.kod)
          pokazKomunikaty([...[...komunikaty.children].map((p) => p.textContent ?? ''), tresc])
        } else {
          zdjecie.stan = 'gotowe'
          zdjecie.plik = wynik.plik
          zdjecie.podglad = URL.createObjectURL(wynik.plik)
        }
        odswiez()
      })
    }

    pokazKomunikaty(tresci)
    odswiez()
  })

  odswiez()

  return {
    pliki: () =>
      zdjecia.flatMap((z, i) =>
        z.plik ? [{ plik: z.plik, nazwa: `zdjecie-${i + 1}.${z.plik.type === 'image/jpeg' ? 'jpg' : z.plik.type.split('/')[1]}` }] : []
      ),
    liczba: () => zdjecia.length,
    trwa: () => zdjecia.some((z) => z.stan === 'trwa'),
    wyczysc: () => {
      for (const z of zdjecia) if (z.podglad) URL.revokeObjectURL(z.podglad)
      zdjecia = []
      komunikaty.replaceChildren()
      odswiez()
    },
  }
}
