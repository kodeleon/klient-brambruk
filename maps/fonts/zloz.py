#!/usr/bin/env python3
"""
Składa podzbiory JEDNEGO kroju zmiennego (np. `latin` + `latin-ext`
z `@fontsource-variable/*`) w jeden plik woff2 dla renderu map.

Po co: serwis serwuje kroje pocięte na podzbiory, a silnik bierze jeden plik
na krój (`fonty.py`). Polskie znaki są w `latin-ext`, więc sam `latin` dałby
mapę bez „ł”, a sam `latin-ext` - bez cyfr.

Dlaczego nie `fontTools.merge`: nie zna krojów zmiennych (`fvar`, `gvar`) -
zgubiłby oś wagi albo wyłożył się na tabelach. Podzbiory pochodzą z tego
samego mastera (ta sama wersja, `unitsPerEm`, oś, nazwy glifów w `post`),
więc wystarczy dołożyć do pierwszego pliku glify, których w nim nie ma:
kontury (`glyf`), zmienność (`gvar`), szerokości (`hmtx`) i wpisy `cmap`.

Czego wynik NIE ma dla dołożonych glifów: kerningu i cech OpenType (`GPOS`,
`GSUB`) oraz `HVAR` (zdejmowany w całości - szerokość po wypaleniu wagi
bierze się wtedy z punktów fantomowych `gvar`, które podzbiory zachowują).
matplotlib i tak nie stosuje `GPOS`, a silnik rozstawia litery sam z `hmtx`.

Wynik jest sprawdzany, zanim trafi na dysk: dla kilku wag każdy glif
wypalony z pliku złożonego ma mieć te same kontury i tę samą szerokość co
wypalony ze swojego podzbioru. Różnica = przerwanie, plik nie powstaje.

Użycie (z katalogu maps/):
    .venv\\Scripts\\python fonts\\zloz.py -o fonts\\manrope.woff2 ^
        ..\\node_modules\\@fontsource-variable\\manrope\\files\\manrope-latin-wght-normal.woff2 ^
        ..\\node_modules\\@fontsource-variable\\manrope\\files\\manrope-latin-ext-wght-normal.woff2
"""

from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

# Wagi do sprawdzenia: skraje osi i to, czego realnie używają podpisy.
WAGI_KONTROLNE = (200, 400, 500, 600, 700, 800)


def wczytaj(sciezka: Path) -> TTFont:
    f = TTFont(sciezka)
    f.ensureDecompiled()
    return f


def zgodnosc(a: TTFont, b: TTFont) -> list[str]:
    """Czy dwa pliki to podzbiory tego samego mastera."""
    bledy = []
    if a["head"].unitsPerEm != b["head"].unitsPerEm:
        bledy.append("różne unitsPerEm")
    if a["head"].fontRevision != b["head"].fontRevision:
        bledy.append("różne wersje kroju")
    osie = lambda f: [(x.axisTag, x.minValue, x.defaultValue, x.maxValue) for x in f["fvar"].axes]
    if osie(a) != osie(b):
        bledy.append(f"różne osie: {osie(a)} / {osie(b)}")
    if a["post"].formatType != 2.0 or b["post"].formatType != 2.0:
        bledy.append("brak nazw glifów (post 2.0) - scalanie po nazwach niemożliwe")
    # Glify o tej samej nazwie muszą być tym samym glifem.
    for nazwa in set(a.getGlyphOrder()) & set(b.getGlyphOrder()):
        ga, gb = a["glyf"][nazwa], b["glyf"][nazwa]
        if (ga.compile(a["glyf"]) != gb.compile(b["glyf"])
                or a["hmtx"][nazwa] != b["hmtx"][nazwa]):
            bledy.append(f"glif {nazwa!r} różni się między plikami")
    return bledy


def zloz(pliki: list[Path]) -> tuple[TTFont, dict[str, Path]]:
    baza = wczytaj(pliki[0])
    skad = {g: pliki[0] for g in baza.getGlyphOrder()}

    for plik in pliki[1:]:
        dodatek = wczytaj(plik)
        bledy = zgodnosc(baza, dodatek)
        if bledy:
            sys.exit(f"✗ {plik.name} nie pasuje do {pliki[0].name}:\n  - " + "\n  - ".join(bledy))

        nowe = [g for g in dodatek.getGlyphOrder() if g not in skad]
        for g in nowe:
            baza["glyf"].glyphs[g] = dodatek["glyf"][g]
            baza["hmtx"].metrics[g] = dodatek["hmtx"].metrics[g]
            baza["gvar"].variations[g] = dodatek["gvar"].variations.get(g, [])
            skad[g] = plik
        kolejnosc = baza.getGlyphOrder() + nowe
        baza.setGlyphOrder(kolejnosc)
        baza["glyf"].glyphOrder = kolejnosc

        # cmap: dopisz kody z dodatku do każdej tablicy Unicode bazy
        # (format 4 przyjmuje tylko BMP).
        mapa = dodatek.getBestCmap()
        for tab in baza["cmap"].tables:
            if not tab.isUnicode():
                continue
            for kod, glif in mapa.items():
                if tab.format == 4 and kod > 0xFFFF:
                    continue
                tab.cmap.setdefault(kod, glif)

    if "HVAR" in baza:
        del baza["HVAR"]
    os2 = baza["OS/2"]
    os2.recalcUnicodeRanges(baza)
    kody = sorted(baza.getBestCmap())
    os2.usFirstCharIndex, os2.usLastCharIndex = min(kody[0], 0xFFFF), min(kody[-1], 0xFFFF)
    return baza, skad


def wypal(font_bajty: bytes, waga: int) -> TTFont:
    f = TTFont(io.BytesIO(font_bajty))
    return instantiateVariableFont(f, {"wght": waga})


def bajty(font: TTFont, flavor: str | None) -> bytes:
    font.flavor = flavor
    bufor = io.BytesIO()
    font.save(bufor)
    return bufor.getvalue()


def sprawdz(wynik: bytes, skad: dict[str, Path]) -> int:
    zrodla = {p: p.read_bytes() for p in set(skad.values())}
    for waga in WAGI_KONTROLNE:
        zlozony = wypal(wynik, waga)
        wzorce = {p: wypal(b, waga) for p, b in zrodla.items()}
        for glif, plik in skad.items():
            w = wzorce[plik]
            ka = zlozony["glyf"][glif].getCoordinates(zlozony["glyf"])[0]
            kb = w["glyf"][glif].getCoordinates(w["glyf"])[0]
            if list(ka) != list(kb) or zlozony["hmtx"][glif] != w["hmtx"][glif]:
                sys.exit(f"✗ waga {waga}: glif {glif!r} po złożeniu różni się od "
                         f"{plik.name} - plik NIE został zapisany")
    return len(skad)


def main() -> None:
    ap = argparse.ArgumentParser(description="Składa podzbiory kroju zmiennego w jeden woff2.")
    ap.add_argument("-o", "--wynik", required=True, type=Path)
    ap.add_argument("pliki", nargs="+", type=Path)
    args = ap.parse_args()

    font, skad = zloz(args.pliki)
    wynik = bajty(font, "woff2")
    n = sprawdz(wynik, skad)
    args.wynik.parent.mkdir(parents=True, exist_ok=True)
    args.wynik.write_bytes(wynik)
    print(f"  {args.wynik}  {len(wynik) / 1024:.0f} kB, {n} glifów, "
          f"{len(TTFont(io.BytesIO(wynik)).getBestCmap())} kodów, "
          f"zgodny ze źródłami w wagach {', '.join(map(str, WAGI_KONTROLNE))}")


if __name__ == "__main__":
    main()
