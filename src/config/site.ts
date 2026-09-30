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

import type { SlugFormularza } from './formularze'

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
   * Formularze (kontakt + kreator wyceny) wysyłane do Workera z `forms-worker/`.
   *
   * Włączony dokłada origin Workera do `connect-src`, `blob:` do `img-src`
   * (podgląd zdjęć w kreatorze) i adres wysyłki do znacznika formularzy
   * (`adresFormularza`). Wyłączony: formularze się renderują, ale wysyłka
   * kończy się komunikatem z telefonem i e-mailem firmy.
   */
  formularz: true,

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
   * Worker przyjmujący zgłoszenia z formularzy - sam origin, bez ścieżki.
   * Trafia do `connect-src`; adresy formularzy składa `adresFormularza`.
   */
  formularz: originApiFormularzy(),

  /** Host skryptu Plausible. Trafia do `script-src` i `connect-src`. */
  plausible: 'https://plausible.io',
}

/**
 * Origin Workera formularzy. Domyślnie produkcja; zmienna środowiskowa builda
 * `ADRES_API_FORMULARZY` przestawia go bez zmiany kodu, np. na worker lokalny:
 *
 *   ADRES_API_FORMULARZY=http://localhost:8787 npm run build
 *
 * CSP (astro.config.ts) i adres wysyłki (znacznik stron) biorą się z tej
 * jednej wartości, więc nie mogą się rozjechać. Czytana wyłącznie z
 * `process.env`: ten plik wykonują tylko konfiguracja i prerender stron, oba
 * w Node. Plik `.env` jej NIE ustawia - konfigurację Astro ładuje, zanim
 * Vite wczyta `.env`, więc CSP i znacznik dostałyby różne adresy.
 */
function originApiFormularzy(): string {
  const zmienna = typeof process === 'undefined' ? undefined : process.env.ADRES_API_FORMULARZY
  // `origin` odcina ścieżkę i końcowy ukośnik; zły adres przerywa build.
  return new URL(zmienna?.trim() || 'https://api.brambruk.pl').origin
}

/**
 * Adres wysyłki jednego formularza albo `undefined` przy wyłączonym module.
 * Dla stron `.astro` - skrypt przeglądarki czyta go z `data-adres` formularza
 * i tego pliku nie importuje (zmienna builda istnieje tylko w Node).
 */
export function adresFormularza(slug: SlugFormularza): string | undefined {
  return moduly.formularz ? `${endpointy.formularz}/forms/${slug}` : undefined
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
