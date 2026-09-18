/**
 * KREATOR WYCENY - słowniki opcji dla formularza na /wycena/.
 *
 * Przeniesione z `code/src/data/wycena.js`. Komponenty ikon z `lucide-react`
 * zastąpione nazwami kształtów z `src/components/icons/ikony.ts`, adresy
 * zdjęć - kluczami z manifestu mediów.
 *
 * ⚠️ Klucze opcji (`asap`, `up_to_5k`, `panelowe`...) jadą w treści zgłoszenia
 * do Workera. Zmiana klucza to zmiana formatu danych po drugiej stronie.
 */

export const typyUslug = [
  {
    klucz: 'ogrodzenia',
    etykieta: 'Ogrodzenie / brama',
    opis: 'Panele ogrodzeniowe, bramy przesuwne i dwuskrzydłowe, furtki, siatka, podmurówki',
    ikona: 'shield',
    foto: 'wycena.ogrodzenia',
  },
  {
    klucz: 'brukarstwo',
    etykieta: 'Kostka brukowa',
    opis: 'Podjazdy, chodniki, alejki ogrodowe, tarasy, parkingi, schody terenowe',
    ikona: 'grid-3x3',
    foto: 'wycena.brukarstwo',
  },
  {
    klucz: 'budownictwo',
    etykieta: 'Budownictwo',
    opis: 'Altany ogrodowe, garaże blaszane i drewniane, domki narzędziowe, wiaty',
    ikona: 'hammer',
    foto: 'wycena.budownictwo',
  },
];

export const podtypy = {
  ogrodzenia: [
    { klucz: 'panelowe', etykieta: 'Panelowe 2D/3D' },
    { klucz: 'murowane', etykieta: 'Murowane / podmurówki' },
    { klucz: 'brama-przesuwna', etykieta: 'Brama przesuwna' },
    { klucz: 'brama-dwuskrzydlowa', etykieta: 'Brama dwuskrzydłowa' },
    { klucz: 'furtka', etykieta: 'Furtka' },
    { klucz: 'siatka', etykieta: 'Siatka ogrodzeniowa' },
    { klucz: 'inne-ogrodzenia', etykieta: 'Inne / nie wiem' },
  ],
  brukarstwo: [
    { klucz: 'podjazd', etykieta: 'Podjazd' },
    { klucz: 'chodnik', etykieta: 'Chodnik / alejka' },
    { klucz: 'taras', etykieta: 'Taras' },
    { klucz: 'parking', etykieta: 'Parking' },
    { klucz: 'schody', etykieta: 'Schody terenowe' },
    { klucz: 'inne-brukarstwo', etykieta: 'Inne / nie wiem' },
  ],
  budownictwo: [
    { klucz: 'altana', etykieta: 'Altana ogrodowa' },
    { klucz: 'garaz', etykieta: 'Garaż' },
    { klucz: 'domek', etykieta: 'Domek narzędziowy' },
    { klucz: 'wiata', etykieta: 'Wiata' },
    { klucz: 'inne-budownictwo', etykieta: 'Inne' },
  ],
};

export const opcjeTerenu = [
  { klucz: 'flat', etykieta: 'Teren płaski' },
  { klucz: 'uneven', etykieta: 'Lekkie nierówności' },
  { klucz: 'slope', etykieta: 'Spadek / pochyłość' },
  { klucz: 'access', etykieta: 'Utrudniony dojazd' },
  { klucz: 'old-fence', etykieta: 'Stare ogrodzenie do rozbiórki' },
  { klucz: 'leveling', etykieta: 'Wyrównanie terenu' },
  { klucz: 'rocky', etykieta: 'Kamienisty / twardy grunt' },
  { klucz: 'wet', etykieta: 'Podmokły / wysoki poziom wód' },
  { klucz: 'roots', etykieta: 'Korzenie drzew / pnie' },
  { klucz: 'narrow', etykieta: 'Wąski dojazd maszyn' },
  { klucz: 'neighbor', etykieta: 'Granica z sąsiadem' },
];

export const opcjeTerminu = [
  { klucz: 'asap', etykieta: 'Jak najszybciej' },
  { klucz: 'month', etykieta: 'W ciągu miesiąca' },
  { klucz: 'quarter', etykieta: 'W ciągu 3 miesięcy' },
  { klucz: 'later', etykieta: 'Później / do ustalenia' },
];

export const opcjeBudzetu = [
  { klucz: 'up_to_5k', etykieta: 'do 5 000 zł' },
  { klucz: '5k_15k', etykieta: '5 000 – 15 000 zł' },
  { klucz: '15k_30k', etykieta: '15 000 – 30 000 zł' },
  { klucz: 'over_30k', etykieta: 'powyżej 30 000 zł' },
  { klucz: 'unknown', etykieta: 'Nie wiem jeszcze' },
];
