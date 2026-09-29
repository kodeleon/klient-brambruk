#!/usr/bin/env python3
"""
RENDER: wycinek z `paths.extract` → PNG pod `paths.output`.

Wynik wchodzi w istniejący potok zdjęć jako oryginał w `_raw/`. Dalej robotę
przejmuje `npm run images:source` i `npm run images`. Renderer NIE pisze do
`source/` ani do `public/assets/`.

Wszystkie wartości wyglądu są w pliku projektu (`map.project.json`),
wczytywanym przez `projekt.py`. Ten plik nie zna ani jednej z nich.

CO TU JEST NIEOCZYWISTE
───────────────────────

1. **Podpisy ulic biegną po osi jezdni, litera po literze.** Nie „obok drogi"
   i nie „pod kątem drogi w jednym punkcie" — każda litera dostaje własną
   pozycję i własny kąt z lokalnej stycznej, więc napis podąża za łukiem.
   To jest różnica między mapą a wykresem z podpisanymi seriami.

2. **Halo rysowane w osobnym przebiegu.** Gdyby każda litera niosła własną
   obwódkę, obwódka litery N+1 nadgryzałaby literę N. Dlatego najpierw
   idą wszystkie obwódki (zorder 20), a dopiero potem wszystkie wypełnienia
   (zorder 21). Halo w kolorze tła wycina drogę spod tekstu.

3. **Kierunek czytania.** Ścieżka z OSM biegnie w dowolną stronę. Bez obrócenia
   połowa nazw wyszłaby do góry nogami. Reguła: napis poziomy czyta się
   w prawo, pionowy do góry.

4. **Mapa kraju** (`projection: lcc`, warstwy `kraj`/`morze`/`granice` z filtra,
   `highlight`, `frames.<id>.places`): miejscowości podpisywane automatycznie,
   od najważniejszych; podpis, który na coś by nachodził albo wyszedłby poza
   kadr, wypada razem z kropką. Kolejność = ważność, więc wypadają najmniejsze.
"""

from __future__ import annotations

import argparse
import io
import json
import math
import sys
import time
from pathlib import Path

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.collections import LineCollection, PathCollection, PolyCollection
from matplotlib.path import Path as SciezkaMpl
from matplotlib.font_manager import FontProperties
from matplotlib.patches import Circle, Rectangle
from matplotlib.patheffects import withStroke
from fontTools.ttLib import TTFont
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import linemerge, unary_union

import fonty
from projekt import wczytaj

DPI = 100
Z_HALO, Z_TEKST = 20, 21

# Przypisanie rodzaju podpisu do kroju i do roli palety jest daną projektu
# (`label_fonts`, `label_colors` w map.project.json), nie stałą silnika:
# klient z jednym krojem mapuje wszystkie rodzaje na ten sam plik.


_METRYKI: dict[Path, tuple] = {}


def metryki_kroju(sciezka: Path) -> tuple:
    if sciezka not in _METRYKI:
        font = TTFont(sciezka)
        _METRYKI[sciezka] = (font["head"].unitsPerEm, font.getBestCmap(), font["hmtx"])
    return _METRYKI[sciezka]


def szerokosci_znakow(sciezka: Path, tekst: str, rozmiar_px: float) -> list[float]:
    upem, cmap, hmtx = metryki_kroju(sciezka)
    out = []
    for znak in tekst:
        glif = cmap.get(ord(znak))
        out.append((hmtx[glif][0] if glif else upem // 2) / upem * rozmiar_px)
    return out


def zapisz(cel: Path, dane: bytes, proby: int = 8) -> None:
    """
    Zapis z ponowieniem. Na Windows świeżo zapisany plik bywa przez chwilę
    trzymany przez inny proces (skaner, synchronizacja dysku) i `open` kończy
    się `OSError: [Errno 22]` - przy renderze kilku kadrów pod rząd prawie
    zawsze na którymś. Obraz liczony raz, do pamięci; ponawiany jest tylko zapis.
    """
    for proba in range(proby):
        try:
            cel.write_bytes(dane)
            return
        except OSError:
            if proba == proby - 1:
                raise
            time.sleep(0.5 * (proba + 1))


def pole_ze_znakiem(punkty) -> float:
    """Dodatnie dla pierścienia przeciwnie do ruchu wskazówek zegara."""
    s = 0.0
    for i in range(len(punkty) - 1):
        s += punkty[i][0] * punkty[i + 1][1] - punkty[i + 1][0] * punkty[i][1]
    return s / 2


def pole_m2(punkty) -> float:
    return abs(pole_ze_znakiem(punkty))


def rysuj_powierzchnie(ax, wielokaty, kolor, zorder) -> None:
    """
    Wielokąty jako listy pierścieni: [obwód, dziura, dziura...].

    Bez dziur idą przez `PolyCollection` jak dotąd, z dziurami - przez ścieżkę
    złożoną. Podział nie jest kosmetyką: ta sama figura inną drogą
    rasteryzacji może różnić się o piksele na krawędziach, a porównanie
    przed/po zmianie silnika ma pokazywać różnicę TYLKO tam, gdzie dziura
    faktycznie jest.
    """
    pelne = [w[0] for w in wielokaty if len(w) == 1]
    if pelne:
        ax.add_collection(PolyCollection(pelne, facecolors=kolor, edgecolors="none", zorder=zorder))
    sciezki = []
    for w in (w for w in wielokaty if len(w) > 1):
        wierzcholki, kody = [], []
        for nr, pierscien in enumerate(w):
            # Obwód przeciwnie do ruchu wskazówek zegara, dziury zgodnie - wtedy
            # dziura wycina się niezależnie od reguły wypełnienia i od kierunku,
            # w jakim pierścień zapisano w OSM.
            if (nr == 0) != (pole_ze_znakiem(pierscien) > 0):
                pierscien = pierscien[::-1]
            wierzcholki.append(np.asarray(pierscien))
            kody += ([SciezkaMpl.MOVETO] + [SciezkaMpl.LINETO] * (len(pierscien) - 2)
                     + [SciezkaMpl.CLOSEPOLY])
        sciezki.append(SciezkaMpl(np.concatenate(wierzcholki), kody))
    if sciezki:
        ax.add_collection(PathCollection(sciezki, facecolors=kolor, edgecolors="none", zorder=zorder))


def skala_stopnia(lat: float) -> tuple[float, float]:
    f = math.radians(lat)
    return (111132.95 - 559.85 * math.cos(2 * f) + 1.175 * math.cos(4 * f),
            111412.84 * math.cos(f) - 93.5 * math.cos(3 * f))


R_ZIEMI = 6371008.8


def odwzorowanie(PR):
    """
    Funkcja (lon, lat) → metry od punktu centralnego projektu.

    `local` - lokalna skala stopnia w punkcie. Dokładna na kilkunastu km, na
    kilkuset rozjeżdża się (na krańcach Polski ±7% w poziomie). Zostaje
    domyślna i dosłownie ta sama arytmetyka co wcześniej: mapy okolicy mają
    wyglądać piksel w piksel jak przed wprowadzeniem odwzorowań.
    `lcc` - stożkowe Lamberta na sferze: kąty wierne, skala prawie stała między
    równoleżnikami - kraj ma swój znajomy kształt.
    """
    lat0, lng0 = PR.centrum()
    if PR.ODWZOROWANIE.get("typ", "local") == "local":
        m_lat, m_lng = skala_stopnia(lat0)
        return lambda lon, lat: ((lon - lng0) * m_lng, (lat - lat0) * m_lat)
    f1, f2 = (math.radians(v) for v in PR.ODWZOROWANIE["rownolezniki"])
    tg = lambda f: math.tan(math.pi / 4 + f / 2)
    n = math.log(math.cos(f1) / math.cos(f2)) / math.log(tg(f2) / tg(f1))
    F = math.cos(f1) * tg(f1) ** n / n
    rho0 = R_ZIEMI * F / tg(math.radians(lat0)) ** n

    def lcc(lon, lat):
        rho = R_ZIEMI * F / tg(math.radians(lat)) ** n
        kat = n * math.radians(lon - lng0)
        return rho * math.sin(kat), rho0 - rho * math.cos(kat)
    return lcc


def okrag_geodezyjny(lat: float, lon: float, promien_m: float, n: int = 240):
    """Punkty (lon, lat) w stałej odległości od środka - po kuli, nie w rzucie."""
    d = promien_m / R_ZIEMI
    f1, l1 = math.radians(lat), math.radians(lon)
    for i in range(n):
        th = 2 * math.pi * i / n
        f2 = math.asin(math.sin(f1) * math.cos(d) + math.cos(f1) * math.sin(d) * math.cos(th))
        l2 = l1 + math.atan2(math.sin(th) * math.sin(d) * math.cos(f1),
                             math.cos(d) - math.sin(f1) * math.sin(f2))
        yield math.degrees(l2), math.degrees(f2)


def na_pierscienie(geom) -> list:
    """Shapely → lista wielokątów w postaci [obwód, dziura...] dla `rysuj_powierzchnie`."""
    return [[list(p.exterior.coords), *[list(i.coords) for i in p.interiors]]
            for p in getattr(geom, "geoms", [geom])
            if p.geom_type == "Polygon" and not p.is_empty]


def sciezka_ulicy(drogi, nazwa: str, hint, ramka) -> LineString | None:
    """
    Najlepszy fragment ulicy do podpisania: scalony, przycięty do kadru,
    najbliższy podpowiedzi z konfiguracji i obrócony do kierunku czytania.

    Scalanie jest konieczne, bo OSM tnie ulicę na kilkadziesiąt wayów po
    skrzyżowaniach i zmianach atrybutów. Bez tego najdłuższy „fragment ulicy"
    miałby 40 metrów i nie zmieściłby nawet połowy nazwy.
    """
    czesci = [LineString(g) for g in drogi.get(nazwa, []) if len(g) >= 2]
    if not czesci:
        return None

    scalone = linemerge(unary_union(czesci))
    kawalki = list(scalone.geoms) if scalone.geom_type == "MultiLineString" else [scalone]

    w_kadrze = []
    for kawalek in kawalki:
        przyciety = kawalek.intersection(ramka)
        if przyciety.is_empty:
            continue
        w_kadrze += (list(przyciety.geoms) if przyciety.geom_type == "MultiLineString"
                     else [przyciety])
    w_kadrze = [l for l in w_kadrze if l.geom_type == "LineString" and l.length > 1]
    if not w_kadrze:
        return None

    cel = Point(hint)
    # Najbliższy podpowiedzi, ale nie kosztem długości: fragment krótszy niż
    # 60 m nie udźwignie żadnej nazwy, choćby leżał dokładnie pod kursorem.
    uzyteczne = [l for l in w_kadrze if l.length >= 60] or w_kadrze
    wybrany = min(uzyteczne, key=lambda l: l.distance(cel))

    wsp = list(wybrany.coords)
    dx = wsp[-1][0] - wsp[0][0]
    dy = wsp[-1][1] - wsp[0][1]
    odwroc = (dx < 0) if abs(dx) >= abs(dy) else (dy < 0)
    return LineString(wsp[::-1] if odwroc else wsp)


def main() -> None:
    ap = argparse.ArgumentParser(description="Wycinek → PNG mapy.")
    ap.add_argument("-p", "--projekt", required=True, help="map.project.json")
    ap.add_argument("--kadr", default=None, help="tylko ten kadr")
    ap.add_argument("--podglad", action="store_true",
                    help="dodatkowo zrzuty w szerokościach CSS z obrysem pinezki")
    args = ap.parse_args()

    PR = wczytaj(args.projekt)
    if args.kadr and args.kadr not in PR.KADRY:
        sys.exit(f"✗ nie ma kadru {args.kadr!r}; są: {', '.join(PR.KADRY)}")

    plik = PR.sciezka("extract")
    if not plik.exists():
        sys.exit(f"✗ brak wycinka: {plik}\n  uruchom najpierw silnik/filtr.py")
    dane = json.loads(plik.read_text(encoding="utf-8"))
    kroje = fonty.sciezki(PR)

    print()
    for kadr in ([args.kadr] if args.kadr else list(PR.KADRY)):
        cel = render(PR, kadr, dane, kroje, args.podglad)
        print(f"  {kadr:10s} → {cel}  ({cel.stat().st_size / 1024:.0f} kB)")
    print()


def render(PR, kadr: str, dane: dict, kroje: dict[str, Path], podglad: bool) -> Path:
    cfg = PR.KADRY[kadr]

    szer_m = cfg["szerokosc_m"]
    wys_m = szer_m * cfg["proporcja"][1] / cfg["proporcja"][0]
    szer_px = cfg["render_px"]
    wys_px = round(szer_px * cfg["proporcja"][1] / cfg["proporcja"][0])

    # Jedyny mnożnik w całym pliku. Wszystko, co w konfiguracji jest w pikselach
    # CSS, przechodzi przez niego — patrz nagłówek konfiguracji.
    mnoznik = szer_px / cfg["kontener_css"]
    px = lambda css: css * mnoznik              # px CSS → px renderu
    pkt = lambda css: px(css) * 72 / DPI        # px CSS → punkty matplotlib
    m_na_px = szer_m / szer_px

    proj = odwzorowanie(PR)

    def rzut(pary):
        return [proj(lon, lat) for lon, lat in pary]

    P = PR.PALETA
    fig = plt.figure(figsize=(szer_px / DPI, wys_px / DPI), dpi=DPI)
    fig.patch.set_facecolor(P["tlo"])
    ax = fig.add_axes((0, 0, 1, 1))
    ax.set_facecolor(P["tlo"])
    ax.set_xlim(-szer_m / 2, szer_m / 2)
    ax.set_ylim(-wys_m / 2, wys_m / 2)
    ax.set_aspect("equal")
    ax.axis("off")

    W = dane["warstwy"]

    # ---- mapa kraju: morze, ląd kraju, obszar, granice ----------------
    # Tło kadru to sąsiedzi; kraj i morze leżą na nim. Mapa okolicy tych
    # warstw nie ma - wtedy nic się tu nie rysuje i obraz jest jak dawniej.
    rysuj_powierzchnie(ax, [[rzut(r) for r in p] for p in W.get("morze", [])], P["woda"], 0.5)
    kraj = [[rzut(r) for r in p] for p in W.get("kraj", [])]
    rysuj_powierzchnie(ax, kraj, P["kraj"], 0.6)
    obszar = None
    if PR.OBSZAR and kraj:
        # Okrąg po kuli, przycięty do lądu kraju: obszar kończy się na granicy,
        # nie wchodzi za nią ani w morze.
        kraj_u = unary_union([Polygon(p[0], p[1:]).buffer(0) for p in kraj])
        (olat, olon), promien = PR.OBSZAR["srodek"], PR.OBSZAR["promien_km"] * 1000
        kolo = Polygon([proj(lon, lat) for lon, lat in okrag_geodezyjny(olat, olon, promien)])
        obszar = kolo.intersection(kraj_u)
        rysuj_powierzchnie(ax, na_pierscienie(obszar), P["obszar"], 0.7)
        luk = kolo.exterior.intersection(kraj_u)
        luki = [list(l.coords) for l in getattr(luk, "geoms", [luk]) if l.geom_type == "LineString"]
        if luki:
            ax.add_collection(LineCollection(
                luki, colors=P["obszar_krawedz"], linewidths=pkt(PR.GRUBOSCI_CSS["obszar_krawedz"]),
                capstyle="round", joinstyle="round", zorder=2.7))
    for poziom, kolor, grub, zorder in ((4, "granica_drobna", "granica_drobna", 2.5),
                                        (2, "granica", "granica", 2.6)):
        linie = [rzut(g["linia"]) for g in W.get("granice", [])
                 if (g["poziom"] == 2) == (poziom == 2)]
        if linie:
            ax.add_collection(LineCollection(
                linie, colors=P[kolor], linewidths=pkt(PR.GRUBOSCI_CSS[grub]),
                capstyle="round", joinstyle="round", zorder=zorder))

    # ---- powierzchnie, od najdalszej warstwy ------------------------
    # `.get`, bo wycinek sprzed warstwy zabudowy i rzek (np. mapa Fade
    # Barbera) nie ma tych kluczy, a render ma go czytać bez ponownego filtra.
    for warstwa, kolor, zorder in (("zielen", P["zielen"], 1),
                                   ("zabudowa", P["zabudowa"], 1.5),
                                   ("woda", P["woda"], 2),
                                   ("budynki", P["budynek"], 3)):
        wielokaty = [[rzut(pierscien) for pierscien in p] for p in W.get(warstwa, [])]
        if warstwa == "budynki":
            prog = cfg["min_budynek_m2"]
            wielokaty = [w for w in wielokaty if pole_m2(w[0]) >= prog]
        rysuj_powierzchnie(ax, wielokaty, kolor, zorder)

    # Rzeka linią POD poligonem wody, w tym samym kolorze: tam, gdzie brzegi
    # są w OSM, linii nie widać; tam, gdzie ich brak, rzeka się nie rwie.
    rzeki = [rzut(k["linia"]) for k in W.get("rzeki", [])]
    if rzeki:
        ax.add_collection(LineCollection(
            rzeki, colors=P["woda"], linewidths=pkt(PR.GRUBOSCI_CSS["rzeka"]),
            capstyle="round", joinstyle="round", zorder=1.9))

    landmarki = [rzut(l["ring"][0]) for l in W["landmarki"]]
    if landmarki:
        ax.add_collection(PolyCollection(
            landmarki, facecolors=P["landmark"], edgecolors="none", zorder=4))

    # Tor kolejowy rysujemy dwa razy: ciągła linia, a na niej przerywana
    # nakładka w kolorze tła. To klasyczny „drabinkowy" znak kolei i jedyny
    # sposób, żeby odróżnić ją od drogi bez dokładania legendy.
    kolejowe = [rzut(k["linia"]) for k in W["kolej"] if k["typ"] in ("rail", "light_rail")]
    if kolejowe:
        ax.add_collection(LineCollection(
            kolejowe, colors=P["kolej"], linewidths=pkt(PR.GRUBOSCI_CSS["kolej"]),
            capstyle="butt", zorder=5))
        ax.add_collection(LineCollection(
            kolejowe, colors=P["kolej_podklad"], linewidths=pkt(PR.GRUBOSCI_CSS["kolej"] * 0.62),
            linestyles=(0, (pkt(2.6), pkt(3.4))), capstyle="butt", zorder=5.1))

    # Tor tramwajowy rysujemy NAD jezdnią, nie pod nią: w Warszawie tramwaj
    # jedzie środkiem ulicy, więc pod spodem był niewidoczny — a wtedy znacznik
    # przystanku znowu nie miał kontekstu. Cienka, nieco jaśniejsza linia
    # środkiem jezdni to standardowy sposób pokazania tego na mapach.
    tramwajowe = [rzut(k["linia"]) for k in W["kolej"] if k["typ"] in ("tram", "subway")]
    if tramwajowe:
        ax.add_collection(LineCollection(
            tramwajowe, colors=P["tram"], linewidths=pkt(PR.GRUBOSCI_CSS["tram"]),
            capstyle="butt", zorder=11))

    # ---- drogi: od najdrobniejszych, żeby główne były na wierzchu ----
    wg_nazwy: dict[str, list] = {}
    kolejnosc = ("drobne", "dojazdowe", "lokalne", "zbiorcze", "glowne")
    for i, klasa in enumerate(kolejnosc):
        if klasa not in cfg["klasy_drog"]:
            continue
        linie = []
        for d in W["drogi"]:
            if d["klasa"] != klasa:
                continue
            xy = rzut(d["linia"])
            linie.append(xy)
            if d.get("nazwa"):
                wg_nazwy.setdefault(d["nazwa"], []).append(xy)
        if linie:
            ax.add_collection(LineCollection(
                linie, colors=P[f"droga_{klasa}"], linewidths=pkt(PR.GRUBOSCI_CSS[klasa]),
                capstyle="round", joinstyle="round", zorder=6 + i))

    # Nazwy ulic zbieramy ze WSZYSTKICH klas, także tych, których w tym kadrze
    # nie rysujemy — inaczej podpis znikałby razem z klasą.
    for d in W["drogi"]:
        if d.get("nazwa") and d["nazwa"] not in wg_nazwy:
            wg_nazwy.setdefault(d["nazwa"], []).append(rzut(d["linia"]))

    # ---- podpisy -----------------------------------------------------
    ramka = box(-szer_m / 2, -wys_m / 2, szer_m / 2, wys_m / 2)

    def wypisz(x, y, znak, rodzaj, kat=0.0, ha="center"):
        """Jedna litera w dwóch przebiegach: najpierw obwódka, potem tekst."""
        wspolne = dict(
            fontproperties=FontProperties(fname=kroje[PR.KROJE_PODPISOW[rodzaj]]),
            fontsize=pkt(PR.PISMO_CSS[rodzaj]),
            rotation=kat, rotation_mode="anchor", ha=ha, va="center",
        )
        ax.text(x, y, znak, color=P["halo"], zorder=Z_HALO,
                path_effects=[withStroke(linewidth=pkt(PR.HALO_CSS),
                                         foreground=P["halo"], alpha=PR.HALO_ALFA)],
                alpha=PR.HALO_ALFA, **wspolne)
        ax.text(x, y, znak, color=P[PR.KOLORY_PODPISOW[rodzaj]], zorder=Z_TEKST, **wspolne)

    # Ramka z zapasem dla podpisów, którym wolno wyjść poza kadr: ścieżka musi
    # istnieć poza krawędzią, inaczej litery spiętrzyłyby się na jej końcu.
    ramka_luzna = box(-szer_m / 2 - 400, -wys_m / 2 - 400, szer_m / 2 + 400, wys_m / 2 + 400)

    def podpis_ulicy(nazwa: str, hint, zacisk: bool = True) -> None:
        linia = sciezka_ulicy(wg_nazwy, nazwa, hint, ramka if zacisk else ramka_luzna)
        if linia is None:
            print(f'    · pominięto podpis {nazwa!r} - brak fragmentu w kadrze')
            return
        krojpliku = kroje[PR.KROJE_PODPISOW["ulica"]]
        rozmiar_px = px(PR.PISMO_CSS["ulica"])
        adv = [a * m_na_px for a in szerokosci_znakow(krojpliku, nazwa, rozmiar_px)]
        odstep = PR.TRACKING_ULICA * rozmiar_px * m_na_px
        calosc = sum(adv) + odstep * (len(nazwa) - 1)

        if calosc > linia.length:
            print(f'    · {nazwa!r} ({calosc:.0f} m) dluzsze niz fragment '
                  f'({linia.length:.0f} m) - napis wyjdzie poza jezdnie')

        # Środek napisu w miejscu wskazanym przez `przy`, ale tak, żeby cały
        # napis mieścił się na wybranym fragmencie.
        s = linia.project(Point(hint))
        if zacisk:
            s = min(max(s, calosc / 2), max(calosc / 2, linia.length - calosc / 2))
        else:
            # Bez zacisku napis stoi dokładnie tam, gdzie wskazano, nawet jeśli
            # część liter wyjdzie poza kadr — kanwa je przytnie.
            s = min(max(s, 0), linia.length)
        kursor = s - calosc / 2

        for znak, szer in zip(nazwa, adv):
            srodek = kursor + szer / 2
            a = linia.interpolate(max(0, srodek - 6))
            b = linia.interpolate(min(linia.length, srodek + 6))
            p_ = linia.interpolate(srodek)
            kat = math.degrees(math.atan2(b.y - a.y, b.x - a.x))
            wypisz(p_.x, p_.y, znak, "ulica", kat)
            kursor += szer + odstep

    def podpis_punktowy(tekst, x, y, rodzaj, ha="center") -> None:
        linie = tekst if isinstance(tekst, list) else [tekst]
        krojpliku = kroje[PR.KROJE_PODPISOW[rodzaj]]
        rozmiar_px = px(PR.PISMO_CSS[rodzaj])
        interlinia = PR.INTERLINIA * rozmiar_px * m_na_px
        gora = y + interlinia * (len(linie) - 1) / 2

        for nr, wiersz in enumerate(linie):
            wy = gora - nr * interlinia
            if rodzaj == "dzielnica":
                # Rozstaw liczony z tablicy hmtx kroju i rysowany znak po znaku:
                # matplotlib nie zna `letter-spacing`, a wstawianie spacji dałoby
                # odstęp kilka razy za duży i zależny od kroju.
                wiersz = wiersz.upper()
                adv = szerokosci_znakow(krojpliku, wiersz, rozmiar_px)
                odstep = PR.TRACKING_DZIELNICA * rozmiar_px
                calosc = (sum(adv) + odstep * (len(wiersz) - 1)) * m_na_px
                kursor = x - calosc / 2
                for znak, szer in zip(wiersz, adv):
                    wypisz(kursor, wy, znak, rodzaj, ha="left")
                    kursor += (szer + odstep) * m_na_px
            else:
                wypisz(x, wy, wiersz, rodzaj, ha=ha)

    for p_ in PR.PODPISY[kadr]:
        if "ulica" in p_:
            podpis_ulicy(p_["ulica"], p_["przy"], p_.get("zacisk", True))
        else:
            podpis_punktowy(p_["punkt"], *proj(p_["lon"], p_["lat"]), p_["rodzaj"])

    # ---- znaczniki punktowe ------------------------------------------
    for z in PR.ZNACZNIKI[kadr]:
        opis = PR.ZNACZNIK[z["rodzaj"]]
        bok = px(opis["bok_css"]) * m_na_px
        zx, zy = proj(z["lon"], z["lat"])

        if opis["ksztalt"] == "pociag":
            # Piktogram zamiast litery: „K" nic nie znaczy, a kropka — jak się
            # okazało — tym bardziej. Wagon składa się z trzech prostokątów,
            # bo przy 12,5 px CSS każdy dodatkowy detal zlewa się w plamę.
            ax.add_patch(Rectangle((zx - bok / 2, zy - bok / 2), bok, bok,
                                   facecolor=P["znacznik_tlo"], edgecolor="none",
                                   zorder=Z_TEKST + 1))
            k = P["znacznik_znak"]
            ax.add_patch(Rectangle((zx - bok * 0.29, zy - bok * 0.30), bok * 0.58, bok * 0.62,
                                   facecolor=k, edgecolor="none", zorder=Z_TEKST + 2))
            ax.add_patch(Rectangle((zx - bok * 0.21, zy + bok * 0.03), bok * 0.42, bok * 0.19,
                                   facecolor=P["znacznik_tlo"], edgecolor="none",
                                   zorder=Z_TEKST + 3))
            for bok_kola in (-0.24, 0.11):
                ax.add_patch(Rectangle((zx + bok * bok_kola, zy - bok * 0.38),
                                       bok * 0.13, bok * 0.10,
                                       facecolor=k, edgecolor="none", zorder=Z_TEKST + 2))
        elif opis["ksztalt"] == "kwadrat":
            ax.add_patch(Rectangle((zx - bok / 2, zy - bok / 2), bok, bok,
                                   facecolor=P["znacznik_tlo"], edgecolor="none",
                                   zorder=Z_TEKST + 1))
            ax.text(zx, zy, opis["znak"], color=P["znacznik_znak"],
                    fontproperties=FontProperties(fname=kroje[opis["kroj"]]),
                    fontsize=pkt(opis["pismo_css"]), ha="center", va="center",
                    zorder=Z_TEKST + 2)
        else:
            # Kółko z obwódką w kolorze halo: bez niej znacznik zlewa się
            # z jezdnią, na której z definicji stoi. Halo, nie tło kadru - na
            # mapie kraju tłem są sąsiedzi, a znacznik stoi na lądzie kraju.
            ax.add_patch(Circle((zx, zy), bok / 2 + px(opis["obwodka_css"]) * m_na_px,
                                facecolor=P["halo"], edgecolor="none", zorder=Z_TEKST + 1))
            ax.add_patch(Circle((zx, zy), bok / 2,
                                facecolor=P["znacznik_tlo"], edgecolor="none",
                                zorder=Z_TEKST + 2))

        if z.get("nazwa"):
            dx, dy = z.get("przesuniecie", (0, 0))
            podpis_punktowy(z["nazwa"], zx + dx, zy + dy, "przystanek",
                            ha=z.get("wyrownanie", "center"))

    # ---- miejscowości: podpisy automatyczne (mapa kraju) --------------
    if cfg.get("miejscowosci") and W.get("miejscowosci"):
        rozmiesc_miejscowosci(PR, kadr, cfg, W["miejscowosci"], proj, obszar, kroje,
                              szer_m, wys_m, ax, podpis_punktowy, px, P)

    cel = PR.sciezka("output", frame=kadr)
    cel.parent.mkdir(parents=True, exist_ok=True)
    bufor = io.BytesIO()
    fig.savefig(bufor, format="png", dpi=DPI, facecolor=P["tlo"], pad_inches=0)
    zapisz(cel, bufor.getvalue())

    if podglad:
        podglad_dir = PR.sciezka("preview")
        podglad_dir.mkdir(parents=True, exist_ok=True)
        from PIL import Image, ImageDraw
        obraz = Image.open(cel).convert("RGB")
        # Szerokości podglądu są daną kadru (`preview_css`), nie stałą silnika:
        # to ma być zakres kontenerów, jaki ten kadr realnie obsługuje w serwisie.
        for css in cfg.get("preview_css") or [cfg["kontener_css"]]:
            wys = round(css * wys_px / szer_px)
            mini = obraz.resize((css, wys), Image.LANCZOS)
            pin = PR.PODGLAD_PINEZKA
            skala = css / cfg["kontener_css"]
            pw, ph = pin["szerokosc_css"] * skala, pin["wysokosc_css"] * skala
            if pw and ph:  # mapa bez pinezki (kraj) ma pin_css 0×0
                ImageDraw.Draw(mini).rectangle(
                    [css / 2 - pw / 2, wys / 2 - ph, css / 2 + pw / 2, wys / 2],
                    outline=(178, 58, 69), width=max(1, round(skala)))
            mini.save(podglad_dir / f"{kadr}-{css}css.png")

    plt.close(fig)
    return cel


def rozmiesc_miejscowosci(PR, kadr, cfg, miejscowosci, proj, obszar, kroje,
                          szer_m, wys_m, ax, podpis_punktowy, px, P) -> None:
    """
    Kropka + podpis dla miejscowości, bez nachodzenia.

    Zachłannie, od najważniejszej: waga = ludność, w obszarze wyróżnionym
    pomnożona przez `highlight_weight` (tam mapa ma być gęstsza). Dla każdej
    osiem pozycji podpisu wokół kropki, w kolejności kartograficznej (prawo,
    lewo, skosy, góra, dół). Wolna = mieści się w kadrze z marginesem i nie
    nachodzi na żaden postawiony podpis, kropkę ani znacznik z `markers`.
    Z wolnych wygrywa pierwsza, która nie przykrywa kropki miejscowości
    czekającej w kolejce; gdy każda przykrywa - pierwsza wolna. Brak wolnej
    pozycji = miejscowość wypada cała, bez osieroconej kropki.

    Wszystko liczone w metrach rzutu, rozmiary tekstu z metryk kroju - ten
    sam rozmiar, który potem narysuje matplotlib.
    """
    mc = cfg["miejscowosci"]
    m_css = szer_m / cfg["kontener_css"]           # metry na px CSS
    pomin = set(mc.get("pomin", []))
    r = mc["kropka_css"] / 2 * m_css
    g = mc["odstep_css"] * m_css
    pad = 1.5 * m_css
    marg = mc["margines_css"] * m_css
    X0, X1 = -szer_m / 2 + marg, szer_m / 2 - marg
    Y0, Y1 = -wys_m / 2 + marg, wys_m / 2 - marg

    def wolne(pr, zajete):
        x0, y0, x1, y1 = pr
        if x0 < X0 or x1 > X1 or y0 < Y0 or y1 > Y1:
            return False
        return not any(x0 < b[2] and x1 > b[0] and y0 < b[3] and y1 > b[1] for b in zajete)

    def szer_tekstu(tekst, rodzaj):
        plik = kroje[PR.KROJE_PODPISOW[rodzaj]]
        return sum(szerokosci_znakow(plik, tekst, PR.PISMO_CSS[rodzaj])) * m_css

    # Znaczniki z projektu są przeszkodą: kropka i jej podpis.
    zajete = []
    for z in PR.ZNACZNIKI.get(kadr, []):
        opis = PR.ZNACZNIK[z["rodzaj"]]
        zx, zy = proj(z["lon"], z["lat"])
        rz = (opis["bok_css"] / 2 + opis.get("obwodka_css", 0)) * m_css
        zajete.append((zx - rz, zy - rz, zx + rz, zy + rz))
        if z.get("nazwa"):
            linie = z["nazwa"] if isinstance(z["nazwa"], list) else [z["nazwa"]]
            w = max(szer_tekstu(l, "przystanek") for l in linie)
            h = PR.PISMO_CSS["przystanek"] * (1 + PR.INTERLINIA * (len(linie) - 1)) * m_css
            dx, dy = z.get("przesuniecie", (0, 0))
            ax_, ay_ = zx + dx, zy + dy
            lewo = {"left": ax_, "right": ax_ - w}.get(z.get("wyrownanie", "center"), ax_ - w / 2)
            zajete.append((lewo - pad, ay_ - h / 2 - pad, lewo + w + pad, ay_ + h / 2 + pad))

    kandydaci = []
    for m in miejscowosci:
        if m["nazwa"] in pomin:
            continue
        x, y = proj(m["lon"], m["lat"])
        w_obszarze = obszar is not None and obszar.contains(Point(x, y))
        # Wieś gminna często nie ma w OSM `population` - bez zastępczej liczby
        # spadłaby na koniec kolejki za każdą osadą z tagiem.
        ludnosc = m["ludnosc"] or (mc.get("ludnosc_siedziby", 0) if m.get("siedziba") else 0)
        if ludnosc < (mc["min_ludnosc_obszar"] if w_obszarze else mc["min_ludnosc"]):
            continue
        waga = ludnosc * (mc["waga_obszaru"] if w_obszarze else 1)
        kandydaci.append((waga, m, x, y))
    kandydaci.sort(key=lambda k: -k[0])

    # Kropki wszystkich kandydatów z góry: podpis ważniejszego miasta omija
    # kropkę mniejszego, jeśli tylko może. Bez tego „Warszawa" (stawiana
    # pierwsza, domyślnie na prawo) przykrywała kropkę Siedlec 90 km dalej
    # i Siedlce wypadały z mapy, choć podpis Warszawy zmieściłby się z lewej.
    kropki = [(x - r - pad / 2, y - r - pad / 2, x + r + pad / 2, y + r + pad / 2)
              for _, _, x, y in kandydaci]

    postawione = []
    for i, (_, m, x, y) in enumerate(kandydaci):
        rodzaj = "miasto" if m["ludnosc"] >= mc["ludnosc_miasta"] else "miasteczko"
        w = szer_tekstu(m["nazwa"], rodzaj)
        h = PR.PISMO_CSS[rodzaj] * m_css
        kropka = kropki[i]
        if not wolne(kropka, zajete):
            continue
        czekajace = kropki[i + 1:]
        s = r * 0.7
        wybor = zapas = None
        for ax_, ay_, ha in ((x + r + g, y, "left"), (x - r - g, y, "right"),
                             (x + s + g / 2, y + h / 2 + s, "left"), (x + s + g / 2, y - h / 2 - s, "left"),
                             (x - s - g / 2, y + h / 2 + s, "right"), (x - s - g / 2, y - h / 2 - s, "right"),
                             (x, y + r + g + h / 2, "center"), (x, y - r - g - h / 2, "center")):
            lewo = {"left": ax_, "right": ax_ - w}.get(ha, ax_ - w / 2)
            pudelko = (lewo - pad, ay_ - h / 2 - pad, lewo + w + pad, ay_ + h / 2 + pad)
            if not wolne(pudelko, zajete):
                continue
            zapas = zapas or (ax_, ay_, ha, pudelko)
            if wolne(pudelko, czekajace) or not czekajace:
                wybor = (ax_, ay_, ha, pudelko)
                break
        wybor = wybor or zapas
        if wybor:
            ax_, ay_, ha, pudelko = wybor
            zajete += [kropka, pudelko]
            postawione.append((m, x, y, ax_, ay_, ha, rodzaj))

    for m, x, y, ax_, ay_, ha, rodzaj in postawione:
        kolor = P[PR.KOLORY_PODPISOW[rodzaj]]
        ax.add_patch(Circle((x, y), r + px(0.8) * szer_m / cfg["render_px"],
                            facecolor=P["halo"], edgecolor="none", zorder=Z_TEKST + 1))
        ax.add_patch(Circle((x, y), r, facecolor=kolor, edgecolor="none", zorder=Z_TEKST + 2))
        podpis_punktowy(m["nazwa"], ax_, ay_, rodzaj, ha=ha)
    print(f"    · miejscowości: {len(postawione)} z {len(kandydaci)} kandydatów "
          f"(reszta nachodziłaby na inne podpisy)")

if __name__ == "__main__":
    main()
