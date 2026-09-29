#!/usr/bin/env python3
"""
FILTR: surowy zrzut Overpass → wycinek pod `paths.extract`.

Po co ten krok w ogóle istnieje: zrzut Overpass ma od kilku do kilkudziesięciu
MB i jest wyłączony
z repozytorium, więc bez tego pliku render byłby odtwarzalny tylko u kogoś, kto
najpierw pobierze dane. Wycinek jest na tyle mały, że może leżeć w repozytorium,
a to on — nie zrzut — jest wejściem renderu.

Co robi, w kolejności:
  1. rozwija geometrię wayów i relacji multipolygon (obwód składany
     z kawałków, dziury odejmowane - patrz `wielokaty`),
  2. przypisuje obiekty do warstw rysunkowych (`silnik/taksonomia.py`),
  3. przycina wszystko do zasięgu z `extract.span_m` w pliku projektu,
  4. upraszcza linie i pierścienie (Douglas-Peucker) tolerancją równą jednemu
     pikselowi CSS docelowego układu — punkty bliższe i tak wpadłyby w ten sam
     piksel, więc nie tracimy niczego, co dałoby się zobaczyć,
  5. wyrzuca powierzchnie mniejsze od progu widoczności.

Współrzędne zostają w lon/lat (WGS84), NIE w metrach od punktu centralnego.
Dane zapisane względem punktu trzeba by regenerować po każdym przesunięciu
adresu, choć świat się nie ruszył — a punkt bywa niepotwierdzony do końca
projektu. Projekcję liczy render, nie filtr.

Mapa kraju (`extract.country` w projekcie) dostaje dodatkowo: morze złożone
z linii brzegowej, ląd kraju (granica ∩ ląd - bez pasa wód terytorialnych),
granicę państwa i granice jednostek z `extract.admin_levels` jako linie oraz
miejscowości (`place=city|town`) z ludnością.

Użycie:
    python silnik/filtr.py -p <mapa>/map.project.json -z <mapa>/data/dump.json
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import date
from pathlib import Path

import re

from shapely import STRtree
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import linemerge, polygonize, polygonize_full, unary_union

import taksonomia as T
from projekt import wczytaj


def metry_na_stopien(lat: float) -> tuple[float, float]:
    """Lokalna skala stopnia. Na 3 km wystarczy z ogromnym zapasem."""
    f = math.radians(lat)
    m_lat = 111132.95 - 559.85 * math.cos(2 * f) + 1.175 * math.cos(4 * f)
    m_lng = 111412.84 * math.cos(f) - 93.5 * math.cos(3 * f)
    return m_lat, m_lng


def warstwa_powierzchni(t: dict) -> str | None:
    if t.get("building"):
        return "budynki"
    if t.get("natural") in T.WODA_NATURAL or t.get("landuse") in T.WODA_LANDUSE:
        return "woda"
    if (t.get("landuse") in T.ZIELEN_LANDUSE
            or t.get("leisure") in T.ZIELEN_LEISURE
            or t.get("natural") in T.ZIELEN_NATURAL):
        return "zielen"
    if t.get("landuse") in T.ZABUDOWA_LANDUSE:
        return "zabudowa"
    return None


# Największa luka w obwodzie relacji, którą domykamy odcinkiem prostym (stopnie,
# ~1 km). Większa to już nie przerwa w danych, tylko brakujący kawałek granicy.
LUKA_DEG = 0.01


def domknij_luki(scalone, id_relacji: int):
    """
    Obwód relacji z przerwą: łączy najbliższe końce otwartych łańcuchów,
    jeśli dzieli je mniej niż `LUKA_DEG`. Duża relacja (granica państwa, 1600
    wayów) potrafi mieć w OSM przerwę kilkuset metrów - bez domknięcia
    `polygonize` nie składa z niej ani jednego wielokąta i kraj znika z mapy.
    """
    lancuchy = [list(l.coords) for l in getattr(scalone, "geoms", [scalone])]
    zamkniete = [l for l in lancuchy if l[0] == l[-1]]
    otwarte = [l for l in lancuchy if l[0] != l[-1]]
    while otwarte:
        a = otwarte.pop()
        odl = lambda p, q: math.hypot(p[0] - q[0], p[1] - q[1])
        najlepszy = (odl(a[-1], a[0]), None, False)
        for i, b in enumerate(otwarte):
            for odwroc in (False, True):
                bb = b[::-1] if odwroc else b
                if odl(a[-1], bb[0]) < najlepszy[0]:
                    najlepszy = (odl(a[-1], bb[0]), i, odwroc)
        luka, i, odwroc = najlepszy
        if luka > LUKA_DEG:
            print(f"    · relacja {id_relacji}: obwód urwany (luka {luka * 111000:.0f} m) - pominięty")
            continue
        if luka > 1e-5:
            print(f"    · relacja {id_relacji}: domknięto lukę {luka * 111000:.0f} m w obwodzie")
        if i is None:
            zamkniete.append(a + [a[0]])
        else:
            b = otwarte.pop(i)
            otwarte.append(a + (b[::-1] if odwroc else b))
    return unary_union([LineString(l) for l in zamkniete])


def wielokaty(element: dict) -> list[Polygon]:
    """
    Wielokąty elementu: zamknięty way `out geom` albo relacja multipolygon.

    Obwód dużego obszaru (brzeg rzeki, park, las) jest w OSM pocięty na
    kilka OTWARTYCH wayów. Wzięty kawałek po kawałku, każdy domykał się prostą
    cięciwą - z brzegu Bugu wychodziło „jezioro” 22 km² z prostą krawędzią.
    Dlatego kawałki składa `polygonize`, a role `inner` są dziurami (wyspa
    w rzece, polana w lesie). Otwarty way nie jest powierzchnią - to linia
    z błędnym tagiem albo fragment obwodu, który ma sens tylko w relacji.
    """
    if element["type"] == "way":
        g = element.get("geometry") or []
        if len(g) < 4 or g[0] != g[-1]:
            return []
        return [Polygon([(p["lon"], p["lat"]) for p in g])]

    def zloz(role: tuple[str, ...]) -> list[Polygon]:
        linie = [LineString([(p["lon"], p["lat"]) for p in c["geometry"]])
                 for c in element.get("members", [])
                 if c.get("type") == "way" and c.get("role") in role
                 and len(c.get("geometry") or []) >= 2]
        if not linie:
            return []
        siec = unary_union(linie)
        # Najpierw zwykłe składanie. Naprawiamy TYLKO krawędzie, których
        # `polygonize` nie umiał użyć (urwane końce) - obwody poprawne idą
        # dokładnie tą samą drogą co zawsze.
        gotowe, ciecia, urwane, _ = polygonize_full(siec)
        wynik = list(getattr(gotowe, "geoms", []))
        luzne = [g for kol in (ciecia, urwane) for g in getattr(kol, "geoms", [])]
        if luzne:
            siec_l = unary_union(luzne)
            scalone = linemerge(siec_l) if siec_l.geom_type == "MultiLineString" else siec_l
            wynik += list(polygonize(domknij_luki(scalone, element["id"])))
        return wynik

    dziury = unary_union(zloz(("inner",)))
    out = []
    for p in zloz(("outer", "")):
        if not dziury.is_empty:
            p = p.difference(dziury)
        out += [g for g in getattr(p, "geoms", [p]) if g.geom_type == "Polygon"]
    return out


def morze_z_wybrzeza(linie: list[LineString], ramka: Polygon, eps: float) -> list[Polygon]:
    """
    Morze z linii brzegowej. OSM nie ma poligonu morza - ma `natural=coastline`
    rysowaną tak, że ląd leży PO LEWEJ, woda po prawej. Linie przycięte do
    ramki razem z jej obwodem dzielą ją na ściany (`polygonize`); ściana, do
    której trafia punkt tuż na prawo od odcinka wybrzeża, jest morzem.
    Głosowanie po wielu odcinkach, bo pojedynczy punkt przy krętym brzegu może
    wpaść do sąsiedniej ściany.
    """
    if not linie:
        return []
    przyciete = [l.intersection(ramka) for l in linie]
    siec = unary_union([ramka.exterior] + [g for g in przyciete if not g.is_empty])
    sciany = list(polygonize(siec))
    if not sciany:
        return []
    drzewo = STRtree(sciany)
    glosy = [0] * len(sciany)
    wnetrze = ramka.buffer(-eps * 4)
    for l in linie:
        wsp = list(l.coords)
        krok = max(1, (len(wsp) - 1) // 20)
        for i in range(0, len(wsp) - 1, krok):
            (x1, y1), (x2, y2) = wsp[i], wsp[i + 1]
            dl = math.hypot(x2 - x1, y2 - y1)
            if dl == 0:
                continue
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            if not wnetrze.contains(Point(mx, my)):
                continue
            nx, ny = (y2 - y1) / dl * eps, -(x2 - x1) / dl * eps  # na prawo od kierunku
            for (px, py), znak in (((mx + nx, my + ny), 1), ((mx - nx, my - ny), -1)):
                for j in drzewo.query(Point(px, py), predicate="within"):
                    glosy[j] += znak
    return [s for s, g in zip(sciany, glosy) if g > 0]


def ciagle(geom):
    """Linie z przecięć i sum rozpadają się na odcinki; scalamy z powrotem
    w ciągłe łańcuchy - mniej ścieżek, mniejszy wycinek, gładsze połączenia."""
    linie = [g for g in getattr(geom, "geoms", [geom]) if g.geom_type == "LineString"]
    if not linie:
        return geom
    return linemerge(linie) if len(linie) > 1 else linie[0]


def ludnosc(t: dict) -> int:
    """`population` bywa zapisane ze spacjami albo kropkami tysięcy."""
    cyfry = re.sub(r"[^\d]", "", t.get("population", ""))
    return int(cyfry) if cyfry else 0


def main() -> None:
    ap = argparse.ArgumentParser(description="Zrzut Overpass → wycinek dla renderu.")
    ap.add_argument("-p", "--projekt", required=True, help="map.project.json")
    ap.add_argument("-z", "--zrzut", required=True, help="surowy zrzut Overpass")
    args = ap.parse_args()

    PR = wczytaj(args.projekt)
    zrodlo = Path(args.zrzut).resolve()
    if not zrodlo.exists():
        sys.exit(f"✗ brak zrzutu: {zrodlo}\n  pobierz go wg polecenia z maps/README.md")

    lat0, lng0 = PR.centrum()
    m_lat, m_lng = metry_na_stopien(lat0)
    zx, zy = PR.WYCINEK["zasieg_m"]
    ramka = box(lng0 - zx / m_lng, lat0 - zy / m_lat, lng0 + zx / m_lng, lat0 + zy / m_lat)

    # Tolerancja i progi podane w metrach, liczone w stopniach: oś lng jest przy
    # 52° prawie dwa razy „krótsza" od lat, więc jedna liczba dla obu osi
    # zniekształcałaby upraszczanie. Bierzemy oś ostrzejszą (lat).
    tol = PR.WYCINEK["tolerancja_m"] / m_lat
    m2_na_stopien2 = m_lat * m_lng
    prec = PR.WYCINEK["miejsc_po_przecinku"]

    elementy = json.loads(zrodlo.read_text(encoding="utf-8"))["elements"]

    # Siedziby gmin (i innych jednostek z `extract.place_admin_levels`): węzły
    # `admin_centre` relacji granic. Na mapie regionu to one są miejscowościami,
    # do których firma jeździ - wsie gminne, nie tylko miasta.
    siedziby = {c["ref"] for e in elementy
                if e["type"] == "relation" and (e.get("tags") or {}).get("boundary") == "administrative"
                and (e.get("tags") or {}).get("admin_level") in
                {str(p) for p in PR.WYCINEK.get("siedziby_poziomy", [])}
                for c in e.get("members", [])
                if c.get("type") == "node" and c.get("role") == "admin_centre"}

    powierzchnie: dict[str, list] = {"woda": [], "zielen": [], "zabudowa": [], "budynki": []}
    landmarki: list[dict] = []
    drogi: list[dict] = []
    kolej: list[dict] = []
    rzeki: list[dict] = []
    wybrzeze: list[LineString] = []
    administracja: list[dict] = []
    miejscowosci: list[dict] = []
    kod_kraju = PR.WYCINEK.get("kraj")

    for e in elementy:
        t = e.get("tags") or {}

        # ---- mapa kraju: wybrzeże, granice, miejscowości -----------
        if kod_kraju:
            if e["type"] == "way" and t.get("natural") == "coastline":
                g = e.get("geometry") or []
                if len(g) >= 2:
                    wybrzeze.append(LineString([(p["lon"], p["lat"]) for p in g])
                                    .simplify(tol, preserve_topology=False))
                continue
            if e["type"] == "relation" and t.get("boundary") == "administrative":
                administracja.append(e)
                continue
            if (e["type"] == "node" and t.get("name")
                    and (t.get("place") in ("city", "town") or e["id"] in siedziby)):
                miejscowosci.append({"id": e["id"], "nazwa": t["name"], "lon": e["lon"], "lat": e["lat"],
                                     "typ": t.get("place", ""), "ludnosc": ludnosc(t),
                                     **({"siedziba": True} if e["id"] in siedziby else {})})
                continue

        # ---- linie -------------------------------------------------
        if e["type"] == "way" and (t.get("highway") or t.get("railway")
                                   or t.get("waterway") in T.RZEKI_WATERWAY):
            g = e.get("geometry") or []
            if len(g) < 2:
                continue
            if t.get("highway"):
                klasa = T.KLASY_DROG.get(t["highway"])
                if not klasa:
                    continue
                cel, dodatkowe = drogi, {"klasa": klasa}
            elif t.get("railway"):
                if t["railway"] not in ("rail", "subway", "light_rail", "tram"):
                    continue
                cel, dodatkowe = kolej, {"typ": t["railway"]}
            else:
                cel, dodatkowe = rzeki, {}

            linia = LineString([(p["lon"], p["lat"]) for p in g]).intersection(ramka)
            if linia.is_empty:
                continue
            czesci = linia.geoms if linia.geom_type == "MultiLineString" else [linia]
            for c in czesci:
                if c.geom_type != "LineString" or c.length * m_lat < 5:
                    continue
                wpis = dict(dodatkowe)
                if t.get("name"):
                    wpis["nazwa"] = t["name"]
                wpis["linia"] = c.simplify(tol, preserve_topology=False)
                cel.append(wpis)
            continue

        # ---- powierzchnie ------------------------------------------
        warstwa = warstwa_powierzchni(t)
        centrum_handlowe = t.get("shop") == "mall" and t.get("name")
        if not warstwa and not centrum_handlowe:
            continue

        for wielokat in wielokaty(e):
            if not wielokat.is_valid:
                wielokat = wielokat.buffer(0)
            if wielokat.is_empty:
                continue
            wielokat = wielokat.intersection(ramka)
            if wielokat.is_empty:
                continue

            czesci = wielokat.geoms if wielokat.geom_type == "MultiPolygon" else [wielokat]
            for c in czesci:
                if c.geom_type != "Polygon":
                    continue
                pole = c.area * m2_na_stopien2
                prog = (PR.WYCINEK["min_budynek_m2"] if warstwa == "budynki"
                        else PR.WYCINEK["min_powierzchnia_m2"])
                if not centrum_handlowe and pole < prog:
                    continue
                # `preserve_topology=False` bywa agresywne i potrafi rozciąć
                # poligon na kilka — stąd pętla, a nie pojedynczy wynik.
                uproszczony = c.simplify(tol, preserve_topology=False)
                kawalki = (uproszczony.geoms if uproszczony.geom_type == "MultiPolygon"
                           else [uproszczony])
                for k in kawalki:
                    if (k.is_empty or k.geom_type != "Polygon"
                            or len(k.exterior.coords) < 4):
                        continue
                    if centrum_handlowe:
                        landmarki.append({"nazwa": t["name"], "ring": k})
                    else:
                        powierzchnie[warstwa].append(k)

    # ---- mapa kraju ---------------------------------------------------
    kraj_lad, morze, granice = None, [], []
    if kod_kraju:
        eps = tol / 10
        morze = morze_z_wybrzeza(wybrzeze, ramka, eps)
        lad = ramka.difference(unary_union(morze)) if morze else ramka
        admin = [w for e in administracja
                 if e["tags"].get("admin_level") == "2" and e["tags"].get("ISO3166-1") == kod_kraju
                 for w in wielokaty(e)]
        if not admin:
            sys.exit(f"✗ w zrzucie nie ma granicy kraju {kod_kraju!r} (relacja admin_level=2, ISO3166-1)")
        kraj_admin = unary_union([w if w.is_valid else w.buffer(0) for w in admin])
        # Przecięcie potrafi oddać kolekcję (wielokąty + linie styku) - kolekcja
        # nie ma obwodu, a linie i tak nie są lądem.
        przeciecie = kraj_admin.intersection(lad)
        kraj_lad = unary_union([g for g in getattr(przeciecie, "geoms", [przeciecie])
                                if g.geom_type in ("Polygon", "MultiPolygon")]
                               ).simplify(tol, preserve_topology=True)
        # Granica państwa: obwód lądu kraju bez odcinków wzdłuż morza.
        morze_u = unary_union(morze).buffer(tol * 3) if morze else None
        linia = kraj_lad.boundary if morze_u is None else kraj_lad.boundary.difference(morze_u)
        granice.append({"poziom": 2, "linia": ciagle(linia)})
        # Granice jednostek niższego rzędu: tylko wnętrze kraju, bez obwodu.
        wnetrze_kraju = kraj_lad.buffer(-tol * 5)
        for poziom in PR.WYCINEK.get("poziomy_admin", []):
            obwody = [pierscien for e in administracja
                      if e["tags"].get("admin_level") == str(poziom)
                      for w in wielokaty(e)
                      for pierscien in [w.exterior, *w.interiors]]
            if obwody:
                # Najpierw scalenie, potem upraszczanie: po `unary_union` wspólne
                # granice są rozbite na odcinki dwupunktowe, a upraszczanie nie
                # rusza końców odcinka - bez scalenia z 276 tys. punktów zostaje 212 tys.
                granice.append({"poziom": int(poziom), "linia": ciagle(
                    ciagle(unary_union(obwody)).simplify(tol, preserve_topology=False)
                    .intersection(wnetrze_kraju))})
        # Ten sam węzeł bywa w zrzucie dwa razy (miasto i siedziba gminy).
        miejscowosci = list({m["id"]: m for m in miejscowosci
                             if kraj_admin.contains(Point(m["lon"], m["lat"]))}.values())
        # Rzeki i jeziora tylko w kraju (sąsiedzi są tłem): z zapasem, bo rzeka
        # graniczna płynie po samej granicy i przycięta równo zniknęłaby w połowie.
        if PR.WYCINEK.get("przytnij_do_kraju_m"):
            strefa = kraj_admin.buffer(PR.WYCINEK["przytnij_do_kraju_m"] / m_lat)
            # Najpierw suma, potem JEDNO przecięcie z granicą: tysiące przecięć
            # pojedynczych wayów ze złożonym wielokątem kraju trwały minutami.
            # Po scaleniu drugie upraszczanie usuwa punkty na styku wayów.
            def przytnij(linie):
                if not linie:
                    return []
                g = ciagle(ciagle(unary_union(linie)).simplify(tol, preserve_topology=False)
                           .intersection(strefa))
                return [l for l in getattr(g, "geoms", [g])
                        if l.geom_type == "LineString" and not l.is_empty]
            rzeki = [{"linia": l} for l in przytnij([r_["linia"] for r_ in rzeki])]
            # Drogi też (sąsiedzi są tłem bez szczegółów), scalone per klasa - na
            # mapie kraju nazwy ulic nie są potrzebne, a 50 tys. wayów OSM to
            # kilka MB wycinka.
            wg_klas: dict[str, list] = {}
            for d in drogi:
                wg_klas.setdefault(d["klasa"], []).append(d["linia"])
            drogi = [{"klasa": k, "linia": l} for k, linie in wg_klas.items() for l in przytnij(linie)]
            powierzchnie["woda"] = [g for w in powierzchnie["woda"]
                                    for g in getattr(w.intersection(strefa), "geoms",
                                                     [w.intersection(strefa)])
                                    if g.geom_type == "Polygon" and not g.is_empty]

    # Scalenie stykających się poligonów tej samej warstwy: mniej ścieżek do
    # narysowania i brak szwów tam, gdzie OSM dzieli jeden trawnik na trzy.
    for warstwa in ("woda", "zielen", "zabudowa"):
        if powierzchnie[warstwa]:
            scalone = unary_union(powierzchnie[warstwa])
            czesci = scalone.geoms if scalone.geom_type == "MultiPolygon" else [scalone]
            powierzchnie[warstwa] = [c for c in czesci if c.geom_type == "Polygon"]

    r = lambda xy: [[round(x, prec), round(y, prec)] for x, y in xy]
    ring_out = lambda p: [r(p.exterior.coords)] + [r(i.coords) for i in p.interiors]

    wynik = {
        "meta": {
            "zrodlo": "OpenStreetMap contributors",
            "licencja": "ODbL 1.0 — https://www.openstreetmap.org/copyright",
            "narzedzie": "silnik/filtr.py",
            "wygenerowano": date.today().isoformat(),
            "centrum": [lat0, lng0],
            "zasieg_m": [zx, zy],
            "tolerancja_m": PR.WYCINEK["tolerancja_m"],
        },
        "warstwy": {
            "woda": [ring_out(p) for p in powierzchnie["woda"]],
            "zielen": [ring_out(p) for p in powierzchnie["zielen"]],
            "zabudowa": [ring_out(p) for p in powierzchnie["zabudowa"]],
            "budynki": [ring_out(p) for p in powierzchnie["budynki"]],
            "landmarki": [{"nazwa": l["nazwa"], "ring": ring_out(l["ring"])} for l in landmarki],
            "kolej": [{"typ": k["typ"], "linia": r(k["linia"].coords)} for k in kolej],
            "rzeki": [{"linia": r(k["linia"].coords)} for k in rzeki],
            **({
                "morze": [ring_out(p) for p in morze],
                "kraj": [ring_out(p) for p in getattr(kraj_lad, "geoms", [kraj_lad])
                         if p.geom_type == "Polygon"],
                "granice": [{"poziom": g["poziom"], "linia": r(l.coords)}
                            for g in granice
                            for l in getattr(g["linia"], "geoms", [g["linia"]])
                            if l.geom_type == "LineString" and len(l.coords) >= 2],
                "miejscowosci": [{k: v for k, v in m.items() if k != "id"}
                                 for m in sorted(miejscowosci, key=lambda m: -m["ludnosc"])],
            } if kod_kraju else {}),
            "drogi": [
                {k: v for k, v in
                 (("klasa", d["klasa"]), ("nazwa", d.get("nazwa")), ("linia", r(d["linia"].coords)))
                 if v is not None}
                for d in drogi
            ],
        },
    }

    cel = PR.sciezka("extract")
    cel.parent.mkdir(parents=True, exist_ok=True)
    cel.write_text(json.dumps(wynik, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    w = wynik["warstwy"]
    print(f"\n  {zrodlo.name} → {cel}")
    print(f"  {zrodlo.stat().st_size / 1e6:.1f} MB → {cel.stat().st_size / 1024:.0f} kB\n")
    print(f"    drogi      {len(w['drogi']):5d}   (punktów {sum(len(d['linia']) for d in w['drogi']):6d})")
    print(f"    budynki    {len(w['budynki']):5d}   (punktów {sum(len(p[0]) for p in w['budynki']):6d})")
    print(f"    zieleń     {len(w['zielen']):5d}")
    print(f"    zabudowa   {len(w['zabudowa']):5d}")
    print(f"    woda       {len(w['woda']):5d}")
    print(f"    rzeki      {len(w['rzeki']):5d}")
    if kod_kraju:
        print(f"    morze      {len(w['morze']):5d}")
        print(f"    kraj       {len(w['kraj']):5d}")
        print(f"    granice    {len(w['granice']):5d}")
        print(f"    miejscow.  {len(w['miejscowosci']):5d}")
    print(f"    kolej      {len(w['kolej']):5d}")
    print(f"    landmarki  {len(w['landmarki']):5d}   {[l['nazwa'] for l in w['landmarki']]}\n")


if __name__ == "__main__":
    main()
