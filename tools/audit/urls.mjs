/**
 * LISTA ADRESÓW DO AUDYTU = SUMA DWÓCH ŹRÓDEŁ.
 *
 *   1. `sitemap.xml` wygenerowana przez build,
 *   2. lista podstron, którą build faktycznie wyprodukował
 *      (`.build-state/strony.json`, pisana przez tools/build/sitemap.mjs).
 *
 * SUMA, NIE PRZECIĘCIE. Rozbieżność między tymi źródłami jest sama w sobie
 * sygnałem i trafia do raportu jako ostrzeżenie: adres obecny w jednym źródle,
 * a nieobecny w drugim, zwykle znaczy albo zapomniane wyłączenie z mapy,
 * albo `noindex` postawiony bez wpisu w `pozaMapaStrony`.
 *
 * Gdyby audyt brał tylko mapę strony, podstrona z `noindex` nigdy nie zostałaby
 * sprawdzona - a to często właśnie ona ma najwięcej surowego HTML-a.
 */

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const LOC = /<loc>\s*([^<\s]+)\s*<\/loc>/g

/** Zamienia adres bezwzględny na samą ścieżkę. */
function sciezkaZ(adres) {
  try {
    const u = new URL(adres)
    return u.pathname.endsWith('/') ? u.pathname : `${u.pathname}/`
  } catch {
    return adres.endsWith('/') ? adres : `${adres}/`
  }
}

export async function collectUrls({ root, dist = 'dist', stan = '.build-state' }) {
  const ostrzezenia = []

  // --- źródło 1: mapa strony ---------------------------------------
  const plikMapy = path.join(root, dist, 'sitemap.xml')
  const zMapy = new Set()
  if (existsSync(plikMapy)) {
    const xml = await readFile(plikMapy, 'utf8')
    let m
    LOC.lastIndex = 0
    while ((m = LOC.exec(xml)) !== null) zMapy.add(sciezkaZ(m[1]))
  } else {
    ostrzezenia.push(`brak ${dist}/sitemap.xml - uruchom build przed audytem`)
  }

  // --- źródło 2: lista podstron builda ------------------------------
  const plikStanu = path.join(root, stan, 'strony.json')
  const zBuilda = new Set()
  const swiadomiePominiete = new Set()
  let origin = null
  if (existsSync(plikStanu)) {
    const dane = JSON.parse(await readFile(plikStanu, 'utf8'))
    origin = dane.origin ?? null
    for (const p of dane.zbudowane ?? []) zBuilda.add(p)
    // Wyłączenia z `pozaMapaStrony` w site.ts są DECYZJĄ, nie rozbieżnością.
    // Zgłaszanie ich jako ostrzeżenia przy każdym audycie nauczyłoby czytać
    // tę sekcję po łebkach - a wtedy przestałaby działać przy prawdziwym braku.
    for (const p of dane.pozaMapaStrony ?? []) swiadomiePominiete.add(p)
  } else {
    ostrzezenia.push(`brak ${stan}/strony.json - uruchom build przed audytem`)
  }

  // --- rozbieżności --------------------------------------------------
  for (const p of zBuilda) {
    if (zMapy.has(p) || swiadomiePominiete.has(p)) continue
    ostrzezenia.push(
      `${p} - zbudowana, ale nieobecna w mapie strony. Jeśli to zamierzone, dopisz ścieżkę ` +
        'do `pozaMapaStrony` w src/config/site.ts (i sprawdź, czy podstrona ma `noindex`).'
    )
  }
  for (const p of zMapy) {
    if (!zBuilda.has(p)) ostrzezenia.push(`${p} - w mapie strony, ale nie ma jej wśród zbudowanych podstron`)
  }

  const sciezki = [...new Set([...zMapy, ...zBuilda])].sort()
  return {
    sciezki,
    origin,
    ostrzezenia,
    zMapy: [...zMapy].sort(),
    zBuilda: [...zBuilda].sort(),
    swiadomiePominiete: [...swiadomiePominiete].sort(),
  }
}
