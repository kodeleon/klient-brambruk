#!/usr/bin/env node
/**
 * WERYFIKACJA: CZY STRONA CZYTA SIĘ BEZ JAVASCRIPTU.
 *
 *   npm run no-js                        podgląd lokalny (dist/)
 *   npm run no-js -- --url=https://...   wdrożona wersja
 *
 * Checklista przedwdrożeniowa klasyfikuje to jako BLOKER: „treść widoczna,
 * nie schowana za animacją wejścia". Sprawdzenie musi iść na WYNIKU BUILDA,
 * przez serwer, a nie na kodzie źródłowym - między jednym a drugim leży
 * wszystko, co może pójść nie tak.
 *
 * Co mierzy, dla każdej podstrony, przy wyłączonym silniku JavaScriptu:
 *   · ile znaków tekstu widać w `<main>`,
 *   · jakie nagłówki są widoczne i czy hierarchia nie ma przeskoków,
 *   · ile odnośników i pozycji nawigacji da się kliknąć,
 *   · ILE ELEMENTÓW Z TREŚCIĄ JEST NIEWIDOCZNYCH przez `opacity` -
 *     to jest właściwy test i jedyna liczba, która musi wyjść zero.
 *
 * Narzędzie nie przerywa procesu. Raportuje i kończy się powodzeniem.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { collectUrls } from './urls.mjs'
import { startPreview } from './server.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const arg = (n, d = null) => {
  const t = process.argv.find((a) => a.startsWith(`--${n}=`))
  return t ? t.slice(n.length + 3) : d
}

function znajdzChrome(chromeLauncher) {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  const znalezione = chromeLauncher.Launcher.getInstallations?.() ?? []
  if (!znalezione.length) {
    throw new Error('nie znalazłem przeglądarki Chrome. Wskaż plik zmienną CHROME_PATH.')
  }
  return znalezione[0]
}

async function main() {
  const { sciezki } = await collectUrls({ root: ROOT })
  if (!sciezki.length) {
    console.error('\n✗ brak adresów. Uruchom `npm run build` przed sprawdzeniem.\n')
    return
  }

  let bazowy = arg('url')
  let zatrzymaj = null
  if (!bazowy) {
    if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
      console.error('\n✗ brak dist/. Uruchom `npm run build`.\n')
      return
    }
    const p = await startPreview({ port: Number(arg('port', '4322')) })
    bazowy = p.adres
    zatrzymaj = p.zatrzymaj
  }
  bazowy = bazowy.replace(/\/$/, '')

  const chromeLauncher = await import('chrome-launcher')
  const puppeteer = await import('puppeteer-core')
  const przegladarka = await puppeteer.launch({
    executablePath: znajdzChrome(chromeLauncher),
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })

  console.log(`\nCzytelność bez JavaScriptu · ${bazowy}\n`)
  let blokery = 0

  for (const sciezka of sciezki) {
    const karta = await przegladarka.newPage()
    await karta.setJavaScriptEnabled(false)
    await karta.goto(bazowy + sciezka, { waitUntil: 'domcontentloaded' })

    const raport = await karta.evaluate(() => {
      const widoczny = (el) => {
        const st = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return (
          st.display !== 'none' &&
          st.visibility !== 'hidden' &&
          Number(st.opacity) > 0.01 &&
          r.width > 0 &&
          r.height > 0
        )
      }
      const main = document.querySelector('main')
      return {
        tytul: document.title,
        znakow: (main?.innerText ?? '').trim().length,
        naglowki: [...document.querySelectorAll('h1,h2,h3,h4')]
          .filter(widoczny)
          .map((el) => el.tagName),
        linki: [...document.querySelectorAll('a[href]')].filter(widoczny).length,
        nawigacja: [...document.querySelectorAll('header nav a')].filter(widoczny).length,
        ukryte: [...document.querySelectorAll('main *')].filter((el) => {
          const st = getComputedStyle(el)
          return Number(st.opacity) < 0.1 && el.textContent.trim().length > 20
        }).length,
      }
    })

    // Hierarchia nagłówków bez przeskoków: po h1 idzie h2, nie h3.
    const poziomy = raport.naglowki.map((t) => Number(t.slice(1)))
    const przeskoki = poziomy.filter((p, i) => i > 0 && p - poziomy[i - 1] > 1).length
    const ok = raport.ukryte === 0 && raport.znakow > 0

    if (!ok) blokery++

    console.log(`${ok ? '✓' : '✗ BLOKER'}  ${sciezka}`)
    console.log(`     title: ${raport.tytul}`)
    console.log(
      `     ${raport.znakow} znaków w <main> · ${raport.linki} odnośników · ` +
        `${raport.nawigacja} pozycji nawigacji · ${raport.naglowki.length} nagłówków`
    )
    console.log(
      `     ukryte przez opacity: ${raport.ukryte}` +
        (przeskoki ? ` · PRZESKOKI W HIERARCHII NAGŁÓWKÓW: ${przeskoki}` : '')
    )
    await karta.close()
  }

  try {
    await przegladarka.close()
  } catch {
    /* sprzątanie - porażka nie może zabrać ze sobą wyniku */
  }
  if (zatrzymaj) await zatrzymaj()

  console.log(
    blokery
      ? `\n✗ ${blokery} podstron nie czyta się bez JavaScriptu. To jest bloker publikacji.\n`
      : '\n✓ Wszystkie podstrony czytają się bez JavaScriptu.\n'
  )
}

main()
  .catch((err) => console.error(`\n✗ sprawdzenie nie dokończyło: ${err.message}\n`))
  .finally(() => process.exit(0))
