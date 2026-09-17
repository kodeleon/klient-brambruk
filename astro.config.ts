/**
 * KONFIGURACJA BUILDA.
 *
 * Trzy rzeczy, które trzeba tu zrozumieć, zanim się cokolwiek zmieni:
 *
 * 1. `output: 'static'` i zero adapterów. Każda podstrona to osobny plik HTML
 *    z kompletem znaczników w źródle, gotowy przed uruchomieniem jakiegokolwiek
 *    skryptu. To jest wymóg blokujący z checklisty („strona czyta się bez
 *    JavaScriptu"), nie preferencja.
 *
 * 2. `build.assets: 'static'`. Wyjście builda ląduje w `dist/static/`, a nie
 *    w `dist/assets/`, i to jest decyzja o cache'owaniu, nie o porządku
 *    w katalogach. `/static/` to pliki z hashem w nazwie (rok + immutable),
 *    `/assets/` to wynik potoku zdjęć o stałych nazwach (doba). Gdyby leżały
 *    w jednym katalogu, reguły w `_headers` zachodziłyby na siebie, a one się
 *    NIE nadpisują - sklejają się przecinkiem.
 *
 * 3. `security.csp`. Astro liczy hashe SHA-256 swoich skryptów i stylów inline
 *    i wstawia gotową politykę w `<meta>`. Integracja `headers()` przepisuje
 *    ją do nagłówka HTTP w `dist/_headers`. Dzięki temu `script-src` nie
 *    potrzebuje `'unsafe-inline'` - a to jest punkt blokujący audytu.
 *    Nie dopisuj tu `'unsafe-inline'`. Jeśli coś nie działa przez CSP,
 *    przyczyną jest skrypt, nie polityka.
 */

import { defineConfig } from 'astro/config'
import tailwind from '@tailwindcss/vite'

import { site, moduly, endpointy, pozaMapaStrony, dodatkoweZrodlaCSP } from './src/config/site'
import { sitemap } from './tools/build/sitemap.mjs'
import { headers } from './tools/build/headers.mjs'
import { images } from './tools/media/integration.mjs'

/* ------------------------------------------------------------------ */
/* Źródła w CSP wyliczone z włączonych modułów                         */
/* ------------------------------------------------------------------ */

const connect = ["'self'"]
const script: string[] = []
const img = ["'self'", 'data:']

if (moduly.formularz && endpointy.formularz) connect.push(endpointy.formularz)
if (moduly.analityka && endpointy.plausible) {
  script.push(endpointy.plausible)
  connect.push(endpointy.plausible)
}

connect.push(...dodatkoweZrodlaCSP['connect-src'])
script.push(...dodatkoweZrodlaCSP['script-src'])
img.push(...dodatkoweZrodlaCSP['img-src'])

const unikalne = (a: string[]) => [...new Set(a)]

export default defineConfig({
  site: site.origin,
  output: 'static',
  trailingSlash: 'always',

  integrations: [
    images(),
    sitemap({ origin: site.origin, pozaMapa: [...pozaMapaStrony] }),
    headers({
      dodatkowe: {
        'connect-src': unikalne(connect),
        'img-src': unikalne(img),
        'font-src': unikalne(["'self'", ...dodatkoweZrodlaCSP['font-src']]),
        'frame-src': unikalne(dodatkoweZrodlaCSP['frame-src']),
      },
    }),
  ],

  markdown: {
    // Podświetlanie składni (Shiki) stosuje style inline, których CSP nie
    // przepuści bez hasha. Strony wizytówkowe nie pokazują kodu, więc zamiast
    // rozluźniać politykę - wyłączamy podświetlanie. Projekt, który realnie
    // potrzebuje bloków kodu, włącza `syntaxHighlight: 'prism'` (klasy CSS,
    // zero stylów inline) i dokłada arkusz motywu.
    syntaxHighlight: false,
  },

  build: {
    // patrz komentarz 2 na górze pliku
    assets: 'static',
    format: 'directory',
    // Arkusze zawsze jako osobny plik. Wstawiony inline musiałby mieć hash
    // w CSP przy każdej zmianie i nie skorzystałby z cache między podstronami.
    inlineStylesheets: 'never',
  },

  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        `img-src ${unikalne(img).join(' ')}`,
        `connect-src ${unikalne(connect).join(' ')}`,
        "font-src 'self'",
        // Formularz wysyła przez fetch do Workera, nie natywnie - ale
        // `form-action` domykamy i tak, na wypadek wariantu bez JS.
        "form-action 'self'",
        "base-uri 'none'",
        "object-src 'none'",
        // `frame-ancestors` celowo NIE ma w polityce wstawianej w <meta>:
        // przeglądarka ją tam ignoruje i wypisuje ostrzeżenie w konsoli,
        // a checklista wymaga konsoli bez ostrzeżeń. Dyrektywa wchodzi
        // wyłącznie do nagłówka HTTP - dokłada ją `tools/build/headers.mjs`.
        'upgrade-insecure-requests',
      ],
      scriptDirective: {
        resources: unikalne(script),
      },
    },
  },

  vite: {
    plugins: [tailwind()],
    build: {
      // Zero skryptów inline poza tymi, które wstawia sam Astro i które
      // ma policzone w CSP. Bundle zawsze jako osobny plik z hashem.
      assetsInlineLimit: 0,
    },
  },
})
