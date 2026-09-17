/**
 * SKAN PODSTRON - które użycia zdjęć faktycznie stoją w znaczniku.
 *
 * Listy użytych zdjęć nie dopisujemy do konfiguracji ręcznie, bo taka lista
 * dezaktualizuje się przy pierwszej zmianie układu i nikt tego nie zauważa.
 * Źródłem prawdy jest kod podstron i komponentów.
 *
 * Łapiemy dwie formy zapisu, obie realne:
 *
 *   1. wprost na komponencie mediów
 *        <Obraz use="galeria.01" />
 *        <Preload use="hero.glowna" />
 *        <OgImage use="og.domyslny" />
 *
 *   2. przez właściwość przekazaną do komponentu wyżej
 *        <PasCTA obraz="cta.glowna" />
 *      a wewnątrz `PasCTA`: <Obraz use={obraz} />
 *
 * Sam skan `use="..."` przegapiłby drugi przypadek i zgłosiłby wszystkie pasy
 * CTA jako martwe wpisy w konfiguracji.
 *
 * Klucz uznajemy za trafienie dopiero wtedy, gdy istnieje w `uses` - dzięki
 * temu przypadkowe `use="button"` z innego kontekstu nie robi fałszywej
 * pozytywnej.
 *
 * PODZIAŁ NA PODSTRONY I KOMPONENTY jest potrzebny do wykrywania kolizji
 * „to samo zdjęcie dwa razy na jednej podstronie". Komponent może być użyty
 * wielokrotnie i to nie jest kolizja, więc liczymy go osobno.
 */

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const ROZSZERZENIA = new Set(['.astro', '.tsx', '.jsx', '.ts', '.js', '.md', '.mdx'])

/** use="klucz" | use={'klucz'} | use={"klucz"} */
const UZYCIE = /\buse=(?:"([^"]+)"|\{\s*['"]([^'"]+)['"]\s*\})/g

/** Właściwości, którymi przekazujemy klucz zdjęcia w głąb komponentu. */
const WLASCIWOSC =
  /\b(?:obraz|zdjecie|preload|ogImage|tlo)=(?:"([^"]+)"|\{\s*['"]([^'"]+)['"]\s*\})/g

async function pliki(dir) {
  const out = []
  let wpisy
  try {
    wpisy = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const wpis of wpisy) {
    const p = path.join(dir, wpis.name)
    if (wpis.isDirectory()) out.push(...(await pliki(p)))
    else if (ROZSZERZENIA.has(path.extname(wpis.name))) out.push(p)
  }
  return out
}

/**
 * @returns {{ pages: Map<string, Set<string>>, komponenty: Map<string, Set<string>>, all: Set<string> }}
 */
export async function scanPages({ root, dir, uses }) {
  const baza = path.join(root, dir)
  const lista = await pliki(baza)

  const pages = new Map()
  const komponenty = new Map()
  const all = new Set()

  for (const plik of lista) {
    const wzgledna = path.relative(root, plik).split(path.sep).join('/')
    const tekst = await readFile(plik, 'utf8')
    const klucze = new Set()

    for (const wyrazenie of [UZYCIE, WLASCIWOSC]) {
      wyrazenie.lastIndex = 0
      let m
      while ((m = wyrazenie.exec(tekst)) !== null) {
        const klucz = m[1] ?? m[2]
        if (klucz && uses[klucz]) klucze.add(klucz)
      }
    }

    for (const k of klucze) all.add(k)
    if (wzgledna.includes('/pages/')) pages.set(wzgledna, klucze)
    else komponenty.set(wzgledna, klucze)
  }

  return { pages, komponenty, partials: komponenty, all }
}
