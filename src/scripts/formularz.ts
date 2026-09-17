/**
 * FORMULARZ - warstwa skryptu.
 *
 * Trzy rzeczy, w tej kolejności:
 *   1. odblokowuje pola (w znaczniku są `disabled`, żeby bez skryptu formularz
 *      nie udawał działającego),
 *   2. stempluje czas otwarcia - Worker odrzuca zgłoszenia wysłane szybciej
 *      niż w kilka sekund, bo tak wysyłają boty,
 *   3. wysyła przez `fetch` i pokazuje komunikat sukcesu albo błędu.
 *
 * KOMUNIKATY SĄ NAPISANE, nie domyślne z przeglądarki. Formularz ma `novalidate`
 * właśnie po to: natywny dymek walidacji jest nieprzetłumaczony, znika przy
 * przewinięciu i nie jest ogłaszany czytnikowi ekranu.
 *
 * Błąd walidacji trafia jednocześnie do obszaru `role="status"` (ogłoszenie)
 * i do elementu przy polu (wskazanie), a fokus ląduje na pierwszym błędnym
 * polu. Sam czerwony obrys nie jest komunikatem.
 */

const CZAS_KOMUNIKATU = 8000

type Odpowiedz = { ok: boolean; blad?: string; pole?: string }

export function formularz() {
  const form = document.querySelector<HTMLFormElement>('[data-formularz]')
  if (!form) return

  const endpoint = form.dataset.endpoint
  const pola = form.querySelector<HTMLFieldSetElement>('[data-formularz-pola]')
  const status = form.querySelector<HTMLElement>('[data-formularz-status]')
  if (!endpoint || !pola || !status) return

  pola.disabled = false
  const otwarty = Date.now()

  const pokaz = (tekst: string, rodzaj: 'sukces' | 'blad') => {
    status.textContent = ''
    status.dataset.rodzaj = rodzaj
    // Ustawienie tekstu w kolejnym zadaniu daje czytnikowi ekranu szansę
    // zauważyć zmianę zawartości pustego obszaru.
    window.setTimeout(() => {
      status.textContent = tekst
    }, 50)
  }

  const wyczyscBledy = () => {
    for (const el of form.querySelectorAll<HTMLElement>('[data-blad-dla]')) {
      el.textContent = ''
    }
    for (const el of form.querySelectorAll<HTMLElement>('[aria-invalid]')) {
      el.removeAttribute('aria-invalid')
    }
  }

  const pokazBladPola = (pole: string, tekst: string) => {
    const wskaznik = form.querySelector<HTMLElement>(`[data-blad-dla="${pole}"]`)
    const kontrolka = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${pole}"]`)
    if (wskaznik) wskaznik.textContent = tekst
    if (kontrolka) {
      kontrolka.setAttribute('aria-invalid', 'true')
      kontrolka.focus()
    }
  }

  /** Walidacja po stronie przeglądarki. Worker sprawdza to samo jeszcze raz. */
  const sprawdz = (): { pole: string; tekst: string } | null => {
    const email = form.querySelector<HTMLInputElement>('[name="email"]')?.value.trim() ?? ''
    const wiadomosc = form.querySelector<HTMLTextAreaElement>('[name="wiadomosc"]')?.value.trim() ?? ''

    if (!email) return { pole: 'email', tekst: 'Podaj adres e-mail, żebyśmy mogli odpowiedzieć.' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return { pole: 'email', tekst: 'Ten adres e-mail wygląda na niepoprawny.' }
    if (wiadomosc.length < 10)
      return { pole: 'wiadomosc', tekst: 'Napisz kilka słów więcej - co najmniej 10 znaków.' }
    return null
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    wyczyscBledy()

    const problem = sprawdz()
    if (problem) {
      pokazBladPola(problem.pole, problem.tekst)
      pokaz(problem.tekst, 'blad')
      return
    }

    const przycisk = form.querySelector<HTMLButtonElement>('button[type="submit"]')
    const etykieta = przycisk?.textContent ?? ''
    if (przycisk) {
      przycisk.disabled = true
      przycisk.textContent = 'Wysyłanie...'
    }
    pokaz('Wysyłanie wiadomości...', 'sukces')

    const wartosc = (nazwa: string) =>
      form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${nazwa}"]`)?.value ?? ''

    try {
      const odp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imie: wartosc('imie'),
          email: wartosc('email'),
          temat: wartosc('temat'),
          wiadomosc: wartosc('wiadomosc'),
          strona: wartosc('strona'),
          czas: otwarty,
        }),
      })

      const wynik: Odpowiedz = await odp.json().catch(() => ({ ok: false }))

      if (odp.ok && wynik.ok) {
        form.reset()
        pokaz('Dziękujemy. Wiadomość została wysłana - odpowiemy najszybciej, jak to możliwe.', 'sukces')
      } else {
        const tekst = wynik.blad ?? 'Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.'
        if (wynik.pole) pokazBladPola(wynik.pole, tekst)
        pokaz(tekst, 'blad')
      }
    } catch {
      // Brak sieci albo Worker nieosiągalny. Komunikat musi dać drogę wyjścia,
      // a nie tylko zgłosić porażkę.
      pokaz(
        'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie albo napisz do nas bezpośrednio.',
        'blad'
      )
    } finally {
      if (przycisk) {
        przycisk.disabled = false
        przycisk.textContent = etykieta
      }
    }
  })

  // Komunikat sukcesu znika po chwili, komunikat błędu zostaje - użytkownik
  // musi mieć czas przeczytać, co poszło nie tak.
  const obserwator = new MutationObserver(() => {
    if (status.dataset.rodzaj !== 'sukces' || !status.textContent) return
    window.setTimeout(() => {
      if (status.dataset.rodzaj === 'sukces') status.textContent = ''
    }, CZAS_KOMUNIKATU)
  })
  obserwator.observe(status, { childList: true })
}
