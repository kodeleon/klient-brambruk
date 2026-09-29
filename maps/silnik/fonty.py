#!/usr/bin/env python3
"""
Rozpakowanie krojów pisma do postaci, którą czyta matplotlib.

Render ma używać DOKŁADNIE tych samych krojów co strona, więc źródłem są pliki
woff2 z repozytorium, a nie kopia z systemu ani z Google Fonts.

Dwie rzeczy, które trzeba tu zrobić i które nie są oczywiste:

1. woff2 → ttf. matplotlib nie czyta woff2. `fontTools` potrafi to rozpakować,
   ale wymaga pakietu `brotli` (woff2 używa kompresji Brotli, woff używał zlib).

2. Instancjonowanie kroju zmiennego. Krój zmienny ma oś `wght` i wartość
   domyślną; bez instancjonowania matplotlib narysuje zawsze tę domyślną, więc
   żądana waga byłaby po cichu ignorowana. `instantiateVariableFont` wypala
   konkretną wagę w statyczny plik. Wagę podaje projekt: drugi element wpisu
   w `fonts`, albo `null` dla kroju statycznego.

Źródło to `paths.fonts` z pliku projektu, wynik `paths.font_cache` —
katalog roboczy, poza repozytorium.
Odtwarzalny w całości z plików woff2, więc nie ma powodu go wersjonować.
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

# Lista krojów jest daną projektu (`fonts` w map.project.json), nie stałą
# silnika: każdy klient ma własne kroje.


def rozpakuj(zrodla: Path, cache: Path, nazwa: str, plik: str, waga: int | None) -> Path:
    zrodlo = zrodla / plik
    if not zrodlo.exists():
        sys.exit(f"✗ brak kroju: {zrodlo}")

    cel = cache / f"{nazwa}.ttf"
    if cel.exists() and cel.stat().st_mtime >= zrodlo.stat().st_mtime:
        return cel

    cache.mkdir(parents=True, exist_ok=True)
    font = TTFont(zrodlo)

    if waga is not None:
        if "fvar" not in font:
            sys.exit(f"✗ {plik} nie jest krojem zmiennym, a proszono o wagę {waga}")
        os_ = {a.axisTag: (a.minValue, a.maxValue) for a in font["fvar"].axes}
        lo, hi = os_.get("wght", (waga, waga))
        if not lo <= waga <= hi:
            sys.exit(f"✗ {plik}: waga {waga} poza osią wght {lo}–{hi}")
        font = instantiateVariableFont(font, {"wght": waga})

    # flavor=None zdejmuje opakowanie woff2 i zapisuje surowy ttf
    font.flavor = None
    font.save(cel)
    return cel


def sciezki(PR) -> dict[str, Path]:
    """Komplet krojów gotowych dla matplotlib. Rozpakowuje, jeśli trzeba."""
    zrodla, cache = PR.sciezka("fonts"), PR.sciezka("font_cache")
    return {nazwa: rozpakuj(zrodla, cache, nazwa, plik, waga)
            for nazwa, (plik, waga) in PR.KROJE.items()}


if __name__ == "__main__":
    import argparse
    from projekt import wczytaj
    ap = argparse.ArgumentParser(description="Rozpakowuje kroje projektu do ttf.")
    ap.add_argument("-p", "--projekt", required=True)
    for nazwa, sciezka in sciezki(wczytaj(ap.parse_args().projekt)).items():
        print(f"  {nazwa:18s} → {sciezka}  ({sciezka.stat().st_size // 1024} kB)")
