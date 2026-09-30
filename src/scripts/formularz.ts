/**
 * FORMULARZE - wspólna walidacja, wysyłka do Workera i komunikaty,
 * plus formularz kontaktowy. Kreator wyceny (`wycena.ts`) korzysta z tych
 * samych funkcji.
 *
 * Kontrakt z Workerem: `forms-worker/INTEGRATION.md` (źródło prawdy),
 * wartości przepisane w `src/config/formularze.ts`. Reguły tutaj mają być
 * DOKŁADNIE takie jak w Workerze: ostrzejsze odrzuciłyby poprawne dane,
 * łagodniejsze kończyłyby się błędem dopiero po wysyłce.
 *
 * Adres wysyłki przychodzi z `data-adres` formularza, nie z `site.ts`:
 * zmienna builda, która go przestawia, istnieje tylko w Node.
 */

import { WZORZEC_EMAIL, WZORZEC_LINKU, WZORZEC_TELEFONU, ZDJECIA } from '../config/formularze'
// Dane i teksty wprost z plików treści: to moduł przeglądarki, więc nie może
// przejść przez kolekcje Astro ani przez rozwijacz znaczników (`node:fs`).
import firma from '../content/firma.json'
import teksty from '../content/formularze.json'

export type Pole = HTMLInputElement | HTMLTextAreaElement
export type Bledy = Record<string, string>

/* ------------------------------------------------------------------ */
/* Komunikaty                                                          */
/* ------------------------------------------------------------------ */

/** `{klucz}` -> wartość. Nieznany klucz zostaje, żeby literówka była widoczna. */
export function wypelnij(szablon: string, wartosci: Record<string, string | number>): string {
  return szablon.replace(/\{(\w+)\}/g, (calosc, klucz: string) =>
    klucz in wartosci ? String(wartosci[klucz]) : calosc
  )
}

/** Jak `wypelnij`, ale `{telefon}` i `{email}` stają się klikalnymi odnośnikami firmy. */
export function zOdnosnikami(szablon: string, wartosci: Record<string, string | number> = {}): (string | Node)[] {
  const odnosniki: Record<string, [string, string]> = {
    telefon: [`tel:${firma.telefonHref}`, firma.telefon],
    email: [`mailto:${firma.email}`, firma.email],
  }
  return wypelnij(szablon, wartosci)
    .split(/(\{telefon\}|\{email\})/)
    .filter(Boolean)
    .map((kawalek) => {
      const cel = odnosniki[kawalek.slice(1, -1)]
      if (!kawalek.startsWith('{') || !cel) return kawalek
      const a = document.createElement('a')
      a.href = cel[0]
      a.textContent = cel[1]
      a.className = 'font-semibold underline whitespace-nowrap'
      return a
    })
}

/**
 * Waga pliku: „594 KB", „1,4 MB", „10 MB". Te same jednostki co limity
 * w `ZDJECIA` (1 MB = 1024 × 1024 B), więc limit i komunikat o nim się zgadzają.
 */
export function waga(bajty: number): string {
  const kb = Math.max(1, Math.round(bajty / 1024))
  if (kb < 1024) return `${kb} KB`
  return `${(bajty / (1024 * 1024)).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} MB`
}

export function limit(pole: Pole): number | null {
  const wartosc = Number(pole.dataset.limit)
  return Number.isFinite(wartosc) && wartosc > 0 ? wartosc : null
}

/** Komunikat przy polu dla kodu błędu z walidacji frontu albo z odpowiedzi Workera. */
export function komunikatPola(formularz: HTMLElement, nazwa: string, kod: string): string {
  const b = teksty.bledyPol
  const pole = formularz.querySelector<HTMLElement>(`[data-pole="${nazwa}"]`)
  const wybor =
    pole instanceof HTMLSelectElement ||
    (pole instanceof HTMLInputElement && (pole.type === 'radio' || pole.type === 'checkbox'))

  switch (kod) {
    case 'required':
      return wybor ? b.requiredWybor : b.required
    case 'too_long': {
      const maks = pole instanceof HTMLInputElement || pole instanceof HTMLTextAreaElement ? limit(pole) : null
      return wypelnij(b.too_long, { maks: maks?.toLocaleString('pl-PL') ?? '' })
    }
    case 'invalid_option':
      return formularz.querySelector(`[data-blad="${nazwa}"][data-zalezne]`) ? b.invalid_optionZalezne : b.invalid_option
    case 'too_many_files':
      return wypelnij(b.too_many_files, { maks: ZDJECIA.maksPlikow })
    case 'file_too_large':
      // Tylko z odpowiedzi Workera (wysyłka z pominięciem kompresji) - front ma niższy `maksWyniku`.
      return wypelnij(b.file_too_large, { maks: waga(ZDJECIA.maksWorkera) })
    default:
      return b[kod as keyof typeof b] ?? kod
  }
}

/* ------------------------------------------------------------------ */
/* Walidacja - te same reguły co w Workerze                            */
/* ------------------------------------------------------------------ */

/** Pola tekstowe (wybory też mają `data-pole`, ale sprawdza je kreator). */
export function pobierzPola(kontener: HTMLElement): Pole[] {
  return [...kontener.querySelectorAll<Pole>('input[data-pole], textarea[data-pole]')].filter(
    (pole) => !(pole instanceof HTMLInputElement && ['radio', 'checkbox', 'file'].includes(pole.type))
  )
}

/**
 * Worker przycina wartość (`trim()`), zanim cokolwiek sprawdzi - więc sam
 * ciąg spacji to puste pole, a limit liczy się bez spacji z brzegów.
 * Kolejność sprawdzeń jak w `validate.ts`: długość, format, linki.
 */
export function sprawdzPole(pole: Pole): string | null {
  const wartosc = pole.value.trim()
  if (!wartosc) return pole.required ? 'required' : null
  const maks = limit(pole)
  if (maks !== null && wartosc.length > maks) return 'too_long'
  if (pole.type === 'email' && !WZORZEC_EMAIL.test(wartosc)) return 'invalid_format'
  if (pole.type === 'tel' && !WZORZEC_TELEFONU.test(wartosc)) return 'invalid_phone'
  if (pole instanceof HTMLTextAreaElement && WZORZEC_LINKU.test(wartosc)) return 'links_blocked'
  return null
}

export function sprawdzPola(kontener: HTMLElement): Bledy {
  const bledy: Bledy = {}
  for (const pole of pobierzPola(kontener)) {
    const kod = sprawdzPole(pole)
    if (kod) bledy[pole.dataset.pole ?? pole.name] = kod
  }
  return bledy
}

/* ------------------------------------------------------------------ */
/* Stan błędów w znaczniku                                             */
/* ------------------------------------------------------------------ */

/** Pokazuje albo chowa komunikat przy jednym polu. */
export function oznaczPole(formularz: HTMLElement, nazwa: string, kod: string | null) {
  for (const pole of formularz.querySelectorAll<HTMLElement>(`[data-pole="${nazwa}"]`)) {
    pole.toggleAttribute('data-blad-pola', Boolean(kod))
    pole.setAttribute('aria-invalid', kod ? 'true' : 'false')
  }

  const komunikat = formularz.querySelector<HTMLElement>(`[data-blad="${nazwa}"]`)
  if (komunikat) {
    komunikat.textContent = kod ? komunikatPola(formularz, nazwa, kod) : ''
    komunikat.hidden = !kod
  }

  // Podpowiedź pod telefonem ustępuje miejsca komunikatowi o błędzie.
  const podpowiedz = formularz.querySelector<HTMLElement>(`[data-podpowiedz="${nazwa}"]`)
  if (podpowiedz) podpowiedz.hidden = Boolean(kod)
}

export function pokazPodsumowanie(formularz: HTMLElement, bledy: Bledy) {
  const blok = formularz.querySelector<HTMLElement>('[data-formularz-podsumowanie]')
  const tytul = formularz.querySelector<HTMLElement>('[data-podsumowanie-tytul]')
  const lista = formularz.querySelector<HTMLElement>('[data-podsumowanie-lista]')
  if (!blok || !tytul || !lista) return

  const pozycje = Object.entries(bledy)
  blok.hidden = !pozycje.length
  if (!pozycje.length) return

  const etykiety: Record<string, string> = teksty.etykietyPol
  tytul.textContent = pozycje.length === 1 ? teksty.podsumowanieBledow.jedno : teksty.podsumowanieBledow.wiele
  lista.replaceChildren(
    ...pozycje.map(([nazwa, kod]) => {
      const pozycja = document.createElement('li')
      pozycja.className = 'text-xs text-red-600'
      const etykieta = document.createElement('span')
      etykieta.className = 'font-medium'
      etykieta.textContent = etykiety[nazwa] ?? nazwa
      pozycja.append(etykieta, ` - ${komunikatPola(formularz, nazwa, kod)}`)
      return pozycja
    })
  )
}

/** Komunikaty przy polach + podsumowanie; zwraca pierwsze błędne pole w kolejności znacznika. */
export function pokazBledyPol(formularz: HTMLElement, bledy: Bledy): HTMLElement | null {
  for (const [nazwa, kod] of Object.entries(bledy)) oznaczPole(formularz, nazwa, kod)
  pokazPodsumowanie(formularz, bledy)
  return formularz.querySelector<HTMLElement>('[data-blad-pola]')
}

export function wyczyscBledy(formularz: HTMLElement) {
  // Tylko komunikaty przy polach: `[data-blad]` bez nazwy pola to nie komunikat.
  for (const komunikat of formularz.querySelectorAll<HTMLElement>('[data-blad]:not([data-blad=""])')) {
    oznaczPole(formularz, komunikat.dataset.blad ?? '', null)
  }
  for (const blok of formularz.querySelectorAll<HTMLElement>('[data-formularz-podsumowanie], [data-formularz-blad]')) {
    blok.hidden = true
  }
}

export function podepnijLicznik(formularz: HTMLElement) {
  for (const licznik of formularz.querySelectorAll<HTMLElement>('[data-licznik]')) {
    const pole = formularz.querySelector<Pole>(`[data-pole="${licznik.dataset.licznik}"]`)
    const maks = pole ? limit(pole) : null
    if (!pole || maks === null) continue

    const odswiez = () => {
      const dlugosc = pole.value.trim().length
      licznik.textContent = `${dlugosc.toLocaleString('pl-PL')} / ${maks.toLocaleString('pl-PL')}`
      const ponad = dlugosc > maks
      licznik.classList.toggle('text-red-500', ponad)
      licznik.classList.toggle('font-semibold', ponad)
      licznik.classList.toggle('text-brand-text-light', !ponad)
    }

    pole.addEventListener('input', odswiez)
    odswiez()
  }
}

/* ------------------------------------------------------------------ */
/* Przycisk wysyłki                                                    */
/* ------------------------------------------------------------------ */

/**
 * Przycisk może być zablokowany z kilku powodów naraz (wysyłka, kompresja
 * zdjęć, limit zgłoszeń) - odblokowuje go dopiero zniknięcie ostatniego.
 * Każde kliknięcie to osobny mail, więc blokada od kliknięcia do odpowiedzi
 * nie jest ozdobą.
 */
const blokady = new WeakMap<HTMLButtonElement, Set<string>>()

export function ustawBlokade(przycisk: HTMLButtonElement, powod: string, aktywna: boolean) {
  const powody = blokady.get(przycisk) ?? new Set<string>()
  if (aktywna) powody.add(powod)
  else powody.delete(powod)
  blokady.set(przycisk, powody)
  przycisk.disabled = powody.size > 0
  przycisk.setAttribute('aria-busy', powody.has('wysylka') ? 'true' : 'false')
}

/* ------------------------------------------------------------------ */
/* Wysyłka                                                             */
/* ------------------------------------------------------------------ */

export type Wynik =
  | { ok: true }
  | {
      ok: false
      /** Kod `error` z odpowiedzi albo `siec` (brak odpowiedzi / odpowiedź nie-JSON). */
      kod: string
      pola?: Bledy
      /** Tylko przy 5xx - drobnym drukiem, żeby dało się znaleźć wpis w logach Workera. */
      requestId?: string
      /** Sekundy z `Retry-After` przy 429. */
      ponowZa?: number
    }

/** `multipart/form-data` bez ręcznego `Content-Type` - przeglądarka dokłada `boundary`. */
export async function wyslij(formularz: HTMLFormElement, dane: FormData): Promise<Wynik> {
  const adres = formularz.dataset.adres
  if (!adres) return { ok: false, kod: 'not_configured' }

  let odpowiedz: Response
  let tresc: { ok?: unknown; error?: unknown; fields?: unknown; requestId?: unknown }
  try {
    odpowiedz = await fetch(adres, { method: 'POST', body: dane })
    tresc = await odpowiedz.json()
  } catch {
    // Brak sieci, CORS, awaria przed Workerem (strona błędu zamiast JSON-a).
    return { ok: false, kod: 'siec' }
  }
  if (!tresc || typeof tresc !== 'object') return { ok: false, kod: 'siec' }
  if (tresc.ok === true) return { ok: true }

  const ponowZa = Number(odpowiedz.headers.get('Retry-After'))
  return {
    ok: false,
    kod: typeof tresc.error === 'string' ? tresc.error : 'internal_error',
    pola:
      tresc.error === 'validation_failed' && tresc.fields && typeof tresc.fields === 'object'
        ? (tresc.fields as Bledy)
        : undefined,
    requestId: odpowiedz.status >= 500 && typeof tresc.requestId === 'string' ? tresc.requestId : undefined,
    ponowZa: odpowiedz.status === 429 && ponowZa > 0 ? ponowZa : undefined,
  }
}

/** Kod odpowiedzi -> klucz komunikatu w `bledyWysylki`. */
function kluczKomunikatu(kod: string): keyof typeof teksty.bledyWysylki {
  switch (kod) {
    case 'validation_failed':
    case 'rate_limited':
    case 'mail_failed':
    case 'siec':
    case 'payload_too_large':
      return kod
    case 'not_configured':
    case 'internal_error':
      return 'nieczynny'
    default:
      // bad_request, forbidden_origin, unknown_form, not_found, method_not_allowed
      return 'odrzucone'
  }
}

/**
 * Komunikat nad przyciskiem. Formularz zachowuje wszystko, co wpisano
 * (i zdjęcia) - ten moduł niczego nie czyści po błędzie.
 */
export function pokazBladWysylki(
  formularz: HTMLElement,
  wynik: Extract<Wynik, { ok: false }>,
  przycisk: HTMLButtonElement | null
) {
  const blok = formularz.querySelector<HTMLElement>('[data-formularz-blad]')
  const tekst = formularz.querySelector<HTMLElement>('[data-formularz-blad-tekst]')
  const kod = formularz.querySelector<HTMLElement>('[data-formularz-kod]')
  if (!blok || !tekst) return

  const w = teksty.bledyWysylki
  const sekundy = wynik.ponowZa ?? 60
  const czas = sekundy <= 60 ? w.minuta : wypelnij(w.minuty, { liczba: Math.ceil(sekundy / 60) })
  tekst.replaceChildren(...zOdnosnikami(w[kluczKomunikatu(wynik.kod)], { czas }))

  if (kod) {
    kod.textContent = wynik.requestId ? wypelnij(w.kodZgloszenia, { kod: wynik.requestId }) : ''
    kod.hidden = !wynik.requestId
  }
  blok.hidden = false

  // Kolejna próba przed upływem `Retry-After` i tak skończyłaby się 429.
  if (wynik.kod === 'rate_limited' && przycisk) {
    ustawBlokade(przycisk, 'limit', true)
    window.setTimeout(() => ustawBlokade(przycisk, 'limit', false), sekundy * 1000)
  }
}

/** Ustawia fokus na polu bez skoku strony, a potem przewija łagodnie (albo od razu). */
export function przejdzDo(element: HTMLElement | null) {
  if (!element) return
  const bezRuchu = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element.scrollIntoView({ behavior: bezRuchu ? 'auto' : 'smooth', block: 'center' })
  element.focus({ preventScroll: true })
}

/**
 * Formularz ma przycisk `type="button"`, ale Enter w polu mógłby i tak
 * wysłać go natywnie - GET-em na tę samą stronę, z danymi w adresie.
 */
export function zablokujNatywnaWysylke(formularz: HTMLFormElement) {
  formularz.addEventListener('submit', (zdarzenie) => zdarzenie.preventDefault())
}

/* ------------------------------------------------------------------ */
/* Formularz kontaktowy                                                */
/* ------------------------------------------------------------------ */

export function formularz() {
  const element = document.querySelector<HTMLFormElement>('[data-formularz="kontakt"]')
  if (!element) return

  const przycisk = element.querySelector<HTMLButtonElement>('[data-formularz-wyslij]')
  const sukces = document.querySelector<HTMLElement>('[data-formularz-sukces]')

  zablokujNatywnaWysylke(element)
  podepnijLicznik(element)

  for (const pole of pobierzPola(element)) {
    pole.addEventListener('input', () => {
      oznaczPole(element, pole.dataset.pole ?? '', null)
      const blok = element.querySelector<HTMLElement>('[data-formularz-podsumowanie]')
      if (blok) blok.hidden = true
    })
  }

  element.querySelector('[data-podsumowanie-zamknij]')?.addEventListener('click', () => {
    const blok = element.querySelector<HTMLElement>('[data-formularz-podsumowanie]')
    if (blok) blok.hidden = true
  })

  przycisk?.addEventListener('click', async () => {
    wyczyscBledy(element)

    const bledy = sprawdzPola(element)
    if (Object.keys(bledy).length) {
      przejdzDo(pokazBledyPol(element, bledy))
      return
    }

    ustawBlokade(przycisk, 'wysylka', true)
    const wynik = await wyslij(element, new FormData(element))
    ustawBlokade(przycisk, 'wysylka', false)

    if (wynik.ok) {
      if (sukces) sukces.hidden = false
      element.hidden = true
      window.scrollTo(0, 0)
      sukces?.focus({ preventScroll: true })
      return
    }

    if (wynik.pola) {
      przejdzDo(pokazBledyPol(element, wynik.pola))
      return
    }
    pokazBladWysylki(element, wynik, przycisk)
  })
}
