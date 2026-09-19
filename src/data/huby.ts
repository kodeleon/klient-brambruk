/**
 * HUBY KATEGORII - treść podstron /ogrodzenia/, /brukarstwo/, /budownictwo/.
 *
 * Układ rysuje `SzablonHubu.astro`, ten plik mówi wyłącznie, co ma w nim stać.
 *
 * ┌── CO SIĘ ZMIENIŁO 18.09.2026 ──────────────────────────────────────┐
 * │ 1. ZASIĘG. Wszędzie było „powiat bialski" i „promień 50 km", przez  │
 * │    co ktoś z Siedlec albo Lublina czytał ofertę jako nie dla siebie.│
 * │    Dziś: promień 100 km i trzy województwa, spójnie z `dane.ts`.    │
 * │                                                                     │
 * │ 2. SEKCJA „DLACZEGO MY - TAK DZIAŁAMY" zamiast dwóch akapitów       │
 * │    o niczym. Trzy bloki, każdy odpowiada na inne pytanie:           │
 * │      zasieg   - gdzie dojeżdżamy (z listą miast, wyróżnionych       │
 * │                 w tekście, żeby dało się znaleźć swoje),            │
 * │      metodyka - co dokładnie robimy, KROK PO KROKU, jako lista,     │
 * │                 nie jako akapit, w którym kroki się zlewają,        │
 * │      sprzet   - na czym pracujemy i co to daje.                     │
 * │    To jest jedyna treść na hubie, która tłumaczy, czym ta firma     │
 * │    różni się od sąsiada z ogłoszenia.                               │
 * │                                                                     │
 * │ 3. CENNIK dostał `opis` i `czynniki` - widełki bez wyjaśnienia,     │
 * │    od czego zależą, czytają się jak unik.                          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ⚠️ `miasta` to dziesięć NAJWIĘKSZYCH miejscowości w promieniu 100 km od
 * Białej Podlaskiej, policzonych w linii prostej ze współrzędnych, nie
 * dobranych na oko. Odległość drogą jest większa - dlatego w tekście stoi
 * „w promieniu", a nie konkretna liczba kilometrów przy każdym mieście.
 */

/** Lista wspólna dla trzech hubów - jedna zmiana, trzy podstrony. */
const MIASTA_100KM = [
  'Lublin',
  'Siedlce',
  'Świdnik',
  'Łuków',
  'Bielsk Podlaski',
  'Lubartów',
  'Hajnówka',
  'Sokołów Podlaski',
  'Międzyrzec Podlaski',
  'Radzyń Podlaski',
] as const

const WOJEWODZTWA = 'lubelskiego, podlaskiego i mazowieckiego'

export const huby = {

  ogrodzenia: {
    okruszek: 'Ogrodzenia',
    etykieta: 'Ogrodzenia i bramy',
    fotoHero: 'hero.ogrodzenia',
    fotoHeroObok: 'hero.ogrodzenia-obok',
    tytulHero: 'Ogrodzenia, bramy i furtki',
    podtytulHero: 'Montaż, automatyka, gwarancja',
    opisHero: `Montujemy ogrodzenia panelowe, bramy przesuwne i dwuskrzydłowe, furtki oraz podmurówki na terenie województwa ${WOJEWODZTWA}. Pracujemy z panelami ocynkowanymi i malowanymi proszkowo w wybranym kolorze RAL.`,
    tytulSekcji: 'Nasze usługi ogrodzeniowe',
    uslugi: [
      {
        tytul: 'Panelowe 2D/3D',
        opis: 'Najpopularniejsze ogrodzenia posesji - ocynkowane, malowane proszkowo RAL',
        foto: 'karta.panelowe',
        href: '/ogrodzenia/panelowe/',
      },
      {
        tytul: 'Bramy przesuwne',
        opis: 'Automatyczne i ręczne bramy wjazdowe, samonośne i na szynie',
        foto: 'karta.brama-przesuwna',
        href: '/ogrodzenia/bramy-przesuwne/',
      },
      {
        tytul: 'Bramy dwuskrzydłowe',
        opis: 'Klasyczne bramy wjazdowe - panelowe, kute, z automatyką',
        foto: 'karta.brama-dwuskrzydlowa',
        href: '/ogrodzenia/bramy-dwuskrzydlowe/',
      },
      {
        tytul: 'Furtki',
        opis: 'Furtki wejściowe dopasowane stylem i kolorem do ogrodzenia',
        foto: 'karta.furtka',
        href: '/ogrodzenia/furtki/',
      },
      {
        tytul: 'Murowane / podmurówki',
        opis: 'Ogrodzenia z cegły klinkierowej, bloczków i podmurówki betonowe',
        foto: 'karta.murowane',
        href: '/ogrodzenia/murowane/',
      },
      {
        tytul: 'Siatka ogrodzeniowa',
        opis: 'Ekonomiczne ogrodzenie na działki, ogrody i tereny rekreacyjne',
        foto: 'karta.siatka-hub',
        href: '/ogrodzenia/siatka/',
      },
    ],
    tresc: {
      zasieg: {
        tytul: 'Dojeżdżamy w promieniu 100 km od Białej Podlaskiej',
        tekst: `Ogrodzenia montujemy na terenie województwa ${WOJEWODZTWA}. W tym promieniu mieszczą się między innymi`,
        miasta: MIASTA_100KM,
        domkniecie:
          'oraz wszystkie mniejsze miejscowości pomiędzy nimi. Dojazd ekipy i wizja lokalna są bezpłatne w całym tym obszarze, a jeżeli mieszkasz nieco dalej, zadzwoń i sprawdzimy, czy damy radę przyjechać.',
      },
      metodyka: {
        tytul: 'Jak wygląda montaż ogrodzenia krok po kroku',
        wstep:
          'Ogrodzenie trzyma się tak długo, jak dobrze osadzone są słupki, więc kolejność prac nie jest u nas kwestią wygody. Każde zlecenie przechodzi przez te same etapy:',
        kroki: [
          'wizja lokalna z pomiarem i wytyczeniem linii ogrodzenia',
          'wiercenie otworów pod słupki wiertnicą, poniżej granicy przemarzania',
          'osadzenie i wypoziomowanie słupków w betonie',
          'montaż podmurówki prefabrykowanej albo wylanie jej na miejscu',
          'montaż paneli lub przęseł, z zabezpieczeniem miejsc cięcia przed korozją',
          'osadzenie bramy i furtki, regulacja zawiasów i rolek',
          'podłączenie i próba automatyki: napęd, fotokomórki, piloty',
          'uprzątnięcie terenu i wywóz odpadów',
        ],
        tytulDodatkow: 'W ramach tego samego zlecenia wykonujemy też',
        dodatki: [
          'demontaż starego ogrodzenia razem z wywozem gruzu',
          'montaż schodkowy na terenie pochyłym',
          'doprowadzenie zasilania i sterowania do bramy',
          'montaż listew podmurówkowych i blend przeciwwglądowych',
        ],
      },
      sprzet: {
        tytul: 'Sprzęt, na którym pracujemy',
        tekst:
          'Otwory pod słupki wiercimy wiertnicą spalinową, a nie kopiemy łopatą - otwór ma wtedy równe ściany i beton wiąże w pełnym przekroju. Linię ogrodzenia i wysokości ustawiamy niwelatorem laserowym, więc przęsła nie falują na długich odcinkach. Do cięcia paneli używamy szlifierki z tarczą do stali nierdzewnej, a każde miejsce cięcia zabezpieczamy farbą cynkową - to właśnie tam zaczyna się korozja ogrodzeń ciętych na sucho i zostawionych bez zabezpieczenia.',
      },
      fotoObok: 'karta.murowane',
      fotoObokAlt: 'Ogrodzenie panelowe z betonową podmurówką - realizacja BramBruk',
    },
    cennikOpis: {
      wstep:
        'Cennik pokazuje widełki cenowe, a nie konkretne ceny, ponieważ ostateczny koszt ogrodzenia zależy od kilku rzeczy, których nie widać na etapie zapytania:',
      czynniki: [
        'ukształtowanie terenu i różnice poziomów wzdłuż linii ogrodzenia',
        'wysokość i typ panelu oraz rodzaj podmurówki',
        'liczba bram i furtek, a przy nich obecność automatyki',
        'stan gruntu: piasek, glina czy grunt nasypowy z gruzem',
        'demontaż i wywóz starego ogrodzenia, jeżeli jest potrzebny',
      ],
    },
    galeria: [
      { foto: 'realizacja.01', tytul: 'Ogrodzenie panelowe + brama', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.08', tytul: 'Brama przesuwna', lokalizacja: 'Janów Podlaski' },
      { foto: 'realizacja.05', tytul: 'Ogrodzenie z podmurówką', lokalizacja: 'Leśna Podlaska' },
    ],
    tytulGalerii: 'Nasze ogrodzenia i bramy',
    etykietaFaq: 'FAQ - Ogrodzenia',
    tytulFaq: 'Pytania o ogrodzenia',
    faq: [
      {
        pytanie: 'Ile kosztuje metr bieżący ogrodzenia panelowego?',
        odpowiedz: 'Ogrodzenie panelowe z montażem kosztuje orientacyjnie 100–180 zł za metr bieżący. Na cenę wpływa typ panelu (2D lub 3D), wysokość, kolor RAL oraz rodzaj podłoża. Sam materiał to ok. 40–80 zł/mb.',
      },
      {
        pytanie: 'Jaka jest różnica między panelem 2D a 3D?',
        odpowiedz: 'Panel 3D ma fałdy (przetłoczenia), które zwiększają jego sztywność - jest bardziej wytrzymały i estetyczny, sprawdza się na ogrodzenie frontowe. Panel 2D jest płaski i tańszy, dobry na ogrodzenia boczne i tylne posesji.',
      },
      {
        pytanie: 'Czy potrzebuję pozwolenia na budowę ogrodzenia?',
        odpowiedz: 'Ogrodzenia do 2,2 m wysokości zazwyczaj wymagają jedynie zgłoszenia do starostwa powiatowego, nie pozwolenia na budowę. Wyjątkiem są ogrodzenia od strony dróg publicznych i torów kolejowych. Pomożemy ustalić formalności dla Twojej działki.',
      },
    ],
  },

  brukarstwo: {
    okruszek: 'Brukarstwo',
    etykieta: 'Brukarstwo',
    fotoHero: 'hero.brukarstwo',
    fotoHeroObok: 'hero.brukarstwo-obok',
    tytulHero: 'Profesjonalne brukarstwo',
    podtytulHero: 'Od korytowania po fugowanie',
    opisHero: `Układamy kostkę brukową na podjazdy, chodniki, tarasy i parkingi. Kompleksowa realizacja od przygotowania terenu po wykończenie, z doborem materiałów, doradztwem i bezpłatną wyceną na terenie województwa ${WOJEWODZTWA}.`,
    tytulSekcji: 'Nasze usługi brukarskie',
    uslugi: [
      {
        tytul: 'Kostka brukowa',
        opis: 'Układanie, dobór materiału, wzory',
        foto: 'karta.kostka',
        href: '/brukarstwo/kostka-brukowa/',
      },
      {
        tytul: 'Podjazdy i parkingi',
        opis: 'Trwałe nawierzchnie pod samochody',
        foto: 'karta.podjazd',
        href: '/brukarstwo/podjazdy/',
      },
      {
        tytul: 'Chodniki i tarasy',
        opis: 'Alejki ogrodowe, tarasy, schody',
        foto: 'karta.chodnik',
        href: '/brukarstwo/chodniki-tarasy/',
      },
    ],
    tresc: {
      zasieg: {
        tytul: 'Dojeżdżamy w promieniu 100 km od Białej Podlaskiej',
        tekst: `Prace brukarskie wykonujemy na terenie województwa ${WOJEWODZTWA}. W tym promieniu mieszczą się między innymi`,
        miasta: MIASTA_100KM,
        domkniecie:
          'oraz wszystkie mniejsze miejscowości pomiędzy nimi. Przy większych powierzchniach dojazd nie wpływa na cenę - liczy się metraż i zakres prac ziemnych, a nie to, ile kilometrów pokonuje ekipa.',
      },
      metodyka: {
        tytul: 'Jak układamy kostkę krok po kroku',
        wstep:
          'Kostka rozjeżdża się nie dlatego, że jest zła, tylko dlatego, że pod nią czegoś zabrakło. Dlatego połowa roboty dzieje się zanim położymy pierwszy element:',
        kroki: [
          'korytowanie terenu, czyli zebranie humusu na głębokość dobraną do obciążenia',
          'zagęszczenie gruntu rodzimego',
          'ułożenie podbudowy z kruszywa, warstwami, z zagęszczeniem każdej warstwy',
          'montaż krawężników i obrzeży na ławie betonowej',
          'podsypka cementowo-piaskowa, ściągnięta pod zaplanowany spadek',
          'układanie kostki w wybranym wzorze, z docinaniem przy krawędziach',
          'fugowanie i zagęszczanie powierzchni zagęszczarką z matą ochronną',
        ],
        tytulDodatkow: 'W ramach tego samego zlecenia wykonujemy też',
        dodatki: [
          'odwodnienie liniowe i studzienki przy garażu lub bramie',
          'schody terenowe, palisady i niskie murki oporowe',
          'wywóz urobku i gruzu po starej nawierzchni',
          'obsadzenie studzienek, włazów i skrzynek w nawierzchni',
        ],
      },
      sprzet: {
        tytul: 'Sprzęt, na którym pracujemy',
        tekst:
          'Spadki ustawiamy niwelatorem laserowym, nie „na oko" - od tego zależy, czy woda po ulewie spływa na trawnik, czy pod drzwi garażu. Grunt i kolejne warstwy podbudowy zagęszczamy zagęszczarką płytową, a w wąskich miejscach przy ścianie i słupkach ubijakiem skokowym, do którego zagęszczarka nie sięga. Kostkę tniemy piłą z chłodzeniem wodnym: cięcie na sucho wypala krawędź i zostawia jasny ślad, który widać przez kilka sezonów. Do zagęszczania gotowej powierzchni używamy maty ochronnej, żeby nie zmatowić wierzchniej warstwy kostki.',
      },
      fotoObok: 'karta.kostka',
      fotoObokAlt: 'Układanie kostki brukowej na podjeździe - realizacja BramBruk',
    },
    cennikOpis: {
      wstep:
        'Cennik pokazuje widełki cenowe, a nie konkretne ceny, ponieważ ostateczny koszt zależy od kilku rzeczy, których nie widać na etapie zapytania:',
      czynniki: [
        'przeznaczenie nawierzchni: chodnik, podjazd osobowy czy parking pod cięższy pojazd',
        'kształt powierzchni - wąskie alejki i łuki oznaczają więcej docinania',
        'stan gruntu i głębokość korytowania, jaką trzeba zrobić',
        'konieczność odwodnienia i wykonania spadków',
        'wzór ułożenia kostki i rodzaj materiału',
      ],
    },
    galeria: [
      { foto: 'realizacja.02', tytul: 'Podjazd z kostki', lokalizacja: 'Międzyrzec Podlaski' },
      { foto: 'realizacja.09', tytul: 'Chodniki i obrzeża', lokalizacja: 'Sławacinek Stary' },
      { foto: 'realizacja.03', tytul: 'Taras z kostki', lokalizacja: 'Biała Podlaska' },
    ],
    tytulGalerii: 'Nasze prace brukarskie',
    etykietaFaq: 'FAQ - Brukarstwo',
    tytulFaq: 'Pytania o brukarstwo',
    faq: [
      {
        pytanie: 'Ile kosztuje ułożenie kostki brukowej za m²?',
        odpowiedz: 'Sama robocizna to ok. 70–95 zł/m². Z materiałem (kostka, podsypka, krawężniki) całkowity koszt wynosi 100–200 zł/m², w zależności od rodzaju kostki, grubości podbudowy i stopnia skomplikowania wzoru.',
      },
      {
        pytanie: 'W jakim terminie realizujecie brukarstwo?',
        odpowiedz: 'Brukarstwo najlepiej realizować od marca do listopada, gdy temperatura nie spada poniżej 5°C. Standardowy podjazd (30–50 m²) wykonujemy w 3–5 dni roboczych. Większe projekty planujemy indywidualnie.',
      },
      {
        pytanie: 'Jak przygotować podłoże pod kostkę?',
        odpowiedz: 'Przygotowanie podłoża obejmuje: korytowanie (usunięcie humusu na 30–40 cm), zagęszczenie gruntu, warstwę kruszywa (podbudowę), podsypkę cementowo-piaskową i obramowanie krawężnikami. Wykonujemy to kompleksowo w ramach zlecenia.',
      },
    ],
  },

  budownictwo: {
    okruszek: 'Budownictwo',
    etykieta: 'Budownictwo',
    fotoHero: 'hero.budownictwo',
    fotoHeroObok: 'hero.budownictwo-obok',
    tytulHero: 'Altany, garaże i domki',
    podtytulHero: 'Od fundamentu po wykończenie',
    opisHero: `Budujemy solidne konstrukcje ogrodowe i gospodarcze: altany drewniane i murowane, garaże blaszane, domki narzędziowe i wiaty. Od fundamentu po wykończenie, na terenie województwa ${WOJEWODZTWA}.`,
    tytulSekcji: 'Nasze usługi budowlane',
    uslugi: [
      {
        tytul: 'Altany ogrodowe',
        opis: 'Drewniane i murowane altany z dachem, na relaks i grillowanie',
        foto: 'karta.altana',
        href: undefined,
      },
      {
        tytul: 'Garaże',
        opis: 'Garaże blaszane i murowane na samochód, motocykl lub sprzęt',
        foto: 'karta.garaz',
        href: undefined,
      },
      {
        tytul: 'Domki narzędziowe',
        opis: 'Praktyczne pomieszczenia gospodarcze na narzędzia i sprzęt ogrodowy',
        foto: 'karta.domek',
        href: undefined,
      },
    ],
    tresc: {
      zasieg: {
        tytul: 'Dojeżdżamy w promieniu 100 km od Białej Podlaskiej',
        tekst: `Konstrukcje ogrodowe i gospodarcze stawiamy na terenie województwa ${WOJEWODZTWA}. W tym promieniu mieszczą się między innymi`,
        miasta: MIASTA_100KM,
        domkniecie:
          'oraz wszystkie mniejsze miejscowości pomiędzy nimi. Elementy przygotowujemy w warsztacie i przywozimy na miejsce, więc budowa altany czy garażu nie zamienia posesji w plac budowy na dwa tygodnie.',
      },
      metodyka: {
        tytul: 'Jak stawiamy altanę, garaż lub wiatę',
        wstep:
          'Konstrukcja ogrodowa stoi prosto tak długo, jak równe jest to, na czym stoi. Dlatego zaczynamy od podłoża, a nie od ścian:',
        kroki: [
          'ustalenie miejsca, wymiarów i sprawdzenie, czy potrzebne jest zgłoszenie',
          'przygotowanie podłoża: płyta betonowa, bloczki albo kotwy gruntowe',
          'montaż konstrukcji nośnej z zabezpieczonego drewna lub profili stalowych',
          'pokrycie dachu wraz z obróbkami i orynnowaniem',
          'impregnacja lub malowanie elementów drewnianych',
          'montaż drzwi, okien, bram i zamków',
          'uprzątnięcie terenu i wywóz odpadów po budowie',
        ],
        tytulDodatkow: 'W ramach tego samego zlecenia wykonujemy też',
        dodatki: [
          'podłogę na legarach albo wylewkę pod altaną',
          'instalację elektryczną: oświetlenie i gniazda',
          'grill murowany i wbudowane ławki w altanie',
          'utwardzenie dojścia lub podjazdu kostką brukową',
        ],
      },
      sprzet: {
        tytul: 'Sprzęt, na którym pracujemy',
        tekst:
          'Podłoże wypoziomowujemy niwelatorem laserowym, bo kilka milimetrów różnicy na fundamencie zamienia się w kilka centymetrów krzywizny na kalenicy. Kotwy gruntowe osadzamy wiertnicą, co pozwala postawić altanę bez wylewania betonowej płyty i bez rozkopywania połowy ogrodu. Drewno tniemy pilarką z prowadnicą, a nie z ręki - równe cięcie oznacza szczelne połączenia, a te decydują o tym, czy w konstrukcję wchodzi woda. Każdy element drewniany, który dotyka gruntu albo betonu, dostaje przekładkę i impregnat.',
      },
      fotoObok: 'karta.altana',
      fotoObokAlt: 'Drewniana altana ogrodowa - realizacja BramBruk',
    },
    cennikOpis: {
      wstep:
        'Cennik pokazuje widełki cenowe, a nie konkretne ceny, ponieważ ostateczny koszt budowy zależy od kilku rzeczy, których nie widać na etapie zapytania:',
      czynniki: [
        'wymiary konstrukcji i rodzaj drewna albo profili',
        'rodzaj podłoża: kotwy gruntowe, bloczki czy płyta betonowa',
        'pokrycie dachu i sposób wykończenia elementów',
        'wyposażenie: podłoga, elektryka, grill murowany, bramy',
        'dojazd i możliwość wjechania sprzętem na posesję',
      ],
    },
    galeria: [
      { foto: 'realizacja.04', tytul: 'Altana ogrodowa', lokalizacja: 'Terespol' },
      { foto: 'realizacja.06', tytul: 'Garaż blaszany', lokalizacja: 'Łomazy' },
      { foto: 'realizacja.10', tytul: 'Domek narzędziowy', lokalizacja: 'Cicibór' },
    ],
    tytulGalerii: 'Nasze budowy',
    etykietaFaq: 'FAQ - Budownictwo',
    tytulFaq: 'Pytania o budownictwo',
    faq: [
      {
        pytanie: 'Ile kosztuje altana ogrodowa?',
        odpowiedz: 'Altana drewniana 3×3 m to wydatek rzędu 8 000–15 000 zł, w zależności od rodzaju drewna, pokrycia dachu i wyposażenia. Altana z grillem murowanym: 15 000–30 000 zł. Wyceniamy indywidualnie po ustaleniu projektu.',
      },
      {
        pytanie: 'Czy na budowę altany potrzebne jest pozwolenie?',
        odpowiedz: 'Altana do 35 m² na działce budowlanej (maksymalnie dwie altany na 500 m² działki) wymaga jedynie zgłoszenia w starostwie, nie pozwolenia na budowę. Pomożemy ustalić formalności dla Twojej działki.',
      },
      {
        pytanie: 'Jak długo trwa budowa altany lub garażu?',
        odpowiedz: 'Altana drewniana: 3–7 dni roboczych. Garaż blaszany: 1–2 dni. Garaż murowany: 2–4 tygodnie. Czas zależy od stopnia skomplikowania i warunków pogodowych. Budujemy od marca do listopada.',
      },
    ],
  },
}
