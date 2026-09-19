/**
 * KREATOR WYCENY - pięć kroków bez frameworka.
 *
 * Cały formularz jest w HTML. Ten moduł: chowa kroki, których akurat nie
 * oglądamy, waliduje przejścia, zapisuje postęp w `localStorage`, obsługuje
 * dodawanie zdjęć i składa podsumowanie.
 *
 * Bez JavaScriptu zostaje jedna długa forma z wszystkimi polami - czytelna
 * i wypełnialna, choć bez podziału na kroki.
 *
 * Reguły walidacji, limity pól, komunikaty i klucze zapisu są te same,
 * co w `code/src/pages/Wycena.jsx` - zgłoszenie ma dojść do Workera
 * w formacie, na który się umówimy, a nie w nowym.
 */

import {
  pobierzPola,
  oznaczPole,
  ponadLimit,
  poprawnyEmail,
  poprawnyTelefon,
  pokazPodsumowanie,
  pokazBlad,
  podepnijLicznik,
  backendGotowy,
  komunikatBrakBackendu,
  type Pole,
} from './formularz'
import { typyUslug, podtypy, opcjeTerenu, opcjeTerminu, opcjeBudzetu } from '../data/wycena'
import { endpointy } from '../config/site'

const KLUCZ_ZAPISU = 'brambruk_wycena-draft'
const LICZBA_KROKOW = 5

const MAKS_PLIKOW = 2
const MAKS_ROZMIAR_MB = 4
const DOZWOLONE = ['image/jpeg', 'image/png', 'image/webp']

const ETYKIETY_KROKOW = ['Usługa', 'Szczegóły', 'Dodatkowe', 'Dane', 'Sprawdź']

/** Które pola należą do którego kroku - potrzebne przy walidacji i skokach. */
const KROK_POLA: Record<string, number> = {
  serviceType: 0,
  subtype: 1,
  amount: 1,
  location: 1,
  terrain: 2,
  timeline: 2,
  budget: 2,
  description: 2,
  photos: 2,
  name: 3,
  email: 3,
  phone: 3,
}

function rozmiar(bajty: number): string {
  if (bajty < 1024) return `${bajty} B`
  if (bajty < 1024 * 1024) return `${(bajty / 1024).toFixed(0)} KB`
  return `${(bajty / (1024 * 1024)).toFixed(1)} MB`
}

function poprawnaLiczba(wartosc: string): boolean {
  const przyciety = wartosc.trim()
  if (!przyciety) return true
  return /^\d[\d\s]*([.,]\d+)?$/.test(przyciety)
}

export function wycena() {
  const formularz = document.querySelector<HTMLFormElement>('[data-formularz="wycena"]')
  if (!formularz) return

  const sekcja = document.querySelector<HTMLElement>('[data-wycena-formularz]')
  const kroki = [...formularz.querySelectorAll<HTMLElement>('[data-krok]')]
  const wskaznikKroki = [...document.querySelectorAll<HTMLButtonElement>('[data-wskaznik-krok]')]
  const kreski = [...document.querySelectorAll<HTMLElement>('.wskaznik-kreska')]
  const numerKroku = document.querySelector<HTMLElement>('[data-wycena-numer]')
  const etykietaKroku = document.querySelector<HTMLElement>('[data-wycena-etykieta]')
  const wstecz = formularz.querySelector<HTMLButtonElement>('[data-wycena-wstecz]')
  const dalej = formularz.querySelector<HTMLButtonElement>('[data-wycena-dalej]')
  const wyslij = formularz.querySelector<HTMLButtonElement>('[data-wycena-wyslij]')
  const rodo = formularz.querySelector<HTMLElement>('[data-wycena-rodo]')
  const jednostka = formularz.querySelector<HTMLElement>('[data-jednostka]')
  const sukces = document.querySelector<HTMLElement>('[data-wycena-sukces]')
  const kreator = document.querySelector<HTMLElement>('[data-wycena]')

  let krok = 0
  let pliki: File[] = []

  /* ---------------------------------------------------------------- */
  /* Stan formularza                                                   */
  /* ---------------------------------------------------------------- */

  const wartosc = (nazwa: string): string => {
    // ⚠️ KOLEJNOŚĆ MA ZNACZENIE. Pola wyboru też mają `data-pole`, a pierwsze
    // z brzegu `radio` ma swoją wartość NIEZALEŻNIE od tego, czy jest
    // zaznaczone - odpytane jako pierwsze udawałoby wypełniony formularz
    // i przepuszczało krok „wybierz typ usługi" bez wyboru.
    const zaznaczony = formularz.querySelector<HTMLInputElement>(`input[name="${nazwa}"]:checked`)
    if (zaznaczony) return zaznaczony.value

    const pole = formularz.querySelector<Pole>(`[data-pole="${nazwa}"]`)
    if (!pole) return ''
    const wyborNiezaznaczony =
      pole instanceof HTMLInputElement && (pole.type === 'radio' || pole.type === 'checkbox')
    return wyborNiezaznaczony ? '' : pole.value
  }

  const teren = (): string[] =>
    [...formularz.querySelectorAll<HTMLInputElement>('input[name="terrain"]:checked')].map((p) => p.value)

  const stan = () => ({
    serviceType: wartosc('serviceType'),
    subtype: wartosc('subtype'),
    amount: wartosc('amount'),
    location: wartosc('location'),
    terrain: teren(),
    timeline: wartosc('timeline'),
    budget: wartosc('budget'),
    description: wartosc('description'),
    name: wartosc('name'),
    email: wartosc('email'),
    phone: wartosc('phone'),
  })

  /* ---------------------------------------------------------------- */
  /* Zapis postępu                                                     */
  /* ---------------------------------------------------------------- */

  const zapisz = () => {
    const dane = stan()
    if (!dane.serviceType) return
    try {
      localStorage.setItem(KLUCZ_ZAPISU, JSON.stringify(dane))
    } catch {
      // Tryb prywatny albo pełny magazyn - zapis postępu jest wygodą,
      // nie warunkiem działania formularza.
    }
  }

  const odtworz = () => {
    let zapisane: string | null = null
    try {
      zapisane = localStorage.getItem(KLUCZ_ZAPISU)
    } catch {
      return
    }
    if (!zapisane) return

    try {
      const dane = JSON.parse(zapisane) as Record<string, unknown>
      for (const [nazwa, war] of Object.entries(dane)) {
        if (nazwa === 'terrain' && Array.isArray(war)) {
          for (const klucz of war) {
            const pole = formularz.querySelector<HTMLInputElement>(`input[name="terrain"][value="${klucz}"]`)
            if (pole) pole.checked = true
          }
          continue
        }
        if (typeof war !== 'string' || !war) continue

        // ⚠️ KOLEJNOŚĆ MA ZNACZENIE i jest odwrotna niż podpowiada intuicja:
        // NAJPIERW grupa przycisków radiowych, dopiero potem `data-pole`.
        // Przyciski radiowe (`serviceType`, `subtype`) TEŻ mają `data-pole`,
        // więc szukanie po nim trafiało w pierwszy przycisk grupy i ustawiało
        // mu `value` zamiast zaznaczyć właściwy - szkic nie wracał, a pierwszy
        // przycisk zaczynał wysyłać cudzą wartość. `stan()` czyta w tej samej
        // kolejności; te dwa miejsca muszą się zgadzać.
        const wybor = formularz.querySelector<HTMLInputElement>(`input[name="${nazwa}"][value="${war}"]`)
        if (wybor) {
          wybor.checked = true
          // Bez sztucznego zdarzenia `change`: jego obsługa kasuje podtyp przy
          // zmianie typu usługi, czyli skasowałaby to, co właśnie odtwarzamy.
          // Listę podtypów odsłania `odswiezPodtypy()` wywoływane zaraz po
          // `odtworz()` na dole tego modułu.
          continue
        }
        const pole = formularz.querySelector<Pole>(`[data-pole="${nazwa}"]`)
        if (pole) pole.value = war
      }
    } catch {
      try {
        localStorage.removeItem(KLUCZ_ZAPISU)
      } catch {
        /* nic */
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Walidacja                                                         */
  /* ---------------------------------------------------------------- */

  const sprawdzKrok = (numer: number): Record<string, string> => {
    const bledy: Record<string, string> = {}
    const dane = stan()

    if (numer === 0 && !dane.serviceType) bledy.serviceType = 'required'

    if (numer === 1) {
      const pole = formularz.querySelector<Pole>('[data-pole="amount"]')
      if (pole && ponadLimit(pole)) bledy.amount = 'too_long'
      else if (dane.amount.trim() && !poprawnaLiczba(dane.amount)) bledy.amount = 'invalid_number'

      const lokalizacja = formularz.querySelector<Pole>('[data-pole="location"]')
      if (lokalizacja && ponadLimit(lokalizacja)) bledy.location = 'too_long'
    }

    if (numer === 2) {
      const opis = formularz.querySelector<Pole>('[data-pole="description"]')
      if (opis && ponadLimit(opis)) bledy.description = 'too_long'
    }

    if (numer === 3) {
      const imie = formularz.querySelector<Pole>('[data-pole="name"]')
      const email = formularz.querySelector<Pole>('[data-pole="email"]')
      const telefon = formularz.querySelector<Pole>('[data-pole="phone"]')

      if (!dane.name.trim()) bledy.name = 'required'
      else if (imie && ponadLimit(imie)) bledy.name = 'too_long'

      if (!dane.email.trim()) bledy.email = 'required'
      else if (!poprawnyEmail(dane.email)) bledy.email = 'invalid_format'
      else if (email && ponadLimit(email)) bledy.email = 'too_long'

      if (dane.phone.trim()) {
        if (telefon && ponadLimit(telefon)) bledy.phone = 'too_long'
        else if (!poprawnyTelefon(dane.phone)) bledy.phone = 'invalid_phone'
      }
    }

    return bledy
  }

  const wszystkieBledy = () => ({
    ...sprawdzKrok(0),
    ...sprawdzKrok(1),
    ...sprawdzKrok(2),
    ...sprawdzKrok(3),
  })

  const wyczyscBledy = () => {
    for (const pole of pobierzPola(formularz)) oznaczPole(formularz, pole.dataset.pole ?? '', null)
    kroki[0]?.removeAttribute('data-blad')
    const blok = formularz.querySelector<HTMLElement>('[data-formularz-podsumowanie]')
    if (blok) blok.hidden = true
    const blad = formularz.querySelector<HTMLElement>('[data-formularz-blad]')
    if (blad) blad.hidden = true
  }

  const pokazBledy = (bledy: Record<string, string>, wstep: string) => {
    for (const [nazwa, kod] of Object.entries(bledy)) oznaczPole(formularz, nazwa, kod)
    if (bledy.serviceType) {
      kroki[0]?.setAttribute('data-blad', '')
      const opis = formularz.querySelector<HTMLElement>('[data-krok0-opis]')
      if (opis) {
        opis.textContent = 'Wybierz jedną z poniższych opcji, aby przejść dalej.'
        opis.classList.add('text-red-500', 'font-medium')
        opis.classList.remove('text-brand-text-light')
      }
    }
    pokazPodsumowanie(formularz, bledy, wstep)
  }

  /* ---------------------------------------------------------------- */
  /* Widok                                                             */
  /* ---------------------------------------------------------------- */

  const odswiezPodtypy = () => {
    const typ = wartosc('serviceType')
    for (const grupa of formularz.querySelectorAll<HTMLElement>('[data-podtypy]')) {
      grupa.hidden = grupa.dataset.podtypy !== typ
    }
    if (jednostka) jednostka.textContent = typ === 'ogrodzenia' ? 'mb' : 'm²'
  }

  const odswiezPodsumowanie = () => {
    const dane = stan()
    const etykieta = (lista: readonly { klucz: string; etykieta: string }[], klucz: string) =>
      lista.find((pozycja) => pozycja.klucz === klucz)?.etykieta ?? '-'

    const listaPodtypow = (podtypy as Record<string, readonly { klucz: string; etykieta: string }[]>)[
      dane.serviceType
    ]
    const powierzchnia = dane.serviceType === 'brukarstwo' || dane.serviceType === 'budownictwo'

    const wartosci: Record<string, string> = {
      usluga: `${etykieta(typyUslug, dane.serviceType)} - ${listaPodtypow ? etykieta(listaPodtypow, dane.subtype) : '-'}`,
      wymiary: dane.amount ? `${dane.amount} ${powierzchnia ? 'm²' : 'mb'}` : '-',
      lokalizacja: dane.location || '-',
      teren: dane.terrain.map((klucz) => etykieta(opcjeTerenu, klucz)).join(', ') || '-',
      termin: etykieta(opcjeTerminu, dane.timeline),
      budzet: etykieta(opcjeBudzetu, dane.budget),
      opis: dane.description.trim()
        ? dane.description.length > 80
          ? `${dane.description.slice(0, 80)}...`
          : dane.description
        : '-',
      zdjecia: pliki.length ? `${pliki.length} plik(ów)` : 'Brak',
      kontakt: [dane.name, dane.email, dane.phone].filter(Boolean).join(' · ') || '-',
    }

    for (const wiersz of formularz.querySelectorAll<HTMLElement>('[data-podsumowanie-wiersz]')) {
      const nazwa = wiersz.dataset.podsumowanieWiersz ?? ''
      const miejsce = wiersz.querySelector<HTMLElement>('[data-podsumowanie-wartosc]')
      if (miejsce) miejsce.textContent = wartosci[nazwa] ?? '-'
    }
  }

  const pokazKrok = (numer: number, przewin = true) => {
    krok = Math.min(Math.max(numer, 0), LICZBA_KROKOW - 1)

    kroki.forEach((element, i) => {
      element.hidden = i !== krok
    })

    wskaznikKroki.forEach((przycisk, i) => {
      const stanKroku = i < krok ? 'zrobiony' : i === krok ? 'aktywny' : 'przyszly'
      przycisk.dataset.stan = stanKroku
      przycisk.disabled = i > 0 && !wartosc('serviceType')
      przycisk.setAttribute('aria-current', i === krok ? 'step' : 'false')
    })

    kreski.forEach((kreska, i) => {
      if (i < krok) kreska.setAttribute('data-wskaznik-kreska', 'zrobiona')
      else kreska.removeAttribute('data-wskaznik-kreska')
    })

    if (numerKroku) numerKroku.textContent = String(krok + 1)
    if (etykietaKroku) etykietaKroku.textContent = ETYKIETY_KROKOW[krok]

    const ostatni = krok === LICZBA_KROKOW - 1
    if (dalej) dalej.hidden = ostatni
    if (wyslij) wyslij.hidden = !ostatni
    if (rodo) rodo.hidden = !ostatni

    if (wstecz) {
      wstecz.disabled = krok === 0
      wstecz.classList.toggle('text-brand-text-light/50', krok === 0)
      wstecz.classList.toggle('cursor-not-allowed', krok === 0)
      wstecz.classList.toggle('text-brand-text', krok !== 0)
      wstecz.classList.toggle('hover:border-brand-olive/40', krok !== 0)
    }

    if (ostatni) odswiezPodsumowanie()
    if (przewin && krok > 0) sekcja?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* ---------------------------------------------------------------- */
  /* Zdjęcia                                                           */
  /* ---------------------------------------------------------------- */

  const polePliku = formularz.querySelector<HTMLInputElement>('[data-upload-pole]')
  const listaPlikow = formularz.querySelector<HTMLElement>('[data-upload-lista]')
  const odrzucone = formularz.querySelector<HTMLElement>('[data-upload-odrzucone]')
  const przyciskPliku = formularz.querySelector<HTMLElement>('[data-upload-przycisk]')

  const odswiezPliki = () => {
    if (!listaPlikow) return
    listaPlikow.replaceChildren(
      ...pliki.map((plik, indeks) => {
        const karta = document.createElement('div')
        karta.className =
          'flex items-center gap-2 bg-brand-card border border-brand-border rounded-lg px-3 py-2'

        const podglad = document.createElement('img')
        podglad.className = 'w-8 h-8 rounded object-cover'
        podglad.alt = plik.name
        podglad.src = URL.createObjectURL(plik)

        const nazwa = document.createElement('span')
        nazwa.className = 'text-xs text-brand-text truncate max-w-[120px]'
        nazwa.textContent = plik.name

        const waga = document.createElement('span')
        waga.className = 'text-[10px] text-brand-text-light'
        waga.textContent = rozmiar(plik.size)

        const usun = document.createElement('button')
        usun.type = 'button'
        usun.className = 'p-0.5 text-brand-text-light hover:text-brand-text transition-colors'
        usun.setAttribute('aria-label', `Usuń ${plik.name}`)
        usun.textContent = '✕'
        usun.addEventListener('click', () => {
          URL.revokeObjectURL(podglad.src)
          pliki = pliki.filter((_, i) => i !== indeks)
          odswiezPliki()
        })

        karta.append(podglad, nazwa, waga, usun)
        return karta
      })
    )

    if (przyciskPliku) {
      const pelno = pliki.length >= MAKS_PLIKOW
      przyciskPliku.textContent = pelno ? `Limit ${MAKS_PLIKOW} plików` : 'Wybierz pliki'
      przyciskPliku.classList.toggle('bg-brand-border/50', pelno)
      przyciskPliku.classList.toggle('text-brand-text-light', pelno)
      przyciskPliku.classList.toggle('cursor-not-allowed', pelno)
      przyciskPliku.classList.toggle('bg-brand-olive', !pelno)
      przyciskPliku.classList.toggle('text-brand-dark', !pelno)
      przyciskPliku.classList.toggle('cursor-pointer', !pelno)
    }
  }

  const dodajPliki = (lista: FileList | null) => {
    if (!lista || !odrzucone) return
    const odrzuty: string[] = []

    for (const plik of [...lista]) {
      if (!DOZWOLONE.includes(plik.type)) {
        const rozszerzenie = plik.name.split('.').pop()?.toUpperCase() ?? '?'
        odrzuty.push(`${plik.name} - Niedozwolony format (.${rozszerzenie}). Dozwolone: JPG, PNG, WebP.`)
        continue
      }
      if (plik.size > MAKS_ROZMIAR_MB * 1024 * 1024) {
        odrzuty.push(`${plik.name} - Za duży (${rozmiar(plik.size)}). Max ${MAKS_ROZMIAR_MB} MB.`)
        continue
      }
      if (pliki.length >= MAKS_PLIKOW) {
        odrzuty.push(`${plik.name} - Osiągnięto limit ${MAKS_PLIKOW} plików.`)
        continue
      }
      pliki.push(plik)
    }

    odrzucone.replaceChildren(
      ...odrzuty.map((tresc) => {
        const wiersz = document.createElement('p')
        wiersz.className = 'text-xs text-amber-700'
        wiersz.textContent = tresc
        return wiersz
      })
    )

    odswiezPliki()
  }

  polePliku?.addEventListener('change', () => {
    dodajPliki(polePliku.files)
    polePliku.value = ''
  })

  /* ---------------------------------------------------------------- */
  /* Zdarzenia                                                         */
  /* ---------------------------------------------------------------- */

  for (const pole of pobierzPola(formularz)) {
    pole.addEventListener('input', () => {
      oznaczPole(formularz, pole.dataset.pole ?? '', null)
      zapisz()
    })
  }

  for (const wybor of formularz.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]')) {
    wybor.addEventListener('change', () => {
      if (wybor.name === 'serviceType') {
        // Zmiana typu usługi kasuje podtyp - inaczej zostałby wybór
        // z poprzedniej kategorii, niewidoczny i niezrozumiały w podsumowaniu.
        for (const podtyp of formularz.querySelectorAll<HTMLInputElement>('input[name="subtype"]')) {
          podtyp.checked = false
        }
        odswiezPodtypy()
        oznaczPole(formularz, 'serviceType', null)
        kroki[0]?.removeAttribute('data-blad')
      }
      zapisz()
    })
  }

  for (const select of formularz.querySelectorAll<HTMLSelectElement>('select[data-pole]')) {
    select.addEventListener('change', zapisz)
  }

  formularz.querySelector('[data-podsumowanie-zamknij]')?.addEventListener('click', () => {
    const blok = formularz.querySelector<HTMLElement>('[data-formularz-podsumowanie]')
    if (blok) blok.hidden = true
  })

  wskaznikKroki.forEach((przycisk, i) => {
    przycisk.addEventListener('click', () => {
      if (i > 0 && !wartosc('serviceType')) return
      wyczyscBledy()
      pokazKrok(i)
    })
  })

  for (const wiersz of formularz.querySelectorAll<HTMLElement>('[data-podsumowanie-wiersz]')) {
    wiersz.addEventListener('click', () => {
      const cel = Number(wiersz.dataset.krokDocelowy ?? 0)
      wyczyscBledy()
      pokazKrok(cel)
    })
  }

  wstecz?.addEventListener('click', () => {
    wyczyscBledy()
    pokazKrok(krok - 1)
  })

  dalej?.addEventListener('click', () => {
    const bledy = sprawdzKrok(krok)
    if (Object.keys(bledy).length) {
      pokazBledy(bledy, 'Popraw')
      const pierwsze = formularz.querySelector<Pole>('[data-blad-pola]')
      pierwsze?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      pierwsze?.focus({ preventScroll: true })
      return
    }
    wyczyscBledy()
    pokazKrok(krok + 1)
  })

  wyslij?.addEventListener('click', async () => {
    const bledy = wszystkieBledy()
    if (Object.keys(bledy).length) {
      pokazBledy(bledy, 'Popraw')
      const pierwszePole = Object.keys(bledy)[0]
      pokazKrok(KROK_POLA[pierwszePole] ?? 0)
      return
    }

    if (!backendGotowy()) {
      pokazBlad(formularz, komunikatBrakBackendu())
      return
    }

    const dane = new FormData(formularz)
    dane.set('terrain', JSON.stringify(teren()))
    for (const plik of pliki) dane.append('photos[]', plik)

    try {
      const odpowiedz = await fetch(endpointy.formularz, { method: 'POST', body: dane })
      if (odpowiedz.ok) {
        try {
          localStorage.removeItem(KLUCZ_ZAPISU)
        } catch {
          /* nic */
        }
        if (sukces) sukces.hidden = false
        if (kreator) kreator.hidden = true
        window.scrollTo(0, 0)
        return
      }
      pokazBlad(formularz, 'Wystąpił błąd przy wysyłaniu. Spróbuj ponownie.')
    } catch {
      pokazBlad(formularz, 'Nie udało się połączyć z serwerem. Sprawdź połączenie z internetem i spróbuj ponownie.')
    }
  })

  /* ---------------------------------------------------------------- */
  /* Start                                                             */
  /* ---------------------------------------------------------------- */

  podepnijLicznik(formularz)
  odtworz()
  odswiezPodtypy()
  odswiezPliki()
  pokazKrok(0, false)
}
