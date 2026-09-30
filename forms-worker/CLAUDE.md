# Worker formularzy Brambruk - instrukcja dla Claude Code

Pracujesz WYŁĄCZNIE w tym katalogu (`forms-worker/`). Nie widzisz reszty serwisu
i nie zmieniasz niczego poza tym katalogiem. Integracją z frontem zajmie się
później inny model - Twoim zadaniem jest gotowy, przetestowany backend plus
dokument `INTEGRATION.md`, z którego tamten model skorzysta.

Plan pracy jest w `TODO.md`. Ten plik opisuje KONTEKST, DECYZJE i ZASADY.
Decyzje z sekcji 3 są zamknięte - nie otwieraj ich ponownie. Jeśli któraś
okaże się technicznie niewykonalna, wybierz rozwiązanie najbliższe jej
intencji, zostaw komentarz w kodzie i opisz to w podsumowaniu końcowym.

---

## 1. Kontekst

- **Brambruk** (brambruk.pl) - firma ogrodzeniowo-brukarsko-budowlana spod
  Białej Podlaskiej. Serwis przechodzi z WordPressa na statyczne Astro
  hostowane na Cloudflare Workers (static assets).
- **Dotychczas** formularze obsługiwała wtyczka WP "Codove Mailing" (REST API,
  schematy formularzy w opcjach WP, logi w tabeli MySQL) plus wtyczka
  "Send Emails with Resend", która podpinała `wp_mail` pod Resend.
  Nazwa "Codove" jest przestarzała - NIE używaj jej nigdzie.
- **Teraz** WordPress znika. Ten worker przejmuje wysyłkę dwóch formularzy:
  - `contact` - prosty formularz kontaktowy,
  - `quote` - pięciokrokowy kreator wyceny z opcjonalnymi zdjęciami.
- Konto Resend należy do klienta i ma już zweryfikowaną domenę `brambruk.pl`
  (nadawca `kontakt@brambruk.pl` działa produkcyjnie od roku).

### Pliki w katalogu na starcie

| Plik | Status |
|---|---|
| `form-config-kontakt.json` | eksport ze starej wtyczki - ŹRÓDŁO pól i wyglądu maila formularza `contact` |
| `form-config-wycena.json` | eksport ze starej wtyczki - ŹRÓDŁO pól i wyglądu maila formularza `quote` |
| `index.js`, `wrangler.jsonc`, `README.md` | stary szkic wygenerowany wcześniej, nie odpowiada realnym formularzom. Do zastąpienia |

Oba JSON-y przenosisz do `reference/` i traktujesz jako materiał źródłowy
(pola, opcje, etykiety, wygląd maila). Nie ładujesz ich w runtime.

---

## 2. Co robi worker (w skrócie)

```
POST https://api.brambruk.pl/forms/{contact|quote}
  multipart/form-data (także application/json dla formularzy bez plików)
    → CORS (lista dozwolonych originów)
    → limit rozmiaru żądania
    → honeypot `_hp`
    → parsowanie i walidacja wg definicji z src/forms.ts
    → blokada linków w polach textarea
    → walidacja plików (liczba, rozmiar, sygnatura bajtowa)
    → rate limit (w pamięci, bez zapisu)
    → render maila (HTML + text): wspólny layout + pętla po polach
    → wysyłka JEDNEGO maila do firmy przez Resend API
    → jedna linia logu bez danych osobowych
    → odpowiedź JSON
```

Brak potwierdzenia do osoby wysyłającej. Brak zapisu zgłoszeń. Brak bazy danych.

---

## 3. Decyzje zamknięte

1. **Topologia:** osobny worker `brambruk-forms` na własnej domenie
   `api.brambruk.pl` (`routes: [{ pattern: "api.brambruk.pl", custom_domain: true }]`),
   na koncie Cloudflare klienta. Bez `*.workers.dev` i preview URL
   (`workers_dev: false`, `preview_urls: false`) - strona testowa też wysyła
   na `api.brambruk.pl`. Serwis statyczny jest osobnym wdrożeniem.
2. **Worker pod Brambruk, napisany jako wzorzec do skopiowania.** W kolejnym
   projekcie AI skopiuje ten katalog i dostosuje go - nie będzie go
   konfigurować. Dlatego:
   - wszystko, co zależy od projektu, siedzi w JEDNYM pliku `src/forms.ts`
     (definicje formularzy: pola, typy, wymagalność, limity, opcje, zależności,
     sekcje w mailu, temat) - czyste dane, zero logiki,
   - branding maila (kolory, logo, stopka) siedzi w `src/email/layout.ts`,
   - adresy i originy w `wrangler.jsonc`,
   - reszta kodu nie zna słowa "Brambruk" ani nazw konkretnych pól,
   - BEZ silnika "dowolnych formularzy": bez endpointu konfiguracji, bez DSL
     szablonów, bez trybów multi-recipient, bez panelu. Typy pól tylko te,
     których używają dwa formularze. Czytelność ponad uniwersalność.
3. **Front NIC nie importuje z katalogu workera.** Model od frontu przepisuje
   potrzebne wartości ręcznie, na podstawie `INTEGRATION.md`. Kontrakt jest
   jawny i opisany, nie współdzielony przez kod.
4. **Bez auto-potwierdzenia.** Szablony `client` z JSON-ów są porzucone.
   Wysyłamy tylko mail do firmy (`admin`), z `reply_to` ustawionym na adres
   osoby wysyłającej, żeby firma odpowiadała jednym kliknięciem.
5. **Anty-spam:** honeypot + binding Cloudflare Rate Limiting + blokada linków.
   Bez CAPTCHA, bez Turnstile, bez żadnych zewnętrznych skryptów.
6. **Logi:** wyłącznie Workers Logs (`observability.enabled`). Retencję
   ustala Cloudflare (3 dni na planie Free, 7 na Paid) - nie budujemy
   własnej tabeli ani crona. W logach NIE MA danych osobowych (sekcja 6).
7. **Zdjęcia:** maks. 2 pliki, JPEG/PNG/WebP. Front kompresuje zdjęcia
   w przeglądarce (dłuższy bok maks. 2000 px) - worker dostaje zwykle
   ~0,3-0,6 MB na plik. Worker i tak trzyma twardy limit 4 MB na plik
   (ścieżka awaryjna, gdy kompresja w przeglądarce zawiedzie, i ochrona
   przed botami, które pomijają skrypt frontu). Worker NIE przetwarza
   obrazów - tylko waliduje i koduje base64 dla Resend.
8. **Plan Cloudflare: Free** (10 ms CPU na żądanie). Pomiar CPU wymaga
   wdrożenia, więc robi go Marek po Twojej pracy - Ty przygotowujesz tryb
   `MAIL_DRY_RUN`, pole rozmiaru w logu i instrukcję pomiaru (TODO faza 5).
9. **Szablony:** jeden wspólny layout + generyczny renderer, który przechodzi
   po polach z `src/forms.ts` w kolejności i sekcjach tam zdefiniowanych.
   Nowy formularz = nowy wpis w `forms.ts`, bez nowego szablonu.
   Każdy mail ma wersję HTML i tekstową.
10. **Stack:** TypeScript, Wrangler, Vitest z `@cloudflare/vitest-pool-workers`.
    Wysyłka przez `fetch` do `https://api.resend.com/emails` - bez SDK Resend.
    Walidacja napisana ręcznie, bez Zod/Valibot. Zero zależności runtime.

---

## 4. Definicje formularzy (dane do `src/forms.ts`)

Źródło: `reference/*.json`. Poniżej rozstrzygnięte różnice między JSON-em
a tym, co dziś waliduje front. Front zostanie dostosowany do workera, ale
**worker nie może być ciaśniejszy niż sensowne dane od człowieka** (np. telefon
w formacie `+48 123 456 789` musi przejść).

### `contact`

| Pole | Typ | Wymagane | Limit | Uwagi |
|---|---|---|---|---|
| `name` | text | tak | 100 | |
| `email` | email | tak | 200 | |
| `phone` | tel | nie | 20 | w JSON-ie 12 - za mało na `+48 123 456 789` |
| `message` | textarea | tak | 2000 | blokada linków |

### `quote`

| Pole | Typ | Wymagane | Limit | Uwagi |
|---|---|---|---|---|
| `serviceType` | select | tak | - | `ogrodzenia`, `brukarstwo`, `budownictwo` |
| `subtype` | select | nie | - | musi należeć do wybranego `serviceType` (mapa niżej) |
| `amount` | text | nie | 50 | etykieta "Wymiary" |
| `location` | text | nie | 200 | |
| `terrain` | multiselect | nie | - | 11 kluczy z JSON-a |
| `timeline` | select | nie | - | |
| `budget` | select | nie | - | |
| `description` | textarea | nie | 5000 | blokada linków |
| `photos` | file | nie | 2 pliki × 4 MB | `image/jpeg`, `image/png`, `image/webp` |
| `name` | text | tak | 100 | |
| `email` | email | tak | 200 | |
| `phone` | tel | nie | 20 | |

Mapa `serviceType` → dozwolone `subtype` (w `forms.ts` jako deklaratywna
zależność pola, np. `dependsOn: { field: 'serviceType', options: {...} }`):

- `ogrodzenia`: `panelowe`, `murowane`, `brama-przesuwna`, `brama-dwuskrzydlowa`, `furtka`, `siatka`, `inne-ogrodzenia`
- `brukarstwo`: `podjazd`, `chodnik`, `taras`, `parking`, `schody`, `inne-brukarstwo`
- `budownictwo`: `altana`, `garaz`, `domek`, `wiata`, `inne-budownictwo`

Etykiety opcji bierz z JSON-a (`budownictwo` = "Budownictwo lekkie").

Sekcje w mailu `quote` (kolejność jak w starym szablonie): "Dane nadawcy"
(name, email, phone), "Szczegóły projektu" (serviceType, subtype, amount,
location, terrain, timeline, budget, photos), "Opis projektu" (description).
`contact`: "Dane nadawcy" (name, email, phone), "Treść wiadomości" (message).

### Format wejścia

- `multipart/form-data`, nazwy pól = klucze z `forms.ts`.
- Honeypot: pole `_hp` (niewidoczne; niepuste = bot).
- `multiselect`: przyjmij powtórzone klucze (`terrain=a&terrain=b`), string
  JSON z tablicą i string z przecinkami - wszystkie trzy formy.
- Pliki: pod kluczem pola (`photos`). Przyjmij też wariant `photos[]`,
  pomiń puste wpisy (rozmiar 0, pusta nazwa), usuń duplikaty (nazwa + rozmiar)
  i dopiero wtedy licz limit.
- Nieznane pola ignoruj - nie trafiają do maila.
- Wszystkie wartości: `trim()`, normalizacja końców linii do `\n`, usunięcie
  znaków kontrolnych poza `\n` i `\t`.

### Walidacja - kody błędów

`required`, `invalid_format`, `invalid_phone`, `too_long`, `invalid_option`,
`too_many_files`, `file_too_large`, `invalid_file_type`, `links_blocked`.

- email: luźne sprawdzenie `/\S+@\S+\.\S+/` plus limit długości. Nie zaostrzaj.
- telefon: pusty albo `/^[+\d\s\-()]{3,}$/`.
- plik: typ po sygnaturze bajtowej (JPEG `FF D8 FF`, PNG `89 50 4E 47`,
  WebP `RIFF....WEBP`), nie po `File.type` ani rozszerzeniu. Nazwę pliku
  w załączniku generujesz sam (`zdjecie-1.jpg`), nie ufasz nazwie od klienta.
- Blokada linków w polach textarea: `https?://` oraz `www.` (bez rozróżniania
  wielkości liter).

---

## 5. Kontrakt odpowiedzi

Zawsze JSON, zawsze `requestId` (UUID z `crypto.randomUUID()`).

| Sytuacja | HTTP | Ciało |
|---|---|---|
| wysłano | 200 | `{ ok: true, requestId }` |
| honeypot | 200 | `{ ok: true, requestId }` - bez wysyłki, bot nie ma wiedzieć |
| walidacja (w tym linki i pliki) | 400 | `{ ok: false, error: "validation_failed", fields: { pole: kod }, requestId }` |
| nieznany formularz | 404 | `{ ok: false, error: "unknown_form", requestId }` |
| zła metoda | 405 | `{ ok: false, error: "method_not_allowed", requestId }` |
| origin spoza listy | 403 | `{ ok: false, error: "forbidden_origin", requestId }` |
| za duże żądanie | 413 | `{ ok: false, error: "payload_too_large", requestId }` |
| zły Content-Type / nieparsowalne | 400 | `{ ok: false, error: "bad_request", requestId }` |
| rate limit | 429 | `{ ok: false, error: "rate_limited", requestId }` + `Retry-After: 60` |
| Resend odmówił / timeout | 502 | `{ ok: false, error: "mail_failed", requestId }` |
| brak konfiguracji (brak sekretu itp.) | 500 | `{ ok: false, error: "not_configured", requestId }` |

`fields` zawiera WSZYSTKIE błędy naraz, nie tylko pierwszy.
Szczegóły techniczne (treść błędu Resend, stack) NIGDY nie trafiają do odpowiedzi.

CORS: `Access-Control-Allow-Origin` = dokładnie origin z listy `ALLOWED_ORIGINS`
(nigdy `*` w produkcji), `Vary: Origin`, metody `POST, OPTIONS`, nagłówki
`Content-Type`. Preflight `OPTIONS` → 204. Nagłówki CORS na KAŻDEJ odpowiedzi,
także błędach. Żądanie bez `Origin` albo z originem spoza listy → 403.

---

## 6. Prywatność (RODO) i logi

Podstawa prawna: art. 6 ust. 1 lit. f RODO (odpowiedź na zapytanie).
Klauzula informacyjna jest przy formularzu na stronie - to nie jest zadanie
workera. Mail trafia tylko do firmy, więc nie zawiera klauzuli RODO.

Zasady twarde:

- **Worker nic nie przechowuje.** Zgłoszenie żyje tylko w trakcie żądania.
- **Logi bez danych osobowych.** Jedna linia JSON na żądanie:
  `{ requestId, form, outcome, reason, status, resendStatus?, resendError?, files, bytes, ms }`.
  NIE logujesz: IP, e-maila (także zamaskowanego), imienia, telefonu, treści,
  nazw plików, pełnej odpowiedzi Resend (może zawierać adres). Z błędu Resend
  logujesz tylko status HTTP i pole `name`.
- **IP** służy wyłącznie jako klucz rate limitu w pamięci bindingu i nigdzie
  nie jest zapisywane.
- Test automatyczny pilnuje, że log nie zawiera e-maila, imienia, telefonu
  ani treści z przykładowego zgłoszenia.

---

## 7. Mail do firmy

- `from`: z `MAIL_FROM` (`Brambruk - Kontakt <kontakt@brambruk.pl>`).
- `to`: z sekretu `MAIL_TO` (lista po przecinku; prywatny adres właściciela,
  nie `kontakt@brambruk.pl` - ta skrzynka obsługuje tylko pocztę przychodzącą).
- `reply_to`: e-mail osoby wysyłającej (pole typu `email` z definicji).
- Temat z `forms.ts`, z podstawieniem wartości pola:
  - contact: `Nowe zapytanie od {name}`
  - quote: `Nowe zapytanie o wycenę - {serviceType}` (etykieta, nie klucz)
  Temat: usunięte `\r` i `\n`, obcięty do 150 znaków.
- Nagłówek `Idempotency-Key: {requestId}`.
- `tags`: `[{ name: "form", value: <slug> }]`.
- Załączniki: `{ filename, content: base64 }`. Kodowanie możliwie tanie
  w CPU - sprawdź, co daje workerd przy zadanej `compatibility_date`
  (`Uint8Array.prototype.toBase64`, `Buffer` z `nodejs_compat`), bez pętli
  znak po znaku przez `btoa`.
- Timeout wywołania Resend: 10 s (`AbortSignal.timeout`). Bez automatycznych
  ponowień - przy błędzie 502, front pokazuje komunikat.

### Renderer i layout

- `src/email/html.ts`: tagged template, który **escapuje wszystko domyślnie**
  (`& < > " '`). Surowy HTML tylko jawnie, przez osobną funkcję, nigdy dla
  danych od użytkownika. Stary plugin używał `wp_kses_post` - nie powielaj.
- `src/email/layout.ts`: preheader, pasek górny, nagłówek, karty sekcji,
  stopka z logo. Wygląd wg szablonów `admin` z `reference/`: pasek `#98af15`,
  nagłówek `#5a5343`, akcent lewej krawędzi `#b5cc1c`, linki `#89a66f`,
  tło kart `#f8f9f7`, stopka `#5a5343`. Tylko inline style i tabele.
- `src/email/render.ts`: generyczny - dla danego formularza i danych po
  walidacji buduje `{ subject, html, text }`, przechodząc po sekcjach z
  `forms.ts`. Pola krótkie jako wiersze "etykieta: wartość", textarea jako
  osobny blok z akcentem lewej krawędzi (tekst escapowany, `\n` → `<br>` albo
  `white-space:pre-line`). Pole typu email jako link `mailto:`.
- Wartości: select/multiselect → etykiety (multiselect po przecinku); pusty
  opcjonalny parametr → `-` (zwykły łącznik); pusty multiselect i brak zdjęć
  → `Brak`; zdjęcia → `1 zdjęcie w załączniku` / `2 zdjęcia w załączniku`.
- Logo: z `LOGO_URL` (domyślnie `https://brambruk.pl/assets/logo/znak-144.png`,
  64 px). Stary adres z `/wp-content/uploads/` przestanie działać - nie używaj.
- **Zakaz pauzy (—) w treściach wychodzących** - tematy, maile, komunikaty.
  Zamiast niej zwykły łącznik `-`. Półpauza w przedziałach kwot
  (`5 000 – 15 000 zł`) zostaje.
- Stopka: "Ta wiadomość została wygenerowana automatycznie." plus linia
  `Formularz: {nazwa} · ID zgłoszenia: {requestId}`.

---

## 8. Konfiguracja

`wrangler.jsonc`:

- `name`: `brambruk-forms`, `main`: `src/index.ts`, `compatibility_date`
  aktualna (serwis używa `2026-09-14`).
- `vars`: `ALLOWED_ORIGINS` (tylko produkcyjne: `https://brambruk.pl,https://www.brambruk.pl`;
  origin testowy przez `wrangler deploy --var`), `MAIL_FROM`, `LOGO_URL`,
  `MAIL_DRY_RUN` (`"false"`).
- Sekrety (`secrets.required`): `RESEND_API_KEY` i `MAIL_TO` - wyłącznie
  `wrangler secret put`, lokalnie `.dev.vars`. Nigdy w repo, nigdy w logu,
  nigdy w odpowiedzi.
- `ratelimits`: dwa bindingi `simple` z `period: 60` (dozwolone tylko 10 lub 60):
  - `RL_IP` - klucz `{form}:{CF-Connecting-IP}`, limit 5,
  - `RL_EMAIL` - klucz `{form}:{email lowercase}`, limit 3.
  `namespace_id` - placeholder z komentarzem. Brak bindingu (np. lokalnie)
  = ostrzeżenie w logu i przepuszczenie żądania, nie crash.
  Rate limit sprawdzasz PO honeypocie i walidacji, PRZED wysyłką.
- `observability`: `{ enabled: true, head_sampling_rate: 1 }`.
- `MAIL_DRY_RUN="true"`: pełna ścieżka łącznie z budową payloadu i kodowaniem
  załączników, bez ostatniego `fetch`. W logu `outcome: "dry_run"`.
- Limit rozmiaru żądania: 10 MB (`Content-Length` przed parsowaniem).

`.dev.vars.example` (commitowany) z pustym `RESEND_API_KEY=` i
`ALLOWED_ORIGINS` rozszerzonym o originy lokalne. `.dev.vars` w `.gitignore`.

---

## 9. Konwencje kodu

- Nazwy plików, funkcji, typów, zmiennych: **po angielsku**. Komentarze mogą
  być po polsku. Treści widoczne dla ludzi (maile, komunikaty): po polsku.
- TypeScript `strict`. Typy bindingów generuj `wrangler types`.
- Moduły o jednej odpowiedzialności: `forms`, `cors`, `parse`, `validate`,
  `spam`, `files`, `email/*`, `resend`, `log`. `index.ts` tylko routuje.
- Funkcje czyste tam, gdzie się da (walidacja, render) - łatwe testy, działają w Node.
- Na górze `src/forms.ts` komentarz: "Jedyny plik zależny od projektu (poza
  layoutem maila i wrangler.jsonc). Przy kopiowaniu workera do innego projektu
  zaczynasz tutaj."
- Nie commituj bez polecenia Marka. Nie wdrażaj (`wrangler deploy`) - robi to Marek.

---

## 10. Sposób pracy

1. **Pracujesz bez przerw od fazy 0 do końca fazy 6.** Plan jest uzgodniony.
   Nie pytasz o potwierdzenia, nie czekasz na akceptację między fazami.
2. Kolejność z `TODO.md`. Odhaczaj zadania na bieżąco (`[x]`) - jeśli sesja
   się urwie, następna ma wiedzieć, gdzie skończyłeś.
3. Każda faza kończy się **weryfikacją, którą wykonujesz sam** (testy,
   `tsc`, uruchomienie `wrangler dev` i `curl`, wygenerowanie podglądów).
   Coś nie przechodzi - naprawiasz i idziesz dalej.
4. Rzeczy, których nie możesz zrobić sam (prawdziwa wysyłka przez Resend,
   deploy, pomiar CPU na Cloudflare, ocena wyglądu maila), NIE blokują pracy.
   Zbierasz je w liście "Do sprawdzenia przez Marka" w podsumowaniu końcowym,
   z dokładnymi komendami.
5. Niejasność, której ten plik nie rozstrzyga: wybierz rozwiązanie zgodne
   z duchem decyzji z sekcji 3, oznacz komentarzem `// DECYZJA:` w kodzie
   i wypisz w podsumowaniu końcowym. Zatrzymaj się WYŁĄCZNIE, gdy jedyna
   droga narusza zasady bezpieczeństwa lub prywatności z sekcji 5-6
   (np. wymagałaby logowania danych osobowych albo klucza w repo).
6. Weryfikacja proporcjonalna do ryzyka: `tsc` + testy po zmianach logiki;
   nie odpalaj całej maszynerii po poprawce literówki w komentarzu.
7. Testy nie wołają prawdziwego Resend.
8. Gdy coś w tym pliku wydaje Ci się sprzeczne z dobrą praktyką, zrób to
   zgodnie z dobrą praktyką i uzasadnij w podsumowaniu - nie rób po cichu.
9. Na końcu jedno podsumowanie: co powstało, jak uruchomić stronę testową
   i podgląd maili, lista `// DECYZJA:`, lista "Do sprawdzenia przez Marka".
