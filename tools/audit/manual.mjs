/**
 * PUNKTY DO PRZEJŚCIA RĘCZNIE.
 *
 * Lista jest STAŁA i wypisywana przy każdym audycie, niezależnie od wyników.
 * To są punkty oznaczone 👤 w `PRODUKCJA-audyt-przedwdrozeniowy-frontend.md` -
 * rzeczy, których żaden automat nie rozstrzygnie, bo wymagają oceny człowieka
 * albo realnego urządzenia.
 *
 * Nie skracaj tej listy dlatego, że „w tym projekcie to nie dotyczy".
 * Punkt, który nie dotyczy, odhacza się z adnotacją NIE DOTYCZY - a nie znika.
 */

export const MANUAL_CHECKS = [
  {
    obszar: 'Dostępność',
    punkt: 'Przejście całej strony klawiszem Tab',
    co: 'Każda podstrona po kolei, łącznie z menu mobilnym, powiększaniem zdjęć i formularzem. Sprawdź, czy fokus nigdzie nie znika, nie wchodzi w element niewidoczny i wraca tam, skąd wyszedł po zamknięciu okna.',
  },
  {
    obszar: 'Dostępność',
    punkt: 'Kontrast tekstu na zdjęciach',
    co: 'Najczęstszy błąd, którego automat nie widzi: przycisk albo napis w sekcji głównej wypadający na jasnym fragmencie fotografii. Obejrzyj każdy tekst leżący na zdjęciu, w obu układach.',
  },
  {
    obszar: 'Dostępność',
    punkt: 'Kontrast policzony dla KAŻDEJ powierzchni',
    co: 'Token przechodzi na tle strony i nie przechodzi na karcie o dwa odcienie jaśniejszej. Policz parę tekst/tło osobno dla tła strony, karty, paska nawigacji i stopki.',
  },
  {
    obszar: 'Dostępność',
    punkt: 'Teksty odnośników mają sens wyrwane z kontekstu',
    co: 'Czytnik ekranu potrafi wypisać same linki. „Kliknij tutaj" i „więcej" nic wtedy nie znaczą.',
  },
  {
    obszar: 'Responsywność',
    punkt: 'Sprawdzenie na realnym telefonie',
    co: 'Emulator nie pokazuje bezwładności przewijania, zachowania paska adresu ani klawiatury ekranowej. To musi być fizyczne urządzenie.',
  },
  {
    obszar: 'Wydajność',
    punkt: 'Ocena wyniku Lighthouse',
    co: 'Narzędzie podaje liczbę, nie werdykt. Zdecyduj, czy ten poziom jest akceptowalny dla tego produktu, czy wymaga dalszej pracy.',
  },
  {
    obszar: 'Treść',
    punkt: 'Dane strukturalne opisują prawdę',
    co: 'Żadnego LocalBusiness dla firmy, która nie istnieje. Przy serwisie pokazowym zostaje WebSite i WebPage.',
  },
  {
    obszar: 'Treść',
    punkt: 'Zero fałszywych sygnałów wiarygodności',
    co: 'Wymyślone opinie, oceny, liczby klientów, logotypy partnerów i dane firmy nie jadą na produkcję jako prawdziwe.',
  },
  {
    obszar: 'Treść',
    punkt: 'Placeholdery świadome oznaczone',
    co: 'Wiadomo, które dane czekają na klienta, a które są docelowe. Szukaj wartości oznaczonych PLACEHOLDER w src/config/dane.ts.',
  },
  {
    obszar: 'Treść',
    punkt: 'Literówki i interpunkcja przeczytane',
    co: 'W tekstach dostarczonych przez klienta również. Przeczytaj, nie przeskanuj.',
  },
  {
    obszar: 'Prywatność',
    punkt: 'Polityka opisuje faktyczne przetwarzanie i nic ponadto',
    co: 'W obie strony: każde żądanie poza własną domenę musi być opisane, i nie może być opisu rzeczy, których serwis nie robi.',
  },
  {
    obszar: 'Build',
    punkt: 'Rozbieżności w manifeście haszy ocenione',
    co: 'Plik po pliku: różnica krytyczna (inna treść, inny kod) czy akceptowalna (data budowania, kolejność bez znaczenia). Uruchom `npm run manifest:compare`.',
  },
]
