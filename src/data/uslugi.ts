/**
 * PODSTRONY USŁUG - treść dziewięciu podstron szczegółowych.
 *
 * Przeniesione bez zmian z obiektu `ALL_SERVICES` w `code/src/pages/ServicePage.jsx`.
 * Układ rysuje `SzablonUslugi.astro`; ten plik mówi wyłącznie, co w nim stoi.
 *
 * Dwie zmiany formalne wobec oryginału:
 *   · adresy zdjęć zastąpione kluczami z manifestu mediów,
 *   · `heroImageStyle: { objectPosition }` zastąpione polem `pozycjaFoto`.
 *     Styl w atrybucie `style` jest blokowany przez CSP (`style-src` bez
 *     `'unsafe-inline'`), więc szablon zamienia tę wartość na klasę.
 *     Dopuszczalne wartości są wypisane w `SzablonUslugi.astro` - Tailwind
 *     musi zobaczyć każdą z nich dosłownie, żeby wygenerować klasę.
 *
 * ⚠️ Podstrona „siatka" miała zdjęcie ze stocku (Unsplash) zamiast realizacji
 * BramBruk, mimo że zdjęcie siatki od klienta istnieje w bibliotece
 * WordPressa i nigdzie nie było użyte. Klucz `usluga.siatka` czeka
 * na rozstrzygnięcie - patrz MIGRACJA-braki.md.
 */

export const uslugi = {

  // ── Ogrodzenia ──────────────────────────────────────────

  panelowe: {
    okruszek: 'Panelowe',
    okruszekNadrzedny: { etykieta: 'Ogrodzenia', href: '/ogrodzenia/' },
    etykieta: 'Ogrodzenia panelowe',
    tytul: 'Ogrodzenia panelowe 2D i 3D',
    podtytul: 'Biała Podlaska i okolice',
    fotoHero: 'usluga.panelowe',
    wstep:
      'Ogrodzenia panelowe to najpopularniejsze rozwiązanie wśród naszych klientów. Łączą trwałość, estetykę i przystępną cenę. Oferujemy panele 2D i 3D w pełnej gamie kolorów RAL, z montażem na podmurówce lub bezpośrednio w gruncie.',
    cechy: [
      { emoji: '🛡️', tytul: 'Trwałość', opis: 'Ocynk ogniowy + malowanie proszkowe RAL - ponad 10 lat bez konserwacji' },
      { emoji: '⚡', tytul: 'Szybki montaż', opis: 'Standardowe ogrodzenie 50–100 mb w 2–5 dni roboczych' },
      { emoji: '📐', tytul: 'Warianty', opis: 'Panel 2D (płaski, ekonomiczny) i 3D (z przetłoczeniami, sztywniejszy)' },
      { emoji: '💰', tytul: 'Od ~100 zł/mb', opis: 'Kompletne ogrodzenie z materiałem i montażem, w zależności od parametrów' },
    ],
    tresc: {
      tytul1: 'Ogrodzenia panelowe w Białej Podlaskiej i okolicach',
      tekst1:
        'Montujemy ogrodzenia panelowe na terenie Białej Podlaskiej, Międzyrzeca Podlaskiego, Terespola, Janowa Podlaskiego i okolicznych miejscowości powiatu bialskiego. Panele ogrodzeniowe sprawdzają się na posesje, działki budowlane, obiekty firmowe i tereny publiczne. Stosujemy wyłącznie panele ocynkowane ogniowo i malowane proszkowo, co zapewnia odporność na korozję i wieloletnią trwałość bez konserwacji.',
      tytul2: 'Panel 2D czy 3D - który wybrać?',
      tekst2:
        'Panel 3D posiada charakterystyczne fałdy (przetłoczenia), które zwiększają jego sztywność i wytrzymałość. Jest bardziej estetyczny i lepiej sprawdza się jako ogrodzenie frontowe. Panel 2D jest płaski i tańszy - idealny na ogrodzenia boczne, tylne lub tymczasowe. Oba typy dostępne w wysokościach od 103 do 203 cm i w pełnej palecie kolorów RAL.',
      tytul3: 'Montaż i przygotowanie terenu',
      tekst3:
        'Każdą realizację rozpoczynamy od wizji lokalnej i pomiarów. Przygotowujemy podłoże, wylewamy podmurówkę (jeśli wybrana), osadzamy słupki i montujemy panele. Na terenie pochyłym stosujemy montaż schodkowy - panel za panelem na różnych poziomach. Cały proces dokumentujemy zdjęciami i przekazujemy gotowe ogrodzenie z gwarancją na wykonanie.',
    },
    nazwaPojedyncza: "ogrodzenie panelowe",
    nazwaMnoga: "ogrodzenia panelowe",
    galeria: [
      { foto: 'realizacja.01', tytul: 'Ogrodzenie panelowe 3D', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.07', tytul: 'Panel z podmurówką', lokalizacja: 'Sławacinek' },
      { foto: 'realizacja.08', tytul: 'Ogrodzenie panelowe 2D', lokalizacja: 'Cicibór' },
    ],

    faq: [
      {
        pytanie: 'Ile kosztuje metr bieżący panelu z montażem?',
        odpowiedz: 'Cena ogrodzenia panelowego z montażem wynosi orientacyjnie 100–180 zł/mb, w zależności od typu panelu (2D/3D), wysokości, koloru RAL i rodzaju podłoża. Sam materiał to ok. 40–80 zł/mb.',
      },
      {
        pytanie: 'Jak długo trwa montaż na działce 1000 m²?',
        odpowiedz: 'Przy typowej działce o obwodzie ~130 mb, montaż ogrodzenia panelowego (bez podmurówki) zajmuje ok. 3–5 dni roboczych. Z podmurówką należy doliczyć dodatkowe 2–3 dni na wylanie i wiązanie betonu.',
      },
      {
        pytanie: 'Czy panel 3D jest lepszy od 2D?',
        odpowiedz: 'Panel 3D jest sztywniejszy i bardziej estetyczny dzięki przetłoczeniom - lepszy na ogrodzenie frontowe. Panel 2D jest tańszy i płaski - sprawdza się na ogrodzenia boczne i tylne. Oba typy są ocynkowane i malowane proszkowo.',
      },
    ],
  },

  murowane: {
    okruszek: 'Murowane',
    okruszekNadrzedny: { etykieta: 'Ogrodzenia', href: '/ogrodzenia/' },
    etykieta: 'Ogrodzenia murowane',
    tytul: 'Ogrodzenia murowane i podmurówki',
    podtytul: 'Biała Podlaska i okolice',
    fotoHero: 'usluga.murowane',
    wstep:
      'Ogrodzenia murowane to rozwiązanie premium - trwałe, eleganckie i zapewniające maksymalną prywatność. Wykonujemy ogrodzenia z cegły klinkierowej, bloczków betonowych i kamienia, a także podmurówki pod panele ogrodzeniowe.',
    cechy: [
      { emoji: '🧱', tytul: 'Solidność', opis: 'Konstrukcja murowana - najtrwalsza forma ogrodzenia, na dziesiątki, a nawet setki lat' },
      { emoji: '✨', tytul: 'Estetyka', opis: 'Cegła klinkierowa, bloczki łupane, kamień - wiele wariantów wykończenia' },
      { emoji: '🔒', tytul: 'Prywatność', opis: 'Pełne ogrodzenie murowane zapewnia maksymalną izolację od sąsiedztwa' },
      { emoji: '🏗️', tytul: 'Podmurówki', opis: 'Betonowe podmurówki pod panele - estetyka i ochrona przed podciekaniem' },
    ],
    tresc: {
      tytul1: 'Ogrodzenia murowane i podmurówki - powiat bialski',
      tekst1:
        'Realizujemy ogrodzenia murowane z cegły klinkierowej, bloczków betonowych ozdobnych i kamienia naturalnego na terenie Białej Podlaskiej i okolicznych miejscowości. Każde ogrodzenie murowane wymaga solidnego fundamentu - wylewamy ławy betonowe i murkujemy słupki z zachowaniem dylatacji. Efekt końcowy to ogrodzenie, które wygląda reprezentacyjnie i służy przez dziesięciolecia.',
      tytul2: 'Podmurówki betonowe pod panele',
      tekst2:
        'Podmurówka to betonowy cokół pod panelem ogrodzeniowym. Chroni dolną część ogrodzenia przed wilgocią, podnosi estetykę i zapobiega podciekaniu wody, oraz zapewnia ochronę przed zwierzętami. Oferujemy podmurówki prefabrykowane (szybki montaż) oraz wylewane na miejscu (dopasowanie do nierównego terenu). Standardowa wysokość to 20–30 cm.',
      tytul3: 'Łączenie paneli z murem',
      tekst3:
        'Popularne rozwiązanie to murowane słupki z wypełnieniem panelowym lub przęsłowym - łączy elegancję muru z lekkością panelu. Wykonujemy zarówno pełne ogrodzenia murowane, jak i kombinacje mur + panel, mur + przęsło kute, mur + gabion.',
    },
    nazwaPojedyncza: "ogrodzenie murowane",
    nazwaMnoga: "ogrodzenia murowane",
    galeria: [
      { foto: 'realizacja.03', tytul: 'Słupki murowane + panel', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.06', tytul: 'Podmurówka betonowa', lokalizacja: 'Rakowiska' },
      { foto: 'realizacja.09', tytul: 'Ogrodzenie z cegły', lokalizacja: 'Międzyrzec Podl.' },
    ],

    faq: [
      {
        pytanie: 'Ile kosztuje metr bieżący ogrodzenia murowanego?',
        odpowiedz: 'Pełne ogrodzenie murowane z fundamentem to wydatek rzędu 1 300–2 100 zł/mb, w zależności od materiału (bloczki, cegła klinkierowa, kamień), wysokości i stopnia skomplikowania. Sama podmurówka pod panel to 300–500 zł/mb.',
      },
      {
        pytanie: 'Czy podmurówka jest konieczna pod ogrodzenie panelowe?',
        odpowiedz: 'Nie jest konieczna, ale zdecydowanie zalecana. Podmurówka podnosi estetykę, chroni panel przed wilgocią od gruntu i zapobiega podciekaniu zwierząt. Zwiększa też trwałość całego ogrodzenia.',
      },
      {
        pytanie: 'Jak długo trwa budowa ogrodzenia murowanego?',
        odpowiedz: 'Ogrodzenie murowane wymaga więcej czasu niż panelowe - od 1 do 3 tygodni dla typowej posesji, w zależności od długości, materiału i warunków pogodowych. Fundament potrzebuje kilku dni na wiązanie.',
      },
    ],
  },

  siatka: {
    okruszek: 'Siatka',
    okruszekNadrzedny: { etykieta: 'Ogrodzenia', href: '/ogrodzenia/' },
    etykieta: 'Siatka ogrodzeniowa',
    tytul: 'Ogrodzenia z siatki ogrodzeniowej',
    podtytul: 'Biała Podlaska i okolice',
    fotoHero: 'usluga.siatka',
    wstep:
      'Siatka ogrodzeniowa to najbardziej ekonomiczne rozwiązanie ogrodzeniowe. Idealna na działki rekreacyjne, ogrody, uprawy i tymczasowe ogrodzenia budowlane. Montujemy siatki plecionki na słupkach stalowych z naciągiem.',
    cechy: [
      { emoji: '💰', tytul: 'Ekonomiczność', opis: 'Najtańsza forma ogrodzenia - od 40 zł/mb z montażem' },
      { emoji: '⚡', tytul: 'Szybki montaż', opis: 'Ogrodzenie 100 mb siatką w 1–2 dni robocze' },
      { emoji: '🛡️', tytul: 'Trwałość', opis: 'Siatka ocynkowana lub powlekana PCV - odporność na korozję' },
      { emoji: '🌿', tytul: 'Wszechstronność', opis: 'Działki, ogrody, boiska, hodowle, ogrodzenia tymczasowe' },
    ],
    tresc: {
      tytul1: 'Siatka ogrodzeniowa - ekonomiczne ogrodzenie',
      tekst1:
        'Siatka ogrodzeniowa (plecionka) to sprawdzone rozwiązanie dla działek, ogrodów i terenów rekreacyjnych. Oferujemy siatki ocynkowane i powlekane PCV w kolorze zielonym lub czarnym. Montaż na słupkach stalowych wbetonowanych lub wbijanych w grunt.',
      tytul2: 'Rodzaje siatek ogrodzeniowych',
      tekst2:
        'Oferujemy siatki o różnych oczkach (50×50, 60×60 mm) i grubościach drutu (2,5–3,5 mm). Siatka ocynkowana jest tańsza, siatka powlekana PCV - bardziej estetyczna i trwalsza. Wysokości standardowe: 100, 125, 150, 175 i 200 cm.',
      tytul3: 'Montaż i rozciąganie',
      tekst3:
        'Montaż siatki wymaga odpowiedniego naciągu - stosujemy druty napinające i napinacze śrubowe, aby siatka nie fałdowała się z czasem. Słupki rozmieszczamy co 2–2,5 m. Na narożnikach i przy furtkach stosujemy słupki wzmocnione z zastrzałami.',
    },
    nazwaPojedyncza: "ogrodzenie z siatki",
    nazwaMnoga: "ogrodzenia z siatki",
    galeria: [
      { foto: 'realizacja.08', tytul: 'Siatka na działce', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.06', tytul: 'Ogrodzenie z siatki', lokalizacja: 'Janów Podlaski' },
      { foto: 'realizacja.03', tytul: 'Siatka ogrodowa', lokalizacja: 'Piszczac' },
    ],

    faq: [
      {
        pytanie: 'Ile kosztuje ogrodzenie z siatki?',
        odpowiedz: 'Ogrodzenie z siatki plecionki z montażem i słupkami to ok. 40–80 zł/mb. Sama siatka: 15–30 zł/mb. To najtańsze rozwiązanie ogrodzeniowe na rynku.',
      },
      {
        pytanie: 'Jak długo wytrzyma siatka ogrodzeniowa?',
        odpowiedz: 'Siatka ocynkowana wytrzymuje ok. 10–15 lat, siatka powlekana PCV - 15–20+ lat. Trwałość zależy od jakości cynkowania i warunków atmosferycznych.',
      },
    ],
  },

  'bramy-przesuwne': {
    okruszek: 'Bramy przesuwne',
    okruszekNadrzedny: { etykieta: 'Ogrodzenia', href: '/ogrodzenia/' },
    etykieta: 'Bramy przesuwne',
    tytul: 'Bramy przesuwne i automatyka',
    podtytul: 'Biała Podlaska i okolice',
    fotoHero: 'usluga.brama-przesuwna',
    wstep:
      'Bramy przesuwne to najwygodniejsze rozwiązanie do wjazdu na posesję - nie wymagają miejsca na otwarcie skrzydeł. Montujemy bramy przesuwne ręczne i automatyczne, samonośne i prowadzone na szynie.',
    cechy: [
      { emoji: '🚗', tytul: 'Wygoda', opis: 'Otwieranie równoległe do ogrodzenia - bez zajmowania miejsca na podjeździe' },
      { emoji: '🔧', tytul: 'Automatyka', opis: 'Napędy automatyczne z pilotem, fotokomórkami i lampą sygnalizacyjną' },
      { emoji: '🏠', tytul: 'Samonośne', opis: 'Bramy bez szyny naziemnej - idealne na podjazdy z kostki brukowej' },
      { emoji: '📏', tytul: 'Szerokości 3–6 m', opis: 'Standardowe szerokości przejazdowe, możliwość realizacji na wymiar' },
    ],
    tresc: {
      tytul1: 'Bramy przesuwne - montaż w Białej Podlaskiej i powiecie bialskim',
      tekst1:
        'Montujemy bramy przesuwne samonośne (bez szyny naziemnej) i prowadzone na szynie. Bramy samonośne sprawdzają się szczególnie przy podjazdach z kostki brukowej, gdzie szyna naziemna utrudniałaby odśnieżanie i koszenie. Każda brama dobierana jest do istniejącego ogrodzenia - panelowego, murowanego lub kutego.',
      tytul2: 'Automatyka bram przesuwnych',
      tekst2:
        'Oferujemy montaż napędów automatycznych renomowanych producentów. Zestaw automatyki obejmuje: napęd z przekładnią, 2 piloty, fotokomórki bezpieczeństwa, lampę sygnalizacyjną i listwę zębatą. Możliwość dołożenia domofonu, czytnika kart lub sterowania z telefonu.',
      tytul3: 'Wymiary i materiały',
      tekst3:
        'Standardowe szerokości bram przesuwnych to 3, 4, 5 i 6 metrów. Wysokość dopasowywana do ogrodzenia (120–200 cm). Wypełnienie: panel ogrodzeniowy, przęsło stalowe, drewno kompozytowe. Malowanie proszkowe w wybranym kolorze RAL.',
    },
    nazwaPojedyncza: "brama przesuwna",
    nazwaMnoga: "bramy przesuwne",
    galeria: [
      { foto: 'realizacja.08', tytul: 'Brama przesuwna panelowa', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.02', tytul: 'Brama z automatyką', lokalizacja: 'Sławacinek' },
      { foto: 'realizacja.07', tytul: 'Brama samonośna', lokalizacja: 'Terespol' },
    ],

    faq: [
      {
        pytanie: 'Ile kosztuje brama przesuwna z montażem i automatyką?',
        odpowiedz: 'Kompletna brama przesuwna z montażem i automatyką to wydatek rzędu 5 000–12 000 zł, w zależności od szerokości (3–6 m), wypełnienia i jakości napędu. Sama brama bez automatyki: 3 500–8 000 zł z montażem.',
      },
      {
        pytanie: 'Brama samonośna czy na szynie - co lepsze?',
        odpowiedz: 'Brama samonośna nie wymaga szyny w podłożu - łatwiejsza w utrzymaniu i idealna na podjazdy z kostki. Brama na szynie jest tańsza, ale wymaga regularnego czyszczenia szyny. Dla nowych podjazdów rekomendujemy samonośną.',
      },
      {
        pytanie: 'Czy mogę zamontować automatykę do istniejącej bramy?',
        odpowiedz: 'Tak, w większości przypadków można doposażyć istniejącą bramę przesuwną w napęd automatyczny. Wymagany jest przegląd stanu bramy i prowadnic - bezpłatnie ocenimy możliwości na wizji lokalnej.',
      },
    ],
  },

  'bramy-dwuskrzydlowe': {
    okruszek: 'Bramy dwuskrzydłowe',
    okruszekNadrzedny: { etykieta: 'Ogrodzenia', href: '/ogrodzenia/' },
    etykieta: 'Bramy dwuskrzydłowe',
    tytul: 'Bramy dwuskrzydłowe wjazdowe',
    podtytul: 'Biała Podlaska i okolice',
    fotoHero: 'usluga.brama-dwuskrzydlowa',
    wstep:
      'Bramy dwuskrzydłowe to klasyczne rozwiązanie wjazdowe - eleganckie i proste w konstrukcji. Montujemy bramy dwuskrzydłowe panelowe, palisadowe, kute i z drewna kompozytowego, z możliwością automatyzacji.',
    cechy: [
      { emoji: '🏛️', tytul: 'Klasyka', opis: 'Ponadczasowy design, dopasowanie do każdego stylu ogrodzenia' },
      { emoji: '💰', tytul: 'Ekonomiczność', opis: 'Tańsza od przesuwnej przy wjazdach nawet powyżej 5 m szerokości' },
      { emoji: '🔧', tytul: 'Automatyka', opis: 'Siłowniki liniowe lub ramionowe - otwieranie na pilota' },
      { emoji: '🎨', tytul: 'Dopasowanie', opis: 'Panel, przęsło kute, drewno kompozytowe - do wyboru' },
    ],
    tresc: {
      tytul1: 'Bramy dwuskrzydłowe - klasyczna elegancja',
      tekst1:
        'Bramy dwuskrzydłowe otwierają się na zewnątrz lub do wewnątrz posesji. Wymagają miejsca na otwarcie skrzydeł, ale są tańsze od przesuwnych i prostsze w budowie. Idealnie sprawdzają się przy wjazdach do 5 m szerokości, gdzie nie ma ograniczeń przestrzennych.',
      tytul2: 'Materiały i wykończenie',
      tekst2:
        'Skrzydła bramy wykonujemy z paneli ogrodzeniowych (2D/3D), profili stalowych zamkniętych, przęseł kutych lub drewna kompozytowego. Każda brama jest dwukrotnie malowana proszkowo w kolorze RAL dopasowanym do ogrodzenia i furtki (z możliwością dodatkowego cynkowania).',
      tytul3: 'Automatyzacja bramy dwuskrzydłowej',
      tekst3:
        'Automatyka do bram dwuskrzydłowych opiera się na siłownikach liniowych (ramionowych). Zestaw obejmuje: 2 siłowniki, centralę sterującą, piloty, fotokomórki i lampę. Montaż automatyki jest możliwy zarówno przy nowej bramie, jak i doposażeniu istniejącej.',
    },
    nazwaPojedyncza: "brama dwuskrzydłowa",
    nazwaMnoga: "bramy dwuskrzydłowe",
    galeria: [
      { foto: 'realizacja.07', tytul: 'Brama dwuskrzydłowa', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.05', tytul: 'Brama z automatyką', lokalizacja: 'Cicibór' },
      { foto: 'realizacja.01', tytul: 'Brama panelowa', lokalizacja: 'Rakowiska' },
    ],
    faq: [
      {
        pytanie: 'Brama przesuwna czy dwuskrzydłowa - co wybrać?',
        odpowiedz: 'Brama przesuwna wymaga mniej miejsca na podjazd i jest wygodniejsza z automatyką. Dwuskrzydłowa jest tańsza, ale wymaga przestrzeni na otwarcie skrzydeł. Przy wjazdach powyżej 5 m - przesuwna jest lepszym wyborem.',
      },
      {
        pytanie: 'Ile kosztuje brama dwuskrzydłowa z montażem?',
        odpowiedz: 'Brama dwuskrzydłowa z montażem to koszt rzędu 7 000–12 000 zł, w zależności od szerokości i materiału. Z automatyką: 11 000–18 000 zł. Jest zazwyczaj tańsza od przesuwnej o 20–30%.',
      },
    ],
  },

  furtki: {
    okruszek: 'Furtki',
    okruszekNadrzedny: { etykieta: 'Ogrodzenia', href: '/ogrodzenia/' },
    etykieta: 'Furtki ogrodzeniowe',
    tytul: 'Furtki ogrodzeniowe i wejściowe',
    podtytul: 'Biała Podlaska i okolice',
    fotoHero: 'usluga.furtka',
    wstep:
      'Furtka to wizytówka ogrodzenia - element, który goście widzą jako pierwszy. Montujemy furtki panelowe, kute, z drewna kompozytowego i aluminiowe. Każda furtka dopasowana kolorystycznie i stylistycznie do ogrodzenia i bramy.',
    cechy: [
      { emoji: '🎨', tytul: 'Dopasowanie', opis: 'Furtka w stylu i kolorze ogrodzenia - spójny wygląd posesji' },
      { emoji: '📏', tytul: 'Na wymiar', opis: 'Standardowe i niestandardowe wymiary, lewe i prawe otwieranie' },
      { emoji: '🔑', tytul: 'Zamki i klamki', opis: 'Zamki wpuszczane, elektrozaczepy, samozamykacze, domofony' },
      { emoji: '💰', tytul: 'Od 800 zł', opis: 'Furtka z montażem - cena zależna od materiału i wymiarów' },
    ],
    tresc: {
      tytul1: 'Furtki ogrodzeniowe - dopełnienie ogrodzenia',
      tekst1:
        'Furtka powinna być spójna z resztą ogrodzenia pod względem materiału, koloru i stylu. Oferujemy furtki panelowe (2D i 3D), z profili stalowych zamkniętych, przęseł kutych, aluminium i drewna kompozytowego. Każda furtka malowana proszkowo w wybranym kolorze RAL.',
      tytul2: 'Okucia i automatyka furtek',
      tekst2:
        'Furtki wyposażamy w zamki wpuszczane (na klucz lub wkładkę), klamki ze stali nierdzewnej, zawiasy regulowane i samozamykacze. Na życzenie montujemy elektrozaczepy umożliwiające otwieranie z domofonu lub wideodomofonu.',
      tytul3: 'Wymiary i montaż',
      tekst3:
        'Standardowa szerokość furtki to 100–120 cm, wysokość dopasowywana do ogrodzenia. Furtki montujemy na słupkach stalowych lub murowanych. Czas montażu samej furtki to kilka godzin - zazwyczaj realizujemy ją w ramach całego ogrodzenia.',
    },
    nazwaPojedyncza: "furtka",
    nazwaMnoga: "furtki",
    galeria: [
      { foto: 'realizacja.05', tytul: 'Furtka panelowa', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.01', tytul: 'Furtka z ogrodzeniem', lokalizacja: 'Sławacinek' },
      { foto: 'realizacja.07', tytul: 'Furtka metalowa', lokalizacja: 'Porosiuki' },
    ],
    faq: [
      {
        pytanie: 'Ile kosztuje furtka ogrodzeniowa z montażem?',
        odpowiedz: 'Furtka panelowa z montażem to ok. 1 200–1 800 zł. Furtka stalowa/kuta: 1 500–3 000 zł. Cena zależy od materiału, wymiarów i okuć (zamek, samozamykacz, elektrozaczep).',
      },
      {
        pytanie: 'Czy mogę zamontować domofon w furtce?',
        odpowiedz: 'Tak - montujemy elektrozaczepy umożliwiające zdalne otwieranie furtki z domofonu lub wideodomofonu. Wymaga to doprowadzenia zasilania do furtki (kabel niskiego napięcia).',
      },
    ],
  },

  // ── Brukarstwo ───────────────────────────────────────────

  'kostka-brukowa': {
    okruszek: 'Kostka brukowa',
    okruszekNadrzedny: { etykieta: 'Brukarstwo', href: '/brukarstwo/' },
    etykieta: 'Kostka brukowa',
    tytul: 'Układanie kostki brukowej',
    podtytul: 'Biała Podlaska i okolice',
    fotoHero: 'usluga.kostka',
    pozycjaFoto: '0 40%',
    wstep:
      'Kostka brukowa to najpopularniejszy materiał na podjazdy, chodniki i tarasy. Oferujemy profesjonalne układanie kostki brukowej z pełnym przygotowaniem podłoża, doborem materiałów i gwarancją na wykonanie.',
    cechy: [
      { emoji: '🛡️', tytul: 'Trwałość', opis: 'Kostka betonowa wytrzymuje 25+ lat przy prawidłowym ułożeniu na odpowiedniej podbudowie' },
      { emoji: '🎨', tytul: 'Estetyka', opis: 'Szeroki wybór kolorów, kształtów i wzorów - od klasycznych po nowoczesne' },
      { emoji: '✅', tytul: 'Kompleksowo', opis: 'Od korytowania i podbudowy po fugowanie - realizujemy cały zakres prac' },
      { emoji: '💰', tytul: 'Od 100 zł/m²', opis: 'Robocizna od 100 zł/m², z materiałem od 200 zł/m² w zależności od typu kostki' },
    ],
    tresc: {
      tytul1: 'Kostka brukowa - układanie w Białej Podlaskiej i powiecie bialskim',
      tekst1:
        'Układamy kostkę brukową na terenie Białej Podlaskiej, Międzyrzeca Podlaskiego, Terespola i okolicznych miejscowości w promieniu 50 km. Realizujemy podjazdy, chodniki, alejki ogrodowe, tarasy i parkingi. Każdy projekt zaczynamy od bezpłatnej wizji lokalnej z pomiarem terenu i doradztwa w doborze kostki - pod kątem obciążenia, estetyki i budżetu klienta.',
      tytul2: 'Rodzaje kostki brukowej',
      tekst2:
        'Oferujemy układanie kostki betonowej (Holland, Behaton, Starobruk, Cegła) oraz kostki granitowej. Grubość kostki dobieramy do przeznaczenia: 4–6 cm na chodniki i tarasy, 8 cm na podjazdy samochodowe, 10 cm na parkingi i place manewrowe. Dostępne kolory: szary, grafitowy, czerwony, brązowy i mix.',
      tytul3: 'Proces układania',
      tekst3:
        'Prawidłowe ułożenie kostki wymaga: korytowania (usunięcie humusu 30–60 cm), zagęszczenia gruntu, warstwy podbudowy z kruszywa łamanego (15–25 cm), podsypki cementowo-piaskowej (5–25 cm), montażu krawężników/obrzeży, układania kostki we wzorze, fugowania i zagęszczania wibracyjnego. Każdy etap jest kluczowy dla trwałości nawierzchni.',
    },
    nazwaPojedyncza: "kostka brukowa",
    nazwaMnoga: "kostki brukowe",
    galeria: [
      { foto: 'realizacja.02', tytul: 'Kostka brukowa', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.06', tytul: 'Chodnik z kostki', lokalizacja: 'Sławacinek' },
      { foto: 'realizacja.09', tytul: 'Taras z kostki', lokalizacja: 'Rakowiska' },
    ],
    faq: [
      {
        pytanie: 'Ile kosztuje ułożenie kostki brukowej za m²?',
        odpowiedz: 'Robocizna: 100–150 zł/m². Z materiałem (kostka + podbudowa + krawężniki): 200–350 zł/m². Cena zależy od rodzaju kostki, grubości podbudowy i stopnia skomplikowania wzoru.',
      },
      {
        pytanie: 'Jaką kostkę wybrać na podjazd?',
        odpowiedz: 'Na podjazd samochodowy rekomendujemy kostkę o grubości 8 cm (Behaton, Holland lub Starobruk). Na podjazd ciężarowy: 10 cm. Kolory ciemne (grafitowy, brązowy) lepiej maskują zabrudzenia niż jasne.',
      },
      {
        pytanie: 'Jak długo trwa układanie kostki?',
        odpowiedz: 'Standardowy podjazd (30–50 m²) wykonujemy w 3–5 dni roboczych, wliczając przygotowanie podłoża. Większe powierzchnie (100+ m²) to 1–2 tygodnie. Czas zależy od warunków terenowych i pogodowych.',
      },
    ],
  },

  podjazdy: {
    okruszek: 'Podjazdy',
    okruszekNadrzedny: { etykieta: 'Brukarstwo', href: '/brukarstwo/' },
    etykieta: 'Podjazdy i parkingi',
    tytul: 'Podjazdy z kostki brukowej',
    podtytul: 'Biała Podlaska i okolice',
    fotoHero: 'usluga.podjazd',
    pozycjaFoto: '0% 0%',
    wstep:
      'Podjazd to wizytówka posesji - pierwszy element, który widzą goście. Budujemy podjazdy z kostki brukowej, które są trwałe, estetyczne i odporne na obciążenia pojazdów. Kompleksowa realizacja z gwarancją.',
    cechy: [
      { emoji: '🚗', tytul: 'Wytrzymałość', opis: 'Podbudowa i kostka dobrana pod obciążenie samochodami osobowymi i dostawczymi' },
      { emoji: '💧', tytul: 'Odwodnienie', opis: 'Projektujemy spadki i odprowadzenie wody, aby uniknąć zastoin i oblodzenia' },
      { emoji: '🎨', tytul: 'Design', opis: 'Wzory, kolory i obramowania dopasowane do stylu domu i ogrodzenia' },
      { emoji: '💰', tytul: 'Od 200 zł/m²', opis: 'Podjazd z materiałem i robocizną, w zależności od kostki i zakresu prac' },
    ],
    tresc: {
      tytul1: 'Podjazdy z kostki brukowej - trwałość i estetyka',
      tekst1:
        'Podjazd z kostki brukowej to inwestycja na lata. Projektujemy i budujemy podjazdy dopasowane do kształtu posesji, stylu domu i potrzeb domowników. Uwzględniamy miejsce na parkowanie, manewrowanie i dojście do drzwi. Każdy podjazd wykonujemy na solidnej podbudowie z kruszywa łamanego, która zapewnia stabilność nawet przy codziennym najeżdżaniu samochodem.',
      tytul2: 'Odwodnienie i spadki',
      tekst2:
        'Prawidłowe odprowadzenie wody to klucz do trwałości podjazdu. Projektujemy spadki (min. 1–2%) w kierunku ogrodu, odwodnienia liniowego lub studzienki. Zapobiega to tworzeniu kałuż, podmywaniu podbudowy i oblodzeniu zimą. Przy większych podjazdach stosujemy odwodnienie liniowe z korytkami.',
      tytul3: 'Krawężniki i obramowanie',
      tekst3:
        'Krawężniki pełnią funkcję nie tylko estetyczną, ale przede wszystkim konstrukcyjną - utrzymują kostkę na miejscu i zapobiegają rozsuwaniu się nawierzchni. Stosujemy krawężniki betonowe, granitowe i palisadowe. Obramowanie podjazdu kontrastowym kolorem nadaje elegancki, wykończony wygląd.',
    },
    nazwaPojedyncza: "podjazd z kostki",
    nazwaMnoga: "podjazdy z kostki",
    galeria: [
      { foto: 'realizacja.02', tytul: 'Podjazd z kostki', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.09', tytul: 'Podjazd dwukolorowy', lokalizacja: 'Cicibór' },
      { foto: 'realizacja.06', tytul: 'Parking z kostki', lokalizacja: 'Sławacinek' },
    ],
    faq: [
      {
        pytanie: 'Ile kosztuje podjazd z kostki brukowej?',
        odpowiedz: 'Podjazd z kostki z materiałem i robocizną to ok. 250–400 zł/m². Typowy podjazd 40 m²: 10 000–16 000 zł. Cena zależy od rodzaju kostki, grubości podbudowy i zakresu dodatkowych prac (krawężniki, odwodnienie).',
      },
      {
        pytanie: 'Jak duży powinien być podjazd?',
        odpowiedz: 'Minimum na jedno miejsce parkingowe: 2,5 × 5 m (12,5 m²). Wygodny podjazd na 2 samochody z manewrem: ok. 40–60 m². Przy projektowaniu uwzględniamy szerokość bramy, kąt wjazdu i dojście do drzwi wejściowych.',
      },
    ],
  },

  'chodniki-tarasy': {
    okruszek: 'Chodniki i tarasy',
    okruszekNadrzedny: { etykieta: 'Brukarstwo', href: '/brukarstwo/' },
    etykieta: 'Chodniki, alejki i tarasy',
    tytul: 'Chodniki, alejki ogrodowe i tarasy',
    podtytul: 'Biała Podlaska i okolice',
    fotoHero: 'usluga.chodnik',
    pozycjaFoto: '0% 75%',
    wstep:
      'Chodniki, alejki i tarasy z kostki brukowej to estetyczne i funkcjonalne uzupełnienie posesji. Wykonujemy nawierzchnie ogrodowe w różnych wzorach - od prostych ścieżek po dekoracyjne tarasy z obramowaniem.',
    cechy: [
      { emoji: '🌿', tytul: 'Ogródek', opis: 'Alejki ogrodowe, ścieżki między rabatami, dojścia do altany' },
      { emoji: '☀️', tytul: 'Taras', opis: 'Powierzchnia pod meble ogrodowe, grill, strefę wypoczynku' },
      { emoji: '🪜', tytul: 'Schody', opis: 'Stopnie terenowe z kostki lub kamienia na terenie ze spadkiem' },
      { emoji: '💰', tytul: 'Od 95 zł/m²', opis: 'Chodnik z materiałem i robocizną, kostka cieńsza niż na podjazd' },
    ],
    tresc: {
      tytul1: 'Chodniki i alejki ogrodowe',
      tekst1:
        'Alejki ogrodowe z kostki brukowej porządkują przestrzeń wokół domu i chronią trawnik przed wydeptywaniem. Wykonujemy ścieżki proste i kręte, szerokie i wąskie - dopasowane do układu ogrodu. Na chodniki stosujemy kostkę o grubości 4–6 cm na lekkiej podbudowie.',
      tytul2: 'Tarasy z kostki brukowej',
      tekst2:
        'Taras to strefa relaksu - miejsce na meble ogrodowe, grill, leżaki. Wykonujemy tarasy z kostki brukowej, płyt tarasowych i kamienia naturalnego. Każdy taras wymaga precyzyjnych spadków (min. 1–2% od budynku), aby woda nie wdzierała się pod fundament.',
      tytul3: 'Schody terenowe',
      tekst3:
        'Na działkach ze spadkiem terenu budujemy stopnie z kostki brukowej, kamienia lub bloczków betonowych. Schody terenowe muszą być stabilne, antypoślizgowe i dobrze odwodnione. Typowa wysokość stopnia: 15–17 cm, głębokość: 30–35 cm.',
    },
    nazwaPojedyncza: "chodnik z kostki",
    nazwaMnoga: "chodniki i tarasy",
    galeria: [
      { foto: 'realizacja.06', tytul: 'Chodnik ogrodowy', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.09', tytul: 'Taras z kostki', lokalizacja: 'Rakowiska' },
      { foto: 'realizacja.02', tytul: 'Alejka w ogrodzie', lokalizacja: 'Sławacinek' },
    ],
    faq: [
      {
        pytanie: 'Ile kosztuje chodnik z kostki brukowej?',
        odpowiedz: 'Chodnik z kostki z materiałem i robocizną: 95–160 zł/m². Typowa alejka ogrodowa (15–20 m², szer. 80 cm): 1 500–3 000 zł. Taras (15–25 m²): 2 000–4 000 zł.',
      },
      {
        pytanie: 'Jaka kostka na chodnik, a jaka na taras?',
        odpowiedz: 'Na chodnik i taras wystarczy kostka o grubości 4–6 cm (Holland, Cegła, Starobruk). Na taras warto rozważyć płyty tarasowe 40×40 lub 60×60 cm - większy format, elegantszy wygląd. Podbudowa na chodnik jest cieńsza niż na podjazd.',
      },
    ],
  },
}
