#!/usr/bin/env python3
"""
TAKSONOMIA OSM - jak tagi OpenStreetMap mapują się na warstwy rysunkowe.

To NIE jest dana projektu. Te same tagi znaczą to samo na każdej mapie, więc
siedzą w silniku, a nie w `map.project.json`. W pliku projektu wybiera się
tylko, KTÓRE klasy dróg dany kadr rysuje (`frames.<id>.road_classes`) i jakim
kolorem (`palette.*`).

Zasada: warstwa opisuje POKRYCIE TERENU, czyli to, co widać z góry. Stąd
trzy rzeczy, których tu celowo nie ma, choć wyglądają na zieleń albo wodę:

- `landuse=farmland` - pole jest tłem mapy. Wrzucone do zieleni zlewało pola
  z lasem w jedną płaszczyznę i na mapie wiejskiej nie było widać ani lasu,
  ani wsi.
- `leisure=nature_reserve` - to granica ochrony przyrody (park krajobrazowy
  potrafi mieć 180 km²), nie roślinność. Pod nią są pola, lasy i wsie.
- `natural=wetland` - bagno to nie otwarta woda; w dolinie rzeki
  przykrywało pół kadru na niebiesko.

Czego tu nie ma, tego silnik nie rysuje - i to jest znane ograniczenie, nie
usterka do obejścia w danych projektu:

- `highway=track` (drogi polne), `footway`, `path`, `steps`, `cycleway`,
  `corridor`, `platform`, `construction`
- cieki mniejsze niż rzeka (`stream`, `ditch`, `drain`)
- numery dróg (`ref`), granice państw
- podświetlony obrys tylko dla `shop=mall`
"""

# `highway=*` → klasa rysunkowa (nazwy klas w JSON: major/collector/local/access/service)
KLASY_DROG = {
    "living_street": "dojazdowe",
    "motorway": "glowne",
    "motorway_link": "glowne",
    "pedestrian": "dojazdowe",
    "primary": "glowne",
    "primary_link": "glowne",
    "residential": "dojazdowe",
    "secondary": "zbiorcze",
    "secondary_link": "zbiorcze",
    "service": "drobne",
    "tertiary": "lokalne",
    "tertiary_link": "lokalne",
    "trunk": "glowne",
    "trunk_link": "glowne",
    "unclassified": "dojazdowe",
}

# Powierzchnie
ZIELEN_LANDUSE = {
    "allotments",
    "cemetery",
    "forest",
    "grass",
    "meadow",
    "orchard",
    "recreation_ground",
    "village_green",
}

ZIELEN_LEISURE = {
    "garden",
    "golf_course",
    "park",
    "pitch",
    "playground",
    "sports_centre",
}

ZIELEN_NATURAL = {
    "grassland",
    "heath",
    "scrub",
    "wood",
}

WODA_NATURAL = {
    "bay",
    "water",
}

WODA_LANDUSE = {
    "basin",
    "reservoir",
}

# Teren zabudowany: plama wsi albo osiedla. W małej skali pojedyncze budynki
# to kropki, które nic nie mówią - czytelna jest dopiero plama zabudowy.
ZABUDOWA_LANDUSE = {
    "commercial",
    "farmyard",
    "industrial",
    "residential",
    "retail",
}

# Cieki rysowane linią. Poligon brzegów bywa w OSM dziurawy albo go nie ma
# (Bug: 89% biegu w kadrze mapy dojazdu), a bez linii rzeka rwie się na
# kawałki. Linia pod poligonem łata luki i niczego nie zasłania.
RZEKI_WATERWAY = {
    "canal",
    "river",
}
