/**
 * REALIZACJE - galeria z filtrem na /realizacje/.
 *
 * Przeniesione z `code/src/data/realizacje.js`. Zmiany wobec oryginału:
 *   · adresy zdjęć zastąpione kluczami z manifestu mediów,
 *   · usunięte `position: '50% 50%'` - to wartość domyślna `object-position`,
 *     więc atrybut nic nie robił (a jako styl w znaczniku łamałby CSP),
 *   · usunięte `id` - nie było nigdzie używane.
 */

export const kategorieRealizacji = [
  { klucz: 'all', etykieta: 'Wszystkie' },
  { klucz: 'ogrodzenia', etykieta: 'Ogrodzenia i bramy' },
  { klucz: 'brukarstwo', etykieta: 'Kostka brukowa' },
  { klucz: 'budownictwo', etykieta: 'Budownictwo' },
];

export const realizacje = [
  {
    kategoria: 'ogrodzenia',
    tytul: 'Ogrodzenie panelowe + brama',
    lokalizacja: 'Biała Podlaska, 2025',
    foto: 'realizacja.01',
  },
  {
    kategoria: 'brukarstwo',
    tytul: 'Podjazd z kostki brukowej',
    lokalizacja: 'Międzyrzec Podlaski, 2025',
    foto: 'realizacja.02',
  },
  {
    kategoria: 'ogrodzenia',
    tytul: 'Brama przesuwna automatyczna',
    lokalizacja: 'Janów Podlaski, 2024',
    foto: 'realizacja.08',
  },
  {
    kategoria: 'budownictwo',
    tytul: 'Altana ogrodowa',
    lokalizacja: 'Terespol, 2024',
    foto: 'realizacja.04',
  },
  {
    kategoria: 'brukarstwo',
    tytul: 'Chodniki i obrzeża',
    lokalizacja: 'Sławacinek Stary, 2024',
    foto: 'realizacja.09',
  },
  {
    kategoria: 'ogrodzenia',
    tytul: 'Ogrodzenie z podmurówką',
    lokalizacja: 'Leśna Podlaska, 2024',
    foto: 'realizacja.05',
  },
  {
    kategoria: 'budownictwo',
    tytul: 'Garaż blaszany',
    lokalizacja: 'Łomazy, 2025',
    foto: 'realizacja.06',
  },
  {
    kategoria: 'ogrodzenia',
    tytul: 'Furtka i przęsła metalowe',
    lokalizacja: 'Radzyń Podlaski, 2025',
    foto: 'realizacja.07',
  },
  {
    kategoria: 'brukarstwo',
    tytul: 'Taras z kostki brukowej',
    lokalizacja: 'Biała Podlaska, 2024',
    foto: 'realizacja.03',
  },
];
