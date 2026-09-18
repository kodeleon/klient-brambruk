/**
 * FORMULARZ KONTAKTOWY - walidacja i wysyłka.
 *
 * ┌── STAN PRZEJŚCIOWY ─────────────────────────────────────────────────┐
 * │ Stary formularz wysyłał do wtyczki w WordPressie                     │
 * │ (`/wp-json/codove-mailing/v1/forms/contact/send`). WordPress znika    │
 * │ ze stosu, a Worker przyjmujący zgłoszenia dopiero powstanie.          │
 * │                                                                      │
 * │ Do tego czasu: walidacja działa w całości (te same reguły i te same   │
 * │ komunikaty, co poprzednio), a wysyłka pokazuje komunikat zastępczy    │
 * │ z telefonem i e-mailem. Podpięcie backendu to ustawienie              │
 * │ `endpointy.formularz` w `src/config/site.ts` - reszta jest gotowa.    │
 * └──────────────────────────────────────────────────────────────────────┘
 */

import { endpointy } from '../config/site'
import { dane } from '../config/dane'

const KOMUNIKATY: Record<string, string> = {
  required: 'To pole jest wymagane.',
  invalid_format: 'Nieprawidłowy format.',
  invalid_phone: 'Nieprawidłowy numer telefonu.',
  too_long: 'Tekst jest za długi.',
}

const ETYKIETY: Record<string, string> = {
  name: 'Imię',
  email: 'E-mail',
  phone: 'Telefon',
  message: 'Wiadomość',
}

const BRAK_BACKENDU =
  'Wysyłka formularza jest chwilowo niedostępna - trwa przenoszenie serwisu. ' +
  `Zadzwoń: ${dane.telefon} albo napisz: ${dane.email}. Przepraszamy za utrudnienie.`

export type Pole = HTMLInputElement | HTMLTextAreaElement

export function pobierzPola(formularz: HTMLElement): Pole[] {
  return [...formularz.querySelectorAll<Pole>('[data-pole]')]
}

export function limit(pole: Pole): number | null {
  const wartosc = Number(pole.dataset.limit)
  return Number.isFinite(wartosc) && wartosc > 0 ? wartosc : null
}

export function ponadLimit(pole: Pole): boolean {
  const maks = limit(pole)
  return maks !== null && pole.value.length > maks
}

export function poprawnyEmail(wartosc: string): boolean {
  return /\S+@\S+\.\S+/.test(wartosc)
}

export function poprawnyTelefon(wartosc: string): boolean {
  const przyciety = wartosc.trim()
  if (!przyciety) return true
  return /^[+\d\s\-()]{3,}$/.test(przyciety)
}

/** Pokazuje albo chowa komunikat przy jednym polu. */
export function oznaczPole(formularz: HTMLElement, nazwa: string, kod: string | null) {
  const pole = formularz.querySelector<Pole>(`[data-pole="${nazwa}"]`)
  const komunikat = formularz.querySelector<HTMLElement>(`[data-blad="${nazwa}"]`)
  const podpowiedz = formularz.querySelector<HTMLElement>(`[data-podpowiedz="${nazwa}"]`)

  if (pole) {
    if (kod) pole.setAttribute('data-blad-pola', '')
    else pole.removeAttribute('data-blad-pola')
    pole.setAttribute('aria-invalid', kod ? 'true' : 'false')
  }

  if (komunikat) {
    const maks = pole ? limit(pole) : null
    komunikat.textContent = kod
      ? pole && ponadLimit(pole) && maks
        ? `Za długie - max ${maks} znaków.`
        : (KOMUNIKATY[kod] ?? kod)
      : ''
    komunikat.hidden = !kod
  }

  // Podpowiedź pod telefonem ustępuje miejsca komunikatowi o błędzie -
  // tak samo, jak robił to stary komponent.
  if (podpowiedz) podpowiedz.hidden = Boolean(kod)
}

export function pokazPodsumowanie(formularz: HTMLElement, bledy: Record<string, string>, wstep: string) {
  const blok = formularz.querySelector<HTMLElement>('[data-formularz-podsumowanie]')
  const tytul = formularz.querySelector<HTMLElement>('[data-podsumowanie-tytul]')
  const lista = formularz.querySelector<HTMLElement>('[data-podsumowanie-lista]')
  if (!blok || !tytul || !lista) return

  const pozycje = Object.entries(bledy)
  if (!pozycje.length) {
    blok.hidden = true
    return
  }

  tytul.textContent = `${wstep} ${pozycje.length === 1 ? 'pole' : 'pola'}:`
  lista.replaceChildren(
    ...pozycje.map(([nazwa, kod]) => {
      const pozycja = document.createElement('li')
      pozycja.className = 'text-xs text-red-600'
      const etykieta = document.createElement('span')
      etykieta.className = 'font-medium'
      etykieta.textContent = ETYKIETY[nazwa] ?? nazwa
      pozycja.append(etykieta, ` - ${KOMUNIKATY[kod] ?? kod}`)
      return pozycja
    })
  )
  blok.hidden = false
}

export function pokazBlad(formularz: HTMLElement, tresc: string) {
  const blok = formularz.querySelector<HTMLElement>('[data-formularz-blad]')
  const tekst = formularz.querySelector<HTMLElement>('[data-formularz-blad-tekst]')
  if (!blok || !tekst) return
  tekst.textContent = tresc
  blok.hidden = false
}

export function podepnijLicznik(formularz: HTMLElement) {
  for (const licznik of formularz.querySelectorAll<HTMLElement>('[data-licznik]')) {
    const nazwa = licznik.dataset.licznik
    const pole = formularz.querySelector<Pole>(`[data-pole="${nazwa}"]`)
    if (!pole) continue
    const maks = limit(pole)
    if (maks === null) continue

    const odswiez = () => {
      licznik.textContent = `${pole.value.length.toLocaleString('pl-PL')} / ${maks.toLocaleString('pl-PL')}`
      const ponad = pole.value.length > maks
      licznik.classList.toggle('text-red-500', ponad)
      licznik.classList.toggle('font-semibold', ponad)
      licznik.classList.toggle('text-brand-text-light', !ponad)
    }

    pole.addEventListener('input', odswiez)
    odswiez()
  }
}

/** Czy backend zgłoszeń jest już podpięty. */
export function backendGotowy(): boolean {
  return Boolean(endpointy.formularz)
}

export function komunikatBrakBackendu(): string {
  return BRAK_BACKENDU
}

function sprawdz(formularz: HTMLElement): Record<string, string> {
  const bledy: Record<string, string> = {}

  for (const pole of pobierzPola(formularz)) {
    const nazwa = pole.dataset.pole ?? ''
    const wartosc = pole.value.trim()

    if (pole.required && !wartosc) {
      bledy[nazwa] = 'required'
      continue
    }
    if (ponadLimit(pole)) {
      bledy[nazwa] = 'too_long'
      continue
    }
    if (nazwa === 'email' && wartosc && !poprawnyEmail(wartosc)) {
      bledy[nazwa] = 'invalid_format'
      continue
    }
    if (nazwa === 'phone' && !poprawnyTelefon(wartosc)) {
      bledy[nazwa] = 'invalid_phone'
    }
  }

  return bledy
}

export function formularz() {
  const element = document.querySelector<HTMLFormElement>('[data-formularz="kontakt"]')
  if (!element) return

  const przycisk = element.querySelector<HTMLButtonElement>('[data-formularz-wyslij]')
  const zamknijPodsumowanie = element.querySelector<HTMLElement>('[data-podsumowanie-zamknij]')

  podepnijLicznik(element)

  for (const pole of pobierzPola(element)) {
    pole.addEventListener('input', () => {
      oznaczPole(element, pole.dataset.pole ?? '', null)
      const blok = element.querySelector<HTMLElement>('[data-formularz-podsumowanie]')
      if (blok) blok.hidden = true
    })
  }

  zamknijPodsumowanie?.addEventListener('click', () => {
    const blok = element.querySelector<HTMLElement>('[data-formularz-podsumowanie]')
    if (blok) blok.hidden = true
  })

  przycisk?.addEventListener('click', async () => {
    const bledy = sprawdz(element)

    for (const pole of pobierzPola(element)) {
      const nazwa = pole.dataset.pole ?? ''
      oznaczPole(element, nazwa, bledy[nazwa] ?? null)
    }

    if (Object.keys(bledy).length) {
      pokazPodsumowanie(element, bledy, 'Popraw')
      const pierwsze = element.querySelector<Pole>('[data-blad-pola]')
      pierwsze?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      pierwsze?.focus({ preventScroll: true })
      return
    }

    if (!backendGotowy()) {
      pokazBlad(element, komunikatBrakBackendu())
      return
    }

    // Ścieżka docelowa - włącza się sama, gdy `endpointy.formularz`
    // dostanie adres Workera.
    const dane = new FormData(element)
    try {
      const odpowiedz = await fetch(endpointy.formularz, { method: 'POST', body: dane })
      if (odpowiedz.ok) {
        const sukces = document.querySelector<HTMLElement>('[data-formularz-sukces]')
        const tresc = document.querySelector<HTMLElement>('[data-formularz-tresc]')
        if (sukces) sukces.hidden = false
        if (tresc) tresc.hidden = true
        window.scrollTo(0, 0)
        return
      }
      pokazBlad(element, 'Wystąpił błąd przy wysyłaniu. Spróbuj ponownie.')
    } catch {
      pokazBlad(element, 'Nie udało się połączyć z serwerem. Sprawdź połączenie z internetem i spróbuj ponownie.')
    }
  })
}
