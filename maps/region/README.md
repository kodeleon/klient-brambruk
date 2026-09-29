# Mapa obszaru działania - BramBruk

Mapa regionu z zaznaczonym obszarem ~100 km wokół Białej Podlaskiej. Miejsce:
`/o-nas/`, sekcja „Obszar działania" (`src/pages/o-nas.astro`), klucz
`mapa.region` w `media/images.config.mjs`.

## Brief (Marek, 28.09.2026)

- obszar ok. 100 km wokół Białej Podlaskiej **bez Białorusi i Ukrainy** -
  obszar ucięty na granicy państwa;
- teren wyraźnie zaznaczony;
- dużo miast, ale nazwy nie mogą na siebie nachodzić;
- po pierwszej wersji (cała Polska): **mapa skupiona na obszarze działania**,
  żeby było widać miejscowości, które firma faktycznie obsługuje.

## Decyzje

`[ ]` otwarte - rozstrzyga Marek. `[x]` przesądzone.

- [x] **R1. Obszar**: okrąg 100 km po kuli od węzła `place=city` Biała Podlaska
  (52.0338399, 23.1193948), przecięty z lądem Polski. Wypełnienie #dde79c
  (oliwka marki na tle), krawędź łuku #8fa316 (`--color-brand-olive-dark`),
  bez krawędzi wzdłuż granicy - tam jest linia granicy państwa.
- [x] **R2. Zasięg**: sam region, nie cała Polska (Marek, 28.09.2026). Środek
  kadru 35 km na zachód od Białej (za Bugiem jest już tylko tło), kwadrat
  225 km, kadry 3:2 338 × 225 km - z Warszawą i Radomiem przy lewej krawędzi.
- [x] **R3. Sąsiedzi** szarzy (#e6e2d9), bez podpisów; Polska #fafaf7
  (`--color-brand-section`), rzeki, jeziora, drogi krajowe i wojewódzkie
  cienko, granice województw.
- [x] **R4. Miejscowości automatycznie**: miasta, miasteczka i siedziby gmin.
  W obszarze od 1000 mieszkańców z wagą ×20, poza nim od 10-15 tys. Pogrubione
  od 25 tys. Wersję gęstą wybrał Marek (28.09.2026) - wariant rzadszy,
  z pierwszeństwem dla listy „gdzie pracujemy najczęściej", odrzucony.
- [x] **R5. Ramka** o proporcji obrazu zamiast stałej wysokości (320/380 px
  z `object-cover`): kwadrat do 639 px, 3:2 wyżej.

## Stan (28.09.2026)

**Dane**: zrzut Overpass 27.09.2026 (`osm_base` 2026-09-27T23:05Z), 127 MB,
61 755 elementów: ramka `50.775,19.688,53.292,25.529`, granica Polski
(relacja 49715), 12 województw i 709 gmin w ramce, 466 miast i miasteczek,
422 wsie gminne, rzeki, jeziora, drogi `motorway|trunk|primary|secondary`.
Wycinek 1,5 MB. Wszystkie 19 miejscowości z listy na `/o-nas/` są w danych.

W OSM granica Polski i województwa lubelskiego ma przerwę 176 m (Bug, ok.
24,14°E 50,86°N) - filtr domyka takie luki do ~1 km (`filtr.py`, `domknij_luki`).

**Kadry** (odwzorowanie stożkowe Lamberta, równoleżniki 51,3° i 52,7°):

| Kadr | Proporcja | Zasięg | `container_css` | Dla okna | Miejscowości |
|---|---|---|---|---|---|
| `kwadrat` | 1:1 | 225 km | 350 | do 639 px | 58 |
| `tablet` | 3:2 | 338 km | 728 | 640-1023 px | 115 |
| `karta` | 3:2 | 338 km | 504 | od 1024 px | 70 |

Pliki w serwisie: AVIF/WebP/JPEG, kwadrat 400/800/1200, tablet 800/1400/1900,
karta 600/1140/1460 (AVIF np. 65 kB na telefonie, 77 kB na desktopie).
Podgląd na stronie: `.podglad/k5/` i `.podglad/k5-arkusz.png`.

**Kontrola**: `npm run build` przechodzi, `/o-nas/` czyta się bez JS, audyt
(build): Lighthouse 88-99 mobile (rozrzut między uruchomieniami) / 100 desktop,
axe 0 naruszeń, CLS 0.

**Do sprawdzenia przez Marka**: przy 1024-1279 px karta ma 440 px - podpisy
~13% mniejsze niż projektowane (wsie ~9 px). Kadr tabletowy (115 nazw) jest
najgęstszy - ten sam styl co wybrane, ale Marek widział tylko telefon i desktop.

## Znaleziska dla silnika

Nowe możliwości silnika dla tej mapy - w `../README.md`, „Mapa regionu na
tle kraju".
