/**
 * KROJE PISMA PROJEKTU - konfiguracja importu.
 *
 * Kroje hostujemy u siebie. Żadnego odwołania do fonts.googleapis.com:
 * każde takie żądanie wysyła IP odwiedzającego do podmiotu trzeciego,
 * wymaga wyjątku w CSP i wpisu w polityce prywatności, a przy pierwszym
 * malowaniu i tak jest wolniejsze niż plik z własnej domeny.
 *
 * Źródłem plików są paczki `@fontsource-variable/*` trzymane jako zależność
 * deweloperska. To nie jest zależność produkcyjna - `npm run fonts` kopiuje
 * z nich woff2 do `public/fonts/`, przepisuje licencję i liczy metryki kroju
 * zastępczego. Pliki w `public/fonts/` idą do repozytorium i to one jadą
 * na serwer.
 *
 * PODMIANA KROJU W PROJEKCIE KLIENTA:
 *   1. `npm i -D @fontsource-variable/<krój>` (albo wrzuć woff2 ręcznie,
 *      patrz `zrodloPliku` niżej),
 *   2. popraw wpis poniżej,
 *   3. `npm run fonts`,
 *   4. popraw stos `--font-*` w `src/styles/tokens.css`.
 *
 * ⚠️ WARUNEK REGUŁY CACHE: `_headers` daje `/fonts/*` rok życia z `immutable`.
 * Podmiana kroju musi więc oznaczać NOWĄ NAZWĘ PLIKU, nie nadpisanie starej.
 * Służy do tego pole `wersja` - podbij je przy każdej zmianie pliku.
 */

export const kroje = [
  {
    /** Nazwa rodziny używana w CSS. Musi zgadzać się ze stosem w tokens.css. */
    rodzina: 'Onest',
    /** Paczka fontsource albo `null`, jeśli pliki wrzucasz ręcznie. */
    pakiet: '@fontsource-variable/onest',
    /** Wzorzec nazwy pliku w paczce; {subset} podstawia się z listy niżej. */
    plik: 'onest-{subset}-wght-normal.woff2',
    /** Podzbiory znaków. Dla polskiego wystarczą dwa. */
    podzbiory: ['latin', 'latin-ext'],
    /** Zakres wag kroju zmiennego. */
    waga: '100 900',
    styl: 'normal',
    /** Podbij przy podmianie pliku - wymusza nowy adres mimo reguły immutable. */
    wersja: 1,
    /**
     * Krój systemowy, względem którego liczymy metryki zastępcze.
     * Musi być konkretny. `system-ui` to inny plik na macOS, Windowsie
     * i Androidzie, więc metryki policzone raz byłyby błędne na dwóch z nich.
     * Dopuszczalne wartości to kroje mające metryki w bazie fontaine
     * (Arial, Verdana, Tahoma, Trebuchet MS, Georgia, Times New Roman,
     * Courier New, Segoe UI). Krój spoza tej listy kończy się ostrzeżeniem
     * i brakiem rodziny zapasowej, nie cichym `size-adjust: 100%`.
     */
    zastepczy: ['Arial'],
  },
  {
    rodzina: 'Manrope',
    pakiet: '@fontsource-variable/manrope',
    plik: 'manrope-{subset}-wght-normal.woff2',
    podzbiory: ['latin', 'latin-ext'],
    waga: '200 800',
    styl: 'normal',
    wersja: 1,
    zastepczy: ['Arial'],
  },
  {
    rodzina: 'Shantell Sans',
    pakiet: '@fontsource-variable/shantell-sans',
    plik: 'shantell-sans-{subset}-wght-normal.woff2',
    podzbiory: ['latin', 'latin-ext'],
    waga: '300 800',
    styl: 'normal',
    wersja: 1,
    zastepczy: ['Trebuchet MS'],
  },
]

/** Katalog wyjściowy plików woff2 - serwowany spod `/fonts/`. */
export const katalogWyjsciowy = 'public/fonts'

/** Arkusz z deklaracjami @font-face. Generowany, nie edytować ręcznie. */
export const arkusz = 'src/styles/fonts.css'
