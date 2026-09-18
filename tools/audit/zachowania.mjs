#!/usr/bin/env node
/**
 * ZACHOWANIA - test tego, co przy migracji przestało być Reactem.
 *
 *   npm run zachowania
 *
 * Stary projekt trzymał w Reakcie osiem rzeczy: zakładki cennika, filtr
 * i szukajkę realizacji, akordeon FAQ, powiększanie zdjęć, karuzelę, menu
 * mobilne, kreator wyceny i walidację formularza. Po migracji robi to CSS
 * plus moduły w `src/scripts/` - a to znaczy, że każdą z tych rzeczy da się
 * zepsuć jedną literówką i nikt tego nie zobaczy przy przeglądaniu kodu.
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

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startPreview } from './server.mjs'
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

// --- 1. Zakładki na /uslugi/ ---
await p.goto(adres + '/uslugi/', { waitUntil: 'networkidle0' })
let stan = await p.evaluate(() => {
  const widoczne = () => [...document.querySelectorAll('[data-grupa]')].filter((g) => g.offsetParent !== null).map((g) => g.dataset.grupa)
  const przed = widoczne()
  document.querySelector('label[for="zakladka-brukarstwo"]').click()
  return { przed, po: widoczne() }
})
ok('zakładki /uslugi (ogrodzenia → brukarstwo)', JSON.stringify(stan) === JSON.stringify({ przed: ['ogrodzenia'], po: ['brukarstwo'] }) || stan)

// --- 2. Filtr + szukajka na /realizacje/ ---
await p.goto(adres + '/realizacje/', { waitUntil: 'networkidle0' })
stan = await p.evaluate(() => {
  const ile = () => [...document.querySelectorAll('[data-kategoria]')].filter((k) => k.offsetParent !== null).length
  const wszystkie = ile()
  document.querySelector('label[for="kategoria-brukarstwo"]').click()
  const poFiltrze = ile()
  document.querySelector('label[for="kategoria-all"]').click()
  return { wszystkie, poFiltrze, licznik: document.querySelector('[data-filtr-widoczne]')?.textContent }
})
ok('filtr kategorii /realizacje', stan.wszystkie === 9 && stan.poFiltrze === 3 ? true : stan)

stan = await p.evaluate(async () => {
  const pole = document.querySelector('[data-filtr-szukaj]')
  pole.value = 'terespol'
  pole.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise((r) => setTimeout(r, 100))
  return {
    widoczne: [...document.querySelectorAll('[data-kategoria]')].filter((k) => k.offsetParent !== null).length,
    licznik: document.querySelector('[data-filtr-widoczne]')?.textContent,
    pusto: document.querySelector('[data-filtr-pusto]')?.hidden,
  }
})
ok('szukajka /realizacje (terespol)', stan.widoczne === 1 && stan.licznik === '1' ? true : stan)

// --- 3. FAQ ---
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

// --- 4. Lightbox ---
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

// --- 5. Menu mobilne ---
await p.setViewport({ width: 390, height: 844 })
await p.goto(adres + '/', { waitUntil: 'networkidle0' })
stan = await p.evaluate(async () => {
  const panel = document.querySelector('.naglowek__panel')
  const przed = panel.getBoundingClientRect().height
  document.querySelector('label[for="menu-mobilne"]').click()
  await new Promise((r) => setTimeout(r, 400))
  return { przed, po: panel.getBoundingClientRect().height }
})
ok('menu mobilne rozwija się', stan.przed === 0 && stan.po > 100 ? true : stan)

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
