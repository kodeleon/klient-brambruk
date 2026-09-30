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
 * Nazwy pól, klucze opcji i reguły walidacji są kontraktem z Workerem
 * (`forms-worker/INTEGRATION.md`, `src/config/formularze.ts`); wspólną
 * walidację i wysyłkę daje `formularz.ts`, kompresję zdjęć `zdjecia.ts`.
 */

import {
  pobierzPola,
  oznaczPole,
  sprawdzPola,
  pokazBledyPol,
  pokazBladWysylki,
  wyczyscBledy as wyczyscBledyFormularza,
  podepnijLicznik,
  przejdzDo,
  ustawBlokade,
  wyslij as wyslijZgloszenie,
  zablokujNatywnaWysylke,
  wypelnij,
  type Bledy,
  type Pole,
} from './formularz'
import { zdjecia as podepnijZdjecia, type Zdjecia } from './zdjecia'
// Słowniki i teksty wprost z plików treści: to moduł przeglądarki, więc nie
// może przejść przez kolekcje Astro.
import slowniki from '../content/wycena.json'
import teksty from '../content/formularze.json'

const { typy: typyUslug, podtypy, teren: opcjeTerenu, termin: opcjeTerminu, budzet: opcjeBudzetu } = slowniki

const KLUCZ_ZAPISU = 'brambruk_wycena-draft'
const LICZBA_KROKOW = 5

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

const ODMIANA = new Intl.PluralRules('pl-PL')

/** Pole „wymiary" ma obok jednostkę, więc przyjmuje samą liczbę - to reguła frontu, nie Workera. */
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
  let zdjecia: Zdjecia | null = null

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

  /** Pola tekstowe kroku według reguł Workera + wybór usługi i liczba w „wymiarach". */
  const sprawdzKrok = (numer: number): Bledy => {
    const kontener = kroki[numer]
    const bledy: Bledy = kontener ? sprawdzPola(kontener) : {}
    const dane = stan()

    if (numer === 0 && !dane.serviceType) bledy.serviceType = 'required'
    if (numer === 1 && !bledy.amount && dane.amount.trim() && !poprawnaLiczba(dane.amount)) {
      bledy.amount = 'invalid_number'
    }
    return bledy
  }

  const wszystkieBledy = (): Bledy => Object.assign({}, ...kroki.map((_, i) => sprawdzKrok(i)))

  const wyczyscBledy = () => {
    wyczyscBledyFormularza(formularz)
    kroki[0]?.removeAttribute('data-blad-wyboru')
  }

  const pokazBledy = (bledy: Bledy) => {
    pokazBledyPol(formularz, bledy)
    if (bledy.serviceType) kroki[0]?.setAttribute('data-blad-wyboru', '')
  }

  /** Wraca do kroku z pierwszym błędnym polem i ustawia na nim fokus. */
  const pokazBledyWKreatorze = (bledy: Bledy) => {
    pokazBledy(bledy)
    const pierwszyKrok = Math.min(...Object.keys(bledy).map((nazwa) => KROK_POLA[nazwa] ?? 0))
    pokazKrok(pierwszyKrok)
    przejdzDo(kroki[pierwszyKrok]?.querySelector<HTMLElement>('[data-blad-pola]') ?? null)
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

    const liczbaZdjec = () => {
      const liczba = zdjecia?.liczba() ?? 0
      if (!liczba) return teksty.zdjecia.brak
      const forma = ODMIANA.select(liczba) as keyof typeof teksty.zdjecia.liczba
      return wypelnij(teksty.zdjecia.liczba[forma] ?? teksty.zdjecia.liczba.many, { liczba })
    }

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
      zdjecia: liczbaZdjec(),
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
    if (przewin && krok > 0) {
      const bezRuchu = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      sekcja?.scrollIntoView({ behavior: bezRuchu ? 'auto' : 'smooth', block: 'start' })
    }
  }

  /* ---------------------------------------------------------------- */
  /* Zdjęcia                                                           */
  /* ---------------------------------------------------------------- */

  const polePliku = formularz.querySelector<HTMLInputElement>('[data-upload-pole]')
  const listaPlikow = formularz.querySelector<HTMLElement>('[data-upload-lista]')
  const odrzucone = formularz.querySelector<HTMLElement>('[data-upload-odrzucone]')

  if (polePliku && listaPlikow && odrzucone) {
    zdjecia = podepnijZdjecia({
      formularz,
      pole: polePliku,
      lista: listaPlikow,
      komunikaty: odrzucone,
      przycisk: formularz.querySelector<HTMLElement>('[data-upload-przycisk]'),
      poZmianie: () => {
        oznaczPole(formularz, 'photos', null)
        // Wysyłka czeka, aż kompresja się skończy - inaczej poszedłby oryginał albo nic.
        if (wyslij) ustawBlokade(wyslij, 'zdjecia', zdjecia?.trwa() ?? false)
        if (krok === LICZBA_KROKOW - 1) odswiezPodsumowanie()
      },
    })
  }

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
        oznaczPole(formularz, 'subtype', null)
        kroki[0]?.removeAttribute('data-blad-wyboru')
      }
      oznaczPole(formularz, wybor.name, null)
      zapisz()
    })
  }

  for (const select of formularz.querySelectorAll<HTMLSelectElement>('select[data-pole]')) {
    select.addEventListener('change', () => {
      oznaczPole(formularz, select.name, null)
      zapisz()
    })
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
    wyczyscBledy()
    const bledy = sprawdzKrok(krok)
    if (Object.keys(bledy).length) {
      pokazBledy(bledy)
      przejdzDo(kroki[krok]?.querySelector<HTMLElement>('[data-blad-pola]') ?? null)
      return
    }
    pokazKrok(krok + 1)
  })

  wyslij?.addEventListener('click', async () => {
    wyczyscBledy()
    const bledy = wszystkieBledy()
    if (Object.keys(bledy).length) {
      pokazBledyWKreatorze(bledy)
      return
    }

    // Pola z formularza jak są: `terrain` jako powtórzony klucz (terrain=a&terrain=b),
    // pułapka `_hp` pusta. Zdjęcia tylko po kompresji, z pola pliku nic.
    const dane = new FormData(formularz)
    dane.delete('photos')
    for (const { plik, nazwa } of zdjecia?.pliki() ?? []) dane.append('photos', plik, nazwa)

    ustawBlokade(wyslij, 'wysylka', true)
    const wynik = await wyslijZgloszenie(formularz, dane)
    ustawBlokade(wyslij, 'wysylka', false)

    if (wynik.ok) {
      try {
        localStorage.removeItem(KLUCZ_ZAPISU)
      } catch {
        /* nic */
      }
      zdjecia?.wyczysc()
      if (sukces) sukces.hidden = false
      if (kreator) kreator.hidden = true
      window.scrollTo(0, 0)
      sukces?.focus({ preventScroll: true })
      return
    }

    if (wynik.pola) {
      pokazBledyWKreatorze(wynik.pola)
      return
    }
    pokazBladWysylki(formularz, wynik, wyslij)
  })

  /* ---------------------------------------------------------------- */
  /* Start                                                             */
  /* ---------------------------------------------------------------- */

  zablokujNatywnaWysylke(formularz)
  podepnijLicznik(formularz)
  odtworz()
  odswiezPodtypy()
  pokazKrok(0, false)
}
