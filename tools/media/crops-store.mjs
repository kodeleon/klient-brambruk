/**
 * `media/crops.json` - kadry jako dane.
 *
 * Format (wersja 1):
 *
 * {
 *   "version": 1,
 *   "crops": {
 *     "salon-02-16x9": {
 *       "rect": { "x": 0, "y": 1035, "w": 2208, "h": 1242 },
 *       "source": "salon-02.jpg",
 *       "sourceHash": "1a2b3c4d5e6f7a8b",
 *       "sourceSize": { "w": 2208, "h": 3312 },
 *       "updatedAt": "2026-08-31T10:20:00.000Z"
 *     }
 *   },
 *   "rejected": { "<kadr>": { "why": "...", "at": "..." } }
 * }
 *
 * `rect` jest w układzie współrzędnych pliku z `source/` - nie oryginału,
 * nie wariantu. `sourceHash` i `sourceSize` zapisujemy przy kadrze po to,
 * żeby podmiana zdjęcia w `_raw/` dała się wykryć: prostokąt policzony na
 * innym kadrze pokaże co innego, a bez tego zapisu nikt by tego nie zauważył.
 *
 * `rejected` to kadry oznaczone w narzędziu jako „do wymiany" - świadoma
 * decyzja człowieka, nie brak danych. Raport pokazuje je inaczej niż
 * kadry jeszcze nietknięte.
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const CROPS_VERSION = 1

export const sourceHash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16)

export const emptyStore = () => ({ version: CROPS_VERSION, crops: {}, rejected: {} })

export async function readCrops(root, paths) {
  try {
    const raw = JSON.parse(await readFile(path.join(root, paths.crops), 'utf8'))
    return {
      version: raw.version ?? CROPS_VERSION,
      crops: raw.crops ?? {},
      rejected: raw.rejected ?? {}
    }
  } catch {
    return emptyStore()
  }
}

export async function writeCrops(root, paths, store) {
  const ordered = {
    version: store.version ?? CROPS_VERSION,
    crops: Object.fromEntries(Object.entries(store.crops).sort(([a], [b]) => a.localeCompare(b))),
    rejected: Object.fromEntries(Object.entries(store.rejected ?? {}).sort(([a], [b]) => a.localeCompare(b)))
  }
  await writeFile(path.join(root, paths.crops), JSON.stringify(ordered, null, 2) + '\n')
  return ordered
}

/**
 * Czy prostokąt trzyma się zadeklarowanej proporcji i mieści w źródle.
 * Zapis do `crops.json` z pominięciem tej kontroli oznaczałby, że generator
 * dostaje kadr, którego nie da się wyciąć - lepiej odrzucić przy zapisie.
 */
export function validateRect(rect, ratio, size, tolerance = 0.01) {
  const problems = []
  if (!rect || [rect.x, rect.y, rect.w, rect.h].some((v) => !Number.isFinite(v))) {
    return ['prostokąt nie jest kompletny (x, y, w, h)']
  }
  if (rect.w <= 0 || rect.h <= 0) problems.push('prostokąt ma zerowy bok')
  if (rect.x < 0 || rect.y < 0) problems.push('prostokąt zaczyna się poza źródłem')
  if (size && (rect.x + rect.w > size.w || rect.y + rect.h > size.h)) {
    problems.push(`prostokąt wychodzi poza źródło ${size.w}×${size.h}`)
  }
  const want = ratio[0] / ratio[1]
  const have = rect.w / rect.h
  if (Math.abs(have - want) / want > tolerance) {
    problems.push(`proporcja ${have.toFixed(3)} zamiast ${want.toFixed(3)} (${ratio.join(':')})`)
  }
  return problems
}
