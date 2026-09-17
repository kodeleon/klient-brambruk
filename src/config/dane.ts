/**
 * DANE POWTARZALNE - jedno źródło prawdy.
 *
 * Wszystko, co pojawia się na więcej niż jednej podstronie: adres, kontakt,
 * godziny, ceny, odnośniki zewnętrzne. Jeśli jakaś wartość stoi w dwóch
 * miejscach w kodzie, to są dwa miejsca do rozjazdu - i rozjadą się przy
 * pierwszej poprawce od klienta.
 *
 * Checklista przedwdrożeniowa sprawdza to wprost: „ta sama wartość wszędzie -
 * cena na stronie głównej i w cenniku pochodzą z tego samego miejsca".
 *
 * ZASADA: wartość, która pojawia się drugi raz, przenosi się tutaj.
 * Nie „gdy się powtarza często", tylko przy drugim wystąpieniu.
 *
 * Wartości oznaczone PLACEHOLDER czekają na potwierdzenie klienta.
 * Zero placeholderów w wydaniu - to też punkt checklisty.
 */

export const dane = {
  /** Nazwa firmy klienta, tak jak ma się pojawiać w treści. */
  nazwa: 'Nazwa Firmy',

  /** Krótkie określenie: branża i lokalizacja. Używane w nagłówkach i podglądzie linku. */
  opis: 'Branża · Miasto',

  // --- lokalizacja ---
  ulica: 'ul. Przykładowa 1', // PLACEHOLDER
  miasto: 'Warszawa', // PLACEHOLDER
  kodPocztowy: '00-001', // PLACEHOLDER
  /** Adres w jednej linii, do wyświetlenia obok mapy i w stopce. */
  adres: 'ul. Przykładowa 1, 00-001 Warszawa', // PLACEHOLDER
  /** Współrzędne punktu. Potrzebne tylko przy module mapy. */
  lat: '52.2297', // PLACEHOLDER
  lng: '21.0122', // PLACEHOLDER

  // --- kontakt ---
  telefon: '500 100 200', // PLACEHOLDER
  /** Forma dla href="tel:" - bez spacji, z numerem kierunkowym. */
  telefonHref: '+48500100200', // PLACEHOLDER
  email: 'kontakt@przyklad.pl', // PLACEHOLDER

  // --- odnośniki zewnętrzne ---
  // Pusty łańcuch = odnośnik się nie renderuje. Nigdy nie zostawiamy "#".
  instagram: '',
  instagramUrl: '',
  facebook: '',
  facebookUrl: '',
  /** Zewnętrzny system rezerwacji, jeśli klient go ma. */
  rezerwacjaUrl: '',

  // --- godziny otwarcia ---
  godzinyTydzien: '09:00 - 17:00', // PLACEHOLDER
  godzinySobota: '10:00 - 14:00', // PLACEHOLDER
  godzinyNiedziela: 'nieczynne', // PLACEHOLDER

  // --- administrator danych (polityka prywatności, klauzula RODO) ---
  administrator: 'Nazwa Firmy, ul. Przykładowa 1, 00-001 Warszawa', // PLACEHOLDER
  emailRodo: 'kontakt@przyklad.pl', // PLACEHOLDER
} as const

/**
 * CENNIK - osobno, bo zmienia się niezależnie od reszty danych.
 *
 * Jedna kwota na usługę. Ta sama wartość idzie na stronę główną i do cennika.
 */
export const cennik = [
  { usluga: 'Usługa pierwsza', cena: '100 zł', opis: 'Krótki opis tego, co wchodzi w zakres.' },
  { usluga: 'Usługa druga', cena: '150 zł', opis: 'Krótki opis tego, co wchodzi w zakres.' },
  { usluga: 'Usługa trzecia', cena: '200 zł', opis: 'Krótki opis tego, co wchodzi w zakres.' },
] as const

/**
 * NAWIGACJA - jedno miejsce, z którego bierze ją nagłówek, stopka i strona 404.
 *
 * Ścieżki z ukośnikiem na końcu, zgodnie z tym, co serwuje Cloudflare
 * (`html_handling: auto-trailing-slash`) i co deklaruje canonical.
 */
export const nawigacja = [
  { etykieta: 'Start', sciezka: '/' },
  { etykieta: 'Przykład', sciezka: '/przyklad-podstrony/' },
] as const

/** Rok do stopki. Liczony, nie zaszyty - checklista sprawdza to wprost. */
export const rok = new Date().getFullYear()
