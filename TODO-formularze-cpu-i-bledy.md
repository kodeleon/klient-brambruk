# TODO: CPU workera formularzy i obsługa nieudanej wysyłki

Plik roboczy do planu `PLAN-formularze-cpu-i-bledy.md` (wersja 2, 01.10.2026).
Odhaczać `[x]` na bieżąco. Część dla Marka (pomiary, testy ręczne, lista
`DECYZJA`, kolejność wdrożenia): `TODO-formularze-do-sprawdzenia.md`.

Każdy etap = osobny commit, żeby dało się go sprawdzić i zmierzyć oddzielnie.

## Stan bazowy (01.10.2026, przed zmianami)

- `forms-worker`: `npm run typecheck` czysto, `npm test` 175/175.
- `astro`: `npm run build` OK. `npm run check` - **146 błędów zastanych**
  (głównie `'x' is possibly 'undefined'` w `src/pages/*.astro`: schemat
  kolekcji `strony` ma same pola opcjonalne; plus `z.record` z jednym
  argumentem w `content.config.ts`). Poza zakresem - kryterium dla tej pracy:
  zero NOWYCH błędów.
- `astro`: `npm run no-js` - **12 podstron BLOKER zastanych** (huby, usługi,
  `/realizacje/`: elementy ukryte przez `opacity`). `/wycena/` i `/kontakt/` ✓.
  Kryterium: te dwie zostają ✓, żadnej nowej pozycji BLOKER.
- `TODO-formularze-wdrozenie.md`, na który powołuje się plan, nie istnieje
  w repozytorium (ani w historii Gita). Część A go nie dotyka; w części B
  (dopisek do D3) trzeba będzie ustalić, gdzie ten wpis ma trafić.

## Grupa A - na produkcję (etapy 0-3)

### Etap 0 - pomiar bazowy

- [x] `forms-worker/wrangler.pomiar.jsonc` (worker `brambruk-forms-test`, `*.workers.dev`, dry run, `invocation_logs`, własne liczniki rate limitu)
- [x] `forms-worker/wrangler.jsonc`: tylko komentarz przy `invocation_logs`
- [x] `forms-worker/README.md`: sekcja "Pomiar CPU" przepisana, w "Logi" wyjątek dla workera pomiarowego (+ wiersz w "Struktura" i w "Kopiowanie do innego projektu")
- [x] `wrangler deploy --dry-run` (oba configi), `npm run typecheck`, `npm test` bez zmian (175/175)
- [x] punkt kontrolny 0 w pliku dla Marka
- [x] commit

### Etap 1 - worker: body do Resend bez `JSON.stringify` na base64

- [x] `src/resend.ts`: funkcja budująca body z fragmentów (`buildBody`), komentarz przy `toBase64`
- [x] `src/submit.ts`: użycie nowej funkcji; komentarz o kolejności przed dry run
- [x] `test/send.test.ts`: równoważność (0/1/2/3 załączniki, także string 1:1), nazwa pliku ze znakami specjalnymi, `Content-Type`, dry run buduje body (spy na `Uint8Array.prototype.toBase64`)
- [x] `README.md`: zdanie w sekcji pomiaru, co robi worker
- [x] `npm run typecheck`, `npm test` (183/183); linia logu bez zmian (`log.test.ts` zielony)
- [x] punkt kontrolny 1 w pliku dla Marka
- [x] commit

### Etap 2 - front: kompresja i limity zdjęć

- [ ] `src/config/formularze.ts`: `ZDJECIA` w docelowej strukturze (bok, jakości, limit wejścia / wyniku / workera) + komentarz o wyjątku od zasady „front nie ostrzejszy"
- [ ] `src/scripts/formularz.ts`: wspólny formatter wagi, `file_too_large` z wagą, odnośniki w komunikatach przy zdjęciach
- [ ] `src/scripts/zdjecia.ts`: nowy przepływ (typ -> duplikat -> liczba -> > 10 MB -> 1600 px / 0,82 -> 0,7 -> awaria), karty „nie dodano", licznik niedodanych
- [ ] `src/scripts/wycena.ts`: podsumowanie z niedodanymi, dopisek na ekranie sukcesu
- [ ] `src/pages/wycena.astro`: ukryty dopisek w bloku sukcesu, szablon ikony karty
- [ ] `src/content/formularze.json` + `src/content.config.ts`: `photo_input_too_large`, nowe `photo_failed`, `file_too_large` z wagą, teksty „nie dodano"
- [ ] `src/content/strony/wycena.json` + schemat `strony`: dopisek sukcesu, „do 10 MB" w opisie pola
- [ ] `forms-worker/dev/test-page.html`: sekcja KOMPRESJA ZDJĘĆ, `PHOTO_LIMITS`, etykieta pola
- [ ] `forms-worker/INTEGRATION.md`: pkt 2, 3, 4
- [ ] `forms-worker/CLAUDE.md`: sekcja 3 pkt 7
- [ ] `npm run check` (bez nowych błędów), `npm run build`, `npm run no-js`; próba w przeglądarce
- [ ] punkt kontrolny 2 w pliku dla Marka
- [ ] commit

### Etap 3 - worker: twarde limity rozmiaru

- [ ] `forms-worker/src/forms.ts`: `maxFileSize` 1 MiB, `MAX_REQUEST_BYTES` 3 MiB, komentarze
- [ ] `src/config/formularze.ts`: `ZDJECIA.maksWorkera` 1 MiB
- [ ] testy: `validate.test.ts`, `http.test.ts` (1,1 MiB + 413 z CORS), `parse.test.ts`
- [ ] `README.md` (schemat przepływu, warianty (a)(b)(c), „Jeśli (b) się nie mieści"), `CLAUDE.md`, `INTEGRATION.md`, `dev/test-page.html`
- [ ] opcjonalnie: generator plików do wariantów (b) i (c) w `forms-worker/dev/`
- [ ] grep bez nieaktualnych wartości; `npm run typecheck`, `npm test`
- [ ] punkt kontrolny 3 w pliku dla Marka
- [ ] commit

### Zamknięcie części A

- [ ] `forms-worker`: `npm run typecheck`, `npm test`, `npx wrangler deploy --dry-run` (oba configi)
- [ ] `astro`: `npm run check`, `npm run no-js`, `npm run build`
- [ ] `TODO-formularze-do-sprawdzenia.md`, sekcja A: komendy pomiaru, testy ręczne, `DECYZJA`, kolejność wdrożenia
- [ ] STOP i raport

## Grupa B - po potwierdzeniu Marka („start B"), osobne wdrożenie

Nie zaczynać bez wyraźnego „start B".

### Etap 4 - limit opisu wyceny 2000 znaków

- [ ] `forms.ts` `description.maxLength` 2000, `LIMITY.quote.description` 2000
- [ ] `too_long` z nadmiarem i odmianą, sprawdzenie szkicu przy wejściu na krok „Dodatkowe"
- [ ] dokumentacja workera, strona testowa, `preview-emails.ts`, testy

### Etap 4b - mail workera: etykiety z frontu i jednostka wymiarów

- [ ] etykiety pól (`location`, `terrain`, `description`) i opcji `budownictwo`, tytuł sekcji maila
- [ ] jednostka przy `amount` (z bezpiecznikiem ~20 linii)
- [ ] `JEDNOSTKI_WYMIARU` we froncie, testy, dokumentacja

### Etap 5 - front: obsługa nieudanej wysyłki + szkic kontaktu

- [ ] `szkic.ts`, `wysylkaMailem.ts`, komponent bloku błędu
- [ ] „Spróbuj ponownie" / „Wyślij przez email" wg tabeli sytuacji
- [ ] dopisek do D3 o drugim kluczu `localStorage`

### Zamknięcie części B

- [ ] pełna weryfikacja, sekcja B w pliku dla Marka, ten plik usunąć albo przenieść do `../_to_delete/`
