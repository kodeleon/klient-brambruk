/**
 * KONTEKST POTOKU ZDJĘĆ dla komponentów Astro.
 *
 * Komponenty `<Obraz>`, `<Preload>` i `<OgImage>` potrzebują dwóch rzeczy:
 * konfiguracji (`media/images.config.mjs`) i manifestu wariantów. Ten moduł
 * wczytuje jedno i drugie raz na proces i trzyma w pamięci - inaczej każda
 * podstrona czytałaby manifest od nowa.
 *
 * DWA TRYBY:
 *   build - manifest musi istnieć na dysku (`npm run images`). Brak klucza
 *           albo brak wariantu PRZERYWA budowanie. Cicho pominięte zdjęcie
 *           jest gorsze niż zatrzymany build.
 *   dev   - manifest liczony z konfiguracji i `crops.json`, bez kodowania ani
 *           jednego pliku. Braki dają widoczny placeholder zamiast wyjątku,
 *           żeby dało się pracować nad układem przed skończeniem kadrowania.
 */

import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const PLIK_KONFIGURACJI = path.join(ROOT, 'media', 'images.config.mjs')

let cache = null

/** `true` w `astro dev`, `false` w `astro build`. */
const tryb = () => (process.env.NODE_ENV === 'production' ? 'build' : 'dev')

export async function context() {
  if (cache) return cache

  if (!existsSync(PLIK_KONFIGURACJI)) {
    cache = { config: null, manifest: null, strict: false, aktywny: false }
    return cache
  }

  const config = await import(pathToFileURL(PLIK_KONFIGURACJI).href)
  const plikManifestu = path.join(ROOT, config.paths.cache, 'manifest.json')

  let manifest
  if (existsSync(plikManifestu)) {
    manifest = JSON.parse(await readFile(plikManifestu, 'utf8'))
  } else if (tryb() === 'dev') {
    const { planManifest } = await import('./pipeline.mjs')
    manifest = planManifest({ config, root: ROOT, profileName: 'fast' })
  } else {
    // Brak manifestu przy buildzie jest błędem konfiguracji, nie brakiem
    // zdjęcia - ale tylko wtedy, gdy projekt w ogóle jakieś zdjęcia opisuje.
    if (Object.keys(config.uses ?? {}).length > 0) {
      throw new Error(
        'potok zdjęć: brak .media-cache/manifest.json - uruchom `npm run images` przed budowaniem.'
      )
    }
    manifest = { crops: {}, lightbox: {} }
  }

  cache = {
    config,
    manifest,
    strict: tryb() === 'build' && !process.env.MEDIA_ALLOW_MISSING,
    aktywny: true,
  }
  return cache
}
