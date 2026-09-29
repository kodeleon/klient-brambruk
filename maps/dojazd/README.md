# Mapa dojazdu - BramBruk

Mapa w karcie kontaktu: komponent `src/components/ui/MapaKontakt.astro`,
używany na `/kontakt/` i `/o-nas/`. Zastępuje dzisiejszą zaślepkę. W manifeście
zdjęć: źródło `mapa-dojazd` (dziś `planned: true`), użycie `mapa.dojazd`
(dziś celowo nieobecne - patrz komentarz przy kadrach w `media/images.config.mjs`).

Mapa obszaru działania (`mapa-region` na `/o-nas/`) to osobna mapa i osobny
katalog - **poza zakresem**.

## Punkt

Siedziba: **DW698 1, 21-550 Bohukały** (w `src/content/firma.json` jako
"Bohukały 1, 21-550").

Współrzędne z geokodowania adresu w Mapach Google (27.09.2026):
**52.1522233, 23.4611447** - wschodni kraniec Bohukał, przy DW698.

**Sprawdzone na danych OSM (27.09.2026):** punkt leży wewnątrz budynku
z adresem `Bohukały 1` (odległość 0 m). W `src/` współrzędnych siedziby nie ma -
`center` w `map.project.json` jest jedynym miejscem. Jeśli kiedyś dojdą
(np. dane strukturalne), to one i `center` muszą być tą samą liczbą.

## Co ma być podpisane

Brief: `brief-podpisy.png` - zrzut z Map Google od Marka, czerwone ramki to
podpisy do umieszczenia. Zrzut jest wyłącznie briefem: nie wchodzi do
serwisu i nie jest wzorcem wyglądu (wzorzec: `../reference/`).

| Podpis | Rodzaj w silniku | Skąd punkt |
|---|---|---|
| Bohukały | `district` | węzeł `place` |
| Pratulin | `district` | węzeł `place` |
| Zaczopki | `district` | węzeł `place` |
| Łęgi | `district` | węzeł `place` |
| Krzyczew | `district` | węzeł `place` |
| Sanktuarium Bł. Męczenników Podlaskich | `landmark`, w dwóch liniach | `amenity=place_of_worship` w Pratulinie - **dwa kandydaty**, niżej |
| Bug | `district` (jak "Wisła" w przykładzie krakowskim) | na poligonie rzeki, w miejscu z briefu: na wschód od Łęgów |

Tekst podpisu jest daną projektu - bierzemy go z briefu, nie z tagu `name`
(nazwa sanktuarium w OSM może być pełniejsza).

Położenie względem punktu - **z danych OSM**, nie ze zrzutu (x na wschód,
y na północ):

| Podpis | x | y | Źródło |
|---|---|---|---|
| Zaczopki | −3,77 km | +1,48 km | węzeł `place` 1859515940 |
| Pratulin | −1,78 km | +1,98 km | węzeł `place` 1859515644 |
| Sanktuarium | −1,83 / −1,65 km | +1,92 / +1,98 km | way 291654015 / 291654038 |
| Bohukały | −1,02 km | +0,44 km | węzeł `place` 359442737 |
| Łęgi | +0,23 km | +1,75 km | węzeł `place` 31694035 |
| Krzyczew | +1,89 km | −0,52 km | węzeł `place` 359443000 |
| Bug | ok. +2,3 km | ok. +2,1 km | z ramki w briefie - punkt z poligonu rzeki w G5 |

Pierwotny szacunek ze zrzutu (Zaczopki 2,3 km, Bug 1,5 km, sanktuarium
1,4 km) był zaniżony o ok. 1,55×: zrzut ma skalę 7,64 m/px (dopasowanie do
pięciu miejscowości; punkt siedziby wypada 8 px od szpica pinezki Google),
a nie ok. 4,9 m/px. Treść leży na północny zachód od punktu, pinezka stoi
na środku kadru - południowa połowa kadru jest pusta. To świadomy koszt
wyśrodkowanej pinezki (D3), większy, niż zakładał szacunek.

Sanktuarium: oba kościoły w Pratulinie mają w OSM
`shrine:name=Sanktuarium Błogosławionych Męczenników Podlaskich` - parafialny
pw. św. Apostołów Piotra i Pawła (1908, `alt_name` "Pratulin Martyrs
Sanctuary") i zabytkowy pw. Świętej Trójcy (XVIII w.). Leżą 180 m od siebie;
który jest punktem podpisu - pytanie do Marka w G5. Podpis i tak stoi nad
kościołem, nie na nim, bo inaczej przykryje "Pratulin".

## Decyzje

`[ ]` otwarte - rozstrzyga Marek, rekomendacja to propozycja.
`[x]` przesądzone.
D1 i D2 (wersja i źródło silnika) odpadły - silnik jest w `../silnik/`.
Numeracja zostaje, żeby odwołania w TODO się nie rozjechały.

- [x] **D3. Pinezka HTML, wyśrodkowana.** Wynika z silnika (`pin_css`)
  i z komponentu: przy `object-cover` środek obrazu zostaje na środku
  kontenera, więc pinezka trafia w punkt przy każdej proporcji karty.
  Kolor z tokenów marki, ikona `map-pin` z `src/components/icons/ikony.ts`.
  Pinezka poza środkiem = zmiana w silniku, nie w projekcie.
- [x] **D4. Jeden kadr czy dwa.** Dwa pliki - przyjęte przez Marka 27.09.2026. Po pomiarze (Stan, niżej) wygląda to
  inaczej, niż zakładał brief:

  - **Pudełko nigdy nie jest szersze od obrazu.** W jednej kolumnie (768)
    i na desktopie wysokość pudełka wyznacza sam obraz, więc `object-cover`
    nie obcina góry ani dołu - obcina tylko boki, i tylko w węższych
    pudełkach. Obawa "szeroka karta zgubi sanktuarium" odpada.
  - Proporcje pudełka przy obrazie 3:2: od 0,80 (telefon, `/o-nas/`, 290×362)
    do 1,50 (768, jedna kolumna). Desktop 1,42-1,50, siatka przy 1024:
    1,07-1,18.
  - Treść jest szersza, niż myśleliśmy: Zaczopki 3,8 km na zachód, sanktuarium
    (dwuwierszowy podpis ok. 170 px szerokości) 1,8 km na zachód.

  Wynik (`.podglad/kadry-szkic.png`, szczegóły w Stanie):
  - **Kadr A: 3:2, 9,4 × 6,3 km, jeden plik** - wszystkie podpisy na desktopie
    i przy 768. Przy 1024 wypadają Zaczopki. Na telefonie (5-6 km widocznej
    szerokości, 17 m/px) wypadają Zaczopki i sanktuarium, na najwęższym
    `/o-nas/` także Krzyczew i Bug.
  - Kadr, w którym telefon pokazuje wszystko poza Zaczopkami, musiałby mieć
    16 km (30 m/px) - to już nie jest mapa dojazdu. Drugi kadr z art direction
    ma sens tylko z INNYM zestawem podpisów na telefonie (np. sanktuarium
    jednym słowem), nie z tym samym w mniejszej skali.

  Art direction: działa (`use.art` → `<source media>` w
  `tools/media/markup.mjs`, `<Foto>` → `<Obraz>` → `renderUse`), ale `<source>`
  nie dostaje `width`/`height`. Przy innej proporcji kadru telefonu pudełko
  przeskoczy po wczytaniu obrazu (w jednej kolumnie wysokość wyznacza obraz).

  **Rekomendacja (zmieniona po renderze z podpisami):** dwa pliki o TEJ
  SAMEJ proporcji 3:2 i tym samym zasięgu (9,4 × 6,3 km), różne tylko
  podpisami:
  - `szeroki` - desktop (1280+) i jedna kolumna 768-1023: wszystkie podpisy;
  - `waski` - telefony (< 768) i siatka 1024-1279: bez Zaczopek, sanktuarium
    w trzech liniach, każdy podpis w całości w najwęższym pudełku (290×362),
    tekst w projektowanym rozmiarze na telefonie (`container_css` 544).

  Powód: przy jednym pliku podpisy na krawędzi nie znikały, tylko były
  **ucięte w pół słowa** ("KI", "zenników Podlaskich"), a na telefonie tekst
  był o 11% mniejszy. Ta sama proporcja obu plików znosi problem z brakiem
  `width`/`height` na `<source>` - pudełko nie przeskoczy. W manifeście:
  `art` z kadrem `waski` pod `(max-width:767px)` i
  `(min-width:1024px) and (max-width:1279px)` - do zrobienia w G6.

- [x] **D5. Paleta jasna** (serwis jest jasny) - przyjęta 27.09.2026, wartości w Stanie. Role z tokenów:
  `background` i `halo` ← `--color-brand-bg` (#f5f3ee) albo
  `--color-brand-card` (#ffffff, tło karty) - obejrzeć oba na renderze;
  `label_primary` ← `--color-brand-text`; `label_district` ←
  `--color-brand-text-light`. Pozostałe role dostrojone, punkt wyjścia:
  `../templates/map.project.light.json`.
- [x] **D6. Kroje.** Przyjęte 27.09.2026; nazwy obiektów (sanktuarium, Bug) stylem `stop`. **Rekomendacja:** wszystkie podpisy w Manrope (krój
  treści, najczytelniejszy w małych stopniach); miejscowości jako
  `district` z rozstrzałem, jak "SŁUŻEWIEC" we wzorcu. Montserrat
  i Audiowide nie na mapie.
- [ ] **D7. Strona białoruska.** Za Bugiem w kadrze A wypadnie ok. 2 km
  terenu - rysuje się jak reszta, dane OSM obejmują oba brzegi.
  **Rekomendacja:** bez podpisu "Białoruś" (nie ma go w briefie), rzeka
  wystarcza do orientacji. Granica nie jest rysowana (patrz `../CLAUDE.md`).

## Znaleziska dla silnika

_Format w `../CLAUDE.md`. Naprawa w `../silnik/` po akceptacji Marka._
1-4 naprawione 27.09.2026 po uwagach Marka do K2 ("rzeka wygląda jak jezioro,
nie ma miejscowości, dziwne kropki i jasne plamy") - zmiany w `../silnik/` opisane niżej.
Jasne plamy na zieleni były w 82% artefaktem znaleziska 1 (park krajobrazowy
pocięty cięciwami), w reszcie niezarysowaną zabudową wsi (znalezisko 3).
Stan przed poprawkami: `.podglad/przed-G5.png`.

1. **Brzeg Bugu jako jezioro 22 km².** → `silnik/filtr.py`, `pierscienie`:
   każdy zewnętrzny way relacji multipolygon to osobny pierścień, a relacja
   brzegu Bugu (5450812) ma obwód pocięty na 4 otwarte waye - każdy domyka
   się cięciwą. To samo park krajobrazowy (4520071, 178 km²) i las (410590).
   → Składać kawałki w pierścienie (`shapely.ops.polygonize`), `inner` jako
   dziury. W danych kawałki składają się w zamknięte pierścienie - sprawdzone.
   → **Naprawione** (`filtr.py`, `wielokaty`).
2. **Zieleń przykrywa cały kadr (58,5 km² warstwy na 57,7 km² kadru).** →
   `silnik/taksonomia.py`: `leisure=nature_reserve` (33% zieleni - to granica
   parku, nie las) i `landuse=farmland` (29%) w `ZIELEN_*`, `natural=wetland`
   w `WODA_NATURAL`. → Zdjąć wszystkie trzy: pole = tło, zieleń = las i łąka,
   bagno bez koloru. → **Blokuje czytelność** ("wieś, a nie zielona plama").
   → **Naprawione** (`taksonomia.py`). Dotyczy każdej mapy.
3. **Wsi nie widać, tylko drobne budynki.** → `landuse=residential` (56
   obiektów w zrzucie) nie jest w taksonomii. → Nowa warstwa i rola palety
   (jak szare plamy wsi w Mapach Google). → **Naprawione**: warstwa
   `zabudowa`, rola `settlement`; budynki wyłączone progiem kadru.
4. **Rzeka bez brzegów znika.** → woda tylko z poligonów. Bug w kadrze:
   17 km linii, poligony pokrywały 89% przed poprawką 1 (luki 1064 m i 722 m -
   do przeliczenia po niej); Krzna: 11%. → Rysować `waterway=river` linią.
   → **Naprawione**: `waterway=river|canal` linią pod poligonem wody.
5. **DW698 bez nazwy do podpisu.** 40 z 47 odcinków nie ma `name`, 7 ma
   "Terespolska"; `ref` nie jest obsługiwany (znane). → Obejście w projekcie:
   podpis punktowy "698", jeśli Marek chce numer drogi. → Nie blokuje.
6. `highway=track`: 246 dróg polnych w zrzucie, nierysowane (znane). Na tej
   skali to raczej zaleta. → Nie blokuje.

## Stan

Stan na 27.09.2026. Mapa wdrożona w `MapaKontakt` (`/kontakt/`, `/o-nas/`).
Otwarte: który kościół w Pratulinie (niżej), D7 (bez podpisu "Białoruś" - tak jest).

**Pomiar kontenera (G2.1)** - pudełko `MapaKontakt` w px CSS, `npm run dev`,
`puppeteer-core`. "Zaślepka" = dzisiejszy stan (bez własnej proporcji);
"obraz 3:2" = podstawiony `<img width height>` o proporcji kadru A.

| Okno | `/kontakt/` zaślepka | `/kontakt/` obraz 3:2 | `/o-nas/` zaślepka | `/o-nas/` obraz 3:2 |
|---|---|---|---|---|
| 360 | 320×362 | 320×362 (0,88) | 290×362 | 290×362 (0,80) |
| 390 | 350×362 | 350×362 (0,97) | 320×362 | 320×362 (0,88) |
| 768 | 728×362 | 728×486 (1,50) | 698×362 | 698×466 (1,50) |
| 1024 | 448×420 | 448×420 (1,07) | 426×362 | 426×362 (1,18) |
| 1280 | 576×405 | 576×405 (1,42) | 554×362 | 554×370 (1,50) |
| 1440 | 576×405 | 576×405 (1,42) | 554×362 | 554×370 (1,50) |

Przy obrazie 4:3 wysokość rośnie tam, gdzie wyznacza ją obraz (768: 547 px,
1280 `/kontakt/`: 433 px). `min-h-[360px]` trzyma telefony w pionie.

**Kadr A (propozycja, G2.2):** 3:2, 9400 × 6267 m, `render_px` 2400
(pokrywa 728 px CSS przy DPR 3), `container_css` 608 (szerokość całego obrazu
w pudełku 576×405 - tam rozmiary w px CSS są dokładne). Co zostaje z kadru
w pudełku (podpisy 11 px, sanktuarium 13,5 px):

| Pudełko | m/px | Widać | Wypada |
|---|---|---|---|
| 576×405 (`/kontakt/` 1280+) | 15,3 | 8,8 × 6,2 km | - |
| 554×370 (`/o-nas/` 1280+) | 16,8 | 9,3 × 6,2 km | - |
| 728×486 (768) | 12,8 | 9,3 × 6,2 km | - |
| 448×420 (`/kontakt/` 1024) | 14,8 | 6,6 × 6,2 km | Zaczopki |
| 426×362 (`/o-nas/` 1024) | 17,1 | 7,3 × 6,2 km | Zaczopki |
| 320-350×362 (telefon) | 17,1 | 5,5-6,0 × 6,2 km | Zaczopki, sanktuarium |
| 290×362 (`/o-nas/` 360) | 17,1 | 5,0 × 6,2 km | + Krzyczew, Bug |

(liczone dla 9300 m - minimum, przy którym desktop mieści wszystko; projekt
ma 9400 m, z zapasem.)

**Dane (G3):** zrzut Overpass 27.09.2026 (`osm_base` 2026-09-27T19:47Z),
bbox `52.1154,23.3786,52.1891,23.5437` = punkt ± 5650 m × ± 4100 m
(połowa kadru A + 1000 m), 5,0 MB, 3914 elementów, bez `remark`, wszystkie
miejscowości z briefu obecne. Wycinek: `span_m` 5200 × 3650, 356 kB -
274 drogi, 1533 budynki, 146 płatów zieleni, 103 wody.

Wycinek po poprawkach silnika (G5): 400 kB - 274 drogi, 114 płatów zieleni,
38 zabudowy, 133 wody, 4 rzeki, 1533 budynki (na mapie wyłączone).

**Render (G5):** 27.09.2026, `media/img/_raw/mapa-dojazd-szeroki.png`
i `-waski.png` (po 2400×1600). Oba kadry w zmierzonych pudełkach:
`.podglad/w-pudelkach.png`.

- Paleta: `background`/`halo` #f5f3ee (`--color-brand-bg`), podpisy #2d2d2d
  (`--color-brand-text`). Dostrojone: zieleń #d5dcc8 (30% `--color-brand-sage-jasny`
  na tle), zabudowa #e4ddd1, woda #a9c7dc, DW698 #b3a794.
- Kroje: miejscowości Manrope 700, wersaliki, rozstrzał 0,14, 11 px CSS,
  #2d2d2d. Nazwy obiektów (sanktuarium, Bug) jednym stylem `stop`: Manrope
  600, 10 px, #6e6b64 (`--color-brand-text-light`) - decyzja Marka
  27.09.2026. Bug ma rodzaj `stop`, bo nazwa znacznika zawsze idzie tym
  stylem - jedno źródło kroju, rozmiaru i koloru dla obu.
- Budynki wyłączone (`min_building_m2` 1 000 000): przy 15-17 m/px dom to
  kropka; wieś niesie warstwa zabudowy.
- `pin_css` 30×38 - tymczasowo z szablonu, do ustalenia w G6.2.

**Punkty podpisów.** Kotwica z OSM (tabela w "Co ma być podpisane"), tekst
przesunięty tak, żeby nie leżał na DW698, na rzece, na pinezce ani na innym
podpisie - najbliższa wolna pozycja, liczona z geometrii wycinka i metryk
Manrope (skrypt jednorazowy, wynik w `map.project.json`). Przesunięcia
w metrach od kotwicy:

| Podpis | `szeroki` | `waski` |
|---|---|---|
| Zaczopki | +62 E, +216 N | - (poza telefonem) |
| Pratulin | 0, −285 S (pod kropką sanktuarium) | 0, −311 S |
| Bohukały | +62 E, +186 N | +69 E, +449 N |
| Łęgi | 0, +186 N | 0 |
| Krzyczew | +124 E, +309 N | −346 W, −622 S |
| Bug | 310 m na zachód od nurtu (strona polska) | 449 m na zachód od nurtu |
| Sanktuarium | znacznik na kościele 291654015, tekst 310 m nad nim | tekst 3 linie, +128 E, +479 N |

Sanktuarium: znacznik stoi na kościele pw. św. Apostołów Piotra i Pawła
(`alt_name` "Pratulin Martyrs Sanctuary", strona sanktuarium w tagach).
Drugi kandydat (Świętej Trójcy) leży 180 m dalej - **do potwierdzenia
przez Marka**.

Zmiany w `../silnik/` dla tej mapy: składanie obwodów relacji i dziury
(`filtr.py`), taksonomia bez pól, rezerwatów i bagien, warstwa zabudowy i rzeki
linią (`taksonomia.py`, `render.py`), rola `settlement` i grubość `river`
(`projekt.py`)
(regresja na danych Fade Barbera: każda różnica w promieniu 1,4 px od
pierścienia wielokąta z dziurą).

**Serwis (G6-G7, 27.09.2026).** Manifest `media/images.config.mjs`: źródła
`mapa-dojazd-szeroki` i `mapa-dojazd-waski` (oryginał PNG → źródło JPEG q90
4:4:4, 1877×1251), kadry 3:2 z pełną klatką zapisaną w `media/crops.json`,
warianty 640/1088/1632 px (AVIF 16-44 kB, WebP 21-59 kB, JPEG 30-106 kB),
użycie `mapa.dojazd` z `SIZES.mapa` i `art` dla wąskiego pliku pod
`(max-width:639px), (min-width:1024px) and (max-width:1279px)`. Podpisy
obejrzane po kompresji (AVIF, WebP, JPEG) - halo i szare 10 px bez rozmycia.

`MapaKontakt.astro`: pinezka `map-pin` 46 px (z `pin_css.height`), wypełnienie
`--color-brand-olive-text`, obrys `--color-brand-card`, szpic w środku ramki
przez `-translate-y-[95.8%]`; atrybucja „© OpenStreetMap contributors" w prawym
górnym rogu. `moduly.mapa: true` - przełącznik niczego nie steruje (opis
w `src/config/site.ts`).

Kontrola: `npm run build` przechodzi; `npm run no-js` - `/kontakt/` i `/o-nas/`
czytają się bez JS; audyt (port 4411, build, nie dev): `/kontakt/` LH 87 mobile
/ 100 desktop, `/o-nas/` 95 / 100, axe 0 naruszeń. LCP na telefonie to nagłówek
H1, nie mapa (mapa: AVIF 29 kB, `loading="lazy"`).
