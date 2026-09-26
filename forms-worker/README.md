# Worker formularzy (brambruk-forms)

Osobny Cloudflare Worker, który przyjmuje zgłoszenia z dwóch formularzy
serwisu i wysyła **jeden mail do firmy** przez Resend. Nic nie przechowuje:
zgłoszenie żyje tylko w trakcie żądania. Serwis statyczny (Astro) jest
osobnym wdrożeniem - ten katalog go nie dotyczy.

```
POST https://api.brambruk.pl/forms/contact   formularz kontaktowy
POST https://api.brambruk.pl/forms/quote     kreator wyceny (do 2 zdjęć)

CORS -> limit 10 MiB -> honeypot -> walidacja (pola, linki, pliki po sygnaturze)
     -> rate limit -> mail HTML + tekst -> Resend -> jedna linia logu -> JSON
```

Integracja z frontem: [INTEGRATION.md](INTEGRATION.md). Kontekst i decyzje: [CLAUDE.md](CLAUDE.md).

## Struktura

| Plik | Co robi |
|---|---|
| `src/forms.ts` | **definicje formularzy** (pola, limity, opcje, sekcje maila, temat) - jedyny plik z danymi projektu |
| `src/email/layout.ts` | **wygląd maila** (kolory, logo, stopka, teksty stałe) |
| `wrangler.jsonc` | **adresy, originy, rate limit, logi** |
| `src/index.ts` | router: `/forms/:slug`, OPTIONS, 404/405/403 |
| `src/submit.ts` | kolejne kroki obsługi zgłoszenia |
| `src/parse.ts` | multipart/JSON -> wartości i pliki, normalizacja, limit rozmiaru |
| `src/validate.ts` | walidacja generyczna (reguły z typu pola), kody błędów |
| `src/files.ts` | liczba, rozmiar, typ po sygnaturze bajtowej, nazwy załączników |
| `src/spam.ts` | honeypot `_hp`, blokada linków |
| `src/ratelimit.ts` | bindingi `RL_IP` i `RL_EMAIL` |
| `src/cors.ts` | lista originów, nagłówki CORS |
| `src/email/html.ts`, `render.ts` | escapowanie, generyczny renderer `{ subject, html, text }` |
| `src/resend.ts` | wywołanie Resend, base64 załączników |
| `src/log.ts`, `src/response.ts` | linia logu, kształt odpowiedzi |
| `dev/test-page.html` | strona testowa z oboma formularzami + kompresja zdjęć (wzór dla frontu) |
| `dev/preview-emails.ts` | podgląd maili do `dev/out/` |
| `reference/` | eksport starej wtyczki WP (materiał źródłowy, nieużywany w runtime) |

## Uruchomienie lokalne

```bash
npm install
cp .dev.vars.example .dev.vars
npm run types            # typy bindingów (po każdej zmianie wrangler.jsonc)
npm run dev              # worker: http://localhost:8787
npm run dev:page         # w drugim terminalu: strona testowa http://localhost:4321
```

`.dev.vars.example` ma `MAIL_DRY_RUN=true` - lokalnie nic nie wychodzi, dopóki
tego nie zmienisz. Strona testowa ma pole "Adres workera" (domyślnie
`http://localhost:8787`), przyciski z przykładowymi i błędnymi danymi,
podgląd honeypota, wysyłkę jako JSON i przełącznik "wyślij bez kompresji".
Surowa odpowiedź workera pokazuje się pod formularzem, linia logu w terminalu
`npm run dev`.

Testy i typy:

```bash
npm test
npm run typecheck
```

Testy działają w runtime Workers (workerd) i nigdy nie wołają prawdziwego Resend.

### Podgląd maili

```bash
npm run preview:emails
```

Tworzy `dev/out/{contact,quote}-{pelny,minimalny,xss,dlugi}.html` i `.txt`
oraz `dev/out/index.html`. Przy działającym `npm run dev:page`:
http://localhost:4321/out/

### Prawdziwa wysyłka z komputera

W `.dev.vars`:

```
RESEND_API_KEY=re_...          # klucz z panelu Resend (konto klienta)
MAIL_DRY_RUN=false
MAIL_TO=twoj-adres@example.com # żeby testy nie szły do firmy
```

Potem `npm run dev`, `npm run dev:page` i wysyłka ze strony testowej.

## Konfiguracja

Zmienne w `wrangler.jsonc` (`vars`):

| Zmienna | Znaczenie |
|---|---|
| `ALLOWED_ORIGINS` | originy stron, które mogą wysyłać (po przecinku, dokładne dopasowanie) |
| `MAIL_FROM` | nadawca, na domenie zweryfikowanej w Resend |
| `MAIL_TO` | odbiorcy zgłoszeń (po przecinku) |
| `LOGO_URL` | logo w stopce maila (PNG, 64 px) |
| `MAIL_DRY_RUN` | `"true"` = wszystko oprócz samego wywołania Resend |

Sekret (nigdy w pliku, nigdy w repo):

```bash
npx wrangler secret put RESEND_API_KEY
```

Rate limit: `RL_IP` (5 zgłoszeń / 60 s na formularz i IP) i `RL_EMAIL`
(3 / 60 s na formularz i adres e-mail). `namespace_id` (`1001`, `1002`) musi być
unikalny w obrębie konta Cloudflare - sprawdź przed pierwszym wdrożeniem, czy
żaden inny worker na koncie nie używa tych numerów.

## Wdrożenie

```bash
npx wrangler login
npx wrangler secret put RESEND_API_KEY
npx wrangler deploy
```

Wrangler wypisze adres `https://brambruk-forms.<konto>.workers.dev`. Do czasu
przeniesienia DNS front może wysyłać na ten adres (ścieżki te same:
`/forms/contact`, `/forms/quote`).

### Podpięcie `api.brambruk.pl` (po przeniesieniu DNS do Cloudflare)

1. Strefa `brambruk.pl` musi być aktywna na tym samym koncie Cloudflare.
2. W `wrangler.jsonc` odkomentuj:
   `"routes": [{ "pattern": "api.brambruk.pl", "custom_domain": true }]`
3. `npx wrangler deploy` - Wrangler sam założy rekord DNS i certyfikat.
4. Sprawdź: `curl -i -X OPTIONS -H "Origin: https://brambruk.pl" https://api.brambruk.pl/forms/contact` -> `204`.
5. Na froncie: adres workera i CSP `connect-src` na `https://api.brambruk.pl`.
6. Opcjonalnie `"workers_dev": false`, żeby wyłączyć adres testowy.

## Logi

Workers Logs (`observability.enabled`). Dashboard: Workers & Pages ->
`brambruk-forms` -> Observability. Retencję ustala Cloudflare:
**3 dni na planie Free, 7 dni na Paid**. Własnej bazy logów nie ma.

Jedna linia JSON na żądanie, bez danych osobowych:

```json
{"requestId":"…","form":"quote","outcome":"sent","reason":null,"status":200,"resendStatus":200,"files":2,"bytes":874213,"ms":412}
```

| Pole | Znaczenie |
|---|---|
| `outcome` | `sent`, `dry_run`, `honeypot`, `preflight`, `rejected` (4xx), `failed` (5xx) |
| `reason` | kod `error` z odpowiedzi albo `null` |
| `resendStatus`, `resendError` | status HTTP i pole `name` błędu Resend (`0` + `timeout` / `network_error` przy braku odpowiedzi) |
| `files`, `bytes` | liczba i łączny rozmiar załączników (przed base64) |
| `ms` | czas ściany; w Workers zegar stoi podczas pracy CPU, więc to głównie czekanie na Resend |
| `invalid` | przy `validation_failed`: pole -> kod błędu (bez wartości) |
| `warnings` | np. `rate_limit_missing:RL_IP` (brak bindingu - żądanie przepuszczone) |

`requestId` z logu jest też w odpowiedzi dla frontu i w stopce maila - po nim
łączysz zgłoszenie z mailem i wpisem w logu.

**Automatyczne logi wywołań (`invocation_logs`) są wyłączone.** Cloudflare
zapisuje w nich nagłówki żądania i obiekt `cf`, czyli adres IP i przybliżoną
lokalizację osoby wysyłającej - a zasada projektu brzmi: IP nigdzie nie jest
zapisywane. Liczbę błędów, w tym przekroczenia CPU, i percentyle czasu CPU
widać w zakładce **Metrics** workera, bez zapisu danych żądań.

`npx wrangler tail` pokazuje ruch na żywo razem z metadanymi żądania (także
IP) - nic nie zapisuje, ale używaj tylko do diagnozy.

## Pomiar CPU na planie Free (10 ms na żądanie)

Kod robi niewiele (walidacja, render, base64 natywnym
`Uint8Array.prototype.toBase64`), ale limit 10 ms trzeba sprawdzić na
Cloudflare - lokalny `wrangler dev` nie mierzy CPU tak jak produkcja.
Nic przy tym nie wychodzi mailem (`MAIL_DRY_RUN`).

1. Tymczasowo w `wrangler.jsonc`:
   - `"MAIL_DRY_RUN": "true"`,
   - do `ALLOWED_ORIGINS` dopisz `,http://localhost:4321`,
   - w `observability.logs` ustaw `"invocation_logs": true` (ruch testowy
     pochodzi tylko od Ciebie, a bez tego CPU widać tylko zbiorczo w Metrics).
2. `npx wrangler deploy` (bez `routes` - tylko `*.workers.dev`).
3. `npm run dev:page`, na stronie testowej w polu "Adres workera" wpisz
   adres `https://brambruk-forms.<konto>.workers.dev`.
4. Wyślij po 5 razy formularz wyceny:
   - **(a)** 2 zdjęcia z telefonu z kompresją (normalny tryb strony),
   - **(b)** 2 zdjęcia po ~3,5-4 MB z zaznaczonym "wyślij bez kompresji"
     (każde musi mieć mniej niż 4 MiB = 4 194 304 B, inaczej worker odrzuci je walidacją).
5. Dashboard -> `brambruk-forms` -> Observability: przy każdym wywołaniu
   pole **CPU time** (`$workers.cpuTimeMs`); w tym samym wywołaniu nasza linia
   logu pokazuje `bytes`, więc wiadomo, który wariant to był. Pierwsze
   wywołanie po wdrożeniu (zimny start) pomiń. Zbiorczo (percentyle): zakładka Metrics.
6. Przywróć `wrangler.jsonc` (`MAIL_DRY_RUN` `"false"`, originy bez
   localhost, `invocation_logs` `false`) i wdróż ponownie.

**Kryterium:** wariant (a) musi mieścić się w 10 ms z zapasem (maksimum z 5
prób najwyżej ~6-7 ms).

**Jeśli (b) się nie mieści** (błąd "Exceeded CPU" w Metrics, na stronie
testowej błąd sieci zamiast JSON): przy działającej kompresji na froncie
ścieżka awaryjna jest rzadka, więc

- obniż twardy limit pliku `maxFileSize` w `src/forms.ts` (np. do `2 * 1024 * 1024`)
  i ten sam limit na froncie, albo
- przejdź na Workers Paid (limit CPU liczony w sekundach, nie milisekundach).

## Checklista po wdrożeniu

Na żywo, na produkcyjnym adresie strony, nie tylko w testach:

1. **Wysyłka:** oba formularze (wycena raz ze zdjęciami, raz bez) - mail
   dochodzi na `MAIL_TO`, wygląd OK, załączniki się otwierają, "Odpowiedz"
   trafia do osoby z formularza.
2. **Sukces:** front pokazuje komunikat sukcesu.
3. **Błąd:** wyłącz sieć (tryb samolotowy) i wyślij - front pokazuje komunikat
   z telefonem i e-mailem firmy, formularz nie gubi wpisanych danych.
4. **Spam:** zgłoszenie z innego urządzenia i innej sieci (np. telefon na LTE)
   nie ląduje w spamie u odbiorcy.
5. **Logi:** w Observability jest linia logu z `outcome: "sent"` i nie ma w niej
   danych osobowych.
6. **Obcy origin:** `curl -i -X POST -H "Origin: https://example.com" https://api.brambruk.pl/forms/contact` -> `403`.

## Kopiowanie do innego projektu

Skopiuj cały katalog i zmień tylko:

- `src/forms.ts` - formularze, pola, opcje, limity, sekcje maila, temat;
- `src/email/layout.ts` - `BRAND` (nazwa, strona, kolory, logo) i `TEXT`;
- `wrangler.jsonc` - `name`, `vars` (originy, nadawca, odbiorcy, logo),
  `namespace_id` rate limitów, `routes`;
- `.dev.vars.example` - originy lokalne;
- `dev/test-page.html` - pola formularzy (przepisane z `forms.ts`);
- testy z danymi formularzy: `test/helpers.ts` (`QUOTE_FIELDS`, `CONTACT_FIELDS`)
  oraz przypadki w `test/*.test.ts`, które odwołują się do konkretnych pól.

Nie ruszaj reszty `src/` - nie zna nazw pól ani projektu. Nowy formularz to
nowy wpis w `FORMS`, bez nowego szablonu. Nowy **typ** pola wymaga zmian w
`validate.ts` i `render.ts` - dodawaj tylko, gdy formularz go naprawdę używa.
