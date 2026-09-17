/**
 * PODGLĄD WIERNY HOSTINGOWI - serwer statyczny udający Cloudflare Workers.
 *
 *   npm run preview                 podgląd na http://localhost:4321
 *   npm run preview -- --port=5000
 *
 * ┌── PO CO WŁASNY SERWER, SKORO ASTRO MA `astro preview` ─────────────────┐
 * │ `astro preview` serwuje pliki, ale NIE udaje hostingu. Trzy rzeczy     │
 * │ zachowują się u niego inaczej niż na produkcji i wszystkie trzy są     │
 * │ punktami checklisty przedwdrożeniowej:                                 │
 * │                                                                        │
 * │   1. STRONA 404. Astro oddaje własny komunikat („Not Found             │
 * │      (trailingSlash is set to always)"), a nie `dist/404.html`.        │
 * │      Cloudflare z `not_found_handling: "404-page"` oddaje nasz         │
 * │      dokument razem ze statusem 404. Bez tego nie da się lokalnie      │
 * │      sprawdzić punktu „nieistniejący adres oddaje Twoją stronę 404".   │
 * │                                                                        │
 * │   2. NAGŁÓWKI. `astro preview` ignoruje `dist/_headers`, więc CSP,     │
 * │      `nosniff` i reguły cache w ogóle nie trafiają do odpowiedzi.      │
 * │      Checklista mówi wprost: obecność pliku z regułami to nie to samo  │
 * │      co działający nagłówek. Ten serwer je stosuje, więc audyt widzi   │
 * │      to samo, co zobaczy przeglądarka na produkcji.                    │
 * │                                                                        │
 * │   3. UKOŚNIK NA KOŃCU. Cloudflare z `html_handling:                    │
 * │      "auto-trailing-slash"` przekierowuje `/kontakt` na `/kontakt/`.   │
 * │      Astro po prostu zwraca błąd.                                      │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠️ To jest EMULACJA, nie produkcja. Sprawdzenia oznaczone 🔴 w checkliście
 * i tak trzeba powtórzyć na wdrożonej wersji - hosting potrafi dołożyć własne
 * nagłówki i podmienić `robots.txt`. Ten serwer wychwytuje błędy wcześniej,
 * nie zastępuje testu po wdrożeniu.
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const TYPY = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

/**
 * Parsuje `_headers` do listy reguł.
 * Format Cloudflare: linia ze ścieżką, potem wcięte linie `Nazwa: wartość`.
 */
async function wczytajNaglowki(dist) {
  const plik = path.join(dist, '_headers')
  if (!existsSync(plik)) return []

  const reguly = []
  let biezaca = null
  for (const linia of (await readFile(plik, 'utf8')).split('\n')) {
    if (!linia.trim() || linia.trimStart().startsWith('#')) continue
    if (!/^\s/.test(linia)) {
      biezaca = { wzorzec: linia.trim(), naglowki: [] }
      reguly.push(biezaca)
    } else if (biezaca) {
      const podzial = linia.indexOf(':')
      if (podzial > 0) {
        biezaca.naglowki.push([linia.slice(0, podzial).trim(), linia.slice(podzial + 1).trim()])
      }
    }
  }
  return reguly
}

/** `/static/*` pasuje do `/static/cokolwiek`; `/*` pasuje do wszystkiego. */
const pasuje = (wzorzec, sciezka) =>
  wzorzec.endsWith('/*')
    ? sciezka.startsWith(wzorzec.slice(0, -1))
    : wzorzec === sciezka

export async function startPreview({ port = 4321, dist = 'dist' } = {}) {
  const katalog = path.join(ROOT, dist)
  if (!existsSync(path.join(katalog, 'index.html'))) {
    throw new Error(`brak ${dist}/index.html - uruchom \`npm run build\``)
  }

  const reguly = await wczytajNaglowki(katalog)
  const strona404 = path.join(katalog, '404.html')

  const serwer = createServer(async (req, res) => {
    let sciezka = decodeURIComponent((req.url || '/').split('?')[0])

    // Pliki od podkreślenia są PARSOWANE przez hosting, nie serwowane.
    if (path.basename(sciezka).startsWith('_')) {
      res.writeHead(404).end()
      return
    }

    let plik = path.join(katalog, sciezka)

    // html_handling: auto-trailing-slash
    if (!sciezka.endsWith('/') && !path.extname(sciezka)) {
      if (existsSync(path.join(katalog, sciezka, 'index.html'))) {
        res.writeHead(308, { Location: `${sciezka}/` }).end()
        return
      }
    }
    if (sciezka.endsWith('/')) plik = path.join(katalog, sciezka, 'index.html')

    let status = 200
    let doWyslania = plik

    // not_found_handling: 404-page
    if (!existsSync(doWyslania) || !(await stat(doWyslania)).isFile()) {
      if (!existsSync(strona404)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404')
        return
      }
      doWyslania = strona404
      status = 404
    }

    const naglowki = { 'Content-Type': TYPY[path.extname(doWyslania)] ?? 'application/octet-stream' }
    for (const regula of reguly) {
      if (!pasuje(regula.wzorzec, sciezka)) continue
      for (const [nazwa, wartosc] of regula.naglowki) naglowki[nazwa] = wartosc
    }

    res.writeHead(status, naglowki)
    res.end(await readFile(doWyslania))
  })

  await new Promise((gotowe, blad) => {
    serwer.once('error', blad)
    serwer.listen(port, '127.0.0.1', gotowe)
  })

  return {
    adres: `http://localhost:${port}`,
    zatrzymaj: () =>
      new Promise((gotowe) => {
        serwer.closeAllConnections?.()
        serwer.close(() => gotowe())
      }),
  }
}

// Uruchomienie wprost z wiersza poleceń: `npm run preview`
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const arg = (n, d) => {
    const t = process.argv.find((a) => a.startsWith(`--${n}=`))
    return t ? t.slice(n.length + 3) : d
  }
  const { adres } = await startPreview({ port: Number(arg('port', '4321')) })
  console.log(`\n  Podgląd wierny hostingowi: ${adres}`)
  console.log('  Stosuje dist/_headers, stronę 404 z kodem 404 i ukośnik na końcu.')
  console.log('  Zatrzymanie: Ctrl+C\n')
}
