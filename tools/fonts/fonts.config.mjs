/**
 * KROJE PISMA PROJEKTU - konfiguracja importu.
 *
 * Kroje hostujemy u siebie. Żadnego odwołania do fonts.googleapis.com:
 * każde takie żądanie wysyła IP odwiedzającego do podmiotu trzeciego,
 * wymaga wyjątku w CSP i wpisu w polityce prywatności, a przy pierwszym
 * malowaniu i tak jest wolniejsze niż plik z własnej domeny.
 *
 * Stary projekt ciągnął całą trójkę z Google Fonts jednym `<link>`
 * w `index.html`, razem z dwoma `preconnect`. Po migracji: zero żądań
 * poza własną domenę.
 *
 * PODMIANA KROJU W PROJEKCIE:
 *   1. `npm i -D @fontsource(-variable)/<krój>`,
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
    /**
     * Znak słowny „BramBruk" w nagłówku i stopce. Krój statyczny (jedna waga),
     * nie zmienny - Audiowide ma tylko 400.
     */
    rodzina: 'Audiowide',
    pakiet: '@fontsource/audiowide',
    plik: 'audiowide-{subset}-400-normal.woff2',
    podzbiory: ['latin', 'latin-ext'],
    waga: '400',
    styl: 'normal',
    wersja: 1,
    /**
     * Krój systemowy, względem którego liczymy metryki zastępcze.
     * Audiowide jest szeroki i geometryczny - z listy kroju mających metryki
     * w bazie fontaine najbliżej mu do Trebuchet MS.
     */
    zastepczy: ['Trebuchet MS'],
  },
  {
    /** Nagłówki i liczby - klasa `font-display`. */
    rodzina: 'Montserrat',
    pakiet: '@fontsource-variable/montserrat',
    plik: 'montserrat-{subset}-wght-normal.woff2',
    podzbiory: ['latin', 'latin-ext'],
    waga: '100 900',
    styl: 'normal',
    wersja: 1,
    zastepczy: ['Arial'],
  },
  {
    /** Treść i interfejs - klasa `font-body`, domyślny krój `body`. */
    rodzina: 'Manrope',
    pakiet: '@fontsource-variable/manrope',
    plik: 'manrope-{subset}-wght-normal.woff2',
    podzbiory: ['latin', 'latin-ext'],
    waga: '200 800',
    styl: 'normal',
    wersja: 1,
    zastepczy: ['Arial'],
  },
]

/** Katalog wyjściowy plików woff2 - serwowany spod `/fonts/`. */
export const katalogWyjsciowy = 'public/fonts'

/** Arkusz z deklaracjami @font-face. Generowany, nie edytować ręcznie. */
export const arkusz = 'src/styles/fonts.css'
