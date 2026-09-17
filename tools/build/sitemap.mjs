/**
 * INTEGRACJA: mapa strony, robots.txt i lista podstron dla audytu.
 *
 * Wszystkie trzy powstają z JEDNEJ listy - tej, którą build faktycznie
 * wygenerował. Plik pisany ręcznie rozjedzie się przy pierwszej nowej
 * podstronie i nikt tego nie zauważy, bo nic tego nie sprawdza.
 * Checklista wymaga tego wprost: „mapa strony generowana z listy podstron
 * używanej przez build".
 *
 * Wyłączenia z mapy strony biorą się z `pozaMapaStrony` w `src/config/site.ts`.
 * Mapa jest deklaracją „to chcemy w wynikach", więc podstrona z `noindex`
 * nie może w niej stać. W `robots.txt` jej NIE blokujemy: robot musi wejść
 * na stronę, żeby w ogóle zobaczyć `noindex`.
 *
 * Bez `lastmod`: wartość musiałaby opisywać zmianę treści, a nie datę builda.
 * Data builda zmieniałaby się przy każdym przebiegu i nie znaczyłaby nic.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** `przyklad/` → `/przyklad/`, `` → `/` */
function normalizuj(pathname) {
  let p = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (!p.endsWith('/')) p += '/'
  return p
}

/**
 * Strona błędu nie jest podstroną serwisu. Astro zgłasza ją w liście tras,
 * ale w mapie strony byłaby zaproszeniem dla robota do zaindeksowania błędu,
 * a w audycie - podstroną, której nie da się osiągnąć pod własnym adresem.
 */
const NIE_PODSTRONA = ['/404/', '/500/']

/**
 * @param {object} opcje
 * @param {string} opcje.origin        adres bezwzględny serwisu, bez ukośnika na końcu
 * @param {string[]} [opcje.pozaMapa]  ścieżki wyłączone z mapy strony (z ukośnikiem)
 * @param {string} [opcje.stateDir] gdzie zapisać listę podstron dla audytu
 */
export function sitemap({ origin, pozaMapa = /** @type {string[]} */ ([]), stateDir = '.build-state' }) {
  if (!origin) throw new Error('sitemap: brak `origin` - sprawdź src/config/site.ts')
  const baza = origin.replace(/\/$/, '')

  return {
    name: 'kodeleon-sitemap',
    hooks: {
      'astro:build:done': async ({ pages, dir, logger }) => {
        const wszystkie = [...new Set(pages.map((p) => normalizuj(p.pathname)))]
          .filter((p) => !NIE_PODSTRONA.includes(p))
          .sort()
        const wMapie = wszystkie.filter((p) => !pozaMapa.includes(p))
        const pominiete = wszystkie.filter((p) => pozaMapa.includes(p))

        const wpisy = wMapie.map((p) => `  <url><loc>${baza}${p}</loc></url>`).join('\n')
        const sitemap =
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `${wpisy}\n` +
          '</urlset>\n'

        const robots = `User-agent: *\nAllow: /\n\nSitemap: ${baza}/sitemap.xml\n`

        const distDir = fileURLToPath(dir)
        await writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8')
        await writeFile(path.join(distDir, 'robots.txt'), robots, 'utf8')

        // Lista podstron dla narzędzia audytu. To jest DRUGIE źródło adresów,
        // obok `sitemap.xml`. Audyt bierze SUMĘ obu i zgłasza rozbieżność -
        // podstrona obecna w jednym źródle, a nieobecna w drugim, jest sama
        // w sobie sygnałem (np. przypadkowy `noindex` albo zapomniane
        // wyłączenie z mapy).
        const stan = path.resolve(process.cwd(), stateDir)
        await mkdir(stan, { recursive: true })
        await writeFile(
          path.join(stan, 'strony.json'),
          JSON.stringify(
            { origin: baza, zbudowane: wszystkie, wMapieStrony: wMapie, pozaMapaStrony: pominiete },
            null,
            2
          ),
          'utf8'
        )

        logger.info(
          `mapa strony: ${wMapie.length} adresów` +
            (pominiete.length ? ` (poza mapą: ${pominiete.join(', ')})` : '')
        )
      },
    },
  }
}

export default sitemap
