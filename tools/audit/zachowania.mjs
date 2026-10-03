#!/usr/bin/env node
/**
 * ZACHOWANIA - test tego, co przy migracji przestało być Reactem.
 *
 *   npm run zachowania
 *
 * Stary projekt trzymał w Reakcie filtr i szukajkę realizacji, akordeon FAQ,
 * powiększanie zdjęć, karuzelę, menu mobilne, kreator wyceny i walidację
 * formularza (zakładki cennika odpadły razem z przebudową `/uslugi/`, więc
 * odpadł też ich test). Po migracji robi to CSS
 * plus moduły w `src/scripts/` - a to znaczy, że każdą z tych rzeczy da się
 * zepsuć jedną literówką i nikt tego nie zobaczy przy przeglądaniu kodu.
 *
 * Od menu mobilnego doszła tu jeszcze jedna rzecz, której nie widać nawet
 * na zrzucie: KOLEJNOŚĆ FOKUSU. Zamknięte menu wygląda tak samo wtedy, gdy
 * działa, i wtedy, gdy jego odnośniki nadal łapią Tab albo wypadają z fokusu
 * przed zwinięciem panelu. Różnicę widać wyłącznie klikając - czyli tutaj.
 *
 * Ten skrypt klika po nich w prawdziwej przeglądarce, na wyniku builda,
 * przez ten sam serwer podglądu, co audyt. Uruchamiaj po każdej zmianie
 * w `src/scripts/` i przed wydaniem.
 *
 * WYMAGA: `npm run build` wcześniej oraz Chrome w systemie (jak audyt).
 * Jeśli Chrome nie zostanie znaleziony, wskaż plik zmienną CHROME_PATH.
 *
 * Kod wyjścia: 1, gdy którykolwiek test nie przeszedł - nadaje się do CI.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startPreview } from './server.mjs'
import { collectUrls } from './urls.mjs'
import puppeteer from 'puppeteer-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

async function znajdzChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  const { Launcher } = await import('chrome-launcher')
  const znalezione = Launcher.getInstallations()
  if (!znalezione.length) {
    throw new Error('nie znaleziono Chrome - wskaż plik zmienną CHROME_PATH')
  }
  return znalezione[0]
}

process.chdir(ROOT)

const { adres, zatrzymaj } = await startPreview({ port: 4396 })
const b = await puppeteer.launch({
  executablePath: await znajdzChrome(),
  args: ['--no-sandbox'],
})
const p = await b.newPage()
await p.setViewport({ width: 1280, height: 900 })
const bledyKonsoli = []
p.on('console', (m) => { if (m.type() === 'error') bledyKonsoli.push(m.text()) })
p.on('pageerror', (e) => bledyKonsoli.push('pageerror: ' + e.message))

let bledy = 0
const ok = (nazwa, wynik) => {
  if (wynik !== true) bledy += 1
  console.log(wynik === true ? '✓' : '✗ BŁĄD', nazwa, wynik === true ? '' : JSON.stringify(wynik))
}

// --- 1. Filtr + szukajka na /realizacje/ ---
// Oczekiwane liczby idą z treści, nie z głowy: test sprawdza, że filtr i szukajka
// działają, a nie ile zdjęć jest w galerii.
const { pozycje: realizacje } = JSON.parse(readFileSync(path.join(ROOT, 'src/content/realizacje.json'), 'utf8'))
const ileBrukarstwa = realizacje.filter((r) => r.kategoria === 'brukarstwo').length
// Szukajka zna wyłącznie tytuł kafelka (lokalizacji w galerii nie ma). Fraza
// musi trafiać w jeden tytuł, inaczej test niczego nie rozróżnia.
const FRAZA = 'altana'
const ileZFraza = realizacje.filter((r) => r.tytul.toLowerCase().includes(FRAZA)).length
await p.goto(adres + '/realizacje/', { waitUntil: 'networkidle0' })
let stan = await p.evaluate(() => {
  const ile = () => [...document.querySelectorAll('[data-kategoria]')].filter((k) => k.offsetParent !== null).length
  const wszystkie = ile()
  document.querySelector('label[for="kategoria-brukarstwo"]').click()
  const poFiltrze = ile()
  document.querySelector('label[for="kategoria-all"]').click()
  return { wszystkie, poFiltrze, licznik: document.querySelector('[data-filtr-widoczne]')?.textContent }
})
ok(
  'filtr kategorii /realizacje',
  stan.wszystkie === realizacje.length && stan.poFiltrze === ileBrukarstwa && ileBrukarstwa > 0 ? true : stan
)

stan = await p.evaluate(async (fraza) => {
  const pole = document.querySelector('[data-filtr-szukaj]')
  pole.value = fraza
  pole.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise((r) => setTimeout(r, 100))
  return {
    widoczne: [...document.querySelectorAll('[data-kategoria]')].filter((k) => k.offsetParent !== null).length,
    licznik: document.querySelector('[data-filtr-widoczne]')?.textContent,
    pusto: document.querySelector('[data-filtr-pusto]')?.hidden,
  }
}, FRAZA)
ok(
  `szukajka /realizacje (${FRAZA})`,
  ileZFraza >= 1 && ileZFraza < realizacje.length && stan.widoczne === ileZFraza && stan.licznik === String(ileZFraza)
    ? true
    : stan
)

// --- 2. FAQ ---
await p.goto(adres + '/', { waitUntil: 'networkidle0' })
stan = await p.evaluate(async () => {
  const pierwszy = document.querySelector('.faq-pozycja')
  pierwszy.querySelector('.faq-przycisk').click()
  await new Promise((r) => setTimeout(r, 500))
  const otwarty = pierwszy.open && pierwszy.querySelector('.faq-tresc').getBoundingClientRect().height > 10
  const drugi = document.querySelectorAll('.faq-pozycja')[1]
  drugi.querySelector('.faq-przycisk').click()
  await new Promise((r) => setTimeout(r, 500))
  return { otwarty, pierwszyPoDrugim: pierwszy.open, drugiOtwarty: drugi.open }
})
ok('FAQ: otwiera i zamyka poprzednie', stan.otwarty && !stan.pierwszyPoDrugim && stan.drugiOtwarty ? true : stan)

// --- 2b. Podpis kafelka galerii ---
// Domyślnie widoczny. Chowa go wyłącznie wariant `kursor-js:` (mysz + skrypt),
// a najechanie i fokus z klawiatury go odsłaniają. Na ekranie dotykowym ma zostać
// na wierzchu - tam nie ma jak najechać. Bez JavaScriptu pilnuje tego `npm run no-js`.
const przezroczystoscPodpisu = (indeks) =>
  p.evaluate((i) => {
    const kafelek = document.querySelectorAll('[data-galeria-kafelek]')[i]
    return Number(getComputedStyle(kafelek.querySelector('.galeria-podpis')).opacity)
  }, indeks)
await p.mouse.move(2, 2)
const podpisSpoczynek = await przezroczystoscPodpisu(0)
await (await p.$('[data-galeria-kafelek]')).hover()
await new Promise((r) => setTimeout(r, 450))
const podpisNajechany = await przezroczystoscPodpisu(0)
await p.mouse.move(2, 2)
await p.evaluate(() => document.querySelectorAll('[data-galeria-kafelek]')[1].focus({ focusVisible: true }))
await new Promise((r) => setTimeout(r, 450))
const podpisFokus = await przezroczystoscPodpisu(1)
await p.evaluate(() => document.querySelectorAll('[data-galeria-kafelek]')[1].blur())
ok(
  'galeria (mysz): podpis schowany, najechanie i fokus go odsłaniają',
  podpisSpoczynek === 0 && podpisNajechany === 1 && podpisFokus === 1
    ? true
    : { podpisSpoczynek, podpisNajechany, podpisFokus }
)

const dotyk = await b.newPage()
await dotyk.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
})
await dotyk.goto(adres + '/realizacje/', { waitUntil: 'networkidle0' })
const podpisyDotyk = await dotyk.evaluate(() =>
  [...document.querySelectorAll('[data-galeria-kafelek] .galeria-podpis')].map((el) => Number(getComputedStyle(el).opacity))
)
await dotyk.close()
ok(
  'galeria (dotyk): podpis kafelka widoczny bez najechania',
  podpisyDotyk.length > 0 && podpisyDotyk.every((o) => o === 1) ? true : podpisyDotyk
)

// --- 3. Lightbox ---
stan = await p.evaluate(async () => {
  const kafelek = document.querySelector('[data-galeria-kafelek]')
  kafelek.click()
  await new Promise((r) => setTimeout(r, 300))
  const okno = document.querySelector('dialog.galeria-okno')
  const otwarte = okno.open
  const licznik = okno.querySelector('[data-galeria-licznik]')?.textContent
  const maObraz = okno.querySelector('[data-galeria-obraz]').children.length > 0
  okno.querySelector('[data-galeria-nastepne]').click()
  await new Promise((r) => setTimeout(r, 200))
  const licznik2 = okno.querySelector('[data-galeria-licznik]')?.textContent
  okno.querySelector('[data-galeria-zamknij]').click()
  await new Promise((r) => setTimeout(r, 200))
  return { otwarte, licznik, licznik2, maObraz, zamkniete: !okno.open }
})
ok('galeria: otwarcie, następne, zamknięcie', stan.otwarte && stan.maObraz && stan.licznik === '1 / 6' && stan.licznik2 === '2 / 6' && stan.zamkniete ? true : stan)

// --- 4. Menu mobilne ---
// Panel jest nakładką: zamknięty ma pełną wysokość, tylko `visibility: hidden`.
// Otwarcie NIE może zmienić wysokości dokumentu - wariant, który rozsuwał
// nagłówek, spychał treść i przy dole strony zjadał pozycję przewinięcia.
await p.setViewport({ width: 390, height: 844 })
await p.goto(adres + '/', { waitUntil: 'networkidle0' })
stan = await p.evaluate(async () => {
  const panel = document.querySelector('.naglowek__panel')
  const przed = getComputedStyle(panel).visibility
  const dokumentPrzed = document.documentElement.scrollHeight
  document.querySelector('label[for="menu-mobilne"]').click()
  await new Promise((r) => setTimeout(r, 400))
  return {
    przed,
    po: getComputedStyle(panel).visibility,
    wysokosc: panel.getBoundingClientRect().height,
    dokumentPrzed,
    dokumentPo: document.documentElement.scrollHeight,
  }
})
ok(
  'menu mobilne otwiera się nad treścią',
  stan.przed === 'hidden' && stan.po === 'visible' && stan.wysokosc > 100 && stan.dokumentPrzed === stan.dokumentPo
    ? true
    : stan
)

// Pięć cykli otwórz/zamknij na dole strony nie może ruszyć przewinięcia.
// Klik w punkt na ekranie, jak palcem - `page.click` sam przewija element
// do widoku i zafałszowałby wynik. Łapie też fokus pola wyboru w strefie
// `scroll-padding-top`, który cofał stronę o ~430 px przy każdym stuknięciu.
await p.goto(adres + '/realizacje/', { waitUntil: 'networkidle0' })
await p.evaluate(() => {
  document.documentElement.style.setProperty('scroll-behavior', 'auto')
  window.scrollTo(0, document.documentElement.scrollHeight)
})
const przewiniecie = () => p.evaluate(() => Math.round(window.scrollY))
const przewiniecieStart = await przewiniecie()
for (let i = 0; i < 10; i += 1) {
  const punkt = await p.evaluate(() => {
    const r = document.querySelector('label[for="menu-mobilne"]').getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await p.mouse.click(punkt.x, punkt.y)
  await new Promise((r) => setTimeout(r, 350))
}
const przewiniecieKoniec = await przewiniecie()
ok(
  'menu mobilne: 5 cykli na dole strony nie rusza przewinięcia',
  przewiniecieStart > 0 && przewiniecieStart === przewiniecieKoniec
    ? true
    : { przed: przewiniecieStart, po: przewiniecieKoniec }
)

// Żadna podstrona nie może być szersza niż ekran telefonu - Z DZIAŁAJĄCYM
// skryptem, bo to on przesuwa elementy odsłaniane z boku poza krawędź.
// Strona szersza choćby o 12 px każe mobilnemu Chrome'owi poszerzyć obszar
// układu, a przyklejony nagłówek chował się wtedy o ~26 px pod górną
// krawędź ekranu. Emulacja telefonu (`isMobile`) jest tu konieczna.
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
const szersze = []
for (const sciezka of (await collectUrls({ root: ROOT })).sciezki) {
  await p.goto(adres + sciezka, { waitUntil: 'networkidle0' })
  const szerokosc = await p.evaluate(() => document.documentElement.scrollWidth)
  if (szerokosc > 390) szersze.push(`${sciezka} ${szerokosc}px`)
}
ok('390px: żadna podstrona nie jest szersza niż ekran', szersze.length ? szersze : true)

// --- 5. Nagłówek: kolejność fokusu i zwinięte menu ---
// `max-height: 0` plus `overflow-hidden` ukrywa panel dla oka, ale zostawia
// jego odnośniki w kolejności fokusu - zwinięte menu łapie wtedy Tab i nie
// widać tego na żadnym zrzucie. Stąd ten test.
const kolejnoscFokusu = async (ile = 25) => {
  await p.evaluate(() => {
    window.scrollTo(0, 0)
    document.activeElement?.blur()
  })
  const trafione = []
  for (let i = 0; i < ile; i += 1) {
    await p.keyboard.press('Tab')
    const opis = await p.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      return {
        id: el.id || null,
        wPanelu: Boolean(el.closest('.naglowek__panel')),
        tekst: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24),
      }
    })
    if (!opis) break
    trafione.push(opis)
  }
  return trafione
}

for (const szerokosc of [390, 767]) {
  await p.setViewport({ width: szerokosc, height: 844 })
  await p.goto(adres + '/', { waitUntil: 'networkidle0' })

  const zamkniete = await kolejnoscFokusu()
  ok(
    `nagłówek ${szerokosc}px: zwinięte menu nie łapie Tab`,
    zamkniete.length && !zamkniete.some((w) => w.wPanelu)
      ? true
      : zamkniete.map((w) => w.tekst || w.id)
  )
  ok(
    `nagłówek ${szerokosc}px: hamburger osiągalny Tabem`,
    zamkniete.some((w) => w.id === 'menu-mobilne') ? true : zamkniete.map((w) => w.tekst || w.id)
  )
  // Hamburger po wycenie, nie przed logo: sprawdzamy, że coś go poprzedza.
  const pozycjaHamburgera = zamkniete.findIndex((w) => w.id === 'menu-mobilne')
  ok(
    `nagłówek ${szerokosc}px: hamburger nie jest pierwszy w kolejności`,
    pozycjaHamburgera > 0 ? true : zamkniete.map((w) => w.tekst || w.id)
  )

  // Druga połowa tej samej reguły: po otwarciu panel MUSI wracać do fokusu.
  await p.evaluate(() => document.querySelector('label[for="menu-mobilne"]').click())
  await new Promise((r) => setTimeout(r, 400))
  await p.focus('#menu-mobilne')
  await p.keyboard.press('Tab')
  const poOtwarciu = await p.evaluate(() => {
    const el = document.activeElement
    return { wPanelu: Boolean(el?.closest('.naglowek__panel')), tekst: (el?.textContent || '').trim().slice(0, 24) }
  })
  ok(`nagłówek ${szerokosc}px: otwarty panel wraca do kolejności fokusu`, poOtwarciu.wPanelu ? true : poOtwarciu)
}

// --- 6. Kreator wyceny ---
await p.setViewport({ width: 1280, height: 900 })
await p.goto(adres + '/wycena/', { waitUntil: 'networkidle0' })
stan = await p.evaluate(async () => {
  const widocznyKrok = () => [...document.querySelectorAll('[data-krok]')].findIndex((k) => !k.hidden)
  const start = widocznyKrok()
  document.querySelector('[data-wycena-dalej]').click()
  await new Promise((r) => setTimeout(r, 200))
  const poPustym = { krok: widocznyKrok(), podsumowanie: !document.querySelector('[data-formularz-podsumowanie]').hidden }
  document.querySelector('#typ-ogrodzenia').click()
  document.querySelector('[data-wycena-dalej]').click()
  await new Promise((r) => setTimeout(r, 300))
  const krok2 = widocznyKrok()
  const podtypyWidoczne = [...document.querySelectorAll('[data-podtypy]')].filter((g) => !g.hidden).map((g) => g.dataset.podtypy)
  const jednostka = document.querySelector('[data-jednostka]').textContent
  return { start, poPustym, krok2, podtypyWidoczne, jednostka }
})
ok('wycena: walidacja kroku 1 i przejście', stan.start === 0 && stan.poPustym.krok === 0 && stan.poPustym.podsumowanie && stan.krok2 === 1 && stan.podtypyWidoczne.join() === 'ogrodzenia' && stan.jednostka === 'mb' ? true : stan)

stan = await p.evaluate(async () => {
  // przejdź do końca i sprawdź podsumowanie
  document.querySelector('#podtyp-panelowe').click()
  document.querySelector('[data-pole="amount"]').value = '40'
  document.querySelector('[data-pole="amount"]').dispatchEvent(new Event('input', { bubbles: true }))
  document.querySelector('[data-pole="location"]').value = 'Biała Podlaska'
  document.querySelector('[data-pole="location"]').dispatchEvent(new Event('input', { bubbles: true }))
  document.querySelector('[data-wycena-dalej]').click()
  await new Promise((r) => setTimeout(r, 200))
  document.querySelector('[data-wycena-dalej]').click()
  await new Promise((r) => setTimeout(r, 200))
  // krok kontaktowy - pusty, powinien zatrzymać
  document.querySelector('[data-wycena-dalej]').click()
  await new Promise((r) => setTimeout(r, 200))
  const zatrzymalNaKontakcie = [...document.querySelectorAll('[data-krok]')].findIndex((k) => !k.hidden) === 3
  document.querySelector('[data-pole="name"]').value = 'Jan'
  document.querySelector('[data-pole="name"]').dispatchEvent(new Event('input', { bubbles: true }))
  document.querySelector('[data-pole="email"]').value = 'jan@example.com'
  document.querySelector('[data-pole="email"]').dispatchEvent(new Event('input', { bubbles: true }))
  document.querySelector('[data-wycena-dalej]').click()
  await new Promise((r) => setTimeout(r, 300))
  const wiersze = [...document.querySelectorAll('[data-podsumowanie-wiersz]')].map((w) => `${w.dataset.podsumowanieWiersz}=${w.querySelector('[data-podsumowanie-wartosc]').textContent}`)
  const zapis = localStorage.getItem('brambruk_wycena-draft')
  document.querySelector('[data-wycena-wyslij]').click()
  await new Promise((r) => setTimeout(r, 200))
  const komunikat = document.querySelector('[data-formularz-blad-tekst]')?.textContent
  return { zatrzymalNaKontakcie, wiersze, zapis: Boolean(zapis), komunikat }
})
ok('wycena: podsumowanie + komunikat zastępczy', stan.zatrzymalNaKontakcie && stan.zapis && (stan.komunikat || '').includes('chwilowo niedostępna') ? true : stan)
console.log('   podsumowanie:', stan.wiersze?.join(' | '))

// --- 7. Formularz kontaktowy ---
await p.goto(adres + '/kontakt/', { waitUntil: 'networkidle0' })
stan = await p.evaluate(async () => {
  document.querySelector('[data-formularz-wyslij]').click()
  await new Promise((r) => setTimeout(r, 200))
  const bledy = [...document.querySelectorAll('[data-blad]')].filter((b) => !b.hidden).map((b) => b.textContent)
  document.querySelector('[data-pole="name"]').value = 'Jan'
  document.querySelector('[data-pole="name"]').dispatchEvent(new Event('input', { bubbles: true }))
  document.querySelector('[data-pole="email"]').value = 'zly-email'
  document.querySelector('[data-pole="email"]').dispatchEvent(new Event('input', { bubbles: true }))
  document.querySelector('[data-pole="message"]').value = 'Dzień dobry, proszę o wycenę.'
  document.querySelector('[data-pole="message"]').dispatchEvent(new Event('input', { bubbles: true }))
  document.querySelector('[data-formularz-wyslij]').click()
  await new Promise((r) => setTimeout(r, 200))
  const poZlymMailu = [...document.querySelectorAll('[data-blad]')].filter((b) => !b.hidden).map((b) => b.textContent)
  document.querySelector('[data-pole="email"]').value = 'jan@example.com'
  document.querySelector('[data-pole="email"]').dispatchEvent(new Event('input', { bubbles: true }))
  document.querySelector('[data-formularz-wyslij]').click()
  await new Promise((r) => setTimeout(r, 200))
  return { bledy, poZlymMailu, komunikat: document.querySelector('[data-formularz-blad-tekst]')?.textContent, licznik: document.querySelector('[data-licznik="message"]')?.textContent }
})
ok('formularz kontaktowy: walidacja + komunikat', stan.bledy.length === 3 && stan.poZlymMailu.length === 1 && (stan.komunikat || '').includes('chwilowo niedostępna') ? true : stan)

if (bledyKonsoli.length) {
  bledy += 1
  console.log('\n✗ BŁĄD  konsola przeglądarki:', bledyKonsoli)
} else {
  console.log('\n✓ konsola przeglądarki czysta')
}

await b.close()
await zatrzymaj()

console.log(bledy ? `\n✗ ${bledy} nieudanych sprawdzeń.` : '\n✓ Wszystkie zachowania działają.')
process.exitCode = bledy ? 1 : 0
