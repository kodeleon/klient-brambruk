/**
 * KONFIGURACJA TECHNICZNA SERWISU - jedno miejsce na decyzje, nie na treść.
 *
 * Granica jest ostra i przebiega w jednym miejscu: TU są rzeczy, które zmienia
 * Kodeleon przy zmianie technicznej, a w `src/content/` rzeczy, które zmienia
 * klient. Nazwa firmy i jej krótki opis wyszły stąd do `src/content/firma.json`
 * właśnie dlatego: to są słowa klienta, a nie ustawienie serwisu.
 *
 * Ścieżki podstron mieszkają w `routes.ts` obok - też technika, bo wynikają
 * z `src/pages/`, nie z tego, co klient chce napisać.
 *
 * `origin` jest jedynym źródłem adresu bezwzględnego w całym repozytorium.
 * Bierze go stąd: canonical, og:url, og:image, dane strukturalne, mapa strony,
 * robots.txt i narzędzie audytu. Zmiana domeny to zmiana tej jednej linii.
 */

export const site = {
  /** Adres bezwzględny, bez ukośnika na końcu. */
  origin: 'https://brambruk.pl',

  /** Język dokumentu. Idzie do <html lang> i og:locale. */
  jezyk: 'pl',
  ogLocale: 'pl_PL',

  /** Kolor paska przeglądarki na telefonie. Odpowiada tłu nagłówka. */
  themeColor: '#1E1E1E',
} as const

/**
 * MODUŁY - co ten projekt faktycznie ma.
 *
 * Przełącznik nie jest ozdobą: steruje jednocześnie dyrektywami CSP,
 * blokami polityki prywatności i zakresem audytu.
 */
export const moduly = {
  /**
   * Formularze (kontakt + kreator wyceny).
   *
   * ⚠️ STAN PRZEJŚCIOWY. Formularze renderują się i walidują po stronie
   * przeglądarki, ale NIE MAJĄ jeszcze backendu: stary punkt docelowy
   * (`/wp-json/codove-mailing/...` w WordPressie) odpada razem z WordPressem,
   * a Worker powstanie osobno. Do tego czasu wysyłka pokazuje komunikat
   * zastępczy z telefonem i e-mailem - patrz `src/scripts/formularz.ts`.
   *
   * Przełącznik zostaje na `false`, dopóki `endpointy.formularz` jest pusty:
   * to on decyduje o wpisie w `connect-src`.
   */
  formularz: false,

  /** Analityka Plausible. Skrypt strony trzeciej - wymaga wpisu w polityce prywatności. */
  analityka: false,

  /** Galeria z powiększaniem zdjęć. */
  galeria: true,

  /** Kolekcja artykułów pod SEO. */
  artykuly: false,

  /** Druga wersja językowa. */
  drugiJezyk: false,

  /**
   * Mapa dojazdu: statyczny obraz renderowany z danych OpenStreetMap
   * (`maps/dojazd/`) plus odnośnik do wizytówki w Mapach Google - zamiast
   * osadzonego iframe Google.
   *
   * ⚠️ Przełącznik NIE steruje niczym w kodzie. Obraz z własnego originu
   * nie potrzebuje wpisu w CSP ani w polityce prywatności, więc - w odróżnieniu
   * od `formularz` i `analityka` - nie ma czego włączać. Stan opisuje zakres
   * wdrożenia (tabela modułów w README). Iframe z zewnętrznym serwisem map
   * byłby osobnym modułem z wpisem w `frame-src` i w polityce, nie tym.
   */
  mapa: true,
} as const

/**
 * ADRESY ZEWNĘTRZNE używane przez moduły.
 *
 * Każda wartość tutaj wchodzi do CSP. Pusty łańcuch znaczy „moduł wyłączony
 * albo jeszcze nieskonfigurowany" i wtedy nic do polityki nie trafia.
 */
export const endpointy = {
  /**
   * Worker przyjmujący zgłoszenia z formularzy.
   * Trafia do `connect-src`. Przykład: 'https://formularz.brambruk.workers.dev'
   */
  formularz: '',

  /** Host skryptu Plausible. Trafia do `script-src` i `connect-src`. */
  plausible: 'https://plausible.io',
}

/**
 * Podstrony wyłączone z mapy strony.
 *
 * `/cennik/` to widok administracyjny: zestawienie wszystkich cen używanych
 * na stronie, nielinkowane z nawigacji ani ze stopki. W starym projekcie nie
 * miało wpisu w mapie SEO i dostawało `noindex` - zachowujemy to zachowanie.
 *
 * Polityka prywatności ZOSTAJE w mapie strony: w starym serwisie była
 * indeksowana (`index,follow`, priorytet 0.4), a migracja nie zmienia
 * sygnałów indeksowania bez powodu.
 */
export const pozaMapaStrony: string[] = ['/cennik/']

/**
 * Dodatkowe źródła w CSP, ponad to, co wynika z modułów.
 *
 * ⚠️ PUSTE I TAKIE MA ZOSTAĆ. Po migracji serwis nie wykonuje ANI JEDNEGO
 * żądania poza własny origin: kroje są lokalne, zdjęcia są lokalne, mapa jest
 * obrazem, analityki nie ma. Każdy wpis tutaj to nowy podmiot przetwarzający
 * dane odwiedzających, wpis w polityce prywatności i pozycja w inwentarzu
 * żądań zewnętrznych z checklisty.
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
