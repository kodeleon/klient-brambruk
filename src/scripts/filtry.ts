/**
 * FILTR KATEGORII - to, czego nie robi CSS.
 *
 * Wybór kategorii na /realizacje/ działa bez JavaScriptu: stan trzyma ukryte
 * pole wyboru, a chowaniem zajmuje się `src/styles/components/zakladki.css`.
 * Ten moduł dokłada szukajkę i licznik „Wyświetlono X z Y".
 *
 * ⚠️ Była tu druga funkcja - przewijanie po kliknięciu w dolny zestaw
 * zakładek na /uslugi/. Zakładek na tej podstronie już nie ma (wszystkie
 * karty są widoczne, przyciski typów to kotwice), więc funkcja odpadła
 * razem z nimi.
 */

export function filtry() {
  szukajka()
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
