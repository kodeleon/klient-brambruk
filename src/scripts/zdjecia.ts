/**
 * ZDJĘCIA W KREATORZE WYCENY - kompresja w przeglądarce w chwili dodania.
 *
 * Wymóg z `forms-worker/INTEGRATION.md`, pkt 4 (wzorzec: `forms-worker/dev/
 * test-page.html`, sekcja „KOMPRESJA ZDJĘĆ"). Zdjęcie z telefonu waży 3-12 MB,
 * a Worker ma 10 ms CPU na żądanie i jego koszt rośnie z każdym bajtem
 * zdjęcia - więc zmniejsza je przeglądarka, nie serwer. Wartości: `ZDJECIA`
 * w `src/config/formularze.ts`. Kolejność dla jednego pliku ma znaczenie:
 *
 *   1. typ -> duplikat -> liczba zdjęć (liczą się dodane, nie karty „nie dodano"),
 *   2. plik ponad `maksWejscia` -> od razu „nie dodano", bez dekodowania
 *      (to dekodowanie zjada pamięć telefonu),
 *   3. dłuższy bok do `maksBok`, JPEG `jakosc`; wynik ponad `maksWyniku` ->
 *      jedno ponowne kodowanie z tej samej bitmapy (`jakoscAwaryjna`);
 *      nadal za duży -> „nie dodano",
 *   4. wyjątek przy dekodowaniu albo kodowaniu (np. HEIC poza Safari) ->
 *      oryginał tylko wtedy, gdy Worker przyjmie jego typ i mieści się
 *      w `maksWyniku`; inaczej „nie dodano",
 *   5. poza ścieżką z punktu 4 zawsze wychodzi nowy JPEG, nawet większy od
 *      oryginału: ponowne kodowanie usuwa EXIF, w tym GPS - zamierzone.
 *      Przezroczystość PNG ląduje na białym tle.
 *
 * Zdjęcie, którego nie udało się dodać, zostaje na liście jako karta „nie
 * dodano", a komunikat przy polu żyje tak długo jak karta - klient ma
 * wiedzieć, że to zdjęcie do firmy nie dotrze. Karta nie blokuje wysyłki.
 *
 * Moduł nie jest rejestrowany w `main.ts` - używa go `wycena.ts`.
 */

import { ZDJECIA } from '../config/formularze'
import teksty from '../content/formularze.json'
import { komunikatPola, waga, wypelnij, zOdnosnikami } from './formularz'

/**
 * Dlaczego zdjęcie nie zostało dodane - klucz w `bledyPol` i w `zdjecia.nieDodano`.
 * DECYZJA: `photo_input_too_large` to kod wyłącznie frontu (plik ponad
 * `maksWejscia`); Worker go nie zna, bo takiego pliku nigdy nie dostaje.
 */
type Powod = 'photo_input_too_large' | 'photo_failed'

interface Zdjecie {
  oryginal: File
  stan: 'trwa' | 'gotowe' | 'nieDodano'
  plik?: Blob
  podglad?: string
  powod?: Powod
}

const przyjmowany = (plik: File) =>
  (ZDJECIA.typyWejscia as readonly string[]).includes(plik.type) ||
  (!plik.type && ZDJECIA.rozszerzeniaWejscia.test(plik.name))

const workerPrzyjmie = (plik: Blob) => (ZDJECIA.typyWorkera as readonly string[]).includes(plik.type)

/** To samo zdjęcie wybrane drugi raz ma tę samą nazwę, wagę i datę zmiany. */
const tozsamosc = (plik: File) => `${plik.name}:${plik.size}:${plik.lastModified}`

async function doJpeg(bitmapa: ImageBitmap, szer: number, wys: number, jakosc: number): Promise<Blob> {
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
      return plotno.convertToBlob({ type: 'image/jpeg', quality: jakosc })
    }
  }

  const plotno = document.createElement('canvas')
  plotno.width = szer
  plotno.height = wys
  const ctx = plotno.getContext('2d')
  if (!ctx) throw new Error('brak kontekstu 2d')
  maluj(ctx)
  return new Promise((gotowe, blad) =>
    plotno.toBlob((b) => (b ? gotowe(b) : blad(new Error('toBlob'))), 'image/jpeg', jakosc)
  )
}

/** Punkty 3 i 5; null, gdy nawet po `jakoscAwaryjna` wynik przekracza `maksWyniku`. */
async function kompresuj(plik: File): Promise<Blob | null> {
  const bitmapa = await createImageBitmap(plik, { imageOrientation: 'from-image' })
  // Zamknięcie dopiero po obu kodowaniach: drugie idzie z tej samej bitmapy.
  try {
    const { width, height } = bitmapa
    const skala = Math.min(1, ZDJECIA.maksBok / Math.max(width, height))
    const szer = Math.max(1, Math.round(width * skala))
    const wys = Math.max(1, Math.round(height * skala))
    const wynik = await doJpeg(bitmapa, szer, wys, ZDJECIA.jakosc)
    if (wynik.size <= ZDJECIA.maksWyniku) return wynik
    const ponowny = await doJpeg(bitmapa, szer, wys, ZDJECIA.jakoscAwaryjna)
    return ponowny.size <= ZDJECIA.maksWyniku ? ponowny : null
  } finally {
    bitmapa.close()
  }
}

/** Plik do zgłoszenia albo null - zdjęcie „nie dodano" (`photo_failed`). */
async function przetworz(plik: File): Promise<Blob | null> {
  try {
    return await kompresuj(plik)
  } catch {
    // Punkt 4: brak dekodera (HEIC poza Safari, stara przeglądarka) albo błąd kodowania.
    return workerPrzyjmie(plik) && plik.size <= ZDJECIA.maksWyniku ? plik : null
  }
}

export interface Zdjecia {
  /** Gotowe pliki do `FormData`, z nazwą - bez niej przeglądarka wysłałaby „blob". */
  pliki(): { plik: Blob; nazwa: string }[]
  /** Zdjęcia dodane albo jeszcze w kompresji - bez kart „nie dodano". */
  liczba(): number
  /** Karty „nie dodano": zdjęcia, które nie pójdą w zgłoszeniu. */
  nieDodane(): number
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
  /** Ikona karty „nie dodano" - `<template>` w znaczniku strony. */
  ikonaNieDodano: HTMLTemplateElement | null
  /** Po każdej zmianie listy albo stanu kompresji. */
  poZmianie: () => void
}): Zdjecia {
  const { formularz, pole, lista, komunikaty, przycisk, ikonaNieDodano, poZmianie } = opcje
  const tekstPrzycisku = przycisk?.textContent?.trim() ?? ''
  let zdjecia: Zdjecie[] = []
  /** Komunikaty ostatniego wyboru plików (typ, duplikat, liczba) - do następnego wyboru. */
  let przejsciowe: string[] = []
  let pokazaneKomunikaty = ''

  const dodane = () => zdjecia.filter((z) => z.stan !== 'nieDodano')
  const wartosciKomunikatu = (zdjecie: Zdjecie) => ({ nazwa: zdjecie.oryginal.name, maks: waga(ZDJECIA.maksWejscia) })

  /**
   * Komunikaty kart „nie dodano" (żyją razem z kartą) i ostatniego wyboru.
   * Kontener ma `aria-live`, więc bez zmiany treści nie jest przebudowywany -
   * inaczej czytnik ekranu powtarzałby te same komunikaty po każdej zmianie listy.
   */
  const pokazKomunikaty = () => {
    const tresci = [
      ...zdjecia.flatMap((z) =>
        z.stan === 'nieDodano' && z.powod ? [zOdnosnikami(teksty.bledyPol[z.powod], wartosciKomunikatu(z))] : []
      ),
      ...[...new Set(przejsciowe)].map((tresc) => [tresc]),
    ]
    const klucz = tresci
      .map((kawalki) => kawalki.map((k) => (typeof k === 'string' ? k : k.textContent)).join(''))
      .join('\n')
    if (klucz === pokazaneKomunikaty) return
    pokazaneKomunikaty = klucz

    komunikaty.replaceChildren(
      ...tresci.map((kawalki) => {
        const wiersz = document.createElement('p')
        // Nazwa pliku z telefonu bywa długa i bez spacji - bez łamania rozpycha stronę w poziomie.
        wiersz.className = 'text-xs text-amber-700 break-words'
        wiersz.append(...kawalki)
        return wiersz
      })
    )
  }

  const usun = (zdjecie: Zdjecie) => {
    if (zdjecie.podglad) URL.revokeObjectURL(zdjecie.podglad)
    zdjecia = zdjecia.filter((z) => z !== zdjecie)
    odswiez()
  }

  const karta = (zdjecie: Zdjecie): HTMLElement => {
    const nieDodano = zdjecie.stan === 'nieDodano'
    const element = document.createElement('div')
    element.className = `flex items-center gap-2 bg-brand-card border rounded-lg px-3 py-2 ${
      nieDodano ? 'border-amber-700/40' : 'border-brand-border'
    }`

    const podglad = document.createElement(zdjecie.podglad ? 'img' : 'span')
    podglad.className = 'w-8 h-8 rounded object-cover bg-brand-section shrink-0'
    if (podglad instanceof HTMLImageElement && zdjecie.podglad) {
      // Nazwa stoi obok - podgląd jest ozdobą.
      podglad.alt = ''
      podglad.src = zdjecie.podglad
    } else if (nieDodano && ikonaNieDodano) {
      podglad.classList.add('flex', 'items-center', 'justify-center', 'text-amber-700')
      podglad.append(ikonaNieDodano.content.cloneNode(true))
    }

    const nazwa = document.createElement('span')
    nazwa.className = 'text-xs text-brand-text truncate max-w-[120px]'
    nazwa.textContent = zdjecie.oryginal.name

    const stan = document.createElement('span')
    if (nieDodano && zdjecie.powod) {
      stan.className = 'text-[10px] font-semibold text-amber-700'
      stan.textContent = wypelnij(teksty.zdjecia.nieDodano[zdjecie.powod], wartosciKomunikatu(zdjecie))
    } else {
      stan.className = 'text-[10px] text-brand-text-light whitespace-nowrap'
      stan.textContent = zdjecie.plik ? waga(zdjecie.plik.size) : teksty.zdjecia.przetwarzanie
    }

    const przyciskUsun = document.createElement('button')
    przyciskUsun.type = 'button'
    przyciskUsun.className = 'p-0.5 text-brand-text-light hover:text-brand-text transition-colors'
    przyciskUsun.setAttribute('aria-label', wypelnij(teksty.zdjecia.usun, { nazwa: zdjecie.oryginal.name }))
    przyciskUsun.textContent = '✕'
    przyciskUsun.addEventListener('click', () => usun(zdjecie))

    if (nieDodano) {
      // Nazwa nad powodem: w jednym wierszu karta nie mieści się na telefonie.
      const opis = document.createElement('span')
      opis.className = 'flex flex-col min-w-0'
      opis.append(nazwa, stan)
      element.append(podglad, opis, przyciskUsun)
    } else {
      element.append(podglad, nazwa, stan, przyciskUsun)
    }
    return element
  }

  const odswiez = () => {
    lista.replaceChildren(...zdjecia.map(karta))

    const pelno = dodane().length >= ZDJECIA.maksPlikow
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
    pokazKomunikaty()
    poZmianie()
  }

  pole.addEventListener('change', () => {
    const wybrane = [...(pole.files ?? [])]
    // Czyszczenie pozwala wybrać ten sam plik ponownie po usunięciu.
    pole.value = ''
    przejsciowe = []

    for (const plik of wybrane) {
      if (!przyjmowany(plik)) {
        przejsciowe.push(komunikatPola(formularz, 'photos', 'invalid_file_type'))
        continue
      }
      // DECYZJA: ten sam plik co karta „nie dodano" to nowa próba (np. po
      // chwilowym braku pamięci w telefonie), nie duplikat - zastąpi kartę.
      // Komunikat „już dodane" byłby nieprawdą, a druga karta - szumem.
      const poprzedniaKarta = zdjecia.find((z) => z.stan === 'nieDodano' && tozsamosc(z.oryginal) === tozsamosc(plik))
      if (!poprzedniaKarta && zdjecia.some((z) => tozsamosc(z.oryginal) === tozsamosc(plik))) {
        przejsciowe.push(wypelnij(teksty.bledyPol.photo_duplicate, { nazwa: plik.name }))
        continue
      }
      if (dodane().length >= ZDJECIA.maksPlikow) {
        przejsciowe.push(komunikatPola(formularz, 'photos', 'too_many_files'))
        continue
      }
      if (poprzedniaKarta) zdjecia = zdjecia.filter((z) => z !== poprzedniaKarta)

      if (plik.size > ZDJECIA.maksWejscia) {
        // Przed `createImageBitmap` i bez stanu „Przetwarzanie" - tego pliku nie dekodujemy.
        zdjecia.push({ oryginal: plik, stan: 'nieDodano', powod: 'photo_input_too_large' })
        continue
      }

      const zdjecie: Zdjecie = { oryginal: plik, stan: 'trwa' }
      zdjecia.push(zdjecie)
      void przetworz(plik).then((wynik) => {
        // Usunięte w trakcie kompresji - wynik nikogo już nie obchodzi.
        if (!zdjecia.includes(zdjecie)) return
        if (wynik) {
          zdjecie.stan = 'gotowe'
          zdjecie.plik = wynik
          zdjecie.podglad = URL.createObjectURL(wynik)
        } else {
          zdjecie.stan = 'nieDodano'
          zdjecie.powod = 'photo_failed'
        }
        odswiez()
      })
    }

    odswiez()
  })

  odswiez()

  return {
    pliki: () =>
      zdjecia
        .flatMap((z) => (z.stan === 'gotowe' && z.plik ? [z.plik] : []))
        .map((plik, i) => ({
          plik,
          nazwa: `zdjecie-${i + 1}.${plik.type === 'image/jpeg' ? 'jpg' : plik.type.split('/')[1]}`,
        })),
    liczba: () => dodane().length,
    nieDodane: () => zdjecia.length - dodane().length,
    trwa: () => zdjecia.some((z) => z.stan === 'trwa'),
    wyczysc: () => {
      for (const z of zdjecia) if (z.podglad) URL.revokeObjectURL(z.podglad)
      zdjecia = []
      przejsciowe = []
      odswiez()
    },
  }
}
