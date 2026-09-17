/**
 * ZRZUTY ELEMENTÓW, KTÓRE ZAWIODŁY.
 *
 * Raport, który mówi „color-contrast na `.nadtytul`", zmusza do szukania tego
 * elementu na stronie. Raport, który pokazuje WYCINEK STRONY Z OBWIEDZIONYM
 * ELEMENTEM, mówi to samo w pół sekundy. To jest cała różnica między listą
 * do odhaczenia a listą do naprawienia.
 *
 * Jak to działa: element dostaje na chwilę obwódkę, robimy zrzut jego okolicy
 * (element plus zapas dookoła, żeby było widać kontekst), obwódkę zdejmujemy.
 * Zrzut ląduje jako PNG obok raportu i jest w nim pokazany.
 *
 * KOSZT: około 150-250 ms na element. Dlatego zrzuty mają limity - domyślnie
 * trzy węzły na regułę na podstronę. Naprawiając regułę i tak naprawiasz
 * wszystkie jej wystąpienia naraz, więc czwarty zrzut tego samego problemu
 * nie niesie nowej informacji, a wydłuża audyt.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

/** Zapas dookoła elementu, żeby było widać, gdzie on właściwie jest. */
const ZAPAS = 32
/** Sufit wysokości zrzutu - bez tego `<body>` daje obraz na 12000 px. */
const MAX_WYSOKOSC = 900

/**
 * Selektor z axe bywa tablicą (ramki, shadow DOM). Bierzemy ostatni człon -
 * to ten wskazujący na sam element, a nie na ramkę, w której siedzi.
 */
export function selectorOf(target) {
  const ostatni = Array.isArray(target) ? target[target.length - 1] : target
  return Array.isArray(ostatni) ? ostatni[ostatni.length - 1] : String(ostatni)
}

/** `.karta > h3:nth-child(2)` → `karta-h3-nth-child-2` */
const bezpiecznaNazwa = (s) =>
  s
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'element'

/**
 * @param {object} opcje
 * @param {import('puppeteer-core').Page} opcje.karta
 * @param {string} opcje.selektor   selektor CSS elementu
 * @param {string} opcje.katalog    katalog na zrzuty (bezwzględny)
 * @param {string} opcje.podkatalog nazwa podkatalogu widziana z poziomu raportu
 * @param {string} opcje.nazwa      nazwa pliku bez rozszerzenia
 * @returns {Promise<string|null>}  ścieżka WZGLĘDNA WOBEC RAPORTU albo null
 */
export async function elementShot({ karta, selektor, katalog, podkatalog = 'zrzuty', nazwa }) {
  try {
    const element = await karta.$(selektor)
    if (!element) return null

    const pudelko = await element.boundingBox()
    if (!pudelko || pudelko.width < 1 || pudelko.height < 1) return null

    // Obwódka na czas zrzutu. `!important`, bo element może mieć własny
    // `outline` z reguły fokusu - a wtedy nie byłoby go widać.
    await element.evaluate((el) => {
      el.dataset.auditPrevStyle = el.getAttribute('style') ?? ''
      el.style.setProperty('outline', '3px solid #ff375f', 'important')
      el.style.setProperty('outline-offset', '2px', 'important')
    })

    const wymiary = karta.viewport() ?? { width: 1280, height: 800 }
    const clip = {
      x: Math.max(0, pudelko.x - ZAPAS),
      y: Math.max(0, pudelko.y - ZAPAS),
      width: Math.min(wymiary.width, pudelko.width + ZAPAS * 2),
      height: Math.min(MAX_WYSOKOSC, pudelko.height + ZAPAS * 2),
    }

    await mkdir(katalog, { recursive: true })
    const plik = `${bezpiecznaNazwa(nazwa)}.png`
    const bufor = await karta.screenshot({ clip, type: 'png' })
    await writeFile(path.join(katalog, plik), bufor)

    await element.evaluate((el) => {
      const poprzedni = el.dataset.auditPrevStyle ?? ''
      if (poprzedni) el.setAttribute('style', poprzedni)
      else el.removeAttribute('style')
      delete el.dataset.auditPrevStyle
    })

    // Ścieżka jest względna wobec `index.html`, nie wobec katalogu zrzutów -
    // raport wstawia ją prosto w atrybut `src`.
    return `${podkatalog}/${plik}`
  } catch {
    // Element mógł zniknąć między pomiarem axe a zrzutem (animacja, lazy).
    // Brak zrzutu nie jest błędem audytu - raport ma wtedy sam selektor.
    return null
  }
}

/**
 * Zbiera zrzuty dla wyników axe z jednej podstrony w jednym trybie.
 *
 * @returns {Promise<Map<string, Array<{selektor: string, plik: string|null, html: string, dane: object|null}>>>}
 *          klucz: `${rodzaj}:${idReguly}`
 */
export async function axeShots({ karta, axe, katalog, podkatalog = 'zrzuty', prefiks, limit = 3 }) {
  const zebrane = new Map()
  if (!axe) return zebrane

  for (const [rodzaj, lista] of [
    ['naruszenie', axe.violations ?? []],
    ['niepewne', axe.incomplete ?? []],
  ]) {
    for (const regula of lista) {
      const klucz = `${rodzaj}:${regula.id}`
      const wezly = []

      for (const [i, wezel] of (regula.nodes ?? []).slice(0, limit).entries()) {
        const selektor = selectorOf(wezel.target)
        const plik = await elementShot({
          karta,
          selektor,
          katalog,
          podkatalog,
          nazwa: `${prefiks}-${regula.id}-${i}`,
        })

        // Przy regule kontrastu axe podaje policzone kolory i wartość.
        // To są dokładnie te liczby, których szuka się ręcznie - szkoda
        // je gubić, skoro już są w wyniku.
        const kontrast = [...(wezel.any ?? []), ...(wezel.all ?? [])].find(
          (sprawdzenie) => sprawdzenie?.data?.contrastRatio !== undefined
        )?.data

        wezly.push({
          selektor,
          plik,
          html: (wezel.html ?? '').slice(0, 300),
          dane: kontrast
            ? {
                kontrast: kontrast.contrastRatio,
                prog: kontrast.expectedContrastRatio,
                tekst: kontrast.fgColor ?? null,
                tlo: kontrast.bgColor ?? null,
                rozmiar: kontrast.fontSize,
                grubosc: kontrast.fontWeight,
                // Gdy axe NIE POTRAFIŁ policzyć kontrastu, podaje powód
                // w `messageKey`. Bez tego raport pokazywałby „0:1", co jest
                // nieprawdą - kontrast nie wynosi zero, tylko nie da się go
                // wyliczyć automatycznie.
                powod: kontrast.messageKey ?? null,
                policzony: Boolean(kontrast.contrastRatio) && Boolean(kontrast.bgColor),
              }
            : null,
        })
      }

      zebrane.set(klucz, wezly)
    }
  }

  return zebrane
}
