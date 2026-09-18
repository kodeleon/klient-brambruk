/**
 * HUBY KATEGORII - treść podstron /ogrodzenia/, /brukarstwo/, /budownictwo/.
 *
 * Przeniesione bez zmian z obiektu `HUBS_DATA` w `code/src/pages/ServiceHub.jsx`.
 * Dane zostały oddzielone od szablonu: układ rysuje `SzablonHubu.astro`,
 * a ten plik mówi wyłącznie, co ma się w nim znaleźć.
 *
 * Adresy zdjęć zastąpione kluczami z manifestu mediów.
 *
 * ⚠️ Karta „Siatka ogrodzeniowa" w hubie ogrodzeń pokazywała zdjęcie
 * ze stocku (Unsplash), a nie realizację BramBruk - klucz `karta.siatka-hub`
 * czeka na zdjęcie klienta, patrz MIGRACJA-braki.md.
 */

export const huby = {

  ogrodzenia: {
    okruszek: 'Ogrodzenia',
    etykieta: 'Ogrodzenia i bramy',
    fotoHero: 'hero.ogrodzenia',
    tytulHero: ['Ogrodzenia, bramy i furtki -', 'Biała Podlaska i region'],
    opisHero:
      'Montujemy ogrodzenia panelowe, bramy przesuwne i dwuskrzydłowe, furtki oraz podmurówki na terenie powiatu bialskiego. Pracujemy z panelami ocynkowanymi i malowanymi proszkowo w wybranym kolorze RAL.',
    etykietaSekcji: 'Rodzaje ogrodzeń',
    tytulSekcji: 'Wybierz typ ogrodzenia',
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
      tytul: 'Montaż ogrodzeń w Białej Podlaskiej i powiecie bialskim',
      tekst: 'Działamy na terenie Białej Podlaskiej i okolic w promieniu 50 km - obsługujemy Międzyrzec Podlaski, Terespol, Janów Podlaski, Radzyń Podlaski, Parczew, Łosice oraz wsie i osiedla podmiejskie powiatu bialskiego. Każdą realizację rozpoczynamy od bezpłatnej wizji lokalnej z pomiarem i doradztwem w doborze materiałów.',
      podtytul: 'Od panelu do bramy - pełen zakres prac',
      podtekst:
        'Stawiamy ogrodzenia panelowe 2D i 3D na podmurówce lub w gruncie, montujemy bramy przesuwne samonośne z automatyką, bramy dwuskrzydłowe, furtki wejściowe z zamkiem i samozamykaczem. Wylewamy podmurówki betonowe i murujemy słupki z cegły klinkierowej. Stosujemy wyłącznie panele ocynkowane ogniowo i malowane proszkowo, co gwarantuje odporność na korozję i wieloletnią trwałość. Kolory dobieramy z pełnej palety RAL - najczęściej wybierane to antracyt (RAL 7016), zielony (RAL 6005) i czarny (RAL 9005).',
      fotoObok: 'karta.murowane',
      fotoObokAlt: 'Ogrodzenie panelowe 3D z podmurówką - realizacja w powiecie bialskim',
    },
    galeria: [
      { foto: 'realizacja.01', tytul: 'Ogrodzenie panelowe 3D', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.07', tytul: 'Brama przesuwna z automatyką', lokalizacja: 'Sławacinek' },
      { foto: 'realizacja.08', tytul: 'Panel z podmurówką', lokalizacja: 'Cicibór' },
    ],
    tytulGalerii: 'Nasze ogrodzenia i bramy',
    etykietaFaq: 'FAQ - Ogrodzenia',
    tytulFaq: 'Pytania o ogrodzenia',
    faq: [
      {
        pytanie: 'Ile kosztuje metr bieżący ogrodzenia panelowego?',
        odpowiedz: 'Ogrodzenie panelowe z montażem w Białej Podlaskiej i okolicach kosztuje orientacyjnie 100–180 zł za metr bieżący. Na cenę wpływa typ panelu (2D lub 3D), wysokość, kolor RAL oraz rodzaj podłoża. Sam materiał to ok. 40–80 zł/mb.',
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
    tytulHero: ['Profesjonalne brukarstwo -', 'Biała Podlaska i okolice'],
    opisHero:
      'Układamy kostkę brukową na podjazdy, chodniki, tarasy i parkingi. Kompleksowa realizacja od przygotowania terenu po wykończenie - z doborem materiałów, doradztwem i bezpłatną wyceną na terenie powiatu bialskiego.',
    etykietaSekcji: 'Usługi brukarskie',
    tytulSekcji: 'Co oferujemy',
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
      tytul: 'Brukarstwo w Białej Podlaskiej i regionie',
      tekst: 'Realizujemy usługi brukarskie na terenie Białej Podlaskiej i okolic w promieniu 50 km - dojeżdżamy do Międzyrzeca Podlaskiego, Terespola, Janowa Podlaskiego, Radzynia Podlaskiego i Parczewa. Układamy kostkę brukową na podjazdach, chodnikach, alejkach ogrodowych, tarasach i parkingach. Każdy projekt zaczynamy od bezpłatnej wizji lokalnej z pomiarem terenu i doradztwa w doborze materiałów.',
      podtytul: 'Kompleksowa realizacja',
      podtekst:
        'W ramach zlecenia wykonujemy pełen zakres prac: korytowanie terenu, zagęszczenie gruntu, ułożenie podbudowy z kruszywa, montaż krawężników i obrzeży, podsypkę, układanie kostki we wybranym wzorze oraz fugowanie i zagęszczanie powierzchni. Dobieramy kostkę pod kątem obciążenia - inna grubość na chodnik (4–6 cm), inna na podjazd samochodowy (8 cm) czy parking ciężarowy (10 cm). Doradzamy w wyborze koloru, wzoru i materiału, aby efekt końcowy był trwały i estetyczny.',
      fotoObok: 'karta.kostka',
      fotoObokAlt: 'Układanie kostki brukowej na podjeździe - BramBruk powiat bialski',
    },
    galeria: [
      { foto: 'realizacja.02', tytul: 'Podjazd z kostki', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.06', tytul: 'Chodnik ogrodowy', lokalizacja: 'Sławacinek' },
      { foto: 'realizacja.09', tytul: 'Taras z kostki', lokalizacja: 'Rakowiska' },
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
    tytulHero: ['Altany, garaże i domki -', 'Biała Podlaska i okolice'],
    opisHero:
      'Budujemy solidne konstrukcje ogrodowe i gospodarcze - altany drewniane i murowane, garaże blaszane, domki narzędziowe i wiaty. Od fundamentu po wykończenie, na terenie powiatu bialskiego i okolic.',
    etykietaSekcji: 'Co budujemy',
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
      tytul: 'Budownictwo w regionie Białej Podlaskiej',
      tekst: 'Wykonujemy konstrukcje ogrodowe i gospodarcze na terenie Białej Podlaskiej, Międzyrzeca Podlaskiego, Terespola i okolicznych miejscowości powiatu bialskiego. Specjalizujemy się w altanach ogrodowych z drewna sosnowego i świerkowego, garażach blaszanych i murowanych, domkach narzędziowych oraz wiatach samochodowych.',
      podtytul: 'Altany ogrodowe na wymiar',
      podtekst:
        'Altana to miejsce na relaks, grillowanie i spotkania z rodziną. Budujemy altany drewniane z bali lub desek, z dachem krytym gontem bitumicznym, blachodachówką lub deskami. Na życzenie dobudowujemy grill murowany, ławki wbudowane, stół i oświetlenie. Standardowe wymiary od 3×3 m do 5×5 m, ale realizujemy też projekty niestandardowe. Montujemy również garaże blaszane (szybka realizacja, dobra cena) oraz budujemy garaże murowane z bloczków - każda konstrukcja stawiana na odpowiednio przygotowanym fundamencie.',
      fotoObok: 'karta.altana',
      fotoObokAlt: 'Altana ogrodowa drewniana - realizacja BramBruk okolice Białej Podlaskiej',
    },
    galeria: [
      { foto: 'realizacja.04', tytul: 'Altanka ogrodowa', lokalizacja: 'Biała Podlaska' },
      { foto: 'realizacja.06', tytul: 'Garaż', lokalizacja: 'Cicibór' },
      { foto: 'realizacja.09', tytul: 'Domek narzędziowy', lokalizacja: 'Sławacinek' },
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
        odpowiedz: 'Altana do 35 m² na działce budowlanej (max 2 altany na 500 m² działki) wymaga jedynie zgłoszenia w starostwie, nie pozwolenia na budowę. Pomożemy ustalić formalności dla Twojej działki w powiecie bialskim.',
      },
      {
        pytanie: 'Jak długo trwa budowa altany lub garażu?',
        odpowiedz: 'Altana drewniana: 3–7 dni roboczych. Garaż blaszany: 1–2 dni. Garaż murowany: 2–4 tygodnie. Czas zależy od stopnia skomplikowania i warunków pogodowych. Budujemy od marca do listopada.',
      },
    ],
  },
}
