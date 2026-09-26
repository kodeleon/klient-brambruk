# Integracja frontu z workerem formularzy

Dokument dla osoby (lub modelu), która podpina formularze strony do workera
z tego katalogu.

**Front NIC nie importuje z katalogu workera.** Wszystkie wartości (nazwy pól,
klucze opcji, limity, adres) przepisujesz ręcznie do kodu frontu, na podstawie
plików wskazanych niżej. Kontrakt jest jawny, nie współdzielony przez kod.
Ten dokument celowo nie wymienia konkretnych pól - te zależą od projektu
i jedynym źródłem prawdy jest `src/forms.ts`. Po każdej zmianie `forms.ts`
front trzeba przejrzeć według listy z punktu 2.

---

## 1. Mapa źródeł prawdy

| Informacja | Gdzie w workerze |
|---|---|
| lista formularzy i ich adresy | `src/forms.ts` - klucze obiektu `FORMS` (slug) + `src/index.ts` - wzór ścieżki `FORM_PATH` (`/forms/{slug}`) |
| adres produkcyjny workera | `wrangler.jsonc` - `routes[].pattern` (np. `api.brambruk.pl`); przed przeniesieniem DNS adres `*.workers.dev` podany przez Marka po wdrożeniu |
| nazwy pól, typy, wymagalność, limity długości | `src/forms.ts` - `FORMS[slug].fields`: klucz = nazwa pola, `type`, `required`, `maxLength` |
| klucze opcji select/multiselect | `src/forms.ts` - `options` pola: klucz = wartość wysyłana, wartość = etykieta w mailu |
| zależności między polami | `src/forms.ts` - `dependsOn` pola: `field` = pole nadrzędne, `options` = mapa wartość nadrzędna -> dozwolone opcje |
| limity plików | `src/forms.ts` - pole typu `file`: `maxFiles`, `maxFileSize` (bajty), `accept` (typy MIME) |
| limit całego żądania | `src/forms.ts` - `MAX_REQUEST_BYTES` |
| blokada linków | `src/forms.ts` - `blockLinks` formularza; wzorzec w `src/spam.ts` (`LINK_PATTERN`) - dotyczy pól `textarea` |
| wzorce e-maila i telefonu | `src/validate.ts` - `EMAIL_PATTERN`, `PHONE_PATTERN` |
| nazwa pola honeypot | `src/spam.ts` - `HONEYPOT_FIELD` |
| kody błędów pól | `src/validate.ts` - typ `FieldError` |
| kody błędów żądania i kształt odpowiedzi | `src/response.ts` - typ `ErrorCode` i `Outcome.body` + punkt 3 niżej |
| dozwolone originy | `wrangler.jsonc` - `vars.ALLOWED_ORIGINS` |
| wzorcowa implementacja formularzy i kompresji zdjęć | `dev/test-page.html` |

### Jak czytać `src/forms.ts`

| `type` w forms.ts | Element na froncie | Co wysłać |
|---|---|---|
| `text` | `<input type="text">` | tekst |
| `email` | `<input type="email">` | tekst |
| `tel` | `<input type="tel">` | tekst |
| `textarea` | `<textarea>` | tekst (nowe linie dozwolone) |
| `select` | `<select>` albo grupa radio | jeden klucz opcji |
| `select` z `dependsOn` | `<select>`, którego opcje zależą od pola nadrzędnego | jeden klucz z grupy dla wybranej wartości nadrzędnej |
| `multiselect` | grupa checkboxów o tej samej nazwie | każdy zaznaczony klucz jako osobny wpis (`klucz=a`, `klucz=b`) |
| `file` | `<input type="file" multiple>` + kompresja (punkt 4) | każdy plik jako osobny wpis pod kluczem pola, z nazwą pliku |

`required: true` = pole wymagane (brak `required` = opcjonalne).
`maxLength` = maksymalna liczba znaków po usunięciu spacji z brzegów.
`label` to etykieta w mailu do firmy - etykiety na stronie mogą być inne.

---

## 2. Co MUSI się zgadzać (lista kontrolna)

- [ ] Atrybut `name` każdego pola = klucz pola w `forms.ts` (wielkość liter ma znaczenie). Pola o innych nazwach worker po cichu ignoruje - dane przepadną bez błędu.
- [ ] `value` każdej opcji = klucz opcji z `forms.ts`. Etykiety na froncie mogą się różnić, klucze nie.
- [ ] Limity walidacji frontu ≤ limity workera: `maxlength` pól ≤ `maxLength`, liczba plików ≤ `maxFiles`, rozmiar pliku po kompresji ≤ `maxFileSize`. Front nie może przepuszczać tego, co worker odrzuci.
- [ ] Pola wymagane na froncie = pola z `required: true`. Sam ciąg spacji traktuj jak puste pole (worker robi `trim()`).
- [ ] Zależności opcji odwzorowane: po zmianie pola nadrzędnego lista opcji pola zależnego się zmienia, a wybrana wartość, która nie pasuje do nowej grupy, jest czyszczona.
- [ ] Walidacja e-maila i telefonu na froncie nie ostrzejsza niż `EMAIL_PATTERN` i `PHONE_PATTERN` (np. `+48 123 456 789` i `(83) 343-11-22` muszą przejść).
- [ ] Pola `textarea` w formularzu z `blockLinks: true` sprawdzane na froncie tym samym wzorcem co `LINK_PATTERN` (`http://`, `https://`, `www.`, bez rozróżniania wielkości liter), z komunikatem przy polu.
- [ ] Honeypot obecny w każdym formularzu: `<input type="text" name="{HONEYPOT_FIELD}" tabindex="-1" autocomplete="off">`, ukryty wizualnie i przed czytnikami ekranu (kontener z `aria-hidden="true"`, poza ekranem - nie `type="hidden"`, bo boty go pomijają), zawsze pusty.
- [ ] Wysyłka jako `multipart/form-data` przez `fetch(url, { method: 'POST', body: formData })`, **bez** ręcznego nagłówka `Content-Type` (przeglądarka dodaje `boundary`).
- [ ] Jeden adres na formularz: `{adres workera}/forms/{slug}` - nie jeden wspólny adres dla wszystkich formularzy.
- [ ] Zdjęcia dodane do `FormData` po kompresji: `formData.append('{klucz pola}', blob, 'nazwa.jpg')` - z nazwą pliku (bez nazwy przeglądarka wysyła `blob`), bez duplikatów.
- [ ] Przycisk wysyłki zablokowany od kliknięcia do odpowiedzi (każde żądanie to osobny mail) i w trakcie kompresji zdjęć.
- [ ] Adres workera trzymany w jednym miejscu konfiguracji frontu (zmieni się z `*.workers.dev` na `api.brambruk.pl`).

Wariant JSON (`Content-Type: application/json`, obiekt `{ pole: wartość }`,
multiselect jako tablica) worker też przyjmuje, ale tylko bez plików
i z preflightem CORS. Zalecany jest `FormData` dla wszystkich formularzy.

---

## 3. Kontrakt odpowiedzi

Każda odpowiedź to JSON z `requestId` (UUID). Nagłówki CORS są na każdej
odpowiedzi dla originu z `ALLOWED_ORIGINS`; `Retry-After` jest czytelny z JS.

| Sytuacja | HTTP | Ciało |
|---|---|---|
| wysłano | 200 | `{ ok: true, requestId }` |
| honeypot wypełniony | 200 | `{ ok: true, requestId }` (bez wysyłki) |
| błędy walidacji | 400 | `{ ok: false, error: "validation_failed", fields: { pole: kod }, requestId }` |
| zły `Content-Type` / nieparsowalne ciało | 400 | `{ ok: false, error: "bad_request", requestId }` |
| origin spoza listy albo brak `Origin` | 403 | `{ ok: false, error: "forbidden_origin", requestId }` |
| nieznany slug formularza | 404 | `{ ok: false, error: "unknown_form", requestId }` |
| adres spoza `/forms/*` | 404 | `{ ok: false, error: "not_found", requestId }` |
| metoda inna niż POST/OPTIONS | 405 | `{ ok: false, error: "method_not_allowed", requestId }` |
| żądanie > `MAX_REQUEST_BYTES` | 413 | `{ ok: false, error: "payload_too_large", requestId }` |
| rate limit | 429 | `{ ok: false, error: "rate_limited", requestId }` + nagłówek `Retry-After: 60` |
| brak konfiguracji workera | 500 | `{ ok: false, error: "not_configured", requestId }` |
| nieprzewidziany błąd workera | 500 | `{ ok: false, error: "internal_error", requestId }` |
| Resend odmówił / timeout | 502 | `{ ok: false, error: "mail_failed", requestId }` |

`fields` zawiera **wszystkie** błędne pola naraz (jeden kod na pole). Nie
zawiera pól poprawnych. Szczegóły techniczne nigdy nie trafiają do odpowiedzi.

Jeśli `fetch` rzuci wyjątek albo odpowiedź nie jest JSON-em (np. awaria po
stronie Cloudflare), traktuj to jak **błąd sieci**.

### Zalecane komunikaty

Bez pauz (—) - tylko zwykły łącznik (-). `{telefon}` i `{e-mail}` to dane
kontaktowe firmy z konfiguracji strony (te same, które są w stopce), jako
klikalne `tel:` i `mailto:`.

**Kody błędów pól** (`fields`):

| Kod | Komunikat przy polu |
|---|---|
| `required` | To pole jest wymagane. (select: Wybierz jedną z opcji.) |
| `invalid_format` | Podaj poprawny adres e-mail, np. jan@example.com. |
| `invalid_phone` | Podaj poprawny numer telefonu (cyfry, spacje, +, -, nawiasy). |
| `too_long` | Tekst jest za długi - maksymalnie {maxLength} znaków. |
| `invalid_option` | Wybierz opcję z listy. (pole zależne: Wybierz rodzaj pasujący do wybranej usługi.) |
| `too_many_files` | Możesz dodać maksymalnie {maxFiles} zdjęcia. |
| `file_too_large` | Zdjęcie jest za duże (maksymalnie {maxFileSize w MB} MB). Dodaj mniejsze zdjęcie. |
| `invalid_file_type` | Dodaj zdjęcie w formacie JPG, PNG lub WebP. |
| `links_blocked` | Usuń linki z treści (http://, https://, www.). Adres strony możesz opisać słowami. |

**Kody `error`**:

| Kod | Komunikat nad przyciskiem wysyłki |
|---|---|
| `ok: true` | Dziękujemy! Wiadomość została wysłana. Odpowiemy najszybciej, jak to możliwe. |
| `validation_failed` | Popraw zaznaczone pola. (+ komunikaty przy polach, fokus na pierwszym błędnym) |
| `rate_limited` | Wysłano zbyt wiele zgłoszeń w krótkim czasie. Spróbuj ponownie za minutę albo zadzwoń: {telefon}, napisz: {e-mail}. |
| `mail_failed` | Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę albo skontaktuj się z nami bezpośrednio: {telefon}, {e-mail}. |
| błąd sieci | Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie albo skontaktuj się z nami: {telefon}, {e-mail}. |
| `payload_too_large` | Zgłoszenie jest za duże. Usuń jedno ze zdjęć albo dodaj mniejsze. |
| `bad_request`, `forbidden_origin`, `unknown_form`, `not_found`, `method_not_allowed` | Nie udało się wysłać formularza. Odśwież stronę i spróbuj ponownie albo skontaktuj się z nami: {telefon}, {e-mail}. |
| `not_configured`, `internal_error` | Formularz chwilowo nie działa. Skontaktuj się z nami: {telefon}, {e-mail}. |

Przy błędach 5xx i błędzie sieci pokaż drobnym drukiem `requestId`
("Kod zgłoszenia: …") - po nim Marek znajdzie wpis w logach. Przy każdym
błędzie formularz **zachowuje** wpisane dane i zdjęcia.

Sukces nie wysyła potwierdzenia do osoby wypełniającej - komunikat nie może
obiecywać maila z potwierdzeniem.

---

## 4. Kompresja zdjęć w przeglądarce (wymóg)

Implementacja referencyjna: `dev/test-page.html`, sekcja skryptu
"KOMPRESJA ZDJĘĆ" (`compressImage`, `drawToJpeg`, `decodeFailed`, `ready`).
Przepisz logikę do frontu - nie importuj pliku.

- Kompresja **w momencie dodania** zdjęcia, nie przy wysyłce - użytkownik od razu widzi podgląd i wagę.
- `createImageBitmap(file, { imageOrientation: 'from-image' })` -> canvas (albo `OffscreenCanvas`) -> dłuższy bok maks. **2000 px**, bez powiększania mniejszych.
- Wyjście **JPEG, jakość ~0,82** (JPEG zamiast WebP: pewny podgląd załącznika w każdym kliencie poczty). Przezroczystość PNG na białym tle.
- Ponowne kodowanie usuwa EXIF, w tym lokalizację GPS - to zamierzone.
- Jeśli wynik jest większy od oryginału, a oryginał mieści się w wymiarach (i ma typ z `accept`) - wyślij oryginał.
- Błąd dekodowania (np. HEIC w przeglądarce bez obsługi): wyślij oryginał, jeśli spełnia limity workera (typ z `accept`, rozmiar ≤ `maxFileSize`); jeśli nie - komunikat przy polu ("Nie udało się przetworzyć zdjęcia. Zapisz je jako JPG i dodaj ponownie.").
- Wskaźnik przetwarzania przy każdym zdjęciu; przycisk wysyłki zablokowany, dopóki kompresja trwa.
- Limity **liczby i typów** plików sprawdzane **przed** kompresją, limit **rozmiaru po** kompresji.
- Pole pliku przyjmuje na wejściu także HEIC/HEIF (`accept="image/jpeg,image/png,image/webp,image/heic,image/heif"`) - po kompresji i tak wychodzi JPEG. Worker sprawdza typ po bajtach, więc HEIC bez konwersji odrzuci (`invalid_file_type`).
- Przycisk "Usuń" przy każdym zdjęciu; to samo zdjęcie nie może być dodane dwa razy.

---

## 5. Zmiany poza formularzem

- **CSP** strony: adres workera w `connect-src` (produkcyjnie `https://api.brambruk.pl`, przejściowo adres `*.workers.dev`). Jeśli podgląd zdjęć używa `URL.createObjectURL`, w `img-src` potrzebne jest `blob:`.
- **Originy:** każdy origin, z którego strona wysyła formularze (produkcja z `www` i bez, a także podgląd wdrożenia, jeśli ma działać), musi być wpisany dokładnie w `ALLOWED_ORIGINS` w `wrangler.jsonc` workera. Worker nie obsługuje wzorców (`*`) - origin spoza listy dostaje 403 i przeglądarka zgłosi błąd CORS.

---

## 6. Uwagi do decyzji Marka (poza workerem)

- **Polityka prywatności** powinna wymieniać podmioty przetwarzające: Resend (wysyłka maili; firma z USA - sprawdzić podstawę transferu w ich DPA, np. EU-US Data Privacy Framework lub standardowe klauzule umowne) i Cloudflare (hosting workera i strony). Warto też sprawdzić, jak długo Resend przechowuje wysłane wiadomości w swoim panelu, i ustawić możliwie krótko.
- **Tekst przy formularzu** nie powinien sugerować zgody ("akceptuję Politykę Prywatności", checkbox zgody), bo podstawą przetwarzania jest art. 6 ust. 1 lit. f RODO (odpowiedź na zapytanie), nie zgoda. Lepiej: "Informacje o przetwarzaniu danych: Polityka Prywatności" (link).
- **Retencja:** worker nic nie przechowuje, logi (bez danych osobowych) żyją 3 dni. Zgłoszenia żyją w skrzynce `MAIL_TO` - o ich usuwaniu decyduje firma.
