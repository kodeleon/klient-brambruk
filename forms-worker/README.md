# Worker formularzy (brambruk-forms)

Osobny Cloudflare Worker, który przyjmuje zgłoszenia z dwóch formularzy
serwisu i wysyła **jeden mail do firmy** przez Resend. Nic nie przechowuje:
zgłoszenie żyje tylko w trakcie żądania. Serwis statyczny (Astro) jest
osobnym wdrożeniem - ten katalog go nie dotyczy.

```
POST https://api.brambruk.pl/forms/contact   formularz kontaktowy
POST https://api.brambruk.pl/forms/quote     kreator wyceny (do 2 zdjęć)

CORS -> limit 3 MiB -> honeypot -> walidacja (pola, linki, pliki po sygnaturze)
     -> rate limit -> mail HTML + tekst -> Resend -> jedna linia logu -> JSON
```

Integracja z frontem: [INTEGRATION.md](INTEGRATION.md). Kontekst i decyzje: [CLAUDE.md](CLAUDE.md).

## Struktura

| Plik | Co robi |
|---|---|
| `src/forms.ts` | **definicje formularzy** (pola, limity, opcje, sekcje maila, temat) - jedyny plik z danymi projektu |
| `src/email/layout.ts` | **wygląd maila** (kolory, logo, stopka, teksty stałe) |
| `wrangler.jsonc` | **adresy, originy, rate limit, logi** |
| `wrangler.pomiar.jsonc` | worker pomiarowy CPU (`*.workers.dev`, dry run) - tylko do sekcji "Pomiar CPU" |
| `src/index.ts` | router: `/forms/:slug`, OPTIONS, 404/405/403 |
| `src/submit.ts` | kolejne kroki obsługi zgłoszenia |
| `src/parse.ts` | multipart/JSON -> wartości i pliki, normalizacja, limit rozmiaru |
| `src/validate.ts` | walidacja generyczna (reguły z typu pola), kody błędów |
| `src/files.ts` | liczba, rozmiar, typ po sygnaturze bajtowej, nazwy załączników |
| `src/spam.ts` | honeypot `_hp`, blokada linków |
| `src/ratelimit.ts` | bindingi `RL_IP` i `RL_EMAIL` |
| `src/cors.ts` | lista originów, nagłówki CORS |
| `src/email/html.ts`, `render.ts` | escapowanie, generyczny renderer `{ subject, html, text }` |
| `src/resend.ts` | wywołanie Resend, base64 załączników, body składane z fragmentów |
| `src/log.ts`, `src/response.ts` | linia logu, kształt odpowiedzi |
| `dev/test-page.html` | strona testowa z oboma formularzami + kompresja zdjęć (wzór dla frontu) |
| `dev/preview-emails.ts` | podgląd maili do `dev/out/` |
| `dev/measure-files.ts` | pliki do wariantów (b) i (c) pomiaru CPU (`npm run measure:files`) |
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
tego nie zmienisz. `MAIL_TO` jest wymagany także w dry run (bez niego
`500 not_configured`), stąd przykładowy adres w pliku. Strona testowa ma pole "Adres workera" (domyślnie
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
MAIL_TO=twoj-adres@example.com # własny adres, żeby testy nie szły do firmy
```

Potem `npm run dev`, `npm run dev:page` i wysyłka ze strony testowej.

## Konfiguracja

Zmienne w `wrangler.jsonc` (`vars`, jawne):

| Zmienna | Znaczenie |
|---|---|
| `ALLOWED_ORIGINS` | originy stron, które mogą wysyłać (po przecinku, dokładne dopasowanie). W pliku tylko produkcyjne - testowy dochodzi przy deployu przez `--var` |
| `MAIL_FROM` | nadawca, na domenie zweryfikowanej w Resend |
| `LOGO_URL` | logo w stopce maila (PNG, 64 px) |
| `MAIL_DRY_RUN` | `"true"` = wszystko oprócz samego wywołania Resend |

Sekrety (`secrets.required` w `wrangler.jsonc`; wartość nigdy w pliku ani w repo):

| Sekret | Znaczenie |
|---|---|
| `RESEND_API_KEY` | klucz API Resend (konto klienta) |
| `MAIL_TO` | odbiorcy zgłoszeń (po przecinku). Prywatny adres - dlatego sekret, a nie zmienna widoczna w panelu |

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_TO
```

Zmiana odbiorcy (np. adres testowy -> adres właściciela) to jedno
`npx wrangler secret put MAIL_TO` - wrangler od razu wdraża nową wersję,
bez zmiany kodu i bez `deploy`. Brak któregoś sekretu: `deploy` odmawia
wdrożenia, a działający worker odpowiada `500 not_configured`.

Rate limit: `RL_IP` (5 zgłoszeń / 60 s na formularz i IP) i `RL_EMAIL`
(3 / 60 s na formularz i adres e-mail). `namespace_id` (`1001`, `1002`) musi być
unikalny w obrębie konta Cloudflare - sprawdź przed pierwszym wdrożeniem, czy
żaden inny worker na koncie nie używa tych numerów.

## Wdrożenie

Konto Cloudflare klienta (`account_id` w `wrangler.jsonc`), jedyny adres:
Custom Domain `https://api.brambruk.pl` (`routes`). Adresów `*.workers.dev`
i preview URL nie ma (`workers_dev: false`, `preview_urls: false`) - stan
ustawia każdy deploy, zmiana w panelu nie przetrwa następnego.

Pierwsze wdrożenie (z tego katalogu):

```bash
npx wrangler secret put RESEND_API_KEY   # worker jeszcze nie istnieje: wrangler zapyta,
npx wrangler secret put MAIL_TO          # czy założyć pusty - tak
npx wrangler deploy                      # zakłada api.brambruk.pl (DNS + certyfikat)
```

Dopóki strona działa pod adresem testowym `*.workers.dev`, jej origin musi
być na liście `ALLOWED_ORIGINS`. Nie dopisuj go do pliku - podaj przy
deployu PEŁNĄ listę (`--var` zastępuje wartość z pliku, nie dopisuje):

```bash
npx wrangler deploy --var "ALLOWED_ORIGINS:https://brambruk.pl,https://www.brambruk.pl,https://<adres testowy strony>"
```

Po przełączeniu domeny zwykły `npx wrangler deploy` przywraca listę
z pliku, czyli usuwa origin testowy.

Sprawdzenie:

```bash
curl -i -X OPTIONS -H "Origin: https://brambruk.pl" https://api.brambruk.pl/forms/contact   # 204
curl -i -X OPTIONS -H "Origin: https://example.com" https://api.brambruk.pl/forms/contact   # 403
```

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

Jedyny wyjątek to worker pomiarowy `brambruk-forms-test`
(`wrangler.pomiar.jsonc`): tylko logi wywołań pokazują CPU pojedynczego
żądania. Trafia do niego wyłącznie Twój ruch ze strony testowej, a po serii
pomiarów worker jest usuwany (sekcja "Pomiar CPU").

`npx wrangler tail` pokazuje ruch na żywo razem z metadanymi żądania (także
IP) - nic nie zapisuje, ale używaj tylko do diagnozy.

## Pomiar CPU na planie Free (10 ms na żądanie)

Limit 10 ms trzeba sprawdzić na Cloudflare - lokalny `wrangler dev` nie
mierzy CPU tak jak produkcja, a worker nie zmierzy własnego CPU (w Workers
zegar stoi podczas pracy CPU, więc `ms` w logu to głównie czekanie na
Resend). Czas CPU podaje tylko platforma. Przekroczenie kończy się błędem
Cloudflare 1102 bez nagłówków CORS: przeglądarka widzi błąd sieci, worker
ginie przed zapisem linii logu, mail nie wychodzi.

Koszt rośnie z bajtami zdjęć: parsowanie multipart, kopia pliku do
`Uint8Array`, base64, złożenie body do Resend i jego kodowanie do UTF-8,
sprzątanie dużych stringów. Worker ogranicza swoją część: base64 liczy
natywnie (`Uint8Array.prototype.toBase64`), a body składa z fragmentów
(`buildBody` w `src/resend.ts`) - treść maila przechodzi przez
`JSON.stringify`, base64 załączników jest doklejany wprost, bez drugiego
przebiegu przez `JSON.stringify`, i całość trafia do `fetch` jako jeden string.

Pomiar idzie na osobnym workerze `brambruk-forms-test`
(`wrangler.pomiar.jsonc`, adres `*.workers.dev`, zawsze `MAIL_DRY_RUN`),
nie na `api.brambruk.pl` - produkcja działa w tym czasie bez zmian i nic
nie wychodzi mailem.

1. **Profil lokalny** (proporcje, nie wartości): `npm run dev`, w terminalu
   klawisz `d` -> DevTools -> Performance (w starszych wersjach: Profiler)
   -> nagrywanie -> wysyłka wyceny z 2 zdjęciami ze strony testowej -> stop
   -> zapis profilu `.cpuprofile` do `dev/out/` (katalog jest w `.gitignore`).
   Profil pokazuje, które kroki ważą najwięcej; liczby z komputera nie są
   liczbami z Cloudflare.
2. **Worker pomiarowy** (z tego katalogu). Sekrety z wartościami
   zastępczymi - dry run nie używa klucza, a `MAIL_TO` musi tylko istnieć:

   ```bash
   npx wrangler secret put RESEND_API_KEY --config wrangler.pomiar.jsonc   # np. re_pomiar
   npx wrangler secret put MAIL_TO --config wrangler.pomiar.jsonc          # np. pomiar@example.invalid
   npx wrangler deploy --config wrangler.pomiar.jsonc
   ```

   Pierwszy `secret put` zapyta, czy założyć workera - tak.
3. `npm run dev:page` i strona testowa pod `http://localhost:4321` (dokładnie
   ten origin jest w `ALLOWED_ORIGINS` workera pomiarowego, `127.0.0.1` nie
   przejdzie). W polu "Adres workera" adres `*.workers.dev` z wyniku deployu.
4. Wyślij po 5 razy formularz wyceny w każdym wariancie; pierwsze wywołanie
   po wdrożeniu (zimny start) pomiń. Pliki do (b) i (c) robi
   `npm run measure:files` (sygnatura JPEG + losowe bajty w `dev/out/`,
   rozmiary liczone z limitów w `src/forms.ts`) - worker sprawdza tylko
   sygnaturę, a dry run nic nie wysyła, więc do pomiaru CPU to wystarcza.
   W (b) i (c) zaznacz "wyślij bez kompresji":
   - **(a)** 2 zdjęcia z telefonu z kompresją (normalny tryb strony) -
     `200`, outcome `dry_run`,
   - **(b)** `pomiar-b-1.jpg` + `pomiar-b-2.jpg` (tuż pod `maxFileSize`
     = 1 MiB) - najgorszy przypadek, jaki worker przyjmie; `200`,
   - **(c1)** `pomiar-c1.jpg` (tuż nad 1 MiB) - `400 validation_failed`
     z `photos: file_too_large`,
   - **(c2)** `pomiar-c2-1.jpg` + `pomiar-c2-2.jpg` (razem ponad
     `MAX_REQUEST_BYTES` = 3 MiB) - `413 payload_too_large`.

   W (c1) i (c2) odpowiedź ma być JSON-em z nagłówkami CORS (strona testowa
   pokazuje treść), a nie błędem sieci / 1102.
5. Odczyt: Dashboard -> Workers & Pages -> `brambruk-forms-test` ->
   Observability. Przy każdym wywołaniu pole **CPU time**
   (`$workers.cpuTimeMs`); w tym samym wywołaniu nasza linia logu pokazuje
   `bytes`, więc wiadomo, który wariant to był. Przekroczenie limitu widać
   jako outcome `exceededCpu` (na stronie testowej: błąd sieci zamiast JSON).
   Zbiorczo (percentyle): zakładka Metrics.
6. Po ostatniej serii usuń workera (razem z sekretami i logami wywołań;
   plik konfiguracji zostaje w repo na następny pomiar):

   ```bash
   npx wrangler delete --config wrangler.pomiar.jsonc
   ```

**Kryterium:** wariant (a) mieści się w 10 ms z zapasem (maksimum z 5 prób
najwyżej ~6-7 ms), wariant (b) poniżej 10 ms.

**Jeśli (b) się nie mieści** (outcome `exceededCpu`, na stronie testowej
błąd sieci zamiast JSON): cięcia na froncie nie pomogą, bo wariant (b)
omija front - to dokładnie to, co może wysłać bot albo przeglądarka bez
działającej kompresji. Zostaje:

- niższy twardy limit pliku `maxFileSize` w `src/forms.ts`, razem z kopią
  we froncie (`ZDJECIA.maksWorkera` w `src/config/formularze.ts`) i
  przeglądem `MAX_REQUEST_BYTES` - bez schodzenia poniżej celu kompresji
  frontu (600 KB), albo
- Workers Paid (5 USD/mies., limit CPU liczony w sekundach) - decyzja
  kosztowa klienta.

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
- `wrangler.jsonc` - `name`, `account_id`, `vars` (originy, nadawca, logo),
  `namespace_id` rate limitów, `routes` (sekrety `RESEND_API_KEY` i `MAIL_TO`
  ustawiasz od nowa przez `wrangler secret put`);
- `wrangler.pomiar.jsonc` - `name`, `account_id`, `vars` i `namespace_id`
  tak samo (numery inne niż w `wrangler.jsonc`);
- `.dev.vars.example` - originy lokalne;
- `dev/test-page.html` - pola formularzy (przepisane z `forms.ts`);
- testy z danymi formularzy: `test/helpers.ts` (`QUOTE_FIELDS`, `CONTACT_FIELDS`)
  oraz przypadki w `test/*.test.ts`, które odwołują się do konkretnych pól.

Nie ruszaj reszty `src/` - nie zna nazw pól ani projektu. Nowy formularz to
nowy wpis w `FORMS`, bez nowego szablonu. Nowy **typ** pola wymaga zmian w
`validate.ts` i `render.ts` - dodawaj tylko, gdy formularz go naprawdę używa.
