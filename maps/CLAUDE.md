# maps/ - instrukcja dla Claude Code

Pracujesz nad statyczną mapą serwisu. Kolejność czytania:

1. `maps/README.md` - jak to działa, silnik, polecenia, zmiana silnika.
2. `maps/<mapa>/README.md` - brief tej mapy, decyzje, znaleziska, stan.
3. `maps/TODO-<mapa>.md`, jeśli istnieje - pracujesz z niego, odhaczając `[x]`.

Zasady z `../CLAUDE.md` obowiązują tu w całości (plan przed kodem, coś do
klikania po każdej grupie, bez commitów i wdrożeń, nie zgadujesz danych).
Poniżej tylko to, co specyficzne dla map.

## Twarde zasady

1. **Silnik jest w `silnik/` i wolno go zmieniać - według procedury.** Każda
   zmiana w `silnik/` albo w `requirements.txt` to render przed i po
   z porównaniem pikselowym (`README.md`, "Zmiana silnika"). Nie łatasz
   bibliotek w `.venv`, nie kopiujesz modułów do katalogu mapy, nie piszesz
   drugiego renderu obok. Tłumaczenie kluczy JSON na nazwy w kodzie tylko
   w tablicach na górze `silnik/projekt.py`. Zmiana silnika zmienia zakres
   zadania: brak w silniku zapisujesz jako znalezisko (niżej) i pytasz
   Marka, zanim ruszysz kod - chyba że zadanie wprost jest zmianą silnika.
2. **Nie zgadujesz współrzędnych.** Punkty podpisów bierzesz z danych OSM
   (węzły `place`, obiekty z nazwą w zrzucie). Jedyny punkt z zewnątrz to
   punkt centralny z briefu - i jego też sprawdzasz na danych.
3. **Nie zgadujesz wyglądu.** Role palety, które mają token, przepisujesz
   z `src/styles/tokens.css`. Pozostałe dostrajasz i pokazujesz Markowi
   na renderze, nie w tabelce hexów. Kroje: tylko kroje serwisu.
4. **Kolejność: pomiar → kadr → bbox → dane → render.** Kadr wynika
   z pomiaru kontenera w serwisie. Bbox wynika z kadru. Odwrócenie kolejności
   kończy się ponownym pobieraniem danych albo kadrem, który komponent
   i tak przytnie.
5. **Sieć.** Jeśli Overpass jest dla Ciebie nieosiągalny, nie szukasz
   mirrorów ani innych źródeł danych - podajesz Markowi jedno gotowe
   polecenie PowerShell (jest w README) i czekasz na plik.
6. **Punkt kontrolny to coś do obejrzenia**: PNG, zrzuty z `render.py
   --podglad` w `<mapa>/.podglad/` otwierane z dysku, strona w `npm run dev`.
   "`projekt.py` przechodzi" nie jest punktem kontrolnym.
7. **Pinezka jest elementem HTML nad obrazem**, wyśrodkowanym - silnik
   rysuje mapę wokół `center`, więc punkt jest zawsze na środku obrazu.
   `pin_css` opisuje prostokąt pinezki, który `render.py --podglad` rysuje na
   zrzutach. Kolizje podpisów z pinezką oceniasz na tych zrzutach okiem -
   automat jest tylko dla miejscowości na mapie kraju (`places`, zamówiony
   przez Marka 28.09.2026); dla podpisów ręcznych nie piszesz go bez pytania.
   Renderu pinezki w PNG nie robisz.
8. **Git**: w repozytorium są `silnik/`, `templates/`, `fonts/`,
   `requirements.txt`, w katalogu mapy `map.project.json`, `overpass.txt`,
   `data/extract.json`, plus znormalizowane źródło w `media/img/source/`.
   Poza nim: `.venv/`, `data/dump.json`, `.podglad/`, render
   w `media/img/_raw/`.

## Znaleziska dla silnika

Wszystko, czego silnik nie umie albo robi źle na tej mapie, zapisujesz
w `maps/<mapa>/README.md`, sekcja "Znaleziska dla silnika":

> co widać na mapie → przyczyna (plik i funkcja w `silnik/`) → propozycja
> zmiany → czy blokuje tę mapę

To jest lista do zrobienia tutaj, w `silnik/`. Naprawa po akceptacji Marka,
wg zasady 1: jedno znalezisko, jedna zmiana, jedno porównanie przed/po.

Czego silnik nie umie (wrzesień 2026, po poprawkach silnika przy mapie dojazdu) -
**sprawdź na swojej mapie, nie zakładaj**:

- Podpis drogi tylko z tagu `name`. Numer drogi (`ref`, np. 698) nie jest
  obsługiwany; obejście w danych projektu: podpis punktowy.
- Podświetlony obrys (`landmarki`) tylko dla `shop=mall` z nazwą. Kościół,
  sanktuarium, urząd: znacznik (`markers`, kształt `circle`) z podpisem.
- `highway=track` (drogi polne) nie jest rysowany. Z cieków tylko `river`
  i `canal` (linią); `stream`, `ditch`, `drain` nie.
- Granica państwa nie jest rysowana.
- Podpis punktowy stoi dokładnie w podanym punkcie - nie ma przesunięcia jak
  w znaczniku. Wieś ulicówka ma węzeł `place` na drodze, więc punkt podpisu
  to węzeł + przesunięcie liczone z geometrii (obok DW, nie na niej), zapisane
  w README mapy. Kolizje nie są liczone przez silnik.
- `silnik/render.py`: kadr bez wpisu w `labels` albo `markers` kończy się
  `KeyError` - każdy kadr potrzebuje wpisu, choćby pustej listy.

Naprawione w G5 (27.09.2026), żeby nikt nie szukał ich drugi raz: obwód
relacji multipolygon składany z kawałków i dziury `inner` (`filtr.py`,
`wielokaty`); `farmland`, `nature_reserve` poza zielenią, `wetland` poza wodą;
warstwa `zabudowa` z `landuse=residential` i pokrewnych; rzeki linią.
