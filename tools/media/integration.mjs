/**
 * INTEGRACJA: potok zdjęć, warstwa deweloperska.
 *
 * W trybie deweloperskim dogenerowuje brakujący wariant przy pierwszym
 * żądaniu, żeby po podmianie zdjęcia albo zmianie kadru wystarczyło odświeżyć
 * stronę, bez uruchamiania pełnego potoku.
 *
 * Projekt bez zdjęć nie musi nic wyłączać - bez `media/images.config.mjs`
 * integracja jest bezczynna.
 *
 * AKTUALNOŚCI MANIFESTU ta integracja NIE pilnuje i celowo nie powinna:
 * robi to skrypt `prebuild` w package.json, który przed każdym buildem
 * przepuszcza potok zdjęć. Brakujący wariant przy buildzie wychwytuje
 * `context.mjs` i przerywa z nazwą klucza.
 *
 * ┌── DLACZEGO `zaladujPoNodzie`, A NIE ZWYKŁY `import()` ─────────────────┐
 * │ Kod integracji przechodzi przez moduł uruchomieniowy Vite. Każdy       │
 * │ `import()` napisany wprost - także z adnotacją vite-ignore - jest       │
 * │ przepisywany na wywołanie tego modułu i ginie razem z nim:             │
 * │ „Vite module runner has been closed", a na Windowsie dodatkowo         │
 * │ „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" i zabity      │
 * │ serwer deweloperski.                                                   │
 * │ Funkcja zbudowana przez `new Function` powstaje dopiero w czasie       │
 * │ działania, więc Vite nie ma czego przepisać i import idzie prosto      │
 * │ do Node.                                                               │
 * │                                                                        │
 * │ Druga warstwa zabezpieczenia: wczytanie dzieje się LENIWIE, przy       │
 * │ pierwszym żądaniu o zdjęcie, a nie przy starcie serwera. Hak           │
 * │ `astro:server:setup` tylko rejestruje pośrednik. Nawet gdyby coś tu    │
 * │ padło, serwer deweloperski działa dalej - tracisz dogenerowywanie      │
 * │ wariantów w locie, nie cały `npm run dev`.                             │
 * └────────────────────────────────────────────────────────────────────────┘
 */

import path from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const KONFIGURACJA = 'media/images.config.mjs'

/** Import omijający moduł uruchomieniowy Vite - patrz komentarz wyżej. */
const zaladujPoNodzie = new Function('adres', 'return import(adres)')

export function images({ konfiguracja = KONFIGURACJA } = {}) {
  const ROOT = process.cwd()
  const plikKonfiguracji = path.join(ROOT, konfiguracja)

  /** Wczytane raz, przy pierwszym żądaniu o zdjęcie. */
  let potok = null
  let potokPadl = false

  async function wczytajPotok(logger) {
    if (potok || potokPadl) return potok
    try {
      const [{ renderOnDemand }, { MIME }, config] = await Promise.all([
        zaladujPoNodzie(pathToFileURL(path.join(ROOT, 'tools/media/pipeline.mjs')).href),
        zaladujPoNodzie(pathToFileURL(path.join(ROOT, 'tools/media/presets.mjs')).href),
        zaladujPoNodzie(pathToFileURL(plikKonfiguracji).href),
      ])
      potok = { renderOnDemand, MIME, config }
    } catch (err) {
      potokPadl = true
      logger.warn(
        `nie udało się wczytać potoku zdjęć (${err.message}). ` +
          'Podgląd działa dalej, ale brakujące warianty nie powstaną w locie - uruchom `npm run images`.'
      )
    }
    return potok
  }

  return {
    name: 'kodeleon-images',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        if (!existsSync(plikKonfiguracji)) return

        server.middlewares.use(async (req, res, next) => {
          const url = (req.url || '').split('?')[0]
          if (!url.startsWith('/assets/img/')) return next()

          const p = await wczytajPotok(logger)
          if (!p) return next()

          const rel = decodeURIComponent(url.slice('/assets/img/'.length))
          if (existsSync(path.join(ROOT, p.config.paths.outImg, rel))) return next()

          try {
            const buf = await p.renderOnDemand({
              config: p.config,
              root: ROOT,
              profileName: 'fast',
              relPath: rel,
            })
            if (!buf) return next()
            const ext = path.extname(rel).slice(1)
            res.setHeader(
              'Content-Type',
              p.MIME[ext === 'jpg' ? 'jpeg' : ext] ?? 'application/octet-stream'
            )
            res.setHeader('Cache-Control', 'no-cache')
            res.end(buf)
          } catch (err) {
            logger.warn(`nie udało się wygenerować ${rel}: ${err.message}`)
            next()
          }
        })
      },
    },
  }
}

export default images
