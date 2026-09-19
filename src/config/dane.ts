/**
 * DANE POWTARZALNE - jedno źródło prawdy.
 *
 * Wszystko, co pojawia się na więcej niż jednej podstronie: adres, kontakt,
 * godziny, statystyki, odnośniki zewnętrzne, nawigacja. Jeśli jakaś wartość
 * stoi w dwóch miejscach w kodzie, to są dwa miejsca do rozjazdu - i rozjadą
 * się przy pierwszej poprawce od klienta.
 *
 * Ceny mieszkają osobno, w `src/data/cennik.ts`: zmieniają się niezależnie
 * od reszty danych i jest ich za dużo na ten plik.
 *
 * Źródło wartości: `code/src/data.js` ze starego projektu. Przeniesione bez
 * zmian - migracja odtwarza treść, nie poprawia jej.
 */

export const dane = {
  /** Nazwa firmy klienta, tak jak ma się pojawiać w treści. */
  nazwa: 'BramBruk',

  /** Pełna nazwa rejestrowa. Idzie do polityki prywatności i danych formalnych. */
  nazwaPelna: 'Rafał Wasyluk Ogrodzenia Brambruk',

  /** Krótkie określenie: branża i lokalizacja. */
  opis: 'Ogrodzenia, Brukarstwo, Budownictwo',

  /** Region obsługi. Używany w tytułach podstron i opisach. */
  region: 'Biała Podlaska i okolice',

  // --- lokalizacja ---
  adres: 'Bohukały 1, 21-550, woj. lubelskie',

  // --- rejestr ---
  nip: '5372685534',
  regon: '540140680',

  // --- kontakt ---
  telefon: '+48 572 271 342',
  /** Forma dla href="tel:" - bez spacji. */
  telefonHref: '+48572271342',
  email: 'kontakt@brambruk.pl',

  // --- godziny otwarcia ---
  godzinyTydzien: 'Pon–Pt: 7:00–18:00',
  godzinySobota: 'Sob: 8:00–14:00',

  // --- odnośniki zewnętrzne ---
  // Pusty łańcuch = odnośnik się nie renderuje. Nigdy nie zostawiamy "#".
  facebookUrl: 'https://www.facebook.com/profile.php?id=100088829901271',
  instagramUrl: 'https://www.instagram.com/brambruk/',
  tiktokUrl: 'https://www.tiktok.com/@brambruk_firma_bu',

  /**
   * Wizytówka w Mapach Google. Sam ODNOŚNIK, nie osadzenie: kliknięcie
   * otwiera mapy w nowej karcie, a strona nie wysyła nic do Google
   * samoczynnie. Identyfikator `cid` przeliczony z parametru `!1s` starego
   * iframe (0x7270eb6ed2922d60). ⚠️ DO SPRAWDZENIA W PRZEGLĄDARCE przed
   * wydaniem - odnośnik do cudzej wizytówki to jedyne miejsce, którego
   * nie da się zweryfikować z kodu.
   */
  mapyUrl: 'https://maps.google.com/?cid=8246349778927103328',

  // --- administrator danych (polityka prywatności, klauzula RODO) ---
  administrator: 'Rafał Wasyluk Ogrodzenia Brambruk, Bohukały 1, 21-550, woj. lubelskie',
  emailRodo: 'kontakt@brambruk.pl',
} as const

/** Profil na Fixly - ocena, liczba opinii, odnośnik. */
export const fixly = {
  ocena: '5/5',
  opinie: 2,
  url: 'https://fixly.pl/profil/fg4bbrrn',
} as const

/** Liczby używane w pasku statystyk i w treści. */
export const statystyki = {
  lata: 5,
  miejscowosci: 15,
  realizacje: '50+',
  zasieg: '100 km',
} as const

/**
 * NAWIGACJA GŁÓWNA - jedno miejsce, z którego bierze ją nagłówek i strona 404.
 *
 * Ścieżki z ukośnikiem na końcu, zgodnie z tym, co serwuje Cloudflare
 * (`html_handling: auto-trailing-slash`) i co deklaruje canonical. Odnośnik
 * bez ukośnika kosztuje przekierowanie przy każdym kliknięciu.
 */
export const nawigacja = [
  { etykieta: 'Usługi', sciezka: '/uslugi/' },
  { etykieta: 'Realizacje', sciezka: '/realizacje/' },
  { etykieta: 'O nas', sciezka: '/o-nas/' },
  { etykieta: 'Kontakt', sciezka: '/kontakt/' },
] as const

/** Kolumny odnośników w stopce. */
export const nawigacjaStopki = [
  {
    tytul: 'Nawigacja',
    pozycje: [
      { etykieta: 'Usługi i cennik', sciezka: '/uslugi/' },
      { etykieta: 'Realizacje', sciezka: '/realizacje/' },
      { etykieta: 'O nas', sciezka: '/o-nas/' },
      { etykieta: 'Kontakt', sciezka: '/kontakt/' },
      { etykieta: 'Wycena', sciezka: '/wycena/' },
    ],
  },
  {
    tytul: 'Typy usług',
    pozycje: [
      { etykieta: 'Ogrodzenia', sciezka: '/ogrodzenia/' },
      { etykieta: 'Brukarstwo', sciezka: '/brukarstwo/' },
      { etykieta: 'Budownictwo', sciezka: '/budownictwo/' },
    ],
  },
  {
    tytul: 'Rodzaje usług',
    pozycje: [
      { etykieta: 'Ogrodzenia panelowe', sciezka: '/ogrodzenia/panelowe/' },
      { etykieta: 'Ogrodzenia murowane', sciezka: '/ogrodzenia/murowane/' },
      { etykieta: 'Bramy przesuwne', sciezka: '/ogrodzenia/bramy-przesuwne/' },
      { etykieta: 'Bramy dwuskrzydłowe', sciezka: '/ogrodzenia/bramy-dwuskrzydlowe/' },
      { etykieta: 'Furtki', sciezka: '/ogrodzenia/furtki/' },
      { etykieta: 'Ogrodzenia z siatki', sciezka: '/ogrodzenia/siatka/' },
      { etykieta: 'Kostka brukowa', sciezka: '/brukarstwo/kostka-brukowa/' },
      { etykieta: 'Podjazdy', sciezka: '/brukarstwo/podjazdy/' },
      { etykieta: 'Chodniki i tarasy', sciezka: '/brukarstwo/chodniki-tarasy/' },
    ],
  },
] as const

/** Opinie klientów (Fixly). */
export const opinie = [
  {
    imie: 'Leszek',
    lokalizacja: 'Janów Podlaski',
    data: '2025',
    tresc:
      'Wykonanie usługi bez zarzutu - sprawnie i fschowo . Polecam tych wykonawców. Chłopcy chcą zarobić i pracują solidnie.',
    ocena: 5,
  },
  {
    imie: 'Piotr',
    lokalizacja: 'Janów Podlaski',
    data: '2024',
    tresc: 'Polecam super kontakt',
    ocena: 5,
  },
] as const

/** Rok do stopki. Liczony, nie zaszyty - checklista sprawdza to wprost. */
export const rok = new Date().getFullYear()
