/**
 * KONFIGURACJA TECHNICZNA SERWISU - jedno miejsce na decyzje, nie na treść.
 *
 * Treść powtarzalna (adres, telefon, godziny, ceny, odnośniki) mieszka
 * w `dane.ts` obok. Podział jest celowy: `site.ts` zmienia się raz, przy
 * zakładaniu projektu, `dane.ts` zmienia się za każdym razem, gdy klient
 * przyśle poprawkę.
 *
 * `origin` jest jedynym źródłem adresu bezwzględnego w całym repozytorium.
 * Bierze go stąd: canonical, og:url, og:image, dane strukturalne, mapa strony,
 * robots.txt i narzędzie audytu. Zmiana domeny to zmiana tej jednej linii.
 */

export const site = {
  /** Adres bezwzględny, bez ukośnika na końcu. */
  origin: 'https://przyklad.kodeleon.pl',

  /** Nazwa serwisu. Trafia do og:site_name i danych strukturalnych. */
  nazwa: 'Baza Kodeleon',

  /** Krótki opis serwisu. Trafia do danych strukturalnych, nie do meta description. */
  opis: 'Repozytorium startowe projektów klienckich Kodeleon.',

  /** Język dokumentu. Idzie do <html lang> i og:locale. */
  jezyk: 'pl',
  ogLocale: 'pl_PL',

  /** Kolor paska przeglądarki na telefonie. Powinien odpowiadać tłu strony. */
  themeColor: '#0a0d1a',
} as const

/**
 * MODUŁY - co ten projekt faktycznie ma.
 *
 * Przełącznik nie jest ozdobą: steruje jednocześnie dyrektywami CSP,
 * blokami polityki prywatności i zakresem audytu. Włączenie modułu bez
 * dopisania go tutaj zostawi zablokowany zasób w konsoli i lukę w polityce.
 *
 * Domyślnie wszystko wyłączone. Pusta baza ma zero żądań poza własny origin.
 */
export const moduly = {
  /** Formularz kontaktowy. Wysyłka idzie do Workera, nie do natywnego action. */
  formularz: false,

  /** Analityka Plausible. Skrypt strony trzeciej - wymaga wpisu w polityce prywatności. */
  analityka: false,

  /** Galeria z powiększaniem zdjęć. */
  galeria: true,

  /** Kolekcja artykułów pod SEO (pakiet Premium). */
  artykuly: false,

  /** Druga wersja językowa. */
  drugiJezyk: false,

  /** Mapa renderowana statycznie przez osm-custom-view. */
  mapa: false,
} as const

/**
 * ADRESY ZEWNĘTRZNE używane przez moduły.
 *
 * Każda wartość tutaj wchodzi do CSP. Pusty łańcuch znaczy „moduł wyłączony
 * albo jeszcze nieskonfigurowany" i wtedy nic do polityki nie trafia.
 */
export const endpointy = {
  /**
   * Worker przyjmujący zgłoszenia z formularza.
   * Trafia do `connect-src`. Przykład: 'https://formularz.przyklad.workers.dev'
   */
  formularz: '',

  /** Host skryptu Plausible. Trafia do `script-src` i `connect-src`. */
  plausible: 'https://plausible.io',
}

/**
 * Podstrony wyłączone z mapy strony.
 *
 * Mapa strony jest deklaracją „to chcemy w wynikach wyszukiwania".
 * Podstrona z `noindex` nie może w niej stać - to sprzeczny sygnał
 * indeksowania. W `robots.txt` jej nie blokujemy: robot musi wejść
 * na stronę, żeby w ogóle zobaczyć `noindex`.
 *
 * Ścieżki podajemy tak, jak wychodzą z builda: z ukośnikiem na końcu.
 */
export const pozaMapaStrony: string[] = ['/polityka-prywatnosci/']

/**
 * Dodatkowe źródła w CSP, ponad to, co wynika z modułów.
 *
 * Wpisujesz tu host tylko wtedy, gdy strona faktycznie coś z niego pobiera.
 * Każdy wpis musi mieć odpowiednik w inwentarzu żądań zewnętrznych
 * i w polityce prywatności - to wymóg z checklisty przedwdrożeniowej,
 * nie sugestia.
 */
export const dodatkoweZrodlaCSP = {
  'script-src': [] as string[],
  'connect-src': [] as string[],
  'img-src': [] as string[],
  'font-src': [] as string[],
  'frame-src': [] as string[],
}

/** Pomocnik: adres bezwzględny z dowolnej ścieżki względnej. */
export function adres(sciezka = '/'): string {
  return new URL(sciezka, site.origin + '/').href
}
