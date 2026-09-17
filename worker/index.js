/**
 * WORKER FORMULARZA KONTAKTOWEGO.
 *
 * Osobne wdrożenie, osobny `wrangler.jsonc`, osobna domena workers.dev.
 * Serwis statyczny nie ma kodu serwerowego i nie powinien mieć - wysyłka
 * poczty wymaga klucza API, a klucz w bundlu przeglądarki to klucz publiczny.
 *
 * WDROŻENIE:
 *   cd worker
 *   npx wrangler secret put RESEND_API_KEY
 *   npx wrangler deploy
 *   → skopiuj adres do `endpointy.formularz` w src/config/site.ts
 *
 * PODSTAWY PRAWNE (szczegóły: PRAWO-rodo-formularz-kontaktowy.md):
 *   · treść zgłoszenia        art. 6 ust. 1 lit. f - odpowiedź na zapytanie
 *   · ochrona przed botami    honeypot + token czasowy, ZERO danych na zewnątrz
 *
 * CZEGO TU NIE MA I DLACZEGO:
 *   · reCAPTCHA - wymaga uprzedniej zgody, wysyła dane behawioralne do Google
 *     i ma za sobą serię kar unijnych organów nadzorczych. Honeypot plus
 *     weryfikacja czasu wypełnienia załatwiają boty masowe bez ani jednego
 *     żądania poza własną infrastrukturę.
 *   · przechowywanie zgłoszeń - Worker przekazuje wiadomość i o niej zapomina.
 *     Retencją rządzi skrzynka odbiorcza, nie ten kod.
 *   · adres IP - nie logujemy go i nie przekazujemy dalej. Nie ma go po co
 *     zbierać bez mechanizmu ograniczania liczby zgłoszeń, a ten wymagałby
 *     osobnej podstawy i wpisu w polityce.
 */

const LIMIT_POLA = { imie: 100, email: 254, temat: 150, wiadomosc: 5000 }

/** Minimalny czas wypełnienia formularza. Bot wysyła natychmiast. */
const MIN_SEKUND = 3
/** Po tym czasie token uznajemy za przeterminowany (otwarta karta z wczoraj). */
const MAX_SEKUND = 60 * 60 * 6

const naglowkiCORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
})

const odpowiedz = (dane, status, origin) =>
  new Response(JSON.stringify(dane), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...naglowkiCORS(origin) },
  })

const escapuj = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

export default {
  async fetch(request, env) {
    // `DOZWOLONY_ORIGIN` ustawiasz w wrangler.jsonc na adres serwisu.
    // Gwiazdka jest tu wyłącznie na czas pracy lokalnej.
    const dozwolony = env.DOZWOLONY_ORIGIN || '*'
    const origin = request.headers.get('Origin') ?? ''
    const zwrotny = dozwolony === '*' ? origin || '*' : dozwolony

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: naglowkiCORS(zwrotny) })
    }

    if (request.method !== 'POST') {
      return odpowiedz({ ok: false, blad: 'Nieobsługiwana metoda.' }, 405, zwrotny)
    }

    if (dozwolony !== '*' && origin && origin !== dozwolony) {
      return odpowiedz({ ok: false, blad: 'Nieoczekiwane źródło żądania.' }, 403, zwrotny)
    }

    let dane
    try {
      dane = await request.json()
    } catch {
      return odpowiedz({ ok: false, blad: 'Nieprawidłowy format danych.' }, 400, zwrotny)
    }

    // --- honeypot -----------------------------------------------------
    // Pole niewidoczne dla człowieka i puste u człowieka. Bot wypełnia
    // wszystko, co znajdzie. Odpowiadamy sukcesem, żeby nie podpowiadać,
    // że pułapka zadziałała.
    if (dane.strona) return odpowiedz({ ok: true }, 200, zwrotny)

    // --- token czasowy -------------------------------------------------
    const start = Number(dane.czas)
    const minelo = (Date.now() - start) / 1000
    if (!Number.isFinite(start) || minelo < MIN_SEKUND) {
      return odpowiedz({ ok: false, blad: 'Formularz wysłany zbyt szybko. Spróbuj ponownie.' }, 429, zwrotny)
    }
    if (minelo > MAX_SEKUND) {
      return odpowiedz({ ok: false, blad: 'Formularz był otwarty zbyt długo. Odśwież stronę i wyślij ponownie.' }, 400, zwrotny)
    }

    // --- walidacja pól -------------------------------------------------
    const email = String(dane.email ?? '').trim()
    const wiadomosc = String(dane.wiadomosc ?? '').trim()
    const imie = String(dane.imie ?? '').trim()
    const temat = String(dane.temat ?? '').trim()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return odpowiedz({ ok: false, blad: 'Podaj poprawny adres e-mail.', pole: 'email' }, 400, zwrotny)
    }
    if (wiadomosc.length < 10) {
      return odpowiedz({ ok: false, blad: 'Wiadomość jest za krótka.', pole: 'wiadomosc' }, 400, zwrotny)
    }
    for (const [pole, limit] of Object.entries(LIMIT_POLA)) {
      if (String(dane[pole] ?? '').length > limit) {
        return odpowiedz({ ok: false, blad: `Pole jest za długie (maksimum ${limit} znaków).`, pole }, 400, zwrotny)
      }
    }

    // --- wysyłka -------------------------------------------------------
    if (!env.RESEND_API_KEY) {
      return odpowiedz({ ok: false, blad: 'Formularz nie jest jeszcze skonfigurowany.' }, 500, zwrotny)
    }

    const tresc = [
      `<p><strong>Od:</strong> ${escapuj(imie || 'nie podano')} &lt;${escapuj(email)}&gt;</p>`,
      temat ? `<p><strong>Temat:</strong> ${escapuj(temat)}</p>` : '',
      '<hr>',
      `<p>${escapuj(wiadomosc).replace(/\n/g, '<br>')}</p>`,
    ].join('\n')

    try {
      const wyslane = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.NADAWCA,
          to: [env.ODBIORCA],
          reply_to: email,
          subject: temat ? `Formularz: ${temat}` : `Nowe zgłoszenie z formularza`,
          html: tresc,
        }),
      })

      if (!wyslane.ok) {
        // Treść odpowiedzi dostawcy zostaje w logach Workera, nie u klienta:
        // komunikat dla odwiedzającego ma być zrozumiały, a nie diagnostyczny.
        console.error('Resend:', wyslane.status, await wyslane.text())
        return odpowiedz(
          { ok: false, blad: 'Nie udało się wysłać wiadomości. Spróbuj ponownie albo napisz na nasz adres e-mail.' },
          502,
          zwrotny
        )
      }

      // --- potwierdzenie do nadawcy (pakiet Premium) --------------------
      if (env.POTWIERDZENIE === 'tak') {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: env.NADAWCA,
            to: [email],
            subject: 'Dziękujemy za wiadomość',
            html:
              `<p>Dzień dobry,</p><p>Otrzymaliśmy Twoją wiadomość i odpowiemy najszybciej, jak to możliwe.</p>` +
              `<hr><p><em>${escapuj(wiadomosc).replace(/\n/g, '<br>')}</em></p>`,
          }),
        }).catch((err) => console.error('potwierdzenie:', err))
      }

      return odpowiedz({ ok: true }, 200, zwrotny)
    } catch (err) {
      console.error('wysyłka:', err)
      return odpowiedz(
        { ok: false, blad: 'Nie udało się wysłać wiadomości. Spróbuj ponownie albo napisz na nasz adres e-mail.' },
        502,
        zwrotny
      )
    }
  },
}
