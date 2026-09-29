# Baza projektowa Kodeleon

Repozytorium startowe każdego projektu klienckiego. Wchodzi do gry po
zatwierdzeniu prototypu na Checkpoincie 2 - cały kod produkcyjny powstaje
już w nim.

**Ten plik jest dokumentacją dla modelu, który będzie tu budował.** Jeśli
w którymkolwiek miejscu musisz zgadywać, gdzie coś położyć, to jest błąd tego
pliku, nie Twój - zgłoś to zamiast wymyślać własną konwencję.

---

## Spis

1. [Komendy](#komendy)
2. [Nowy projekt z tej bazy](#nowy-projekt-z-tej-bazy)
3. [Stack i dlaczego taki](#stack-i-dlaczego-taki)
4. [Gdzie ląduje jaki plik](#gdzie-ląduje-jaki-plik)
5. [Kiedy coś jest komponentem, a kiedy zostaje w podstronie](#kiedy-coś-jest-komponentem-a-kiedy-zostaje-w-podstronie)
6. [Przenoszenie treści przy zejściu do jednej kolumny](#przenoszenie-treści-przy-zejściu-do-jednej-kolumny)
7. [Od zatwierdzonego projektu do pierwszej podstrony](#od-zatwierdzonego-projektu-do-pierwszej-podstrony)
8. [Dane powtarzalne](#dane-powtarzalne)
9. [Jak dodać podstronę](#jak-dodać-podstronę)
10. [SEO: gdzie i co się stanie, jeśli zapomnisz](#seo-gdzie-i-co-się-stanie-jeśli-zapomnisz)
11. [Zdjęcia](#zdjęcia)
12. [Moduły](#moduły)
13. [Sekrety i zmienne środowiskowe](#sekrety-i-zmienne-środowiskowe)
14. [Migracja istniejącego projektu React](#migracja-istniejącego-projektu-react) - audyt przedmigracyjny i dopiero potem migracja
15. [Co jest obowiązkowe, a czego wolno nie użyć](#co-jest-obowiązkowe-a-czego-wolno-nie-użyć)
16. [Antywzorce](#antywzorce)
17. [Wdrożenie](#wdrożenie)

---

## Komendy

Pełna lista, z wariantami i argumentami. Dalsze sekcje cytują już tylko gołe
komendy - opis jest tutaj i tylko tutaj.

**Argumenty idą po `--`.** npm musi wiedzieć, że nie są dla niego:
`npm run audit -- --only=/kontakt/`. Bez `--` argument zostaje u npm i nie
dojdzie do skryptu.

### Praca bieżąca

| Komenda | Co robi |
|---|---|
| `npm ci` | instalacja zależności dokładnie według `package-lock.json`. Nie `npm install`: `ci` jest odtwarzalne i nie rusza pliku lock |
| `npm run dev` | serwer deweloperski na `http://localhost:4321`. Automatycznie poprzedzony `predev`, czyli potokiem zdjęć w profilu szybkim |
| `npm run build` | build produkcyjny do `dist/`. Automatycznie poprzedzony `prebuild` (potok zdjęć, profil pełny), a po zbudowaniu generuje `sitemap.xml`, `robots.txt`, `_headers` i `.build-state/strony.json` |
| `npm run check` | kontrola typów w `.astro` i `.ts`. Przed commitem ma wyjść **0 błędów i 0 ostrzeżeń** |
| `npm run preview` | podgląd wierny hostingowi na `http://localhost:4321`: stosuje `dist/_headers`, oddaje `dist/404.html` ze statusem 404, przekierowuje adres bez ukośnika. Wymaga wcześniejszego `npm run build` |
| `npm run preview -- --port=5000` | to samo na innym porcie |
| `npm run preview:astro` | `astro preview`, czyli podgląd bez emulacji hostingu. Tylko wtedy, gdy potrzebujesz porównać zachowanie |

### Kroje pisma

| Komenda | Co robi |
|---|---|
| `npm run fonts` | czyta `tools/fonts/fonts.config.mjs` i robi trzy rzeczy naraz: kopiuje pliki `woff2` do `public/fonts/` z numerem wersji w nazwie, przepisuje obok licencję, liczy metryki kroju zastępczego i zapisuje `src/styles/fonts.css`. Uruchamiasz przy zakładaniu projektu i po każdej zmianie kroju |

Podmiana kroju bez zmiany pola `wersja` w konfiguracji zostawia część
odwiedzających ze starym plikiem na rok - `_headers` daje `/fonts/*` regułę
`immutable`. Zmiana kroju to zawsze zmiana `wersja`.

### Zdjęcia

Potok ma trzy etapy i każdy ma własną komendę. Kolejność jest wymuszona:
kadrowanie potrzebuje znormalizowanych źródeł, warianty potrzebują kadrów.

| Komenda | Co robi |
|---|---|
| `npm run images:check` | sam audyt materiałów: czego brakuje, co jest za małe wobec największego wariantu, co jest opisane w konfiguracji, a nie istnieje. **Nic nie tworzy.** Kod wyjścia 1, gdy brakuje źródła kadru, który jest jedynym źródłem `<img>` w układzie |
| `npm run images:source` | normalizacja `media/img/_raw/` → `media/img/source/`: orientacja z EXIF, przestrzeń barw, sufit rozmiaru policzony z największego użycia. `_raw/` jest wyłącznie czytane |
| `npm run images:source:plan` | sam plan rozmiarów źródeł, z uzasadnieniem każdej liczby. Nic nie zapisuje |
| `npm run images:crop` | kadrowanie w przeglądarce na `http://localhost:5178`. Kolejka: kadry bez wpisu w `media/crops.json` plus te oznaczone do weryfikacji. Serwer stoi na `127.0.0.1` i nie wychodzi na zewnątrz |
| `npm run images:crop:all` | to samo, ale kolejka obejmuje także kadry już zapisane. Do poprawiania wcześniejszych decyzji |
| `npm run images` | pełne kodowanie wariantów: profil `full`, z AVIF. To samo robi `prebuild`, więc przed wydaniem nie musisz uruchamiać ręcznie |
| `npm run images:fast` | profil `fast`: bez AVIF, kilka razy szybciej. To samo robi `predev` |
| `npm run images:force` | ignoruje cache i przelicza wszystko od zera. Po zmianie presetu albo profilu w `media/images.config.mjs` |

Argumenty, które przyjmuje każdy z etapów (dopisujesz je po `--`):

| Argument | Działa w | Znaczenie |
|---|---|---|
| `--only=klucz` | `images`, `images:source` | tylko ten jeden klucz z konfiguracji. Do szybkiej iteracji nad jednym zdjęciem |
| `--verbose` | `images`, `images:source` | wypisuje każdy plik, nie samo podsumowanie |
| `--force` | `images`, `images:source` | ignoruje cache |
| `--profile=fast\|full` | `images` | profil kodowania. Domyślnie `full` |
| `--port=NNNN` | `images:crop` | port narzędzia do kadrowania. Domyślnie 5178 |

### Sprawdzenia

| Komenda | Co robi |
|---|---|
| `npm run audit` | Lighthouse 13 plus axe-core, telefon i komputer, każda podstrona. Wynik: `reports/<data>/index.html`. Wymaga wcześniejszego `npm run build`, bo listę adresów bierze z wyniku builda. Podgląd uruchamia sam, w tym samym procesie |
| `npm run audit -- --url=https://adres/` | to samo na wdrożonej wersji zamiast na podglądzie lokalnym. Po wdrożeniu **obowiązkowe**: emulacja nie zastąpi prawdziwych nagłówków hostingu |
| `npm run audit -- --only=/kontakt/` | jedna podstrona zamiast wszystkich. Do iteracji nad konkretną poprawką |
| `npm run audit -- --no-shots` | bez zrzutów elementów, które zawiodły. Szybciej o jakieś 200 ms na element |
| `npm run audit -- --auth=user:haslo` | środowisko za Basic Auth |
| `npm run no-js` | czy każda podstrona czyta się przy wyłączonym silniku JavaScriptu. Liczba, która musi wyjść zero, to „elementy z treścią niewidoczne przez `opacity`". Uruchamiasz przed Checkpointem 3 i po każdej zmianie w `src/scripts/` |
| `npm run no-js -- --url=https://adres/` | to samo na wdrożonej wersji |

Audyt **nigdy nie przerywa procesu**. Kończy się powodzeniem także przy
znalezionych naruszeniach - wynik jest materiałem wejściowym do audytu
przedwdrożeniowego, a nie bramką. Bramką jest człowiek, który to przeczyta.

Chrome do audytu bierze się z systemu. Jeśli nie zostanie znaleziony, wskaż
plik zmienną środowiskową `CHROME_PATH`.

### Wydanie

| Komenda | Co robi |
|---|---|
| `npm run manifest` | hasze SHA-256 wszystkich plików w `dist/` → `manifest-lokalny.txt` |
| `npm run manifest -- --out=nazwa.txt` | to samo pod wskazaną nazwą |
| `npm run manifest:compare -- a.txt b.txt` | porównanie dwóch manifestów: lista rozbieżnych plików. Nie ocenia, czy różnica jest istotna - to robi człowiek |
| `npx wrangler deploy` | wdrożenie na Cloudflare według `wrangler.jsonc`. Wrangler celowo nie jest zależnością projektu |

Sposób użycia manifestu przy wydaniu, w trzech krokach:

```bash
npm ci && npm run build && npm run manifest -- --out=manifest-lokalny.txt
# świeży klon repozytorium w innym katalogu, to samo, --out=manifest-klon.txt
npm run manifest:compare -- manifest-lokalny.txt manifest-klon.txt
```

Odpowiada na jedno pytanie: czy build ze świeżego klonu daje te same pliki
wyjściowe, co build u Ciebie. Klient dostaje repozytorium i ma zbudować
dokładnie tę stronę, którą ma wdrożoną.

### Raport z audytu

`npm run audit` zostawia w `reports/<data>/` trzy rzeczy:

| Plik | Dla kogo |
|---|---|
| `index.html` | **dla Ciebie.** Jeden dokument spinający wszystkie pomiary: tabela z przełącznikiem telefon/komputer, odnośnik do pełnego raportu Lighthouse przy każdym wierszu, naruszenia axe ze **zrzutami elementów**, które zawiodły, konsola, żądania i lista do przejścia ręcznie |
| `RAPORT.md` | **dla modelu.** Ta sama treść w markdownie, do wklejenia w rozmowę |
| `*-mobile.html`, `*-desktop.html` | oryginalne raporty Lighthouse per pomiar |

**Zrzuty elementów** to główna różnica wobec surowego wyniku axe. Element, który
zawiódł, dostaje na czas zrzutu czerwoną obwódkę, a raport pokazuje wycinek
strony razem z kontekstem. Przy regule kontrastu dochodzą policzone przez axe
kolory i wartość - a jeśli axe **nie potrafił** kontrastu policzyć (gradient,
zdjęcie, półprzezroczyste tło), raport mówi wprost dlaczego i jaki jest wymagany
próg, zamiast pokazywać mylące „0:1".

Zrzuty kosztują ok. 200 ms na element i mają limit trzech węzłów na regułę na
podstronę - naprawiając regułę i tak naprawiasz wszystkie jej wystąpienia naraz.
`--no-shots` je wyłącza.

⚠️ **Duża liczba wystąpień przy `color-contrast` w sekcji „do rozstrzygnięcia"
jest normalna** i nie znaczy, że coś jest zepsute. Gradient na tle strony albo
półprzezroczysty nagłówek sprawiają, że axe nie potrafi ustalić koloru tła dla
żadnego tekstu i zgłasza wszystkie naraz. Nie przeglądaj ich po kolei - policz
kontrast raz, dla każdej pary token-tekstu i token-tła, i zapisz wynik w tabeli
w `tokens.css`.

### Podgląd lokalny udaje hosting

`npm run preview` NIE uruchamia `astro preview`, tylko własny serwer
(`tools/audit/server.mjs`). Powód: `astro preview` serwuje pliki, ale nie udaje
Cloudflare, a trzy rzeczy zachowują się u niego inaczej i wszystkie trzy są
punktami checklisty:

| | `astro preview` | `npm run preview` | Cloudflare |
|---|---|---|---|
| Nieistniejący adres | własny komunikat Astro | `dist/404.html` ze statusem 404 | to samo |
| `dist/_headers` | ignorowane | stosowane | to samo |
| Adres bez ukośnika | błąd | przekierowanie 308 | to samo |

Dzięki temu audyt widzi realne nagłówki odpowiedzi już lokalnie, a nie dopiero
po wdrożeniu. **To nadal emulacja:** punkty 🔴 z checklisty trzeba powtórzyć
na wdrożonej wersji, bo hosting potrafi dołożyć własne nagłówki i podmienić
`robots.txt`.

### Strona 404: `dev` zachowuje się inaczej niż produkcja

To jest zamierzone i nie wymaga naprawy.

| Adres | `npm run dev` | `npm run preview` | Cloudflare |
|---|---|---|---|
| `/nie-ma/` | nasza strona 404 | nasza strona 404 | nasza strona 404 |
| `/nie-ma` (bez ukośnika) | podpowiedź Astro o `trailingSlash` | przekierowanie 308 na wersję z ukośnikiem | to samo |

Podpowiedź Astro pojawia się **wyłącznie** w trybie deweloperskim i **wyłącznie**
dla adresu bez ukośnika na końcu. Jest po to, żeby od razu powiedzieć, że
adres różni się od trasy tylko ukośnikiem - w produkcji ten przypadek załatwia
przekierowanie. Strony 404 sprawdzaj na `npm run preview`, nie na `dev`.

---

## Nowy projekt z tej bazy

Wymagany **Node 22.22 lub nowszy**. Niżej nie zadziała import konfiguracji
TypeScript ze skryptów narzędziowych.

### Skąd bierzesz kopię

Repozytorium bazowe jest **repozytorium szablonowym** GitHuba. Nowy projekt
zakładasz przyciskiem **„Use this template" → „Create a new repository"**,
nie klonem i nie forkiem.

Powód jest jeden i jest twardy: szablon daje **czystą historię**. Projekt
klienta zaczyna się od jednego commita „start projektu", a nie od stu commitów
z budowy bazy, w których klient przy pierwszym `git log` czyta o cudzych
problemach z audytem. Fork dodatkowo zostaje na stałe powiązany z oryginałem
w interfejsie GitHuba i domyślnie celuje pull requestami w repozytorium
bazowe - przy repozytorium, które **oddajesz klientowi**, to jest wada,
nie zaleta.

Bez dostępu do GitHuba, ten sam efekt lokalnie:

```bash
npx giget@latest gh:UZYTKOWNIK/kodeleon-baza nazwa-projektu
cd nazwa-projektu && git init && git add . && git commit -m "start projektu"
```

`giget` pobiera stan gałęzi bez katalogu `.git`, więc historia startuje od zera.
Zwykły `git clone` też zadziała, ale wtedy **trzeba** usunąć `.git` i zainicjować
repozytorium od nowa - inaczej projekt klienta ma w historii całą bazę i zdalne
repozytorium ustawione na bazę.

### Czego baza NIE przenosi

Poprawka w bazie nie dojdzie sama do projektu założonego wcześniej. To jest
świadomy koszt: projekt klienta ma być zamrożony w stanie, w którym przeszedł
audyt, a nie zmieniać się pod spodem. Poprawki ważne dla trwających projektów
przenosisz ręcznie, plik po pliku, i notujesz to w projekcie.

### Kolejność zakładania - ma znaczenie

Każdy krok zamyka decyzje, na których stoi następny.

1. `src/config/site.ts` - `origin` docelowy (nie testowy), nazwa, przełączniki
   modułów wynikające z pakietu,
2. `src/config/dane.ts` - dane firmy; czego nie wiesz, zostaw jako PLACEHOLDER,
   ale zostaw świadomie: audyt sprawdza, czy placeholdery są oznaczone,
3. `src/styles/tokens.css` - system wizualny z etapu B.4,
4. `tools/fonts/fonts.config.mjs`, potem `npm run fonts` - kroje projektu,
5. `wrangler.jsonc` - `name` na unikalny; dwa projekty o tej samej nazwie
   nadpiszą się na Cloudflare.

Szczegółowa ścieżka od zatwierdzonego projektu graficznego do pierwszej
podstrony jest niżej, w osobnej sekcji.

### Co skasować przed wydaniem

Baza zawiera **wzory do podmiany**. Nie są to pozostałości po testach ani
projekt demonstracyjny - są w repozytorium celowo, bo model budujący nową
podstronę potrzebuje wzoru, a nie opisu wzoru. Ale w wydaniu ich nie ma:

| Co | Dlaczego jest | Co z tym zrobić |
|---|---|---|
| `src/pages/przyklad-podstrony.astro` | wzór podstrony: układ, komponenty, sekcje, komentarze z uzasadnieniem | skopiować pod nazwą prawdziwej podstrony, oryginał skasować |
| wartości w `src/styles/tokens.css` | działający, policzony pod kątem kontrastu przykład systemu wizualnego | podmienić na system z etapu B.4, strukturę zostawić |
| przykładowe wpisy w `src/config/dane.ts` | pokazują format każdego pola | podmienić na dane klienta |
| `src/pages/_artykuly/` | wzór podstron modułu artykułów, nieaktywny (podkreślenie wyłącza katalog z routingu) | zostawić albo skasować razem z modułem |
| `src/content/artykuly/przyklad-artykulu.md` | wzór wpisu kolekcji; ma `szkic: true`, więc nie trafia do builda | podmienić na prawdziwy artykuł albo skasować |
| `forms-worker/` | backend formularza kontaktowego, osobne wdrożenie | skasować, jeśli projekt nie ma formularza |

`npm run audit` nie wyłapie zapomnianego wzoru - dla niego to poprawna
podstrona. Wyłapie go **audyt przedwdrożeniowy**, punkt o treściach
zastępczych.

### Oryginały zdjęć

`media/img/_raw/` jest w `.gitignore` i **nie trafia do repozytorium** - plik
raz wrzucony do Gita zostaje w historii na zawsze, a oryginały z aparatu ważą
dziesiątki megabajtów sztuka.

To znaczy, że **klon repozytorium nie odtworzy zdjęć od zera**. Odtworzy
warianty ze znormalizowanych źródeł w `media/img/source/`, które są
w repozytorium, i to wystarcza do zbudowania strony. Ale zmiana kadru albo
dołożenie większego wariantu wymaga oryginału.

**Oryginały trzymasz poza repozytorium, w miejscu z kopią zapasową**, i notujesz
gdzie, w karcie projektu. Bez tego pierwsza prośba klienta o inny kadr kończy
się proszeniem go o ponowne przysłanie zdjęć.

---

## Stack i dlaczego taki

| Warstwa | Wybór |
|---|---|
| Generator | Astro 7 |
| Interaktywność | waniliowy TypeScript w `src/scripts/`; framework tylko jako świadomie dołożona wyspa |
| Bundler | Vite 8 (przez Astro) |
| Style | Tailwind CSS 4 |
| Typowanie | TypeScript 6 |
| Hosting | Cloudflare Workers ze statycznymi zasobami |

### ⚠️ Odejście od stacku rdzeniowego - uzasadnienie

`PRODUKCJA-narzedzia-i-stack.md` wskazuje React + Vite jako stack rdzeniowy
i wymaga jawnego uzasadnienia dla odejścia. Astro jest takim odejściem i oto ono.

Rozważano React Router 8 w trybie frameworka (`ssr: false` + `prerender`).
Sprawdzone na działającym buildzie, nie na dokumentacji:

- **CSP.** Framework wstawia pięć skryptów inline na każdą prerenderowaną
  podstronę, z czego dwa mają treść zależną od podstrony. Przy `script-src 'self'`
  bez `'unsafe-inline'` przeglądarka blokuje wszystkie pięć. Domknięcie tego
  wymaga generowanego per ścieżka `_headers` z hashami przeliczanymi co build
  albo Workera wstrzykującego nonce - czyli runtime dokładanego do statycznego
  hostingu. Checklista przedwdrożeniowa traktuje `unsafe-inline` w `script-src`
  jako punkt blokujący.
- **Waga.** Każda podstrona, łącznie z polityką prywatności, ciągnie ~111 kB
  gzip JavaScriptu, zanim napiszesz pierwszą linię kodu projektu.

Astro na tej samej parze podstron: **0 B JavaScriptu**, a polityka CSP z hashami
powstaje sama i jest wspólna dla całego serwisu.

**Baza nie ma Reacta w zależnościach.** To jest zmiana wobec pierwszej wersji
tego pliku i ma jeden powód: integracja React emitowała do `dist/static/` swój
moduł kliencki (~220 kB) także w projekcie bez ani jednej wyspy. Repozytorium
startowe, które w domyślnym stanie wozi 220 kB martwego kodu i cztery
nieużywane pakiety, uczy złego nawyku od pierwszego commita.

**Koszt tej decyzji:** projekt, który naprawdę potrzebuje wyspy, dokłada
framework sam - jedna komenda, opisana niżej. Projekty aplikacyjne (startupy)
i tak stoją na React Routerze. To jest świadomy podział: wizytówki w Astro,
aplikacje w React Routerze.

### `.astro`, `src/scripts/` i wyspy - co jest czym

Są trzy miejsca, w których może żyć kod, i nie są wymienne. Kolejność w tabeli
to kolejność sięgania: wyspa jest ostatecznością, nie pierwszym odruchem.

| | `.astro` | `src/scripts/*.ts` | wyspa `.tsx` |
|---|---|---|---|
| Kiedy się wykonuje | **tylko przy buildzie** | w przeglądarce | w przeglądarce |
| Co zostaje po buildzie | HTML, zero JavaScriptu | HTML plus własny moduł | HTML plus moduł plus runtime frameworka |
| Koszt pierwszego użycia | 0 B | kilka kB | **~69 kB gzip** |
| Stan, zdarzenia | nie | tak, ręcznie | tak, deklaratywnie |
| Gdzie w projekcie | podstrony, układy, komponenty | moduł wpięty w `main.ts` | `src/components/islands/` |

**Domyślnie nie ma trzeciej kolumny.** Baza nie ma frameworka w zależnościach,
a `src/scripts/` obsługuje wszystko, co robi wizytówka: odsłanianie przy
przewijaniu, lightbox, walidacja i wysyłka formularza. Wyspę zakłada się dopiero
wtedy, gdy ręczne pilnowanie stanu przestaje się bronić - konfigurator z wieloma
krokami, koszyk, filtrowana galeria z wieloma kryteriami naraz.

**Składnia części szablonowej `.astro` to JSX** - te same nawiasy klamrowe,
`{lista.map(...)}`, `{warunek && <div>}`, `className`, `<KomponentZDużejLitery />`.
Różnica jest nad szablonem: między znacznikami `---` siedzi zwykły TypeScript,
który wykonuje się raz, przy buildzie, i ma dostęp do dysku, sieci i zmiennych
środowiskowych. To jest cała idea: kod, który i tak dałby ten sam wynik przy
każdym wejściu, wykonuje się raz u nas, a nie milion razy w przeglądarkach.

**Czy rozszerzenie jest konieczne:** tak, dla podstron i układów. Astro rozpoznaje
trasy po plikach `.astro`, `.md` i `.mdx` w `src/pages`. Podstrona napisana jako
`.tsx` wymagałaby wysłania React do przeglądarki tylko po to, żeby narysować
statyczny tekst - czyli dokładnie tego, czego ta baza unika.

**Ograniczenia `.astro`:** komponent `.astro` nie ma stanu, nie ma efektów
i nie reaguje na zdarzenia, bo w przeglądarce już nie istnieje. To nie jest
okrojony React, tylko inny etap. Zachowanie w przeglądarce dokłada moduł
w `src/scripts/` - do gotowego dokumentu, nigdy zamiast niego.

#### Jak dołożyć wyspę, gdy projekt naprawdę jej potrzebuje

```bash
npx astro add react     # dopisze zależności i wpis w astro.config.ts
```

Potem komponent w `src/components/islands/Nazwa.tsx`, w podstronie
`<Nazwa client:visible />`, i dane przekazane przez zwykłe właściwości.
Wewnątrz wyspy framework działa **bez żadnych ograniczeń**: hooki, kontekst,
biblioteki. Decyzję odnotuj w dokumentacji projektu - to odejście od domyślnego
stanu bazy i następna osoba ma wiedzieć, co je uzasadniło.

#### Biblioteki animacji, 3D i efektów - bez frameworka

Usunięcie Reacta **niczego tu nie zabiera.** Te biblioteki nigdy nie były
częścią Reacta; to React miał do nich osobne nakładki.

| Biblioteka | Jak jej użyć w tej bazie |
|---|---|
| `motion` | ma waniliowe API (`animate`, `scroll`, `inView`, `timeline`). Nakładka `motion/react` jest tylko opcją, nie warunkiem |
| GSAP + ScrollTrigger | czysty JavaScript od zawsze; `@gsap/react` to wyłącznie wygoda przy hookach |
| three.js | czysty JavaScript; `react-three-fiber` to nakładka, tutaj zbędna |
| Swiper, Embla, Lenis | każda ma rdzeń waniliowy, nakładki frameworkowe są opcjonalne |

Instalujesz per projekt (`npm i motion`), importujesz w module w `src/scripts/`,
wpinasz jedną pozycją w `main.ts`. Baza nie trzyma ich w zależnościach, bo
wizytówka zwykle ich nie potrzebuje - `ruch.ts` robi odsłanianie przy
przewijaniu na `IntersectionObserver` i CSS, za zero kilobajtów biblioteki.

⚠️ **Dwie rzeczy do sprawdzenia przy dokładaniu każdej z nich:**
budżet wagi z checklisty (biblioteka animacji potrafi ważyć więcej niż cała
reszta podstrony) oraz CSP - polityka nie ma `'unsafe-inline'` w `style-src`,
więc biblioteka wstrzykująca znacznik `<style>` albo atrybut `style` zostanie
zablokowana. Zapis przez `element.style.setProperty` jest bezpieczny i tak
działa `ruch.ts`. Sprawdzasz to `npm run build` plus konsolą na `npm run preview`,
nie założeniem.

**VS Code:** bez rozszerzenia `astro-build.astro-vscode` edytor pokazuje `.astro`
jako zwykły tekst - bez kolorowania, podpowiedzi i sprawdzania typów. Katalog ma
plik `.vscode/extensions.json`, więc VS Code sam je zaproponuje przy pierwszym
otwarciu projektu; jeśli okienko przepadło, zainstaluj ręcznie z panelu rozszerzeń.
Nie da się sensownie „udawać JSX-a" przez skojarzenie plików: blok `---` na górze
nie jest poprawnym JSX-em i podświetlanie rozjedzie się na pierwszym pliku.
Rozszerzenie jest oficjalne i robi też formatowanie oraz `astro check`.

**Historyczny drobiazg, już rozwiązany:** dopóki `react()` siedział
w `astro.config.ts`, integracja emitowała do `dist/static/` swój moduł kliencki
(~220 kB) także w projekcie bez ani jednej wyspy. Żadna podstrona go nie
pobierała, ale leżał w paczce wdrożeniowej. To jest powód, dla którego baza
startuje bez frameworka - jeśli dokładasz wyspę, te bajty wracają i to jest
część jej kosztu.

---

## Gdzie ląduje jaki plik

| Typ pliku | Miejsce | Uwagi |
|---|---|---|
| **Podstrona** | `src/pages/nazwa.astro` | jeden plik = jeden adres; `index.astro` = `/` |
| **Komponent wielokrotnego użytku** | `src/components/<obszar>/Nazwa.astro` | obszary: `layout`, `media`, `formularz`; nowy obszar zakładasz, gdy ma minimum dwa komponenty |
| **Komponent jednorazowy** | zostaje w podstronie | patrz następna sekcja - kryterium jest twarde |
| **Moduł zachowania** | `src/scripts/nazwa.ts` | domyślne miejsce na interaktywność; jedna pozycja w `main.ts` |
| **Wyspa** | `src/components/islands/Nazwa.tsx` | wyłącznie po `npx astro add react`, gdy ręczny stan przestaje się bronić |
| **Układ podstrony** | `src/layouts/` | dziś jeden; drugi zakładasz tylko przy realnie innym szkielecie `<head>` |
| **Styl globalny** | `src/styles/base.css` | dokument, typografia, dostępność |
| **Styl komponentu** | `src/styles/components/nazwa.css` | plik razem ze swoimi media queries; dopisz import w `global.css` |
| **Token systemu wizualnego** | `src/styles/tokens.css` | **jedyne** miejsce z wartościami wyglądu |
| **Zdjęcie źródłowe** | `media/img/source/` | znormalizowane, w repozytorium |
| **Oryginał zdjęcia** | `media/img/_raw/` | poza repozytorium (`.gitignore`) |
| **Zdjęcie przetworzone** | `public/assets/img/` | generowane, **nigdy nie edytować ręcznie** |
| **Ikona** | `src/components/icons/Nazwa.astro` albo `media/svg/` | SVG inline dla ikon sterowanych kolorem, plik dla logo |
| **Treść redakcyjna** | `src/content/<kolekcja>/*.md` | schemat w `src/content.config.ts` |
| **Dane powtarzalne** | `src/config/dane.ts` | adres, telefon, godziny, ceny, odnośniki, nawigacja |
| **Ustawienie techniczne** | `src/config/site.ts` | `origin`, język, moduły, endpointy, dyrektywy CSP |
| **Skrypt zachowania** | `src/scripts/nazwa.ts` | plus pozycja w tablicy w `main.ts` |
| **Skrypt pomocniczy (narzędzie)** | `tools/<obszar>/` | `media`, `audit`, `build`, `fonts` |
| **Kod serwerowy** | `forms-worker/` | osobne wdrożenie, osobny `wrangler.jsonc` |

Katalogi `src/pages`, `src/layouts`, `src/components`, `src/content`,
`src/styles` mają nazwy narzucone przez Astro i celowo zostają po angielsku.
Wszystko poniżej tego poziomu - nazwy plików, klucze danych, klasy CSS,
komentarze - jest po polsku.

---

## Kiedy coś jest komponentem, a kiedy zostaje w podstronie

Kryterium jest jedno i jest sprawdzalne:

> **Blok wychodzi do komponentu, gdy jego drugie wystąpienie jest w innym
> pliku, ALBO gdy przyjmuje dane z zewnątrz i te dane zmieniają jego treść.**

Trzy konsekwencje, których nie wolno mylić:

1. **Powtórzenie w tym samym pliku to nie powód.** Trzy karty w pętli
   `map()` to jedna karta, nie komponent. Komponent zaczyna się tam, gdzie
   druga podstrona chce tej samej rzeczy.
2. **Sam rozmiar bloku to nie powód.** Sekcja na 80 linii występująca raz
   zostaje w podstronie. Wyniesienie jej do komponentu tylko po to, żeby plik
   był krótszy, dokłada jeden skok w nawigacji po kodzie i zero korzyści.
3. **Dwa niemal identyczne komponenty różniące się szczegółem to sygnał,
   że system wizualny nie został domknięty.** Wracasz do etapu B.4 i uzgadniasz
   wariant, nie mnożysz plików. To jest zapisane wprost w DoD dla C.1.

Test na pograniczu: napisz, jakie parametry weźmie ten komponent. Jeśli lista
ma więcej niż cztery pozycje albo któraś to „czy to jest wariant X", blok
jeszcze nie dojrzał do wyniesienia.

---

## Przenoszenie treści przy zejściu do jednej kolumny

Sekcja dwukolumnowa trzyma po lewej to, co mówi, po prawej treść właściwą.
Po zejściu do jednej kolumny część bloków z lewej musi wylądować na KOŃCU
sekcji - inaczej stoją przed treścią, która dopiero nadaje im sens.

### Kiedy blok się przenosi

Oba warunki muszą być spełnione naraz:

1. **Zdanie bezpośrednio nad blokiem nie wskazuje na niego.** „Skontaktuj się
   z nami, żeby sprawdzić…" wskazuje - taki blok jest częścią swojego zdania
   i zostaje przy nim.
2. **Treść prawej kolumny jest warunkiem sensowności bloku.** „Masz więcej
   pytań?" zakłada, że lista pytań została przeczytana. Przycisk „Bezpłatna
   wycena" w cenniku zakłada, że widziało się widełki.

Nigdy nie wędruje: etykieta sekcji, nagłówek `<h2>`, tekst wprowadzający,
zdjęcie ani ilustracja. Nagłówek przed treścią to nie jest to samo co wezwanie
do działania przed treścią.

### Trzy mechanizmy, które w kodzie wyglądają podobnie

| Co chcesz zrobić | Czym | Jak to wygląda |
|---|---|---|
| Blok jedzie na koniec sekcji przy jednej kolumnie | `<Przenoszony>` | dwa wystąpienia, `miejsce="kolumna"` i `miejsce="pod"` |
| Przycisk „zobacz wszystko" z wiersza nagłówka | `<LinkSekcji>` | dwa wystąpienia, `miejsce="naglowek"` i `miejsce="pod"` |
| Treści po prostu nie ma na wąskim ekranie | `hidden lg:block` wprost w znaczniku | jedno wystąpienie |

Przeniesienie i zaniknięcie dają w kodzie te same klasy. **Rozróżnia je
wyłącznie nazwa komponentu** - i dlatego zaniknięcia nie wolno opakowywać
w `Przenoszony`, nawet gdy „działa tak samo". Rok później ktoś zmieni próg
w `Przenoszony` i zabierze ze sobą decyzję, której ten komponent nie dotyczy.

`LinkSekcji` ma własny prop `miejsce` i celowo nie przechodzi na `Przenoszony`:
to przycisk w wierszu nagłówka, nie dowolna treść w kolumnie. Jego kilkanaście
wystąpień i tak mają sterowanie zamknięte w jednym pliku - czyli dokładnie to,
co `Przenoszony` daje reszcie.

### Progi - wzorcem jest strona główna

| Intencja | Próg | Gdzie |
|---|---|---|
| Przeniesienie bloku przy zejściu do jednej kolumny | `lg` (1024) | FAQ, „Jak działamy", cennik, `LinkSekcji`, hero |
| Podmiana galerii siatka ↔ karuzela | `md` (768) | strona główna, `SzablonUslugi`, `SzablonHubu` |

Dwa progi w jednym serwisie to nie niekonsekwencja: przenoszony blok potrzebuje
pełnej szerokości kolumny, a galeria zmienia się wtedy, gdy siatka przestaje
mieścić dwie kolumny kafelków. Ale **jeden próg na intencję** - trzeci wariant
znaczy, że ktoś rozwiązywał lokalny problem lokalną klasą.

### Wyśrodkowanie należy do opakowania

Kopia dolna jest wyśrodkowana, kopia w kolumnie wyrównana do lewej - i decyduje
o tym `Przenoszony`, nie przenoszony blok. Blok nie ma wiedzieć, że jest
przenoszony; gdyby wiedział, ta sama informacja siedziałaby w dwóch miejscach.

Wyśrodkowanie kopii dolnej to trzy klasy, nie jedna: `text-center` na tekst,
`items-center` na blok, który sam jest kontenerem układu (pasek przycisków we
własnym `flex`), oraz `[&>*]:justify-center` na ten sam pasek, **gdy się
zawija**. Zawinięty kontener `flex` nie ścieśnia się do treści, tylko wypełnia
szerokość - i wtedy każdy jego wiersz startuje od lewej mimo `items-center`
na rodzicu. To jest dokładnie ten przypadek, który widać na telefonie i nie
widać na komputerze.

### Czego pilnować przy dwóch kopiach w DOM

Przenoszony blok nie może nieść `id` ani `aria-controls` - dwie kopie w DOM
to duplikat identyfikatora, nawet gdy jedna jest ukryta. Kopia ukryta przez
`display: none` nie istnieje dla czytników ekranu ani dla kolejności fokusu,
więc treść jest ogłaszana raz - ale `id` żyje w dokumencie niezależnie od tego.

---

## Od zatwierdzonego projektu do pierwszej podstrony

Krok po kroku. Kolejność nie jest dowolna - każdy krok zamyka decyzje,
na których stoi następny.

**1. Przenieś system wizualny do `src/styles/tokens.css`.**
Kolory, kroje, skala rozmiarów, odstępy, promienie, cienie, progi
responsywności, czasy i krzywe ruchu. Wartości bierzesz z wyeksportowanych
danych z narzędzia projektowego, nie ze zrzutu ekranu - modele nie odtwarzają
projektu z obrazka wiernie, potrzebują wejścia strukturalnego.
Zanim pójdziesz dalej: **policz kontrast dla każdej pary tekst/tło**, osobno
dla tła strony, karty, nagłówka i stopki. Tabela w `tokens.css` pokazuje,
jak to zapisać.

**2. Podmień kroje pisma.**
`tools/fonts/fonts.config.mjs` → `npm run fonts` → przepisz nazwy rodzin
do stosów `--font-*` w `tokens.css`. Komenda kopiuje pliki `woff2` lokalnie,
przepisuje licencję i liczy metryki kroju zastępczego.

**3. Uzupełnij `src/config/site.ts` i `src/config/dane.ts`.**
`origin` docelowy (nie testowy), nazwa, przełączniki modułów wynikające
z pakietu, dane firmy. Czego nie wiesz - zostaw jako PLACEHOLDER, ale zostaw
świadomie: audyt sprawdza, czy placeholdery są oznaczone.

**4. Przygotuj zdjęcia.**
Oryginały do `media/img/_raw/` → `npm run images:source` → `npm run images:crop`
→ `npm run images`. Opisujesz je w `media/images.config.mjs`. Szczegóły niżej.

**5. Zbuduj pierwszą podstronę.**
Skopiuj `src/pages/przyklad-podstrony.astro`. Sekcje wstawiasz wprost w pliku.
Komponenty wynosisz DOPIERO wtedy, gdy druga podstrona ich zażąda - budowanie
biblioteki komponentów przed drugą podstroną to zgadywanie, jak będzie
wyglądała.

**6. Uruchom audyt na pierwszej podstronie, nie na ostatniej.**
`npm run build && npm run audit`. Wychwycisz w ten sposób błędy systemowe
(kontrast tokenu, hierarchia nagłówków, waga zdjęć) zanim powielisz je
na sześciu podstronach.

---

## Dane powtarzalne

**Wszystko, co pojawia się drugi raz, ląduje w `src/config/dane.ts`.**

Nie „gdy się często powtarza", tylko **przy drugim wystąpieniu**. Adres,
telefon, godziny otwarcia, ceny, odnośniki zewnętrzne, pozycje nawigacji.

Powód jest prosty: klient przysyła poprawkę cennika e-mailem, Ty zmieniasz
jedną linię. Przy dwóch kopiach zmieniasz jedną i nie zauważasz drugiej
przez trzy miesiące. Audyt sprawdza to wprost: „cena na stronie głównej
i w cenniku pochodzą z tego samego miejsca".

Rozdział `dane.ts` / `site.ts` jest celowy: `site.ts` zmienia się raz, przy
zakładaniu projektu; `dane.ts` zmienia się przy każdej poprawce od klienta.

---

## Jak dodać podstronę

**Jeden plik w `src/pages/`. Koniec.**

```
src/pages/kontakt.astro   →   /kontakt/
```

Automatycznie trafia do:

- **builda** - Astro czyta katalog `src/pages`,
- **mapy strony** - `tools/build/sitemap.mjs` bierze listę z wyniku builda,
  nie z osobnego pliku,
- **audytu** - lista adresów to suma mapy strony i listy podstron builda.

Nie ma trzeciego miejsca do dopisania. Jeśli kiedyś się pojawi, ktoś zepsuł
tę własność - przywróć ją, zamiast dopisywać ręcznie.

**Jedna decyzja zostaje ręczna, celowo:** pozycja w menu. Dopisujesz ją
do `nawigacja` w `src/config/dane.ts`, bo nie każda podstrona ma być w menu
(polityka prywatności jest w stopce, strona 404 nigdzie).

**Podstrona z `noindex`** wymaga dwóch rzeczy naraz: `noindex` w `<Podstrona>`
i ścieżki w `pozaMapaStrony` w `site.ts`. Podstrona z `noindex` obecna
w mapie strony to sprzeczny sygnał indeksowania i audyt to zgłosi.

---

## SEO: gdzie i co się stanie, jeśli zapomnisz

Wszystko powstaje w `src/layouts/Podstrona.astro` i **nigdzie indziej**.

| Znacznik | Skąd | Co, jeśli zapomnisz |
|---|---|---|
| `<title>` | prop `tytul` | **build się przerywa** z nazwą podstrony |
| `description` | prop `opis` | **build się przerywa** z nazwą podstrony |
| `canonical` | `Astro.url.pathname` + `origin` | nie da się zapomnieć - nie jest parametrem |
| `og:url` | to samo źródło co `canonical` | nie da się rozjechać z `canonical` |
| `og:title`, `og:description` | te same propy | jak wyżej |
| `og:image` | prop `ogImage` albo `<OgImage>` | link traci miniaturę; strona działa |
| `twitter:card` | zawsze obecny | - |
| `lang` | `site.jezyk` albo prop `jezyk` | - |
| dane strukturalne | składane z propów | - |
| `sitemap.xml`, `robots.txt` | lista podstron builda | - |

Brak wartości domyślnej dla `tytul` i `opis` jest decyzją: domyślna oznaczałaby
duplikat na dwóch podstronach, a duplikat `title`/`description` jest w audycie
błędem. Lepiej zatrzymany build niż cichy duplikat.

**Dane strukturalne w pustej bazie to `WebSite` + `WebPage`, bez `LocalBusiness`.**
`LocalBusiness` deklaruje wyszukiwarce fakty o firmie - adres, godziny, zakres
usług. Wchodzi dopiero wtedy, gdy klient te dane potwierdzi. Serwis pokazowy
albo firma fikcyjna nie dostają go nigdy.

---

## Zdjęcia

Manifest ma trzy poziomy i każdy odpowiada na inne pytanie:

| Poziom | Przykład klucza | Odpowiada na |
|---|---|---|
| `sources` | `warsztat-01` | jaka to fotografia - plik, domyślny `alt`, pochodzenie |
| `crops` | `warsztat-01-16x9` | jaki wycinek i w jakich szerokościach - **jednostka generowania** |
| `uses` | `hero.glowna` | gdzie w układzie - `sizes`, priorytet, klasy, podpis |

Wszystko żyje w `media/images.config.mjs`. W znaczniku zostaje sam odnośnik:

```astro
<Obraz use="galeria.01" />
<Obraz use="kafelek.uslugi" alt="opis tylko dla tego miejsca" />
<Preload slot="head" use="hero.glowna" />
<OgImage slot="head" use="og.domyslny" />
```

Komponent podstawia pełne `<picture>` z wariantami AVIF / WebP / JPEG,
`srcset`, `sizes`, `width`, `height`, `loading`, `decoding` i `alt`.
**Nieznany klucz przerywa budowanie** - cicho pominięte zdjęcie jest gorsze
niż zatrzymany build.

Rozdział `crops` / `uses` jest celowy: `sizes` opisuje **układ**, nie plik.
Ten sam kafelek ma inną szerokość na `/` i na `/uslugi`, więc wartość zapisana
przy zdjęciu byłaby w jednym z tych miejsc zawsze błędna.

Powiększenie w galerii bierze się ze **źródła**, nie z kadru kafelka:
kliknięcie w kwadratowy kafelek otwiera pełną klatkę, nie powiększony wycinek.

Kolejność przy nowym materiale:

```
media/img/_raw/     →  npm run images:source   →  media/img/source/
                    →  npm run images:crop     →  media/crops.json
                    →  npm run images          →  public/assets/img/
```

`npm run images:check` czyta źródła i kadry i mówi per zdjęcie, czy plik jest,
czy kadr ma zapisany prostokąt, ile pikseli zostaje po kadrze, jaki jest werdykt
wykonalności (OK / CIASNY / ZŁE DOPASOWANIE) i czy waga mieści się w budżecie.
Nic nie koduje. Ten sam raport wchodzi na wejściu do `npm run images` i builda.

**Nie edytuj `public/assets/`.** Katalog można skasować w całości i odtworzyć
jednym poleceniem.

Reguły formatów, presetów i budżetu wagi: `PRODUKCJA-media-przygotowanie.md`.
Progi liczbowe żyją w `tools/media/presets.mjs` - to ich implementacja, nie kopia.

---

## Moduły

Przełączniki w `src/config/site.ts`. Przełącznik nie jest ozdobą: steruje
jednocześnie dyrektywami CSP, blokami polityki prywatności i zakresem audytu.

| Moduł | Domyślnie | Co włącza |
|---|---|---|
| `formularz` | wyłączony | formularz + Worker z `forms-worker/` (pakiety Rozwój i Premium) |
| `analityka` | wyłączony | Plausible + wpis w CSP + blok w polityce prywatności |
| `galeria` | włączony | powiększanie zdjęć (`<dialog>`, bez bibliotek) |
| `artykuly` | wyłączony | kolekcja treści (pakiet Premium) |
| `drugiJezyk` | wyłączony | punkty zaczepienia `hreflang` w układzie |
| `mapa` | włączony | statyczna mapa dojazdu z `maps/` - bez wpisu w CSP i polityce, przełącznik niczego nie steruje |

**Formularz** wymaga wdrożenia Workera - patrz `forms-worker/README.md`. Bez adresu
w `endpointy.formularz` formularz się nie renderuje: lepiej brak formularza
niż formularz, który nigdzie nie wysyła.

**Artykuły** włącza się zmianą nazwy katalogu `src/pages/_artykuly/`
na `src/pages/artykuly/` - Astro pomija w routingu wszystko, co zaczyna się
od podkreślenia. Instrukcja w `src/content.config.ts`.

**Druga wersja językowa** jest w bazie jako punkty zaczepienia (`jezyk`
i `wersje` w `<Podstrona>`), nie jako gotowy mechanizm. Pełny routing
dwujęzyczny to decyzja projektowa - Astro ma własny mechanizm i18n, ale jego
konfiguracja zależy od tego, czy język siedzi w ścieżce, w domenie, czy
w podkatalogu.

**Mapa** to katalog `maps/`: silnik renderu (Python, `maps/silnik/`) i projekty
map, z własnym `README.md` i `CLAUDE.md`. Wynik jest zwykłym zdjęciem w potoku
(`media/img/_raw/` → manifest), atrybucja OpenStreetMap stoi przy mapie, nie
w stopce. Co z `maps/` przechodzi do bazy: `maps/README.md`, sekcja „Do bazy".

---

## Sekrety i zmienne środowiskowe

**W tej bazie nie ma pliku `.env` i nie powinien powstać.** To nie jest
przeoczenie, tylko konsekwencja tego, czym jest statyczny front.

### Dlaczego front nie ma sekretów

Build produkuje pliki, które przeglądarka pobiera w całości. Wszystko, co
wejdzie do builda, wychodzi do przeglądarki - w kodzie, w pliku JSON, w atrybucie
HTML, wszystko jedno. Astro nazywa to wprost: zmienne widoczne w kodzie klienta
muszą mieć przedrostek `PUBLIC_`, a przedrostek jest deklaracją, nie
zabezpieczeniem. **Nie istnieje sposób ukrycia sekretu w statycznym froncie.**

Praktycznie: klucz API, hasło, token dostępowy i identyfikator z sekretem
w nazwie **nigdy** nie wchodzą do `src/`. Jeśli funkcja ich wymaga, ta funkcja
nie należy do frontu, tylko do Workera.

### Jedyny prawdziwy sekret w projekcie

`RESEND_API_KEY` - klucz do wysyłki poczty z formularza kontaktowego. Siedzi
w Workerze (`forms-worker/`), który jest osobnym wdrożeniem, i jest ustawiany jako
**Workers Secret**:

```bash
cd forms-worker
npx wrangler secret put RESEND_API_KEY
```

Wrangler pyta o wartość, zapisuje ją zaszyfrowaną po stronie Cloudflare
i **nie tworzy żadnego pliku**. Klucz nie istnieje w repozytorium na żadnym
etapie. Podmiana to ta sama komenda z nową wartością.

Do pracy lokalnej (`npx wrangler dev` w katalogu `forms-worker/`) klucz można podać
w pliku `.dev.vars`:

```
RESEND_API_KEY=re_xxx
```

`.dev.vars` jest w `.gitignore` i **ma tam zostać**. To jedyne miejsce, gdzie
klucz bywa w postaci jawnej na dysku, i najczęstsza droga, którą klucze trafiają
do repozytoriów.

### Co jest jawne, mimo że wygląda na sekret

| Wartość | Gdzie | Dlaczego jawna |
|---|---|---|
| adres endpointu formularza | `src/config/site.ts` | przeglądarka musi go znać, żeby wysłać żądanie |
| identyfikator analityki | `src/config/site.ts` | jedzie w kodzie strony, z definicji publiczny |
| klucz publiczny mapy albo captchy | `src/config/site.ts` | zabezpiecza się go ograniczeniem domeny po stronie dostawcy, nie ukryciem |
| `origin` i adresy zewnętrzne | `src/config/site.ts`, `dane.ts` | to treść strony |

Ochroną endpointu nie jest jego nieznajomość, tylko to, co robi Worker:
sprawdzenie pochodzenia żądania, pułapka na boty i znacznik czasu. Opis
w `forms-worker/README.md`.

### Czego nie wolno zrobić

- **Nie twórz `.env` w katalogu głównym projektu** po to, żeby „gdzieś trzymać
  klucz". Jeśli klucz jest potrzebny podczas builda i wychodzi do przeglądarki,
  nie jest sekretem. Jeśli nie wychodzi, nie ma go po co budować.
- **Nie wkładaj klucza do `wrangler.jsonc`** w sekcji `vars`. To pole jest
  jawnym tekstem w repozytorium. Sekrety idą przez `wrangler secret put`.
- **Nie przekazuj klientowi danych dostępowych pocztą ani komunikatorem.**
  Kanałem jest Bitwarden Send, zgodnie z ustaleniami z grupy PRAWO.
- **Nie commituj `.dev.vars`.** Klucz raz wrzucony do repozytorium jest spalony:
  usunięcie go kolejnym commitem nie usuwa go z historii. Jedyna poprawna
  reakcja to unieważnienie klucza u dostawcy i wygenerowanie nowego.

---

## Migracja istniejącego projektu React

Dotyczy sytuacji, w której projekt już istnieje - własny, przejęty albo
odziedziczony po innym wykonawcy - i ma zostać przeniesiony na tę bazę.

Migracja ma **dwa etapy i bramkę między nimi**: najpierw audyt przedmigracyjny,
który tylko opisuje, potem migracja, która zmienia. Etapów nie wolno łączyć.
Powód jest prosty: projekt zastany łamie checklistę w miejscach, których nikt
nie wybierał świadomie, a część napraw zmienia to, co klient widzi i co już
zaakceptował. Model, który naprawia je po drodze „przy okazji", oddaje stronę
różniącą się od uzgodnionej i nikt nie wie, kiedy to się stało.

### Najpierw jedno rozstrzygnięcie

**Czy to jest strona, czy aplikacja.**

| Objaw | Wniosek |
|---|---|
| treść zna się w chwili builda, nawigacja to przejścia między podstronami, stan to menu i galeria | strona - migracja na tę bazę ma sens |
| logowanie, panel użytkownika, dane pobierane po zalogowaniu, trasy zależne od stanu | aplikacja - **zostaje na React Routerze**, ta baza jej nie obsłuży |
| jedno i drugie naraz | statyczna część na tę bazę, panel jako osobne wdrożenie pod tym samym adresem |

To jest ten sam podział, który uzasadnia wybór stacku wyżej: wizytówki
w Astro, aplikacje w React Routerze. Migracja aplikacji na Astro to nie
migracja, tylko przepisanie od zera.

### Etap 1: audyt przedmigracyjny

**Nic nie zmieniasz. Wynikiem jest dokument, nie commit.**

Uruchamiasz go na projekcie źródłowym, zanim powstanie choćby pusty katalog
docelowy. Zakres: te same punkty, co checklista przedwdrożeniowa
(`PRODUKCJA-audyt-przedwdrozeniowy-frontend.md`), tylko zastosowane do cudzego
kodu, plus inwentaryzacja, której przy nowym projekcie nie ma po co robić.

Co wypisujesz, punkt po punkcie:

| Obszar | Co konkretnie wypisać |
|---|---|
| **Trasy** | pełna lista adresów, z podziałem na gotowe i zaślepki. To jest umowa o zakresie - strona po migracji ma mieć te same adresy, inaczej tracisz pozycje w wyszukiwarce |
| **Zasoby zewnętrzne** | każde żądanie wychodzące poza domenę: zdjęcia, kroje pisma, mapy, ikony, widżety. Osobno te z domeny klienta, osobno z obcych |
| **Zdjęcia** | skąd pochodzą, w jakiej rozdzielczości, czy istnieją oryginały. Bez tego potok zdjęć nie ma wejścia |
| **Stan w przeglądarce** | gdzie naprawdę jest stan: formularze wieloetapowe, `localStorage`, filtry. To rozstrzyga, gdzie będzie wyspa, a gdzie wystarczy moduł |
| **Zależności** | co ciągnie framework, co ma rdzeń waniliowy, co da się wyciąć bez zamiennika |
| **Treść** | teksty, dane firmy, ceny - czy są w kodzie, czy w jednym miejscu |
| **Naruszenia checklisty** | punkt po punkcie, z oznaczeniem 🔴 blokujące / 🔁 do poprawy |

Każde naruszenie trafia do jednej z dwóch kolumn i to jest najważniejsza część
całego dokumentu:

| | Naprawa automatyczna | Decyzja inwazyjna |
|---|---|---|
| **Kryterium** | wynik wygląda tak samo, zmienia się sposób dostarczenia | zmienia się to, co klient widzi, albo potrzebne są materiały, których nie ma |
| **Przykłady** | kroje pisma z zewnętrznego serwisu → potok `npm run fonts` · brak `width`/`height` na zdjęciu · własny `<head>` w komponencie → układ · biblioteka animacji zamieniona na CSS | usunięcie sekcji · zamiana osadzonej mapy na statyczny obraz plus odnośnik · zdjęcia, do których nie ma oryginałów · rezygnacja z efektu, którego nie da się zrobić w budżecie wagi |
| **Tryb** | robisz w trakcie migracji, odnotowujesz w raporcie | **wstrzymujesz się i pytasz**, jedną listą, przed startem migracji |

**Bramka:** migracja startuje dopiero, gdy każda pozycja z prawej kolumny ma
odpowiedź. Nie „domyślam się, że klient by chciał". Odpowiedź albo jawna zgoda
na wariant zaproponowany w dokumencie.

⚠️ **Zasada zachowania wyglądu.** Poza pozycjami z prawej kolumny migracja
odtwarza projekt, nie poprawia go. Kuszące „przy okazji poprawię ten odstęp"
jest tym, co sprawia, że klient po migracji nie poznaje własnej strony i traci
zaufanie do całej operacji. Pomysły na poprawki zbierasz w osobnej liście na
koniec dokumentu i wracasz do nich po migracji, jako oddzielną rozmowę.

### Etap 2: migracja

### Co przenosi się bez zmian

- **CSS.** Arkusze wchodzą do `src/styles/components/` po jednym pliku na
  komponent. Wartości wyglądu wyciągasz do `tokens.css` - to jedyna
  obowiązkowa zmiana w samym CSS.
- **Znaczniki.** JSX i szablon `.astro` to ta sama składnia atrybutów, łącznie
  z `className`. Wklejony blok JSX zwykle działa od razu.
- **Treść.** Teksty, tabele, listy - kopiuj.
- **Zdjęcia.** Oryginały do `media/img/_raw/`, dalej potok. Nie przenoś gotowych
  wariantów z poprzedniego projektu: rozmiary są policzone z `sizes` układu,
  a ten się zmienia.
- **Komponenty naprawdę interaktywne** - ale dopiero po przejściu progu wyspy
  niżej. Jeśli przechodzą, `.tsx` zostaje `.tsx`, ląduje
  w `src/components/islands/`, dostaje dyrektywę `client:*`, a projekt dokłada
  framework przez `npx astro add react`. Większość komponentów z projektu
  React tego progu **nie przechodzi** i kończy jako `.astro`.

### Co wymaga decyzji

- **Routing.** `react-router` znika. Każda trasa staje się plikiem
  w `src/pages/`. Trasy dynamiczne (`/blog/:slug`) to albo kolekcja treści,
  albo `[slug].astro` z `getStaticPaths()` - jedno i drugie musi dać listę
  adresów **w chwili builda**.
- **Stan globalny.** Context, Redux, Zustand: sprawdź, co naprawdę trzymają.
  Dane znane w chwili builda przenosisz do `src/config/dane.ts` albo do
  kolekcji. Stan przeglądarki zostaje, ale zamyka się w jednej wyspie razem
  z komponentami, które go używają - dwie wyspy nie dzielą stanu.
- **Pobieranie danych.** `useEffect` z `fetch` po dane, które nie zmieniają się
  między buildami, to żądanie sieciowe na darmo. Pobierz je w części serwerowej
  `.astro` (wykonuje się przy buildzie) i wstaw wynik do znaczników.
- **Biblioteki komponentów.** Każda ciągnie własny runtime i zwykle
  `unsafe-inline` w stylach. Zanim przeniesiesz bibliotekę, policz, ile
  komponentów z niej naprawdę zostaje - typowo dwa, a płacisz za sto.
- **Zdjęcia wskazywane spod cudzego adresu.** Najczęstszy i najgroźniejszy
  przypadek: adresy prowadzą do WordPressa klienta albo do serwisu ze zdjęciami
  stockowymi. Strona przestaje być statyczna w sensie, który ma znaczenie -
  żyje tak długo, jak tamten serwer. To jest **decyzja inwazyjna**: potrzebujesz
  oryginałów do `media/img/_raw/`, a jeśli ich nie ma, rozmowy o tym, co wstawić
  w to miejsce. Nie pobieraj cudzych plików i nie wstawiaj ich do repozytorium
  bez ustalenia praw.
- **Kroje pisma z zewnętrznego serwisu.** `fonts.googleapis.com` i podobne to
  żądanie poza domenę na każdej podstronie, wpis do polityki prywatności
  i `font-src` rozluźnione w CSP. Naprawa automatyczna: te same pliki przez
  `npm run fonts`, lokalnie, z metrykami kroju zastępczego.
- **Tailwind: wersja 3 kontra 4.** Projekt zastany ma zwykle
  `tailwind.config.js` i `postcss.config.js`. Ta baza używa Tailwinda 4, gdzie
  konfiguracja jest w CSS (`@theme`), a wtyczka PostCSS nie jest potrzebna.
  Kolory i skale z `theme.extend` przepisujesz do `tokens.css` - i to jest
  właściwy moment, żeby policzyć ich kontrasty.
- **Ikony z biblioteki frameworkowej.** `lucide-react`, `react-icons` i podobne
  wymagają frameworka do narysowania kształtu znanego przy buildzie. Używane
  ikony wyciągasz jako pliki SVG i wstawiasz wprost - zwykle jest ich mniej niż
  dwadzieścia, a koszt spada do zera.
- **Osadzona mapa.** `<iframe>` z zewnętrznego serwisu map to żądanie poza
  domenę, wpis w `frame-src`, pliki cookie u dostawcy i akapit w polityce
  prywatności. **Decyzja inwazyjna:** albo statyczny obraz mapy z odnośnikiem
  do nawigacji (zwykle lepszy dla wagi i prywatności), albo świadoma zgoda na
  osadzenie z opisem w polityce.
- **Wysyłka formularza.** Punkt docelowy ze starego projektu nie przenosi się
  wprost. Formularz w tej bazie wysyła do Workera, a wymogi RODO opisuje
  `PRAWO-rodo-formularz-kontaktowy.md`. Zgoda, klauzula i okres przechowywania
  to część migracji, nie dodatek po niej.

### Czego nie wolno przenieść

- **CSS-in-JS** (`styled-components`, `emotion`, `@stitches`). Generują `<style>`
  inline w trakcie działania. Przy `style-src` bez `'unsafe-inline'`
  przeglądarka je zablokuje, a strona zostanie bez stylów. Osłabienie polityki
  jest punktem blokującym w checkliście. Te style przepisujesz na CSS.
- **`dangerouslySetInnerHTML` na danych z zewnątrz.** Na stałym tekście
  z repozytorium bywa uzasadnione, na treści z API nigdy.
- **Biblioteka animacji ciągnięta dla efektu, który robi CSS.** `motion` jest
  w bazie dla rzeczy sterowanych stanem. Pojawienie się przy przewijaniu,
  najechanie, przejście - to CSS plus `IntersectionObserver` w `src/scripts/`,
  zero kilobajtów JavaScriptu bibliotecznego.
- **Własny `<head>` w komponencie.** `react-helmet` i podobne. `<head>` powstaje
  wyłącznie w `src/layouts/Podstrona.astro`.
- **`index.html` z korzenia projektu Vite.** Astro generuje dokument sam.

### Kolejność

Odwrotna do intuicyjnej: **nie zaczynaj od komponentów.**

0. **Dokument z etapu 1 zatwierdzony.** Każda decyzja inwazyjna ma odpowiedź.
   Bez tego nie ruszasz - to jest bramka, nie formalność.
1. **Tokeny.** Kolory, kroje, skala, odstępy ze starego projektu do
   `tokens.css`. Policz kontrasty od razu - migracja to najtańszy moment
   na wykrycie, że stara paleta nie przechodzi AA.
2. **Układ.** Nagłówek, stopka, nawigacja do `src/components/layout/`.
   Sprawdź, czy strona główna się buduje.
3. **Jedna podstrona, ta najbardziej typowa.** Nie strona główna - ona zwykle
   jest wyjątkiem. Na niej domykasz wzór, według którego pójdą pozostałe.
4. **Reszta podstron.** Komponent wynosisz dopiero przy drugim wystąpieniu
   w innym pliku - kryterium jest w sekcji o komponentach i przy migracji
   obowiązuje tak samo. Stara struktura katalogów nie jest argumentem.
5. **Wyspy na końcu.** Dopiero gdy strona stoi bez JavaScriptu, dokładasz to,
   co naprawdę potrzebuje przeglądarki.

Po każdym kroku `npm run build`. Migracja rozpoznana po trzech dniach jako
nieudana kosztuje trzy dni.

### Próg wyspy

Jeden, twardy, i przy migracji łamany najczęściej:

> **Komponent zostaje wyspą tylko wtedy, gdy ma stan w przeglądarce na tyle
> złożony, że pilnowanie go ręcznie w module `src/scripts/` przestaje się
> bronić.**

Próg jest dwustopniowy i oba stopnie trzeba przejść.

1. **Czy w ogóle jest stan w przeglądarce?** Nie „bo był komponentem w React".
   Nie „bo ma logikę" - logika wykonana przy buildzie to nie stan. Karta
   produktu, sekcja z parametrami, lista z pętli, akordeon FAQ: to wszystko
   jest `.astro`, bo wynik jest znany przed wysłaniem strony.
2. **Czy ten stan jest złożony?** Jedno pole, jedno przełączenie klasy, jedna
   galeria - moduł w `src/scripts/`, tak jak `lightbox.ts` i `formularz.ts`.
   Konfigurator z pięcioma krokami, walidacją krzyżową i zapisem postępu,
   koszyk, filtrowanie po wielu kryteriach naraz - dopiero tutaj ręczne
   pilnowanie stanu kosztuje więcej niż framework.

Pierwsza wyspa na podstronie kosztuje **około 69 kB gzip** (React plus
`react-dom`) - zmierzone na tej bazie - plus ~220 kB w paczce wdrożeniowej,
których nie pobiera żadna podstrona. Każda kolejna wyspa dokłada już tylko
własny kod. Wnioski praktyczne: jedna wyspa obejmująca cały interaktywny
fragment jest tańsza niż pięć drobnych, wyspa na jednej podstronie nie obciąża
pozostałych, a podstrona z zerem wysp wysyła **0 bajtów** JavaScriptu
frameworka.

---

## Co jest obowiązkowe, a czego wolno nie użyć

### Obowiązkowe - usunięcie łamie audyt

- `src/layouts/Podstrona.astro` jako jedyne źródło `<head>`,
- `src/config/site.ts` i `src/config/dane.ts` jako jedyne źródła adresu
  i danych powtarzalnych,
- `src/styles/tokens.css` jako jedyne źródło wartości wyglądu,
- integracje `sitemap` i `headers` w `astro.config.ts`,
- `security.csp` w `astro.config.ts` - bez tego `_headers` powstaje bez polityki,
- `build.assets: 'static'` - rozdział katalogów, na którym stoją reguły cache,
- globalna reguła fokusu, pominięcie nawigacji i punkty orientacyjne
  (`base.css` + układ),
- obsługa `prefers-reduced-motion` w CSS **i** w JavaScripcie,
- strona 404 z nawigacją,
- `wrangler.jsonc` z `not_found_handling` i `html_handling`.

### Wolno nie użyć

- potoku zdjęć - projekt bez fotografii nie musi nic wyłączać, pusty manifest
  jest poprawnym stanem,
- wszystkich modułów - domyślnie prawie wszystkie są wyłączone,
- `src/scripts/` - serwis bez ruchu i bez formularza nie potrzebuje ani jednego
  skryptu; usuń wtedy `<script>` z układu, nie zostawiaj pustego bundla,
- `src/pages/przyklad-podstrony.astro` - to wzór do skopiowania, nie podstrona
  projektu. **Skasuj ją przed wydaniem.**
- katalogu `forms-worker/`, jeśli projekt nie ma formularza.

---

## Antywzorce

Lista rzeczy, na które model najczęściej wpada przy tego typu pracy.
Każda pozycja ma za sobą konkretny punkt checklisty przedwdrożeniowej.

**1. Wpisanie koloru, rozmiaru albo odstępu wprost w komponencie.**
`color: #4a90e2` w pliku komponentu to drugie źródło prawdy o systemie
wizualnym. Paleta domyślna Tailwinda jest w tej bazie **wyłączona** właśnie
po to - `bg-slate-800` nie wygeneruje klasy i zobaczysz to od razu.
Brakuje tokenu? Dodaj go do `tokens.css`, nie obchodź systemu lokalnie.

**2. Chowanie treści pod animacją wejścia.**
Stan domyślny elementu jest WIDOCZNY. Skrypt dopiero go chowa i odsłania.
Odwrotna kolejność zostawia treść niewidoczną na zawsze, gdy skrypt nie
wystartuje - a to jest bloker, nie drobiazg.

**3. `opacity: 0`, `pointer-events: none` albo samo `max-height: 0` jako
sposób ukrywania.** Element niewidoczny, a łapiący fokus, to pułapka dla
klawiatury. Dopuszczalne formy są cztery: `[hidden]`, `.poza-ekranem`, `inert`
i `visibility: hidden`.

Czwarta jest tam, gdzie trzy pierwsze nie wchodzą: przy panelu, który
pojawia się i znika z przejściem. `inert` wymaga JavaScriptu, a `[hidden]` się nie
animuje - zostaje `visibility`, bo jako jedyna wyjmuje treść z fokusu I daje
się przełączyć przejściem. Warunek: `visibility` musi być objęta `transition`
na tym samym elemencie (`transition-all` ją obejmuje). Bez tego odnośniki
znikają, zanim panel zdąży wygasnąć. Wzór: `.naglowek__panel`
w `src/styles/components/naglowek.css` (nakładka z `opacity` i `transform`).

Samo `max-height: 0` plus `overflow-hidden` **nie** wyjmuje odnośników
z kolejności fokusu - zwinięte menu łapie wtedy Tab i nie widać tego
na żadnym zrzucie.

**4. `outline: 0` bez zamiennika.**
Jeśli zdejmujesz obrys fokusu, musisz w tej samej regule dać coś równie
widocznego. Nie „później".

**5. Dopisywanie podstrony do mapy strony ręcznie.**
Mapa powstaje z wyniku builda. Ręczny wpis rozjedzie się przy pierwszej
zmianie i nikt tego nie zauważy.

**6. `'unsafe-inline'` w `script-src`, żeby coś zadziałało.**
Jeśli skrypt nie działa przez CSP, przyczyną jest skrypt, nie polityka.
Kod potrzebny przed pierwszym malowaniem wchodzi jako osobny plik z własnej
domeny, nie jako blok inline.

**7. Poprawka dokładająca element obok istniejącego generatora.**
Brakuje czegoś w zbudowanym pliku? Znajdź, co to generuje i dlaczego warunek
nie został spełniony. Wpisanie brakującego znacznika na sztywno tworzy drugie
źródło prawdy i jest gorsze niż brak poprawki.

**8. `sizes="100vw"` na kafelku szerokim na 380 px.**
`sizes` opisuje układ, nie plik. Błędna wartość każe przeglądarce pobrać
plik cztery razy za duży, a Lighthouse tego nie zgłosi jako błędu.

**9. Dwa niemal identyczne komponenty różniące się szczegółem.**
To nie jest problem kodu, tylko niedomkniętego systemu wizualnego. Wracasz
do etapu B.4, nie mnożysz wariantów.

**10. Tekst ozdobny na `<h3>`, żeby wyglądał jak nagłówek.**
I odwrotnie: nagłówek sekcji jako `<div class="duzy">`. Hierarchia nagłówków
jest strukturą dokumentu, nie stylem. Nadtytuł (`.nadtytul`) jest `<span>`
właśnie dlatego.

**11. `LocalBusiness` w danych strukturalnych „bo zwykle tam jest".**
To deklaracja faktów o firmie. Wchodzi po potwierdzeniu danych przez klienta,
nigdy przy serwisie pokazowym.

**12. Opis w polityce prywatności rzeczy, których serwis nie robi.**
Działa w obie strony: brak opisu żądania zewnętrznego jest błędem, ale opis
przetwarzania, którego nie ma, też. Polityka jedzie za przełącznikami modułów.

**13. Dopisywanie logiki do `src/scripts/main.ts`.**
To rejestr modułów, nie miejsce na kod. Nowe zachowanie to nowy plik plus
jedna pozycja w tablicy - inaczej awaria jednego zachowania zabije pozostałe.

**14. Zostawienie `src/pages/przyklad-podstrony.astro` w wydaniu.**
Razem z przykładowymi tokenami Kodeleon w `tokens.css`. Jedno i drugie jest
wzorem do podmiany, nie treścią projektu.

**15. Komentarz HTML w szablonie `.astro`.**
`<!-- ... -->` w części szablonowej jedzie do przeglądarki razem z dokumentem -
zmierzone 560 bajtów na podstronę, na zasobie, od którego zaczyna się
renderowanie. Komentarze tłumaczące decyzje są tego warte, ale w kodzie,
nie w odpowiedzi serwera. Używaj `{/* ... */}` - tej formy Astro nie emituje.

**16. `import()` napisany wprost w kodzie integracji Astro.**
Kod integracji przechodzi przez moduł uruchomieniowy Vite, który przepisuje
każdy `import()` na swoje wywołanie - także z adnotacją vite-ignore. Gdy moduł
się zamyka, import ginie razem z nim: „Vite module runner has been closed",
a na Windowsie dodatkowo zabity serwer deweloperski. Wzór, który działa, jest
w `tools/media/integration.mjs` (`new Function('adres', 'return import(adres)')`),
razem z uzasadnieniem. Do tego: nie wczytuj niczego w haku `astro:server:setup` -
rób to leniwie, przy pierwszym żądaniu, i w `try`.

**17. `spawn` procesu potomnego w narzędziu, które ma się samo posprzątać.**
Na Windowsie `spawn('npx', ..., { shell: true })` tworzy powłokę `cmd`, a
`proces.kill()` ubija tylko ją - Node pod spodem żyje dalej i polecenie nigdy
się nie kończy. Narzędzia w `tools/audit/` uruchamiają podgląd W TYM SAMYM
PROCESIE (`startPreview` z `server.mjs`). Jeśli musisz odpalić proces
potomny, przewiduj ubicie całego drzewa procesów.

**18. Sprzątanie przed zapisem wyniku.**
`chrome.kill()` potrafi paść na Windowsie z `EPERM` przy kasowaniu katalogu
tymczasowego profilu. Jeśli sprzątanie stoi PRZED zapisem raportu, tracisz
cały pomiar z powodu nieudanego `rm`. Kolejność: policz → zapisz → posprzątaj,
a samo sprzątanie w `try`.

**19. Nadpisanie pliku kroju pod tą samą nazwą.**
`_headers` daje `/fonts/*` rok życia z `immutable`. Podmiana bez zmiany nazwy
zostawia połowę odwiedzających ze starym krojem na rok. Do tego służy pole
`wersja` w `tools/fonts/fonts.config.mjs`.

---

## Wdrożenie

```bash
npm ci
npm run build
npx wrangler deploy
```

`wrangler.jsonc` siedzi w repozytorium, więc wdrożenie jest odtwarzalne bez
klikania w panelu. Wrangler celowo nie jest zależnością - to narzędzie
wdrożeniowe, a `npx` pobiera je na żądanie.

Dwie rzeczy, które ta konfiguracja załatwia:

- **`not_found_handling: "404-page"`** - bez tego nieistniejący adres kończy
  się pustą odpowiedzią. Z tym Cloudflare oddaje `dist/404.html` razem
  ze statusem 404.
- **`html_handling: "auto-trailing-slash"`** - podstrony to katalogi
  z `index.html`, a `canonical` i mapa strony wskazują adresy ze slashem.

### Po wdrożeniu - cztery rzeczy, które potrafią zawieść po cichu

1. `/sitemap.xml` i `/robots.txt` odpowiadają kodem 200, nie 404,
2. dowolny nieistniejący adres oddaje **naszą** stronę 404, nie pustkę,
3. nagłówek `Content-Security-Policy` jest w odpowiedzi serwera - obecność
   pliku `_headers` to nie to samo co działający nagłówek,
4. `/robots.txt` zawiera linię `Sitemap:` - Cloudflare potrafi doklejać
   do tego pliku własną, zarządzaną treść z ustawień strefy.

Pełna lista: `PRODUKCJA-audyt-przedwdrozeniowy-frontend.md`, sekcja
„Po wdrożeniu: 24 godziny".

### Cache - warunek, o którym łatwo zapomnieć

| Ścieżka | Reguła | Warunek |
|---|---|---|
| `/static/*` | rok + `immutable` | hash w nazwie, zapewnia go build |
| `/fonts/*` | rok + `immutable` | **podmiana kroju = nowa nazwa pliku** |
| `/assets/*` | doba + `stale-while-revalidate` | nazwy stałe, podmiana kadru nie zmienia adresu |

Reguły w `_headers` **się nie nadpisują** - żądanie pasujące do kilku wzorców
dostaje nagłówki ze wszystkich, a powtórzony nagłówek jest sklejany przecinkiem.
Dlatego ścieżki są rozdzielone u źródła, przez `build.assets` w `astro.config.ts`.

---

_Baza w wersji z września 2026. Zmiana czegokolwiek w warstwie technicznej
wymaga ponownego przejścia punktów 🧱 z checklisty przedwdrożeniowej._

