# maps/ - statyczne mapy z danych OpenStreetMap

Mapy serwisu, renderowane z danych OSM do zwykłego PNG. Wszystko jest tutaj:
silnik renderu (`silnik/`), dane i konfiguracja każdej mapy, szablony do
założenia kolejnej i zasady pracy dla Claude Code (`CLAUDE.md`).

Wynik wchodzi do potoku zdjęć jak każda fotografia:
`media/img/_raw/` → `npm run images:source` → `npm run images`. Serwis nie
wie, że to mapa - poza pinezką i atrybucją w komponencie.

## Dlaczego render, a nie iframe albo kafelki

- **iframe Map Google** - żądanie poza domenę przy każdej wizycie, cookie
  u dostawcy, wyjątek `frame-src` w CSP, akapit w polityce prywatności.
- **Kafelki OSM (Leaflet)** - Tile Usage Policy zabrania hurtowego pobierania
  kafli ("pre-emptive fetching"), a ładowanie na żywo to znów żądanie poza
  domenę.
- **Render z danych** - dane OSM (Overpass, Geofabrik) są wystawione właśnie
  do masowego pobierania. Mapa dostaje paletę i kroje serwisu, zero żądań
  zewnętrznych. Cena: mapa jest statyczna, bez zoomu i przesuwania - od tego
  jest odnośnik do nawigacji obok.

## Układ katalogu

```
maps/
  README.md                ten plik - jak to działa
  CLAUDE.md                zasady pracy dla Claude Code w tym katalogu
  requirements.txt         biblioteki renderu, wersje przypięte
  .venv/                   Python do renderu, osobno od npm (poza gitem)
  silnik/                  kod renderu - skrypty uruchamiane wprost, nie pakiet
    projekt.py             wczytanie i walidacja map.project.json, tłumaczenie EN → PL
    filtr.py               zrzut Overpass → wycinek
    render.py              wycinek → PNG, opcjonalnie zrzuty podglądowe
    fonty.py               woff2 → ttf, wypalenie wagi kroju zmiennego
    taksonomia.py          tagi OSM → warstwy rysunkowe (stała silnika)
  fonts/                   kroje DO RENDERU, pełny zestaw znaków (nie serwowane)
    zloz.py                składa podzbiory kroju zmiennego w jeden woff2
  templates/
    overpass.txt           zapytanie Overpass - podmieniasz linię bbox
    map.project.light.json projekt jasnej mapy (przykład krakowski), jeden kadr
    map.project.dark.json  projekt ciemnej mapy (Fade Barber), dwa kadry
  reference/
    fade-barber-*.png      wzorzec jakości: gotowy render z pierwszego projektu
  <mapa>/                  jedna mapa = jeden katalog (np. dojazd/, region/)
    README.md              brief: punkt, podpisy, decyzje, znaleziska, stan
    map.project.json       jedyne źródło prawdy o tej mapie
    overpass.txt           zapytanie dla tej okolicy
    data/dump.json         surowy zrzut Overpass (poza gitem)
    data/extract.json      przefiltrowany wycinek - wejście renderu (w gicie)
    .podglad/              zrzuty podglądowe, w .podglad/fonty/ cache krojów (poza gitem)
```

## Silnik

Pięć skryptów w `silnik/`, uruchamianych wprost (`python silnik/<skrypt>.py
-p <projekt>`). Silnik nie jest pakietem i nie instaluje sam siebie -
`requirements.txt` to tylko biblioteki, na których stoi. Mniej ruchomych
części w repozytorium klienta.

- **Kontraktem jest JSON** (`map.project.json`), klucze angielskie. Kod nie
  zna ani jednej wartości projektu: punktu, palety, kroju, ścieżki.
- **Wewnątrz Pythona nazwy są polskie.** Tłumaczenie klucz JSON → nazwa
  w kodzie siedzi w jednym miejscu: tablice na górze `silnik/projekt.py`.
  Nowy klucz w kontrakcie to wpis w tablicy, nigdzie indziej.
- **`paths` liczone względem pliku projektu**, nie względem katalogu, z którego
  odpalasz polecenie. Wyjątek: argument `-z` filtra (zrzut) to zwykła ścieżka
  z linii poleceń.
- **Walidacja jest ścisła.** Brak klucza, nieznany klucz albo nieznana sekcja
  to błąd przy wczytaniu, a nie `None`, które wybuchłoby w środku renderu.
  Każdy skrypt waliduje projekt na starcie; `projekt.py` uruchomiony wprost
  wypisuje dodatkowo podsumowanie (kadry, m/px, rozwiązane ścieżki).
- **Kolizje podpisów ręcznych** (`labels`, `markers`) ocenia się okiem:
  `render.py --podglad` zapisuje zrzuty w szerokościach CSS
  z `frames.<kadr>.preview_css` z czerwonym obrysem pinezki (`pin_css`).
  Automatycznie układane są tylko miejscowości na mapie kraju (niżej).

Czego silnik nie rysuje - lista w `CLAUDE.md` i w nagłówku
`silnik/taksonomia.py`.

## Mapa regionu na tle kraju (`region/`)

Ten sam silnik, ale inne warstwy - włączane kluczami projektu, więc mapa
okolicy wygląda piksel w piksel jak przed ich dodaniem (sprawdzone na obu
mapach, wrzesień 2026):

- `projection: {"type": "lcc", "parallels": [a, b]}` - stożkowe Lamberta.
  Domyślne `local` (skala stopnia w punkcie) na kilkuset km zniekształca
  kształt kraju o kilka procent.
- `extract.country` (kod ISO3166-1), `extract.admin_levels`,
  `extract.clip_to_country_m` - filtr składa morze z `natural=coastline`
  (ląd po lewej stronie linii), ląd kraju (granica ∩ ląd, bez pasa wód
  terytorialnych), granicę państwa i granice jednostek jako linie, zbiera
  miejscowości `place=city|town` z ludnością; rzeki, jeziora i drogi przycina
  do kraju (drogi i rzeki scalone w ciągłe linie - nazwy nie są tu potrzebne).
  Sąsiedzi to tło kadru.
- `extract.place_admin_levels` - do miejscowości dochodzą siedziby jednostek
  tego poziomu (węzły `admin_centre`; dla gmin `7`): na mapie regionu to one
  są wsiami, do których firma jeździ. Wieś gminna bez `population` dostaje
  w kolejce wagę `places.admin_centre_population`.
- `highlight: {"center": [lat, lon], "radius_km": R}` - okrąg po kuli
  przycięty do lądu kraju (rola `highlight`, łuk `highlight_edge`).
- `frames.<kadr>.places` - miejscowości układane automatycznie: od
  najważniejszej (ludność, w obszarze × `highlight_weight`), osiem pozycji
  podpisu wokół kropki, podpis wchodzi tylko cały i bez nachodzenia na inny
  podpis, kropkę ani znacznik z `markers` - inaczej miasto wypada z kropką.
  Podpis ważniejszego miasta omija też kropki mniejszych, jeśli ma gdzie.
  Rodzaje podpisu `city` / `town` (próg `city_population`).

Zapytanie Overpass mapy regionu: `region/overpass.txt` (granica Polski,
województwa i gminy w ramce danych, siedziby gmin, miasta, wszystkie rzeki,
jeziora z obwodem > 3 km, drogi krajowe i wojewódzkie) - ok. 125 MB. Filtr
~30 s. Pierwsza wersja (cała Polska) leżała poza zakresem briefu - Marek
wybrał skupienie na obszarze działania, wrzesień 2026.

W OSM duże relacje granic mają przerwy (granica Polski: 176 m na Bugu).
Filtr domyka luki do ~1 km odcinkiem prostym i wypisuje każdą - większa to
już brakujący kawałek, nie przerwa.

## Szablony

Oba szablony przechodzą `projekt.py`. `templates/` leży na tej samej
głębokości co katalog mapy, więc `paths` w szablonie są już ścieżkami dla
`maps/<mapa>/`: kroje z `../fonts`, wycinek w `data/`, podglądy w `.podglad/`,
wyjście w `../../media/img/_raw/`. Po skopiowaniu podmieniasz w `paths.output`
tylko `<mapa>` na nazwę zgodną z kluczem w manifeście zdjęć (przy jednym
kadrze możesz zdjąć też `-{frame}`).

`style` w szablonie jasnym ma wartości z mapy ciemnej - to punkt wyjścia do
dostrojenia, nie wynik. Rola `settlement` i grubość `river` doszły po mapie
dojazdu (wrzesień 2026): w jasnym szablonie mają jej wartości,
w ciemnym zabudowa ma kolor budynków. Kroje w obu szablonach (`public-sans`, `plex-mono`)
to kroje przykładów: projekt mapy podmienia je na kroje serwisu z `fonts/`.

`reference/` to wzorzec jakości, nie palety: ciemna mapa miejska. Pokazuje
poziom, do którego dążymy - hierarchię dróg, halo podpisów, gęstość treści.

## Podział map.project.json

Sekcje pisane przez człowieka raz: `center`, `paths`, `extract`, `frames`,
`palette`, `fonts`, `label_fonts`, `label_colors`, `font_sizes_css`,
`widths_css`, `style`, `pin_css`, `marker_styles`. Sekcje produkowane w pętli
podpisów: `labels`, `markers` - każdy kadr musi mieć w nich wpis, choćby pustą
listę (`"labels": {"karta": []}`), inaczej render kończy się błędem.

Kolory: silnik nie parsuje `tokens.css` i nie będzie. Role, które mają
odpowiednik w tokenach (tło, halo, podpis główny, podpis przygaszony),
przepisujemy z `src/styles/tokens.css` - lista rola → token jest w README
mapy. Pozostałe role (rampa dróg, woda, zieleń, zabudowa, budynki) są
dostrojone, nie wyprowadzone.

Warstwy od spodu: zieleń (las, łąka, park - nie pole), zabudowa (plama wsi
z `landuse=residential` i pokrewnych), rzeki linią, woda, budynki, drogi,
podpisy. W małej skali (kilkanaście m/px) pojedyncze budynki to kropki bez
treści - wtedy `frames.<kadr>.min_building_m2` tak wysoko, żeby zniknęły,
a wieś niesie warstwa zabudowy.

Wyjście renderu: `media/img/_raw/mapa-<mapa>[-<kadr>].png`. Nazwa musi się
zgadzać z kluczem w `sources` manifestu zdjęć (`media/images.config.mjs`).
Identyfikator kadru jest daną projektu - zmiana nazwy kadru bez zmiany
manifestu rozjeżdża potok po cichu (build weźmie stary plik).

## Przepływ jednej mapy

1. **Brief** → `<mapa>/README.md`: punkt, co podpisać, gdzie mapa stoi
   w układzie serwisu.
2. **Pomiar kontenera** w serwisie (szerokości okna od telefonu do desktopu)
   → kadry: proporcja, szerokość w metrach, `container_css`, `render_px`.
   Kadr wynika z pomiaru, nie z oka.
3. **Dane**: bbox = punkt ± (połowa największego kadru + 1000 m) w obu osiach
   → `overpass.txt` → zrzut → `silnik/filtr.py` → `data/extract.json`. Zapas
   pozwala przesunąć albo poszerzyć kadr bez ponownego pobierania.
4. **Render**: `silnik/projekt.py` → `silnik/render.py --podglad` → oględziny
   zrzutów w `<mapa>/.podglad/`. Pętla podpisów do akceptacji Marka.
5. **Serwis**: pinezka (element HTML nad obrazem) i atrybucja w komponencie,
   wpis w manifeście, `npm run images:source`, `npm run images`.

## Polecenia

Windows, z katalogu `maps/`:

```powershell
# środowisko (raz)
py -3 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt

# zrzut danych
curl.exe -s --fail -A "brambruk-maps/1.0 (kodeleon.pl)" -X POST --data-binary "@<mapa>/overpass.txt" -o "<mapa>/data/dump.json" https://overpass-api.de/api/interpreter

# silnik
.venv\Scripts\python silnik\projekt.py -p <mapa>\map.project.json
.venv\Scripts\python silnik\filtr.py   -p <mapa>\map.project.json -z <mapa>\data\dump.json
.venv\Scripts\python silnik\render.py  -p <mapa>\map.project.json --podglad
.venv\Scripts\python silnik\render.py  -p <mapa>\map.project.json --kadr <kadr>
.venv\Scripts\python silnik\fonty.py   -p <mapa>\map.project.json
```

`projekt.py` - walidacja i podsumowanie. `render.py` bez `--kadr` renderuje
wszystkie kadry. `fonty.py` tylko rozpakowuje kroje do cache i wypisuje
ścieżki - przydaje się do sprawdzenia `cmap` bez renderu.

W PowerShell wydruk działa. Przy wyjściu przekierowanym do pliku albo potoku
(np. `| head` w Git Bash) Python pisze w kodowaniu systemu i `✓` wywraca
skrypt (`UnicodeEncodeError`). Wtedy przed poleceniem:
`$env:PYTHONIOENCODING = "utf-8"` (PowerShell) albo `export PYTHONIOENCODING=utf-8`.

`-A` jest konieczne: bez własnego `User-Agent` Overpass odrzuca zapytanie
kodem 406 (domyślny nagłówek curla jest blokowany - sprawdzone 27.09.2026).

**Zrzut jest poprawny**, gdy to JSON z niepustą tablicą `elements` i bez
pola `remark` (tak Overpass zgłasza przekroczony czas albo przeciążenie).
Rozmiar nie jest miarą: gęste miasto to kilkanaście-kilkadziesiąt MB, wieś
kilka MB.

## Kroje do renderu

Serwis serwuje kroje pocięte na podzbiory (`latin`, `latin-ext`), a polskie
znaki (ł, ę, ż, ś...) siedzą w `latin-ext`. Silnik bierze jeden plik na krój
(`fonts` w projekcie: `[plik, waga]`, waga `null` dla kroju statycznego), więc
render dostaje osobny plik z kompletem znaków w `maps/fonts/`, z licencją
obok. Ten katalog nie jest serwowany i nie wchodzi do builda.

`fonts/manrope.woff2` to `latin` + `latin-ext` z `@fontsource-variable/manrope`
(te same pliki, które serwuje `public/fonts/`), złożone przez `fonts/zloz.py`.
Krój zostaje zmienny - wagę wypala `silnik/fonty.py` z wpisu w projekcie,
np. `"manrope-600": ["manrope.woff2", 600]`. Skrypt sprawdza wynik przed
zapisem: każdy glif wypalony z pliku złożonego ma te same kontury i szerokość
co ze swojego podzbioru, w wagach 200-800. Po aktualizacji pakietu krój
składa się od nowa (polecenie w nagłówku `zloz.py`), a to jest zmiana
wyglądu wszystkich map - render przed i po jak przy zmianie silnika.

## Wnioski z pierwszej mapy (dojazd, wrzesień 2026)

Tego nie ma w szablonach, a kosztowało iteracje - przy następnej mapie od razu:

- **Położenia z OSM przed rozmiarem kadru.** Odległości oszacowane ze zrzutu
  Map Google były zaniżone o 1,55×, bo skala zrzutu była nieznana. Jedno
  małe zapytanie Overpass o węzły `place` (z `-A`, patrz Polecenia) daje
  prawdziwe metry, zanim zapadnie decyzja o kadrze.
- **Ramka z `object-cover` ucina boki, a nie podpisy.** Podpis na krawędzi
  nie znika, tylko jest cięty w pół słowa. Gdy pudełko bywa węższe niż
  obraz, drugi plik o TEJ SAMEJ proporcji i zasięgu, z podpisami, które
  mieszczą się w najwęższym pudełku - art direction po treści
  (`media/images.config.mjs`, użycie `mapa.dojazd`).
- **`sizes` przy `object-cover` to szerokość obrazu, nie pudełka**: pudełko
  290×362 pokrywa obraz 3:2 szeroki na 544 px.
- **Podpis wsi ulicówki obok drogi**, nie na niej: węzeł `place` leży na
  jezdni, halo przecina drogę. Przesunięcie liczone z geometrii wycinka
  (najbliższa pozycja bez kolizji z drogą główną, rzeką, pinezką i innymi
  podpisami) i opisane w README mapy.
- **Obraz sprawdzany w pudełkach z pomiaru**, nie tylko w `--podglad`:
  zrzut podglądu pokazuje cały kadr, a strona - wycinek po `object-cover`.

Szablon jasny po tej mapie: dostał rolę `settlement` i grubość `river`.
Paleta i kroje mapy dojazdu zostają w jej projekcie - to wartości BramBruka,
nie bazy.

## Atrybucja (ODbL)

Wyrenderowany obraz to "produced work" w rozumieniu ODbL 4.3 - wymaga
widocznej atrybucji **"© OpenStreetMap contributors"** z odnośnikiem do
https://www.openstreetmap.org/copyright **przy mapie, nie w stopce**.
Wyjątki z wytycznych OSMF (mniej niż 100 obiektów albo mniej niż 10 000 m²)
nie obejmują mapy okolicy.

## Zmiana silnika

Silnik jest w tym repozytorium, więc brak w silniku naprawia się tutaj,
w `silnik/`. Każda zmiana w `silnik/` albo w `requirements.txt`:

1. render wszystkich map z `maps/*/` **przed** zmianą, odłożony obok,
2. zmiana,
3. render **po** i porównanie pikselowe z renderem przed,
4. każda różnica jest albo zamierzonym skutkiem zmiany, albo błędem.

Porównanie po pikselach, nie po sumie pliku: Pillow potrafi zapisać te same
piksele w inne bajty. Liczba różnych pikseli:

```powershell
.venv\Scripts\python -c "import sys,numpy as n;from PIL import Image as I;a,b=(n.asarray(I.open(p).convert('RGBA')) for p in sys.argv[1:]);print((a!=b).any(2).sum())" przed.png po.png
```

Dopóki żadna mapa nie ma `data/extract.json`, nie ma na czym porównać -
silnika się wtedy nie zmienia.

Port silnika z Fade Barbera sprawdzono raz, punktem K0 (27.09.2026): render
z pliku projektu JSON dał 0 różnych pikseli względem `reference/`. Test był
jednorazowy - dane innego klienta nie zostają w repozytorium, więc `reference/`
jest dziś tylko wzorcem jakości, nie testem.

## Granica: czego tu nie robimy

- Jeden silnik: `silnik/`. Żadnych łatek w bibliotekach w `.venv`, kopii
  modułów w katalogu mapy, "renderu obok" dla jednej mapy.
- Nie pobieramy kafli ani zrzutów ekranu z serwisów map jako materiału
  do serwisu. Zrzut z Map Google może być briefem, nigdy wynikiem.

## Do bazy

Katalog powstał w BramBruk i przejdzie do `baza-astro`. Do bazy idą:
`README.md`, `CLAUDE.md`, `silnik/`, `templates/`, `reference/`,
`requirements.txt`, `fonts/zloz.py` i wpisy w `.gitignore`. Nie idą: katalogi
map i kroje z `fonts/` (kroje są projektu).

Warunek przeniesienia: akapit "Mapa nie jest w bazie" w README bazy do
przepisania - silnik i warstwa projektowa są teraz w bazie razem.

Dane: OpenStreetMap contributors, ODbL 1.0.
