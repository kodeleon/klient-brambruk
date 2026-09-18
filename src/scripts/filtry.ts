/**
 * FILTRY I ZAKŁADKI - to, czego nie robi CSS.
 *
 * Wybór kategorii (/realizacje/) i zakładki (/uslugi/) działają bez
 * JavaScriptu: stan trzymają ukryte pola wyboru, a chowaniem zajmuje się
 * `src/styles/components/zakladki.css`. Ten moduł dokłada dwie rzeczy:
 *
 *   1. szukajkę i licznik „Wyświetlono X z Y" na /realizacje/,
 *   2. przewinięcie do listy po kliknięciu w dolny zestaw zakładek
 *      na /uslugi/ - w starym projekcie robił to `scrollIntoView`.
 */

export function filtry() {
  szukajka()
  dolneZakladki()
}

function szukajka() {
  const obszar = document.querySelector<HTMLElement>('[data-filtr]')
  if (!obszar) return

  const pole = obszar.querySelector<HTMLInputElement>('[data-filtr-szukaj]')
  const licznik = obszar.querySelector<HTMLElement>('[data-filtr-widoczne]')
  const pusto = obszar.querySelector<HTMLElement>('[data-filtr-pusto]')
  const wyczysc = obszar.querySelector<HTMLElement>('[data-filtr-wyczysc]')
  const kafelki = [...obszar.querySelectorAll<HTMLElement>('[data-kategoria]')]
  if (!pole || !kafelki.length) return

  const przelicz = () => {
    const fraza = pole.value.trim().toLowerCase()

    for (const kafelek of kafelki) {
      const pasuje = !fraza || (kafelek.dataset.szukaj ?? '').includes(fraza)
      if (pasuje) kafelek.removeAttribute('data-poza-szukaniem')
      else kafelek.setAttribute('data-poza-szukaniem', '')
    }

    // Widoczne = te, których nie schował ani filtr kategorii (CSS),
    // ani szukajka. `offsetParent === null` łapie oba przypadki naraz.
    const widoczne = kafelki.filter((kafelek) => kafelek.offsetParent !== null).length

    if (licznik) licznik.textContent = String(widoczne)
    if (pusto) pusto.hidden = widoczne > 0
  }

  pole.addEventListener('input', przelicz)

  for (const wybor of obszar.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
    wybor.addEventListener('change', przelicz)
  }

  wyczysc?.addEventListener('click', () => {
    pole.value = ''
    const wszystkie = obszar.querySelector<HTMLInputElement>('#kategoria-all')
    if (wszystkie) wszystkie.checked = true
    przelicz()
  })

  przelicz()
}

function dolneZakladki() {
  const dolne = document.querySelectorAll<HTMLLabelElement>('[data-zakladka-dolna]')
  if (!dolne.length) return

  const cel = document.getElementById('main-content')
  if (!cel) return

  for (const etykieta of dolne) {
    etykieta.addEventListener('click', () => {
      // Kliknięcie w etykietę najpierw przestawia pole wyboru, a dopiero
      // potem przewijamy - stąd opóźnienie o jedną klatkę.
      requestAnimationFrame(() => cel.scrollIntoView({ behavior: 'smooth' }))
    })
  }
}
