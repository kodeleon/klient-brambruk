/**
 * INTEGRACJA: `_headers` dla Cloudflare - nagłówki bezpieczeństwa i cache.
 *
 * Plik jest GENEROWANY, nie pisany ręcznie, z jednego powodu: polityka treści
 * musi nieść hashe SHA-256 skryptów i stylów, które Astro wstawia inline.
 * Hashe zmieniają się razem z kodem, więc ręczna kopia rozjechałaby się przy
 * pierwszej zmianie i strona przestałaby działać w sposób trudny do namierzenia
 * (skrypt zablokowany, konsola „Refused to execute", brak błędu w buildzie).
 *
 * ŹRÓDŁEM PRAWDY JEST WYNIK BUILDA. Astro liczy hashe samo i wstawia gotową
 * politykę w `<meta http-equiv="content-security-policy">` na każdej podstronie.
 * Ta integracja czyta WSZYSTKIE zbudowane dokumenty, robi sumę tokenów per
 * dyrektywa i przepisuje wynik do nagłówka HTTP. Meta zostaje w dokumencie -
 * obie warstwy działają niezależnie i obowiązuje ta bardziej restrykcyjna,
 * więc druga warstwa niczego nie psuje, a chroni przy ręcznym wgraniu `dist`
 * bez `_headers`.
 *
 * ⚠️ REGUŁY W `_headers` SIĘ NIE NADPISUJĄ. Żądanie pasujące do kilku wzorców
 * dostaje nagłówki ze WSZYSTKICH, a ten sam nagłówek użyty dwa razy jest
 * sklejany przecinkiem. Dlatego ścieżki cache poniżej nie mogą na siebie
 * zachodzić - i dlatego wyjście builda siedzi w `/static/` (nazwy z hashem),
 * a wynik potoku zdjęć w `/assets/` (nazwy stałe). Dwa katalogi, dwie reguły,
 * zero nakładania.
 *
 * ⚠️ Plik zaczyna się od podkreślenia. Przy ręcznym wgrywaniu `dist` bardzo
 * łatwo go przeoczyć - audyt sprawdza jego obecność w wyniku builda.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Wartość atrybutu zawiera pojedyncze apostrofy ('self', 'sha256-...'),
// więc klasa znaków musi je dopuszczać - dopasowujemy tylko po cudzysłowie.
const META_CSP = /<meta\s+http-equiv="content-security-policy"\s+content="([^"]*)"\s*\/?>/i

/** Dekoduje encje HTML, które mogły trafić do atrybutu `content`. */
const odkoduj = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

async function plikiHtml(dir) {
  const out = []
  for (const wpis of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, wpis.name)
    if (wpis.isDirectory()) out.push(...(await plikiHtml(p)))
    else if (wpis.name.endsWith('.html')) out.push(p)
  }
  return out
}

/** `"script-src 'self' 'sha256-a'; style-src 'self'"` → Map(dyrektywa → Set(token)) */
function rozbij(polityka) {
  const mapa = new Map()
  for (const czlon of polityka.split(';')) {
    const kawalki = czlon.trim().split(/\s+/).filter(Boolean)
    if (!kawalki.length) continue
    const [dyrektywa, ...tokeny] = kawalki
    if (!mapa.has(dyrektywa)) mapa.set(dyrektywa, new Set())
    for (const t of tokeny) mapa.get(dyrektywa).add(t)
  }
  return mapa
}

/**
 * Dyrektywy, które w `<meta>` NIE działają i tylko zaśmiecają konsolę
 * ostrzeżeniem („is ignored when delivered via a <meta> element").
 * Checklista wymaga czystej konsoli, więc trzymamy je wyłącznie w nagłówku,
 * a z polityki w dokumencie są celowo wycięte (astro.config.ts ich nie podaje).
 */
const TYLKO_NAGLOWEK = {
  'frame-ancestors': ["'none'"],
}

/**
 * @param {object} opcje
 * @param {Record<string, string[]>} [opcje.dodatkowe] dyrektywy CSP dokładane z konfiguracji projektu
 * @param {string} [opcje.katalogHashy]   ścieżka plików z hashem w nazwie (rok + immutable)
 * @param {string} [opcje.katalogZasobow] ścieżka plików o stałych nazwach (doba)
 */
export function headers({
  dodatkowe = /** @type {Record<string, string[]>} */ ({}),
  katalogHashy = '/static/',
  katalogZasobow = '/assets/',
}) {
  return {
    name: 'kodeleon-headers',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir)
        const pliki = await plikiHtml(distDir)

        // --- suma polityk ze wszystkich podstron -----------------------
        const suma = new Map()
        let znalezione = 0

        for (const plik of pliki) {
          const html = await readFile(plik, 'utf8')
          const trafienie = META_CSP.exec(html)
          if (!trafienie) continue
          znalezione++
          for (const [dyrektywa, tokeny] of rozbij(odkoduj(trafienie[1]))) {
            if (!suma.has(dyrektywa)) suma.set(dyrektywa, new Set())
            for (const t of tokeny) suma.get(dyrektywa).add(t)
          }
        }

        if (!znalezione) {
          logger.warn(
            'nie znalazłem polityki CSP w żadnym dokumencie - sprawdź `security.csp` w astro.config.ts. ' +
              '`_headers` powstanie bez CSP.'
          )
        }

        // --- dyrektywy, które mają sens tylko w nagłówku ---------------
        for (const [dyrektywa, zrodla] of Object.entries(TYLKO_NAGLOWEK)) {
          suma.set(dyrektywa, new Set(zrodla))
        }

        // --- dyrektywy dokładane z konfiguracji projektu ---------------
        for (const [dyrektywa, zrodla] of Object.entries(dodatkowe)) {
          if (!zrodla?.length) continue
          if (!suma.has(dyrektywa)) suma.set(dyrektywa, new Set(["'self'"]))
          for (const z of zrodla) suma.get(dyrektywa).add(z)
        }

        // Kolejność dyrektyw jest stała, żeby dwa buildy z tego samego kodu
        // dawały identyczny plik - manifest haszy porównuje tekst.
        const kolejnosc = [
          'default-src',
          'script-src',
          'style-src',
          'img-src',
          'font-src',
          'connect-src',
          'form-action',
          'frame-src',
          'frame-ancestors',
          'base-uri',
          'object-src',
          'manifest-src',
          'media-src',
          'worker-src',
          'upgrade-insecure-requests',
        ]
        const pozostale = [...suma.keys()].filter((d) => !kolejnosc.includes(d)).sort()

        const csp = [...kolejnosc, ...pozostale]
          .filter((d) => suma.has(d))
          .map((d) => {
            const tokeny = [...suma.get(d)]
            // Tokeny sortujemy tak, żeby słowa kluczowe stały przed hashami -
            // czytelniej przy ręcznym przeglądaniu, a znaczenia nie zmienia.
            tokeny.sort((a, b) => {
              const h = (s) => (s.startsWith("'sha") ? 1 : 0)
              return h(a) - h(b) || a.localeCompare(b)
            })
            return tokeny.length ? `${d} ${tokeny.join(' ')}` : d
          })
          .join('; ')

        const linieCSP = csp
          ? '  Content-Security-Policy: ' + csp
          : '  # brak CSP - patrz ostrzezenie builda'

        // Budowane z tablicy, nie z jednego szablonu: tekst zawiera wsteczne
        // apostrofy i znaki dolara, ktore w szablonie trzeba by escapowac,
        // a jeden zapomniany escape urywa plik w losowym miejscu.
        const tresc = [
          '# PLIK GENEROWANY przy kazdym buildzie - nie edytowac recznie.',
          '# Zrodlo: tools/build/headers.mjs + src/config/site.ts',
          '#',
          '# Cloudflare (Workers ze statycznymi zasobami i Pages) czyta ten plik',
          '# z korzenia katalogu statycznego. Sam plik nie jest serwowany, jest parsowany.',
          '#',
          '# UWAGA: reguly sie NIE nadpisuja. Zadanie pasujace do kilku wzorcow dostaje',
          '# naglowki ze WSZYSTKICH, a powtorzony naglowek jest sklejany przecinkiem.',
          '# Sciezki ponizej celowo na siebie nie zachodza.',
          '',
          '# --- bezpieczenstwo, caly serwis ---------------------------------------',
          '#',
          '# Hashe w script-src i style-src policzyl Astro z faktycznej tresci skryptow',
          '# i stylow inline w tym buildzie. Nie ma tu unsafe-inline i nie powinno sie',
          '# pojawic - to punkt blokujacy w audycie przedwdrozeniowym.',
          '',
          '/*',
          linieCSP,
          '  X-Content-Type-Options: nosniff',
          '  Referrer-Policy: strict-origin-when-cross-origin',
          '  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()',
          '  Cross-Origin-Opener-Policy: same-origin',
          '  X-Frame-Options: DENY',
          '',
          '# --- cache -------------------------------------------------------------',
          '#',
          '# Domyslna wartosc Cloudflare dla plikow statycznych to',
          '# "public, max-age=0, must-revalidate", czyli pytanie do serwera przy kazdym',
          '# wejsciu - takze o bundle z hashem w nazwie, ktory z definicji nie moze sie',
          '# zmienic pod tym samym adresem. Ponizsze reguly to prostuja.',
          '',
          '# Wyjscie builda: nazwa zawiera hash tresci, wiec zmiana pliku = zmiana adresu.',
          '# Rok i "immutable" sa tu bezpieczne z definicji.',
          katalogHashy + '*',
          '  Cache-Control: public, max-age=31536000, immutable',
          '',
          '# Kroje pisma maja stale nazwy, ale zmieniaja sie tylko razem z systemem',
          '# wizualnym. WARUNEK: podmiana kroju oznacza NOWA nazwe pliku (pole "wersja"',
          '# w tools/fonts/fonts.config.mjs), nie nadpisanie starej. Nadpisanie zostawi',
          '# polowe odwiedzajacych ze starym krojem na rok.',
          '/fonts/*',
          '  Cache-Control: public, max-age=31536000, immutable',
          '',
          '# Wynik potoku zdjec. Nazwy sa stale i przewidywalne, wiec podmiana kadru',
          '# zostawia ten sam adres - stad doba swiezosci zamiast roku.',
          '# "stale-while-revalidate" sprawia, ze uzytkownik i tak nie czeka: dostaje',
          '# wersje z cache, a przegladarka odswieza ja w tle.',
          katalogZasobow + '*',
          '  Cache-Control: public, max-age=86400, stale-while-revalidate=604800',
          '',
        ].join('\n')

        await writeFile(path.join(distDir, '_headers'), tresc, 'utf8')
        logger.info(`_headers: CSP z ${znalezione} dokumentów, ${suma.size} dyrektyw`)
      },
    },
  }
}

export default headers
