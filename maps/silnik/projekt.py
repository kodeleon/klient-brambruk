#!/usr/bin/env python3
"""
PROJEKT MAPY - wczytanie i walidacja `map.project.json`.

Jedyne miejsce, w którym silnik dowiaduje się czegokolwiek o konkretnej mapie.
`render.py` i `filtr.py` nie znają ani jednej wartości projektu: dostają ten
obiekt i czytają z niego.

DWIE RZECZY, KTÓRE SIĘ TU DZIEJĄ I NIE SĄ OCZYWISTE
───────────────────────────────────────────────────

1. **Tłumaczenie nazw.** Kontraktem jest JSON i jego klucze są angielskie
   (`road_classes`, `label_primary`, `district`), bo taki kontrakt opisują
   `maps/README.md` i `maps/templates/`. Kod renderu jest polski. Zamiast
   przemianowywać 1050 linii albo pisać dokumentację od nowa, całe tłumaczenie
   siedzi w tablicach poniżej. Zgrzyt jest zamknięty w jednym pliku.

2. **Ścieżki liczone względem PLIKU PROJEKTU**, nie względem katalogu, z którego
   odpalasz polecenie. `python silnik/render.py -p dojazd/map.project.json`
   i to samo z innego katalogu dają identyczny wynik. Bez tej reguły `paths`
   są dwuznaczne, a błąd wychodzi dopiero na renderze bez polskich znaków.

Uruchomiony wprost sprawdza projekt i wypisuje podsumowanie:

    python silnik/projekt.py -p dojazd/map.project.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# ── tłumaczenie JSON (angielski) → kod renderu (polski) ───────────────

ROLE_PALETY = {
    "background": "tlo", "water": "woda", "green": "zielen", "settlement": "zabudowa",
    "building": "budynek",
    "landmark": "landmark", "rail": "kolej", "rail_tie": "kolej_podklad", "tram": "tram",
    "road_major": "droga_glowne", "road_collector": "droga_zbiorcze",
    "road_local": "droga_lokalne", "road_access": "droga_dojazdowe",
    "road_service": "droga_drobne",
    "label_street": "podpis", "label_primary": "podpis_wazny",
    "label_district": "podpis_dzielnica", "halo": "halo",
    "marker_bg": "znacznik_tlo", "marker_fg": "znacznik_znak",
    # mapa kraju: ląd kraju (sąsiedzi są tłem), granice, obszar wyróżniony
    "country": "kraj", "border": "granica", "border_minor": "granica_drobna",
    "highlight": "obszar", "highlight_edge": "obszar_krawedz",
}
KLASY_DROG = {"major": "glowne", "collector": "zbiorcze", "local": "lokalne",
              "access": "dojazdowe", "service": "drobne"}
GRUBOSCI = {**KLASY_DROG, "rail": "kolej", "tram": "tram", "river": "rzeka",
            "border": "granica", "border_minor": "granica_drobna",
            "highlight_edge": "obszar_krawedz"}
RODZAJE = {"street": "ulica", "landmark": "landmark", "junction": "wezel",
           "stop": "przystanek", "district": "dzielnica",
           "city": "miasto", "town": "miasteczko"}
KSZTALTY = {"square": "kwadrat", "circle": "kolo", "train": "pociag"}
KADR = {"width_m": "szerokosc_m", "aspect": "proporcja", "render_px": "render_px",
        "container_css": "kontener_css", "road_classes": "klasy_drog",
        "min_building_m2": "min_budynek_m2", "preview_css": "preview_css",
        "places": "miejscowosci"}
# Automatyczne podpisy miejscowości (mapa kraju), per kadr. Podpis wchodzi
# tylko wtedy, gdy nie nachodzi na inny, na kropkę ani na znacznik i mieści
# się w kadrze - kolejność od najważniejszych, więc wypadają najmniejsze.
MIEJSCOWOSCI = {"min_population": "min_ludnosc",
                "min_population_highlight": "min_ludnosc_obszar",
                "highlight_weight": "waga_obszaru", "city_population": "ludnosc_miasta",
                "dot_css": "kropka_css", "gap_css": "odstep_css", "margin_css": "margines_css",
                "exclude": "pomin", "admin_centre_population": "ludnosc_siedziby"}
MIEJSCOWOSCI_OPCJONALNE = ("exclude", "admin_centre_population")
WYCINEK = {"span_m": "zasieg_m", "tolerance_m": "tolerancja_m",
           "min_building_m2": "min_budynek_m2", "min_area_m2": "min_powierzchnia_m2",
           "decimals": "miejsc_po_przecinku",
           "country": "kraj", "admin_levels": "poziomy_admin",
           "place_admin_levels": "siedziby_poziomy",
           "clip_to_country_m": "przytnij_do_kraju_m"}
# Odwzorowanie: `local` - lokalna skala stopnia w punkcie (mapy okolicy,
# dotychczasowy obraz bez zmian); `lcc` - stożkowe Lamberta (mapa kraju:
# kształt bez zniekształceń na kilkuset kilometrach).
ODWZOROWANIE = {"type": "typ", "parallels": "rownolezniki"}
OBSZAR = {"center": "srodek", "radius_km": "promien_km"}
ZNACZNIK = {"shape": "ksztalt", "size_css": "bok_css", "glyph": "znak",
            "font_css": "pismo_css", "font": "kroj", "ring_css": "obwodka_css"}
POZYCJA = {"lon": "lon", "lat": "lat", "name": "nazwa", "align": "wyrownanie",
           "offset": "przesuniecie", "kind": "rodzaj", "near": "przy",
           "clamp": "zacisk", "angle": "kat"}

SCIEZKI = ("fonts", "extract", "output", "font_cache", "preview")
STYL = {"halo_css": "HALO_CSS", "halo_alpha": "HALO_ALFA",
        "tracking_street": "TRACKING_ULICA", "tracking_district": "TRACKING_DZIELNICA",
        "interline": "INTERLINIA"}
PINEZKA = {"width": "szerokosc_css", "height": "wysokosc_css"}

# Sekcje najwyższego poziomu. Wszystko spoza tej listy jest błędem: literówka
# w nazwie sekcji (albo klucz z innego silnika, np. `$schema`, `guard`)
# inaczej przeszłaby po cichu, a sekcja z poprawną nazwą byłaby pusta.
SEKCJE_WYMAGANE = ("center", "paths", "extract", "frames", "palette", "fonts",
                   "label_fonts", "label_colors", "font_sizes_css", "widths_css",
                   "style", "pin_css")
SEKCJE_OPCJONALNE = ("labels", "markers", "marker_styles", "projection", "highlight")


def _przemianuj(zrodlo: dict, tablica: dict, gdzie: str, problemy: list) -> dict:
    """Klucze angielskie → polskie. Nieznany klucz to błąd, nie cisza."""
    out = {}
    for k, v in zrodlo.items():
        if k not in tablica:
            problemy.append(f"{gdzie}: nieznany klucz {k!r} (znane: {', '.join(sorted(tablica))})")
            continue
        out[tablica[k]] = v
    return out


class Projekt:
    """Wczytany plik projektu. Atrybuty nazwane jak w kodzie renderu."""

    def __init__(self, plik: Path, dane: dict, problemy: list):
        self.plik = plik
        self.BAZA = plik.parent
        self._sciezki = dane.get("paths", {})
        self._centrum = dane.get("center")

        self.PALETA = _przemianuj(dane.get("palette", {}), ROLE_PALETY, "palette", problemy)
        self.GRUBOSCI_CSS = _przemianuj(dane.get("widths_css", {}), GRUBOSCI, "widths_css", problemy)
        self.PISMO_CSS = _przemianuj(dane.get("font_sizes_css", {}), RODZAJE, "font_sizes_css", problemy)
        self.KROJE_PODPISOW = _przemianuj(dane.get("label_fonts", {}), RODZAJE, "label_fonts", problemy)
        self.KOLORY_PODPISOW = {
            RODZAJE[k]: ROLE_PALETY.get(v, v)
            for k, v in dane.get("label_colors", {}).items() if k in RODZAJE
        }
        self.KROJE = {n: tuple(v) for n, v in dane.get("fonts", {}).items()}
        self.WYCINEK = _przemianuj(dane.get("extract", {}), WYCINEK, "extract", problemy)

        self.PODGLAD_PINEZKA = _przemianuj(dane.get("pin_css", {}), PINEZKA, "pin_css", problemy)
        self.ODWZOROWANIE = _przemianuj(dane.get("projection", {"type": "local"}),
                                        ODWZOROWANIE, "projection", problemy)
        self.OBSZAR = (_przemianuj(dane["highlight"], OBSZAR, "highlight", problemy)
                       if "highlight" in dane else None)

        # Brak klucza stylu nie wychodzi przy wczytaniu, tylko jako TypeError
        # w środku renderu, przy pierwszym podpisie - dlatego komplet jest
        # sprawdzany w `wczytaj`, a nie zostawiony na `None`.
        styl = _przemianuj(dane.get("style", {}), STYL, "style", problemy)
        for pol in STYL.values():
            setattr(self, pol, styl.get(pol))

        # kadry
        self.KADRY = {}
        for nazwa, kadr in dane.get("frames", {}).items():
            k = _przemianuj(kadr, KADR, f"frames.{nazwa}", problemy)
            k["klasy_drog"] = tuple(KLASY_DROG[c] for c in k.get("klasy_drog", [])
                                    if c in KLASY_DROG)
            nieznane = [c for c in kadr.get("road_classes", []) if c not in KLASY_DROG]
            if nieznane:
                problemy.append(f"frames.{nazwa}.road_classes: nieznane klasy {nieznane}")
            if "miejscowosci" in k:
                k["miejscowosci"] = _przemianuj(k["miejscowosci"], MIEJSCOWOSCI,
                                                f"frames.{nazwa}.places", problemy)
            self.KADRY[nazwa] = k

        # style znaczników
        self.ZNACZNIK = {}
        for rodzaj, opis in dane.get("marker_styles", {}).items():
            o = _przemianuj(opis, ZNACZNIK, f"marker_styles.{rodzaj}", problemy)
            if o.get("ksztalt") in KSZTALTY:
                o["ksztalt"] = KSZTALTY[o["ksztalt"]]
            elif "ksztalt" in o:
                problemy.append(f"marker_styles.{rodzaj}.shape: nieznany kształt {o['ksztalt']!r}")
            self.ZNACZNIK[rodzaj] = o

        # podpisy i znaczniki, per kadr
        self.PODPISY = {k: [self._podpis(p, k, problemy) for p in v]
                        for k, v in dane.get("labels", {}).items()}
        self.ZNACZNIKI = {k: [self._znacznik(z, k, problemy) for z in v]
                          for k, v in dane.get("markers", {}).items()}

    def _podpis(self, p: dict, kadr: str, problemy: list) -> dict:
        out = {}
        if "street" in p:
            out["ulica"] = p["street"]
        elif "point" in p:
            out["punkt"] = p["point"]
            if p.get("kind") not in RODZAJE:
                problemy.append(f"labels.{kadr}: podpis punktowy {p.get('point')!r} "
                                f"ma nieznany kind {p.get('kind')!r}")
            out["rodzaj"] = RODZAJE.get(p.get("kind"), p.get("kind"))
        else:
            problemy.append(f"labels.{kadr}: wpis bez 'street' ani 'point': {p}")
        for k, v in p.items():
            if k in ("street", "point", "kind"):
                continue
            out[POZYCJA.get(k, k)] = tuple(v) if k in ("near", "offset") else v
        return out

    def _znacznik(self, z: dict, kadr: str, problemy: list) -> dict:
        if z.get("kind") not in self.ZNACZNIK:
            problemy.append(f"markers.{kadr}: rodzaj {z.get('kind')!r} "
                            f"nie ma stylu w marker_styles")
        out = {"rodzaj": z.get("kind")}
        for k, v in z.items():
            if k == "kind":
                continue
            out[POZYCJA.get(k, k)] = tuple(v) if k == "offset" else v
        return out

    # ── API dla render.py i filtr.py ──────────────────────────────────

    def centrum(self) -> tuple[float, float]:
        """Punkt centralny (lat, lon). Z pliku projektu - jedno źródło."""
        return tuple(self._centrum)

    def sciezka(self, klucz: str, **fmt) -> Path:
        """Ścieżka z `paths`, rozwiązana względem katalogu pliku projektu."""
        wzor = self._sciezki[klucz]
        return (self.BAZA / wzor.format(**fmt)).resolve()


def wczytaj(plik: str | Path) -> Projekt:
    plik = Path(plik).resolve()
    if not plik.exists():
        sys.exit(f"✗ brak pliku projektu: {plik}")
    try:
        dane = json.loads(plik.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        sys.exit(f"✗ {plik.name} nie jest poprawnym JSON-em: {e}")

    problemy: list[str] = []
    for klucz in SEKCJE_WYMAGANE:
        if klucz not in dane:
            problemy.append(f"brak sekcji {klucz!r}")
    for klucz in dane:
        if klucz not in SEKCJE_WYMAGANE + SEKCJE_OPCJONALNE:
            problemy.append(f"nieznana sekcja {klucz!r}")

    P = Projekt(plik, dane, problemy)

    # Niezmienniki, których złamanie daje cichy błąd na obrazie, nie wyjątek.
    brak_rol = sorted(set(ROLE_PALETY.values()) - set(P.PALETA))
    if brak_rol:
        problemy.append(f"palette: brakuje rol {brak_rol}")
    brak_grubosci = [k for k, pol in GRUBOSCI.items() if pol not in P.GRUBOSCI_CSS]
    if brak_grubosci:
        problemy.append(f"widths_css: brakuje {brak_grubosci}")
    for klucz in SCIEZKI:
        if klucz not in P._sciezki:
            problemy.append(f"paths: brakuje {klucz!r}")
    for klucz in P._sciezki:
        if klucz not in SCIEZKI:
            problemy.append(f"paths: nieznany klucz {klucz!r}")
    brak_stylu = [k for k, pol in STYL.items() if getattr(P, pol) is None]
    if brak_stylu:
        problemy.append(f"style: brakuje {brak_stylu}")
    brak_pinezki = [k for k, pol in PINEZKA.items() if pol not in P.PODGLAD_PINEZKA]
    if brak_pinezki:
        problemy.append(f"pin_css: brakuje {brak_pinezki}")
    typ = P.ODWZOROWANIE.get("typ")
    if typ not in ("local", "lcc"):
        problemy.append(f"projection.type: {typ!r} - znane: local, lcc")
    if typ == "lcc" and len(P.ODWZOROWANIE.get("rownolezniki") or []) != 2:
        problemy.append("projection.parallels: odwzorowanie lcc potrzebuje dwóch równoleżników")
    if P.OBSZAR is not None and not {"srodek", "promien_km"} <= set(P.OBSZAR):
        problemy.append("highlight: potrzebne center i radius_km")
    for nazwa, k in P.KADRY.items():
        if "miejscowosci" not in k:
            continue
        for ang, pol in (("city", "miasto"), ("town", "miasteczko")):
            for sekcja, slownik in (("label_fonts", P.KROJE_PODPISOW), ("font_sizes_css", P.PISMO_CSS),
                                    ("label_colors", P.KOLORY_PODPISOW)):
                if pol not in slownik:
                    problemy.append(f"frames.{nazwa}.places: brak {sekcja}.{ang}")
        brak = [a_ for a_, p_ in MIEJSCOWOSCI.items()
                if p_ not in k["miejscowosci"] and a_ not in MIEJSCOWOSCI_OPCJONALNE]
        if brak:
            problemy.append(f"frames.{nazwa}.places: brakuje {brak}")
    if not P.KADRY:
        problemy.append("frames: ani jednego kadru")
    if len(P.KADRY) > 1 and "{frame}" not in P._sciezki.get("output", ""):
        problemy.append("paths.output: przy kilku kadrach wzorzec musi zawierać "
                        "{frame}, inaczej kadry nadpiszą się wzajemnie")
    for kadr in P.PODPISY:
        if kadr not in P.KADRY:
            problemy.append(f"labels.{kadr}: nie ma takiego kadru we 'frames'")
    for kadr in P.ZNACZNIKI:
        if kadr not in P.KADRY:
            problemy.append(f"markers.{kadr}: nie ma takiego kadru we 'frames'")
    for rodzaj, kroj in P.KROJE_PODPISOW.items():
        if kroj not in P.KROJE:
            problemy.append(f"label_fonts.{rodzaj}: krój {kroj!r} nie jest w 'fonts'")
    for rodzaj, rola in P.KOLORY_PODPISOW.items():
        if rola not in P.PALETA:
            problemy.append(f"label_colors.{rodzaj}: rola {rola!r} nie jest w 'palette'")

    if problemy:
        sys.exit("✗ " + plik.name + " jest niespójny:\n  - " + "\n  - ".join(problemy))
    return P


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Sprawdza plik projektu mapy.")
    ap.add_argument("-p", "--projekt", required=True)
    P = wczytaj(ap.parse_args().projekt)
    lat, lon = P.centrum()
    print(f"\n  {P.plik.name}  ✓ spójny")
    print(f"  punkt        {lat}, {lon}")
    print(f"  wycinek      {P.WYCINEK['zasieg_m']} m, tolerancja {P.WYCINEK['tolerancja_m']} m")
    for nazwa, k in P.KADRY.items():
        pod = P.PODPISY.get(nazwa, []); zn = P.ZNACZNIKI.get(nazwa, [])
        ul = sum(1 for p in pod if "ulica" in p)
        print(f"  kadr {nazwa:10s} {k['szerokosc_m']} m, {k['proporcja']}, "
              f"render {k['render_px']} px, kontener {k['kontener_css']} px CSS"
              f"  →  {k['szerokosc_m']/k['kontener_css']:.2f} m/px")
        print(f"       {'':10s} podpisy: {ul} ulic + {len(pod)-ul} punktowych, "
              f"znaczniki: {len(zn)}, klasy dróg: {len(k['klasy_drog'])}")
    for klucz in SCIEZKI:
        try:
            s = P.sciezka(klucz, frame=next(iter(P.KADRY)))
        except KeyError:
            s = "(brak)"
        print(f"  {klucz:12s} {s}")
    print()
