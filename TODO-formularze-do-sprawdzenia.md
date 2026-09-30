# Do sprawdzenia przez Marka - formularze: CPU workera i limity zdjęć

Plan: `PLAN-formularze-cpu-i-bledy.md`. Plik roboczy modelu:
`TODO-formularze-cpu-i-bledy.md`. Tutaj tylko to, czego model nie mógł
zrobić sam: pomiary na Cloudflare, próby na telefonie, decyzje do oceny.

Każdy etap to osobny commit (`git log --oneline --grep="^Etap"`), więc każdy
da się zmierzyć i obejrzeć oddzielnie.

---

## A. Część A (etapy 0-3) - na produkcję

### Jak zmierzyć konkretny etap

Pełna procedura: `forms-worker/README.md`, sekcja "Pomiar CPU".

Pierwsze wdrożenie workera pomiarowego (z `forms-worker/`), raz:

```bash
npx wrangler secret put RESEND_API_KEY --config wrangler.pomiar.jsonc   # wartość zastępcza, np. re_pomiar
npx wrangler secret put MAIL_TO --config wrangler.pomiar.jsonc          # np. pomiar@example.invalid
npx wrangler deploy --config wrangler.pomiar.jsonc
```

Worker pomiarowy `brambruk-forms-test` wdraża kod z bieżącego katalogu
roboczego. Żeby zmierzyć stan po danym etapie, przełącz się na jego commit,
wdróż i wróć (z katalogu `forms-worker/`, przy czystym `git status`):

```bash
git switch --detach <commit etapu>          # hash z: git log --oneline --grep="^Etap"
npx wrangler deploy --config wrangler.pomiar.jsonc
npm run dev:page                             # strona testowa z tego samego commitu
# ... seria wysyłek, odczyt CPU time w Observability ...
git switch main
```

Sekrety workera pomiarowego zostają między kolejnymi `deploy`. Zależności
się nie zmieniają - `npm ci` między etapami niepotrzebne. Po ostatniej
serii: `npx wrangler delete --config wrangler.pomiar.jsonc`.

### Punkt kontrolny 0 - pomiar bazowy (kod sprzed etapu 1)

- [ ] **Unikalność `namespace_id` 1901 i 1902** na koncie Cloudflare
      (`wrangler.pomiar.jsonc`). Wspólny numer z innym workerem = wspólny
      licznik rate limitu. Numery produkcji to 1001/1002.
- [ ] **Profil lokalny "przed"** na commicie etapu 0: w `forms-worker/`
      `npm run dev`, klawisz `d` -> DevTools -> Performance -> nagrywanie ->
      wysyłka wyceny z 2 zdjęciami ze strony testowej (`npm run dev:page`)
      -> stop -> zapis do `forms-worker/dev/out/przed.cpuprofile`.
- [ ] (opcjonalnie, rekomendowane) **seria bazowa** na workerze pomiarowym,
      commit etapu 0, warianty (a) i (b) z README po 5 wysyłek. Odczyt:
      Observability workera `brambruk-forms-test` -> CPU time. Bez tej serii
      efekt etapu 1 będzie widać tylko w proporcjach profilu.

### Punkt kontrolny 1 - body do Resend bez `JSON.stringify` na base64

Zmiana: `buildBody` w `forms-worker/src/resend.ts`. Body jest bajt w bajt
takie samo jak wcześniej (test porównuje stringi), więc mail się nie zmienia.

- [ ] **Profil lokalny "po"** na commicie etapu 1, ten sam scenariusz co
      "przed" (te same 2 zdjęcia) -> `forms-worker/dev/out/po-etapie-1.cpuprofile`.
      Porównaj udział `JSON.stringify` i kodowania body z profilem "przed".
- [ ] **Seria na workerze pomiarowym**, commit etapu 1, warianty (a) i (b).
      Wynik decyduje tylko o dalszych cięciach (mocniejsza kompresja, mniejszy
      bok). Wariant (b) z limitem 4 MiB może nadal nie mieścić się w 10 ms -
      to naprawia etap 3.
- Ryzyko z planu: V8 ma szybką ścieżkę `JSON.stringify` dla stringów
  jednobajtowych (base64 taki jest), więc zysk może być mniejszy niż w
  diagnozie. Zmiana i tak jest tania i bez wpływu na treść maila.

### Punkt kontrolny 2 - kompresja i limity zdjęć na froncie

Zmiana: 1600 px, JPEG 0,82 -> w razie potrzeby 0,7, cel 600 KB, plik ponad
10 MB odrzucany przed dekodowaniem, karty „nie dodano", dopisek na ekranie
sukcesu. Limit workera nadal 4 MiB (zmienia go etap 3).

Sprawdzone przez model w Chrome (desktop i widok 375 px), na plikach
syntetycznych i zdjęciu kostki z serwisu:

- JPEG 4000×3000 (4,6 MB, z EXIF) -> JPEG 1600×1200, 353 KB, bez EXIF;
- kostka brukowa 1154×2560 -> 721×1600, 318 KB (przy 0,82);
- PNG 1600×1200 z drobnym detalem -> 762 KB przy 0,82 -> 521 KB przy 0,7 (drugie kodowanie działa);
- czysty szum -> 983 KB nawet przy 0,7 -> karta „nie dodano" (`photo_failed`);
- plik 11-12 MB -> karta od razu, bez "Przetwarzanie...";
- udawany HEIC w Chrome -> karta „nie dodano"; uszkodzony JPEG 100 KB -> wysłany oryginał, 700 KB -> karta;
- podsumowanie "1 zdjęcie · 2 nie dodano", wysyłka (z atrapą `fetch`, nic nie wyszło) -> w zgłoszeniu tylko `zdjecie-1.jpg`, ekran sukcesu z dopiskiem i klikalnym `mailto:`;
- 375 px: karty i komunikaty mieszczą się, brak przewijania w poziomie.

Do sprawdzenia przez Ciebie (`npm run dev` w `astro/`, strona `/wycena/`,
oraz strona testowa workera `npm run dev:page` w `forms-worker/`):

- [ ] **Zdjęcia z własnego telefonu** (12 MP, JPEG): na karcie waga ≤ 600 KB;
      w DevTools -> Network przy wysyłce (albo na stronie testowej) widać
      1600 px na dłuższym boku.
- [ ] **HEIC z iPhone'a**: w Safari na iPhonie ma przejść (Safari dekoduje
      HEIC -> wychodzi JPEG); w Chrome na komputerze -> karta „nie dodano",
      formularz da się wysłać, podsumowanie i ekran sukcesu to pokazują.
- [ ] **Zdjęcie o dużej szczegółowości** z prawdziwego aparatu (żwir,
      kostka, siatka ogrodzeniowa) -> przechodzi (przy 0,82 albo 0,7).
- [ ] **Zdjęcie ponad 10 MB** (np. 50 MP) -> komunikat od razu, bez
      "Przetwarzanie...".
- [ ] **Średni telefon z Androidem + zdjęcie 50 MP poniżej 10 MB** (ryzyko
      z planu: HEIC 48-50 MP waży 5-8 MB, a dekoduje się do ~200 MB pamięci)
      -> czy karta się nie zawiesza i czy strona nie przeładowuje się sama.
- [ ] **Wycena z niedodanym zdjęciem do końca**: podsumowanie "N zdjęć · M
      nie dodano", po wysyłce dopisek pod "Nic nie musisz robić" z adresem.
      ⚠️ Lokalny `npm run dev` wysyła na `https://api.brambruk.pl` - do
      prawdziwej próby użyj workera lokalnego (zmienna builda
      `ADRES_API_FORMULARZY`, opis w `src/config/site.ts`) albo strony
      testowej workera.

### Punkt kontrolny 3 - twarde limity workera (1 MiB na plik, 3 MiB na żądanie)

Zmiana: `maxFileSize` 1 MiB i `MAX_REQUEST_BYTES` 3 MiB w
`forms-worker/src/forms.ts`, kopia `ZDJECIA.maksWorkera` we froncie
(komunikat `file_too_large` pokazuje teraz "1 MB"). Testy: dokładnie 1 MiB
przechodzi, 1 MiB + 1 B -> `file_too_large`, żądanie ponad 3 MiB -> 413
JSON z nagłówkami CORS.

- [ ] **Seria (a)(b)(c) na workerze pomiarowym**, commit etapu 3. Pliki do
      (b) i (c): `npm run measure:files` w `forms-worker/` (trafiają do
      `dev/out/`), na stronie testowej zaznaczone "wyślij bez kompresji".
      Warianty i oczekiwane odpowiedzi: README workera, "Pomiar CPU", krok 4.
  - (a) 2 zdjęcia z telefonu z kompresją: maksimum z 5 prób ≤ ~6-7 ms,
  - (b) `pomiar-b-1.jpg` + `pomiar-b-2.jpg`: < 10 ms,
  - (c1) `pomiar-c1.jpg`: `400` z `photos: file_too_large`; (c2)
    `pomiar-c2-1.jpg` + `pomiar-c2-2.jpg`: `413 payload_too_large` - w obu
    JSON na stronie testowej, nie błąd sieci.
- [ ] **Usuń workera pomiarowego** po ostatniej serii:
      `npx wrangler delete --config wrangler.pomiar.jsonc`.
- Jeśli (b) nie mieści się w 10 ms: cięcia na froncie nie pomogą (wariant
  omija front). Zostaje niższy `maxFileSize` (+ `ZDJECIA.maksWorkera`)
  albo Workers Paid (5 USD/mies.) - decyzja kosztowa klienta. README
  workera, "Jeśli (b) się nie mieści".
