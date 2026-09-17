#!/usr/bin/env node
/**
 * AUDYT AUTOMATYCZNY - Lighthouse + axe-core, mobile i desktop.
 *
 *   npm run audit                         podgląd lokalny (serwer udający hosting)
 *   npm run audit -- --url=https://...    wdrożona wersja
 *   npm run audit -- --only=/kontakt/     jedna podstrona
 *   npm run audit -- --auth=user:haslo    środowisko za hasłem (Basic Auth)
 *   npm run audit -- --no-shots           pomiń zrzuty elementów (szybciej)
 *
 * WYNIK: `reports/<data>/index.html` - jeden dokument spinający wszystkie
 * pomiary, ze zrzutami elementów, które zawiodły. Obok `RAPORT.md` w tej samej
 * treści, do wklejenia modelowi, i oryginalne raporty Lighthouse per pomiar.
 *
 * ZASADA: to narzędzie NIGDY nie przerywa procesu. Kończy się powodzeniem
 * nawet przy znalezionych naruszeniach. Wynik jest materiałem wejściowym
 * do audytu przedwdrożeniowego, nie bramką w procesie - bramką jest człowiek,
 * który ten materiał przeczyta.
 *
 * CO ROBI, A CZEGO NIE:
 *   · Lighthouse - wydajność, SEO, best practices. Wynik dostępności
 *     z Lighthouse'a NIE jest wynikiem audytu dostępności: narzędzie uruchamia
 *     podzbiór reguł i setka nie znaczy, że strona jest dostępna. Zostaje
 *     jako liczba do wglądu.
 *   · axe-core - pełny zestaw reguł, WCAG 2.1 poziom AA. To jest właściwa
 *     warstwa automatyczna dostępności.
 *   · konsola i żądania - zbierane przy okazji, bo checklista wymaga czystej
 *     konsoli i zera nieudanych żądań na KAŻDEJ podstronie.
 *
 * Progi domyślne obu bibliotek. Bez własnych reguł kolorowania.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

import { collectUrls } from './urls.mjs'
import { MANUAL_CHECKS } from './manual.mjs'
import { summaryReport } from './report.mjs'
import { htmlReport } from './report-html.mjs'
import { axeShots } from './shots.mjs'
import { startPreview } from './server.mjs'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const arg = (nazwa, domyslna = null) => {
  const trafienie = process.argv.find((a) => a.startsWith(`--${nazwa}=`))
  return trafienie ? trafienie.slice(nazwa.length + 3) : domyslna
}
const flaga = (nazwa) => process.argv.includes(`--${nazwa}`)

/**
 * Ustawienia obu trybów. Wartości wzięte z domyślnych profili Lighthouse'a -
 * nie stroimy ich, żeby wynik dało się porównać z tym, co zobaczy klient
 * w PageSpeed Insights.
 */
const TRYBY = {
  mobile: {
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    okno: { width: 412, height: 823 },
  },
  desktop: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
    okno: { width: 1350, height: 940 },
  },
}

/** Znajduje Chrome: zmienna środowiskowa, potem przeglądarka z systemu. */
function znajdzChrome(chromeLauncher) {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  const znalezione = chromeLauncher.Launcher.getInstallations?.() ?? []
  if (!znalezione.length) {
    throw new Error(
      'nie znalazłem przeglądarki Chrome. Zainstaluj Chrome albo wskaż plik przez zmienną CHROME_PATH.'
    )
  }
  return znalezione[0]
}

async function main() {
  const tylko = arg('only')
  const auth = arg('auth')
  const port = Number(arg('port', '4321'))
  const bazowyArg = arg('url')

  const { sciezki, ostrzezenia, swiadomiePominiete } = await collectUrls({ root: ROOT })
  if (!sciezki.length) {
    console.error('\n✗ brak adresów do sprawdzenia. Uruchom `npm run build` przed audytem.\n')
    return
  }

  const doSprawdzenia = tylko ? sciezki.filter((s) => s === tylko || s === `${tylko}/`) : sciezki
  if (!doSprawdzenia.length) {
    console.error(`\n✗ ${tylko} nie ma wśród zbudowanych podstron.\n`)
    return
  }

  // --- gdzie mierzymy ------------------------------------------------
  // Podgląd lokalny działa W TYM SAMYM PROCESIE. Wersja z `spawn` zostawiała
  // na Windowsie osieroconą powłokę (`proces.kill()` ubija `cmd`, nie Node
  // pod spodem) i audyt nigdy się nie kończył.
  let bazowy = bazowyArg
  let zatrzymajPodglad = null
  if (!bazowy) {
    if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
      console.error('\n✗ brak dist/. Uruchom `npm run build` przed audytem.\n')
      return
    }
    const podglad = await startPreview({ port })
    bazowy = podglad.adres
    zatrzymajPodglad = podglad.zatrzymaj
  }
  bazowy = bazowy.replace(/\/$/, '')

  // --- katalog wyników -----------------------------------------------
  const stempel = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
  const katalog = path.join(ROOT, 'reports', stempel)
  await mkdir(katalog, { recursive: true })

  const chromeLauncher = await import('chrome-launcher')
  const { default: lighthouse } = await import('lighthouse')
  const puppeteer = await import('puppeteer-core')
  const zrodloAxe = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8')

  const chromePath = znajdzChrome(chromeLauncher)
  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })

  const przegladarka = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${chrome.port}`,
    defaultViewport: null,
  })

  const naglowkiAuth = auth
    ? { Authorization: `Basic ${Buffer.from(auth).toString('base64')}` }
    : {}

  const wyniki = []
  console.log(`\nAudyt: ${doSprawdzenia.length} podstron × 2 tryby → ${path.relative(ROOT, katalog)}`)
  console.log(`Adres bazowy: ${bazowy}\n`)

  for (const sciezka of doSprawdzenia) {
    const adres = `${bazowy}${sciezka}`
    const nazwa = sciezka === '/' ? 'strona-glowna' : sciezka.replace(/^\/|\/$/g, '').replace(/\//g, '-')

    for (const [tryb, ustawienia] of Object.entries(TRYBY)) {
      process.stdout.write(`  ${sciezka} · ${tryb} ... `)
      const wynik = {
        sciezka,
        adres,
        tryb,
        lighthouse: null,
        axe: null,
        konsola: [],
        nieudaneZadania: [],
        zrzuty: new Map(),
        blad: null,
      }

      // --- Lighthouse --------------------------------------------------
      try {
        const lh = await lighthouse(
          adres,
          {
            port: chrome.port,
            output: 'html',
            logLevel: 'silent',
            extraHeaders: naglowkiAuth,
          },
          {
            extends: 'lighthouse:default',
            settings: {
              formFactor: ustawienia.formFactor,
              screenEmulation: ustawienia.screenEmulation,
              ...(ustawienia.throttling ? { throttling: ustawienia.throttling } : {}),
            },
          }
        )
        wynik.lighthouse = Object.fromEntries(
          Object.entries(lh.lhr.categories).map(([k, v]) => [k, v.score === null ? null : Math.round(v.score * 100)])
        )
        wynik.metryki = {
          lcp: lh.lhr.audits['largest-contentful-paint']?.numericValue ?? null,
          cls: lh.lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
          tbt: lh.lhr.audits['total-blocking-time']?.numericValue ?? null,
        }
        await writeFile(path.join(katalog, `${nazwa}-${tryb}.html`), lh.report, 'utf8')
      } catch (err) {
        wynik.blad = `Lighthouse: ${err.message}`
      }

      // --- axe-core + konsola + żądania ---------------------------------
      let karta
      try {
        karta = await przegladarka.newPage()
        if (Object.keys(naglowkiAuth).length) await karta.setExtraHTTPHeaders(naglowkiAuth)
        await karta.setViewport(ustawienia.okno)

        karta.on('console', (msg) => {
          if (msg.type() === 'error' || msg.type() === 'warning') {
            wynik.konsola.push({ typ: msg.type(), tekst: msg.text() })
          }
        })
        karta.on('requestfailed', (req) => {
          wynik.nieudaneZadania.push({ url: req.url(), powod: req.failure()?.errorText ?? 'nieznany' })
        })
        karta.on('response', (odp) => {
          if (odp.status() >= 400) {
            wynik.nieudaneZadania.push({ url: odp.url(), powod: `HTTP ${odp.status()}` })
          }
        })

        await karta.goto(adres, { waitUntil: 'networkidle2', timeout: 45000 })

        // `evaluate` idzie przez protokół debugowania, więc CSP go nie dotyczy.
        // `addScriptTag` wstawiłby <script> do dokumentu i poległby na
        // `script-src 'self'` - czyli na tym, co ta baza właśnie osiąga.
        await karta.evaluate(zrodloAxe)
        wynik.axe = await karta.evaluate(async () =>
          // eslint-disable-next-line no-undef
          await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
            resultTypes: ['violations', 'incomplete'],
          })
        )

        // Zrzuty elementów, które zawiodły. Robione TERAZ, na żywej karcie -
        // po jej zamknięciu nie ma już czego fotografować.
        if (!flaga('no-shots')) {
          wynik.zrzuty = await axeShots({
            karta,
            axe: wynik.axe,
            katalog: path.join(katalog, 'zrzuty'),
            prefiks: `${nazwa}-${tryb}`,
          })
        }
      } catch (err) {
        wynik.blad = [wynik.blad, `axe: ${err.message}`].filter(Boolean).join(' · ')
      } finally {
        if (karta) await karta.close().catch(() => {})
      }

      const naruszenia = wynik.axe?.violations?.length ?? 0
      const lh = wynik.lighthouse
      console.log(
        wynik.blad
          ? `BŁĄD (${wynik.blad})`
          : `LH ${lh?.performance ?? '?'}/${lh?.seo ?? '?'} · axe ${naruszenia} naruszeń`
      )
      wyniki.push(wynik)
    }
  }

  // Sprzątanie jest osobno opakowane, bo na Windowsie `chrome.kill()` potrafi
  // paść na `EPERM` przy kasowaniu katalogu tymczasowego profilu (plik trzyma
  // jeszcze antywirus albo sam Chrome). To jest sprzątanie - jego porażka nie
  // może zabrać ze sobą raportu, który już jest policzony.
  // --- raport zbiorczy -------------------------------------------------
  const wspolne = {
    wyniki,
    ostrzezenia,
    swiadomiePominiete,
    punktyReczne: MANUAL_CHECKS,
    bazowy,
    stempel,
  }

  const plikZbiorczy = path.join(katalog, 'RAPORT.md')
  await writeFile(plikZbiorczy, summaryReport(wspolne), 'utf8')

  const plikHtml = path.join(katalog, 'index.html')
  await writeFile(plikHtml, htmlReport(wspolne), 'utf8')


  // `disconnect()` i `kill()` zwracają obietnicę albo nie, zależnie od wersji
  // biblioteki - `bezpiecznie` obsługuje oba przypadki.
  const bezpiecznie = async (co, opis) => {
    try {
      await co()
    } catch (err) {
      console.warn(`  (sprzątanie: ${opis} - ${err.message})`)
    }
  }
  await bezpiecznie(() => przegladarka.disconnect(), 'rozłączenie przeglądarki')
  await bezpiecznie(() => chrome.kill(), 'usunięcie profilu tymczasowego')
  if (zatrzymajPodglad) await bezpiecznie(zatrzymajPodglad, 'zatrzymanie podglądu')

  console.log(`\n  ► RAPORT: ${path.relative(ROOT, plikHtml)}`)
  console.log(`    dla modelu: ${path.relative(ROOT, plikZbiorczy)}`)
  console.log(`    pełne raporty Lighthouse: ${path.relative(ROOT, katalog)}/*-mobile.html, *-desktop.html\n`)
}

// Narzędzie nigdy nie przerywa procesu - także wtedy, gdy samo padnie.
//
// `process.exit(0)` na końcu jest konieczny: Lighthouse i puppeteer zostawiają
// uchwyty (gniazda protokołu debugowania, obserwatory plików), które potrafią
// trzymać pętlę zdarzeń przy życiu w nieskończoność. Bez tego polecenie kończy
// pracę, wypisuje raport i wisi.
main()
  .catch((err) => {
    console.error(`\n✗ audyt nie dokończył: ${err.message}\n`)
  })
  .finally(() => process.exit(0))
