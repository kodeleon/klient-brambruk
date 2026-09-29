# BramBruk - instrukcja dla Claude Code

Pracujesz WYŁĄCZNIE w tym katalogu. Nie masz dostępu do dokumentacji agencji
ani do historii rozmów o projekcie - cały kontekst, jaki masz, jest w tym pliku
i w plikach repozytorium. Jeśli czegoś tu nie ma, przeczytaj kod i komentarze
w nim; są pisane po to, żeby odpowiadały na pytanie „dlaczego tak".

**`README.md` w tym katalogu jest dokumentacją nadrzędną** - komendy, struktura
katalogów, potok zdjęć, reguły SEO, antywzorce. Ten plik jej nie powtarza,
tylko wskazuje. Przy czymkolwiek nieoczywistym: najpierw spis treści `README.md`,
potem kod.

---

## 1. Kontekst

- **BramBruk** (brambruk.pl) - firma ogrodzeniowo-brukarsko-budowlana spod
  Białej Podlaskiej. Klient agencji Kodeleon, właściciel: Marek.
- Serwis został **zmigrowany z WordPressa + React** na statyczne Astro
  hostowane na Cloudflare Workers (static assets). Migracja odtwarzała stary
  wygląd 1:1 - stąd wiele komentarzy w kodzie tłumaczących, dlaczego coś jest
  brzydsze, niż byłoby od zera.
- **Stan: wdrożone, przed przekazaniem klientowi do testów.** Zadania, które
  dostajesz, to poprawki przedodbiorowe: usterki znalezione na prawdziwym
  telefonie i na produkcji, nie nowe funkcje.
- Formularze obsługuje osobny worker (`forms-worker/`, osobne wdrożenie).
  Nie ruszasz go, jeśli zadanie tego wprost nie wymaga.
- Nazwa „Codove" jest przestarzała (agencja nazywa się teraz **Kodeleon**).
  Nie używaj jej nigdzie.

---

## 2. Stack i twarde ograniczenia architektury

| Warstwa | Co jest | Czego NIE MA |
|---|---|---|
| Framework | Astro 7, `output: 'static'`, `trailingSlash: 'always'` | adapterów SSR, wysp React/Vue, żadnego frameworku UI |
| Style | Tailwind 4 przez `@tailwindcss/vite`, utility-first | paleta domyślna Tailwinda jest **wyłączona** (`--color-*: initial`) |
| Skrypty | zwykłe moduły TS w `src/scripts/`, rejestrowane w `src/scripts/main.ts` | bundlerowych sztuczek, zależności runtime (`dependencies` to sam `astro`) |
| Zdjęcia | własny potok z manifestem (`media/images.config.mjs`) | `astro:assets`, `<img src>` wpisywanego ręcznie |

Pięć reguł, których złamanie wywala audyt przedwdrożeniowy - trzymaj się ich
bez pytania:

1. **Strona musi czytać się bez JavaScriptu.** Każdy element jest w źródle HTML
   i domyślnie WIDOCZNY. Skrypt może coś schować i odsłonić - nigdy odwrotnie
   (patrz `src/scripts/ruch.ts`). Stan interfejsu, który da się utrzymać
   natywnym `<input type=checkbox/radio>`, `<details>` albo `<dialog>`, trzyma
   się tak, a nie w JavaScripcie: to dotyczy menu mobilnego, filtrów na
   `/realizacje/`, FAQ i powiększenia zdjęć.
2. **Zero stylów i skryptów inline.** CSP nie ma `'unsafe-inline'`
   (`astro.config.ts`, `security.csp`). Atrybut `style="..."` w znaczniku
   **nie przejdzie**; wartość wyliczaną w przeglądarce ustawiasz przez
   `el.style.setProperty('--zmienna', ...)` (CSSOM nie jest blokowany przez CSP).
   Jeśli coś nie działa przez CSP, przyczyną jest kod, nie polityka.
3. **Wartości wyglądu tylko z `src/styles/tokens.css`.** Kolor, cień, rozmycie,
   krzywa czasowa wpisane wprost w komponencie to drugie źródło prawdy. Brakuje
   tokenu - dodaj go tam, nie obchodź systemu lokalnie.
4. **Ukrywanie elementów: tylko `[hidden]`, `.poza-ekranem`, `inert` albo
   `visibility: hidden`.** Samo `opacity: 0`, `pointer-events: none` czy
   `max-height: 0` zostawia element w kolejności Tab - to pułapka dla
   klawiatury i bloker, nie drobiazg. Przy panelu z przejściem `visibility`
   musi być objęta `transition` na tym samym elemencie (`transition-all` ją
   obejmuje).
5. **`prefers-reduced-motion` obsłużone w CSS **i** w JavaScripcie.**
   Skrócenie czasu przejścia to nadal ruch; w JS efekt po prostu nie startuje.

Dalsze pozycje: `README.md` → „Co jest obowiązkowe, a czego wolno nie użyć"
oraz „Antywzorce" (18 pozycji, każda z uzasadnieniem).

---

## 3. Konwencje kodu

- **Nazwy po polsku.** Komponenty (`Naglowek.astro`, `SekcjaCennika.astro`),
  właściwości (`zwloka`, `wariant`, `pozycje`), klasy CSS (`.naglowek__panel`,
  `.wskaznik-kolko`), atrybuty danych (`data-galeria-kafelek`, `data-rv`),
  funkcje i zmienne w TS (`przelicz`, `kafelki`, `wKlatce`). Cały kod jest
  w tej konwencji - nie wprowadzaj angielskich nazw „bo czyściej".
- **Nazwy klas BEM-owe tylko tam, gdzie klasa istnieje w CSS.** Wygląd siedzi
  w klasach narzędziowych w znaczniku; do `src/styles/components/` trafia
  wyłącznie to, czego klasą narzędziową zrobić się nie da: stany natywnych
  elementów, selektory `:has()`, reguły dla węzłów wstawianych przez skrypt.
- **Komentarze po polsku, wyjaśniają „dlaczego", nie „co"** — 
  **stosowane tylko dla kluczowych funkcjonalności.** Jeśli zmieniasz
  fragment, którego komentarz przestaje być prawdą - popraw komentarz w tym
  samym commicie. Nieaktualny komentarz jest gorszy niż brak komentarza.
- Treść tekstowa stron nie mieszka w komponentach, tylko w `src/content/*.json`
  (kolekcje Astro, schematy w `src/content.config.ts`). Zmiana napisu na
  stronie to zmiana w JSON-ie, nie w `.astro`.

---

## 4. Gdzie co jest

```
src/pages/          jedna podstrona = jeden plik; huby i usługi składają szablony
src/layouts/        Podstrona.astro - JEDYNE miejsce, w którym powstaje <head>
src/components/
  layout/           Naglowek, Stopka, Analityka
  szablony/         SzablonHubu, SzablonUslugi, SekcjaCennika, SekcjaDlaczegoMy
  ui/               komponenty wielokrotnego użytku (Odslon, Galeria*, Przycisk...)
  media/            Foto, Obraz, Logo, OgImage, Preload - jedyne wejście do zdjęć
  icons/            Ikona.astro + ikony.ts (ścieżki SVG)
src/scripts/        moduły zachowań; main.ts rejestruje je i izoluje w try
src/styles/         global.css (same importy) → fonts, tokens, base, components/
src/content/        treść stron i danych (JSON + kolekcje)
src/config/         site.ts (adres, moduły, CSP), routes.ts (trasy)
src/lib/            logika danych (cennik, kwoty, odmiana, znaczniki)
media/              manifest zdjęć + źródła; potok generuje public/assets/img
tools/              potok zdjęć, build (sitemap, headers), audyt, kadrowanie
forms-worker/       osobne wdrożenie, nie część builda serwisu
maps/               statyczne mapy z OSM: silnik renderu (Python), projekty map;
                    własne README.md i CLAUDE.md - czytaj je przed pracą w maps/
```

Szczegóły i zasada „kiedy coś jest komponentem, a kiedy zostaje w podstronie":
`README.md` → „Gdzie ląduje jaki plik".

---

## 5. Zdjęcia - jedyna dozwolona droga

`<Foto klucz="realizacja.01" alt="..." />` albo `<Obraz use="..." />`.
Komponenty nie przyjmują ścieżki do pliku i nie mają jej nigdy przyjąć.
Klucz pochodzi z `uses` w `media/images.config.mjs`; stamtąd bierze się komplet
`<picture>`, `srcset`, `sizes`, `width`, `height`, `loading`, `fetchpriority`.

Trzy poziomy manifestu: `sources` (jaka fotografia) → `crops` (jaki wycinek
i w jakich szerokościach, JEDNOSTKA GENEROWANIA) → `uses` (gdzie w układzie,
czyli `sizes`). Nieznany klucz **przerywa build** - celowo.

`sizes` opisuje UKŁAD, nie plik. `sizes="100vw"` na kafelku szerokim na 380 px
to błąd, nie optymalizacja: każe przeglądarce pobrać plik kilka razy za duży.
Zmieniasz szerokość elementu w układzie - zmieniasz `sizes` w manifeście.

---

## 6. Komendy

Pełna lista z argumentami: `README.md` → „Komendy". Minimum, którego używasz:

| Komenda | Kiedy |
|---|---|
| `npm ci` | instalacja zależności (nie `npm install`) |
| `npm run dev` | serwer deweloperski, `http://localhost:4321` |
| `npm run check` | kontrola typów. **Musi wyjść 0 błędów i 0 ostrzeżeń** |
| `npm run build` | build produkcyjny; poprzedzony pełnym potokiem zdjęć |
| `npm run preview` | podgląd wierny hostingowi (po `npm run build`) |
| `npm run images:check` | audyt materiałów zdjęciowych, nic nie tworzy |
| `npm run images` | pełne kodowanie wariantów zdjęć (to samo robi `prebuild`) |
| `npm run no-js` | czy strony czytają się bez JavaScriptu - po każdej zmianie w `src/scripts/` |
| `npm run audit -- --only=/sciezka/` | Lighthouse + axe na jednej podstronie |

Argumenty idą po `--`. Audyt nigdy nie przerywa procesu - bramką jest człowiek,
który przeczyta raport z `reports/`.

---

## 7. Sposób pracy

1. **Plan przed kodem.** Zadanie na więcej niż jeden plik: rozbij na grupy,
   ułóż je tak, żeby późniejsza poprawka nie cofała wcześniejszej, zapisz plan
   w pliku `TODO-*.md` w tym katalogu i pracuj z niego, odhaczając `[x]` na
   bieżąco. Po skończeniu usuń plik albo przenieś go do `../_to_delete/`.
2. **Weryfikacja proporcjonalna do ryzyka.** Po zmianie w `src/scripts/` -
   `npm run check` i `npm run no-js`. Po zmianie w CSS albo znaczniku -
   `npm run check` i oglądasz wynik w `npm run dev`. Po zmianie w manifeście
   zdjęć - `npm run images:check`, potem `npm run images`. Nie odpalasz całej
   maszynerii po poprawce komentarza.
3. **Dostarczaj coś do klikania.** Po każdej zamkniętej grupie zadań serwis
   ma się budować i dawać się obejrzeć - Marek ocenia kierunek na działającej
   stronie, nie na diffie.
4. **Nie commitujesz bez polecenia. Nie wdrażasz** (`npx wrangler deploy`
   robi Marek).
5. **Nie zgaduj brakujących danych.** Brakuje treści, kwoty, adresu, decyzji
   o wyglądzie - pytasz. Rzeczy, których nie możesz sprawdzić sam (wygląd na
   konkretnym telefonie, prawdziwa wysyłka maila, pomiar na produkcji) nie
   blokują pracy: robisz swoje i zbierasz je w liście „Do sprawdzenia przez
   Marka" w podsumowaniu.
6. **Gdy polecenie wydaje Ci się sprzeczne z dobrą praktyką - zrób zgodnie
   z dobrą praktyką i powiedz to wprost w podsumowaniu.** Nie po cichu i nie
   „zrobione zgodnie z prośbą", jeśli zrobiłeś inaczej.
7. **Nie dokładaj elementu obok istniejącego generatora.** Brakuje czegoś
   w zbudowanym pliku - znajdź, co to generuje i dlaczego warunek nie został
   spełniony. Wpisanie znacznika na sztywno tworzy drugie źródło prawdy i jest
   gorsze niż brak poprawki.
8. Zakres zadania jest zakresem zadania. Widzisz przy okazji inną usterkę -
   wypisz ją w podsumowaniu, nie naprawiaj bez pytania.
