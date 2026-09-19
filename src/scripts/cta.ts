/**
 * SKRÓCONY FORMULARZ W BANERZE CTA.
 *
 * Zadanie jest jedno: przenieść cztery wartości do szkicu kreatora wyceny
 * i wpuścić odwiedzającego na /wycena/ z uzupełnionymi polami.
 *
 * ┌── DLACZEGO SZKIC, A NIE PARAMETRY ADRESU ──────────────────────────┐
 * │ Kreator na /wycena/ i tak zapisuje postęp pod tym samym kluczem     │
 * │ i odtwarza go przy wejściu (`odtworz()` w `wycena.ts`). Wpisanie     │
 * │ danych w ten sam magazyn nie dokłada do serwisu żadnego nowego      │
 * │ mechanizmu - używa tego, który już jest i już jest przetestowany.   │
 * │                                                                     │
 * │ Parametry adresu oznaczałyby e-mail i telefon w historii            │
 * │ przeglądarki, w nagłówku `Referer` i w każdym logu po drodze.       │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Bez tego modułu przycisk zostaje zwykłym odnośnikiem do /wycena/ -
 * formularz otwiera się pusty i to jest cała degradacja.
 */

const KLUCZ_ZAPISU = 'brambruk_wycena-draft'

export function cta() {
  const baner = document.querySelector<HTMLElement>('[data-cta-szybkie]')
  if (!baner) return

  const dalej = baner.querySelector<HTMLAnchorElement>('[data-cta-dalej]')
  if (!dalej) return

  const zbierz = (): Record<string, string> => {
    const wynik: Record<string, string> = {}

    // ⚠️ KOLEJNOŚĆ JAK W `wycena.ts`: pola wyboru najpierw. Gdyby czytać je
    // przez samo `data-cta-pole`, pierwszy przycisk radiowy w grupie oddałby
    // swoją wartość niezależnie od tego, który jest zaznaczony.
    const typ = baner.querySelector<HTMLInputElement>('input[name="cta-typ"]:checked')
    if (typ?.value) wynik.serviceType = typ.value

    for (const pole of baner.querySelectorAll<HTMLInputElement>('input[data-cta-pole]:not(.cta-pole-wyboru)')) {
      const nazwa = pole.dataset.ctaPole
      const wartosc = pole.value.trim()
      if (nazwa && wartosc) wynik[nazwa] = wartosc
    }

    return wynik
  }

  dalej.addEventListener('click', () => {
    const nowe = zbierz()
    if (!Object.keys(nowe).length) return

    try {
      // Szkic mógł już powstać: ktoś zaczął kreator, wrócił na stronę główną
      // i wpisał tu dwa pola. Nadpisanie całości skasowałoby jego pracę,
      // więc dokładamy się do tego, co jest.
      const poprzedni = localStorage.getItem(KLUCZ_ZAPISU)
      const szkic = poprzedni ? { ...(JSON.parse(poprzedni) as Record<string, unknown>), ...nowe } : nowe
      localStorage.setItem(KLUCZ_ZAPISU, JSON.stringify(szkic))
    } catch {
      // Tryb prywatny, pełny magazyn albo uszkodzony szkic. Odnośnik zadziała
      // tak czy inaczej - formularz otworzy się pusty.
    }
  })
}
