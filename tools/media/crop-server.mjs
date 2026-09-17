/**
 * NARZĘDZIE DO KADROWANIA - lokalny serwer + aplikacja w przeglądarce.
 *
 * Kadr jest daną, nie plikiem. To narzędzie jest jedynym miejscem, w którym
 * ta dana powstaje: kolejka kadrów bez wpisu w `crops.json`, duży podgląd,
 * prostokąt zablokowany na proporcji, zapis współrzędnych.
 *
 * Czego tu nie ma i nie będzie: korekcji kolorów, obrotu, filtrów, retuszu,
 * historii zmian. To nie jest edytor zdjęć. Zdjęcie wchodzi z `_raw/` przez
 * `images:source` i wychodzi nietknięte poza kadrem.
 *
 * Werdykt liczy `geometry.mjs` - ten sam plik, który liczy go w audycie.
 * Przeglądarka importuje go bezpośrednio, więc nie ma dwóch implementacji,
 * które mogłyby się rozjechać przy zmianie progu.
 *
 * Serwer stoi na localhost i mówi wyłącznie do siebie: czyta `source/`,
 * zapisuje `crops.json`. Nie dotyka `_raw/` ani `public/assets/`.
 */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { readCrops, writeCrops, sourceHash, validateRect } from './crops-store.mjs'
import { maxInscribed } from './geometry.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const json = (res, code, body) => {
  const buf = Buffer.from(JSON.stringify(body))
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': buf.length })
  res.end(buf)
}

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
    catch (e) { reject(e) }
  })
  req.on('error', reject)
})

/**
 * Propozycja startowa z sharp (`attention`).
 *
 * Bierzemy największy prostokąt o danej proporcji, więc skala wynosi 1 -
 * `fit: cover` nie musi nic zmniejszać i `cropOffset*` przychodzi wprost we
 * współrzędnych pliku źródłowego. Przy mniejszym prostokącie trzeba by
 * przeliczać przez skalę i wynik byłby mniej dokładny.
 */
async function suggestRect(file, ratio) {
  const meta = await sharp(file).metadata()
  const size = { w: meta.width, h: meta.height }
  const box = maxInscribed(size, ratio)
  const { info } = await sharp(file)
    .resize({ width: box.w, height: box.h, fit: 'cover', position: sharp.strategy.attention })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return {
    x: info.cropOffsetLeft ? Math.abs(info.cropOffsetLeft) : 0,
    y: info.cropOffsetTop ? Math.abs(info.cropOffsetTop) : 0,
    w: box.w,
    h: box.h
  }
}

/** Kadry do zrobienia: bez wpisu, na podmienionym źródle albo wszystkie. */
export async function buildQueue({ config, root, all = false }) {
  const store = await readCrops(root, config.paths)
  const srcDir = path.join(root, config.paths.source)
  const items = []

  for (const crop of Object.values(config.crops)) {
    const def = config.sources[crop.source]
    const abs = path.join(srcDir, def.file)
    if (!existsSync(abs)) continue

    const buf = await readFile(abs)
    const hash = sourceHash(buf)
    const meta = await sharp(buf).metadata()
    const size = { w: meta.width, h: meta.height }

    const saved = store.crops[crop.name]
    const rejected = store.rejected?.[crop.name] ?? null
    const stale = Boolean(saved && saved.sourceHash && saved.sourceHash !== hash)
    const state = rejected ? 'odrzucony' : !saved ? 'do-kadrowania' : stale ? 'do-weryfikacji' : 'zdefiniowany'

    if (!all && state === 'zdefiniowany') continue
    if (!all && state === 'odrzucony') continue

    items.push({
      name: crop.name,
      ratio: crop.ratio,
      widths: crop.widths,
      lightbox: crop.lightbox,
      preset: crop.preset,
      source: crop.source,
      file: def.file,
      alt: def.alt,
      size,
      hash,
      state,
      stale,
      rect: stale ? null : saved?.rect ?? null,
      rejected,
      uses: Object.entries(config.uses)
        .filter(([, u]) => u.crop === crop.name || (u.art ?? []).some((a) => a.crop === crop.name))
        .map(([k]) => k),
      zones: [...(config.safeZones?.['*'] ?? []), ...(config.safeZones?.[crop.name] ?? [])]
    })
  }
  return { items, thresholds: config.cropVerdicts }
}

export async function startCropServer({ config, root, port = 5178, all = false, log = console.log }) {
  const srcDir = path.join(root, config.paths.source)

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    try {
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        const html = await readFile(path.join(HERE, 'crop-app.html'))
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        return res.end(html)
      }

      // Przeglądarka importuje dokładnie ten sam plik, którego używa audyt.
      if (req.method === 'GET' && url.pathname === '/geometry.mjs') {
        const js = await readFile(path.join(HERE, 'geometry.mjs'))
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
        return res.end(js)
      }

      if (req.method === 'GET' && url.pathname === '/api/queue') {
        return json(res, 200, await buildQueue({ config, root, all }))
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/source/')) {
        const name = path.basename(decodeURIComponent(url.pathname.slice('/api/source/'.length)))
        const file = path.join(srcDir, name)
        if (!existsSync(file)) return json(res, 404, { error: 'brak pliku' })
        const buf = await readFile(file)
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': buf.length, 'Cache-Control': 'no-store' })
        return res.end(buf)
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/suggest/')) {
        const name = decodeURIComponent(url.pathname.slice('/api/suggest/'.length))
        const crop = config.crops[name]
        if (!crop) return json(res, 404, { error: 'nieznany kadr' })
        const def = config.sources[crop.source]
        const rect = await suggestRect(path.join(srcDir, def.file), crop.ratio)
        return json(res, 200, { rect })
      }

      if (req.method === 'POST' && url.pathname === '/api/save') {
        const { name, rect } = await readBody(req)
        const crop = config.crops[name]
        if (!crop) return json(res, 400, { error: `nieznany kadr: ${name}` })
        const def = config.sources[crop.source]
        const buf = await readFile(path.join(srcDir, def.file))
        const meta = await sharp(buf).metadata()
        const size = { w: meta.width, h: meta.height }

        const round = { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) }
        const problems = validateRect(round, crop.ratio, size)
        if (problems.length) return json(res, 400, { error: problems.join('; ') })

        const store = await readCrops(root, config.paths)
        store.crops[name] = {
          rect: round,
          source: def.file,
          sourceHash: sourceHash(buf),
          sourceSize: size,
          updatedAt: new Date().toISOString()
        }
        delete store.rejected[name]
        await writeCrops(root, config.paths, store)
        log(`  zapisano ${name}: ${round.w}×${round.h} @ ${round.x},${round.y}`)
        return json(res, 200, { ok: true })
      }

      if (req.method === 'POST' && url.pathname === '/api/reject') {
        const { name, why } = await readBody(req)
        if (!config.crops[name]) return json(res, 400, { error: `nieznany kadr: ${name}` })
        const store = await readCrops(root, config.paths)
        store.rejected[name] = { why: why || 'oznaczony do wymiany', at: new Date().toISOString() }
        delete store.crops[name]
        await writeCrops(root, config.paths, store)
        log(`  do wymiany: ${name}${why ? ` - ${why}` : ''}`)
        return json(res, 200, { ok: true })
      }

      json(res, 404, { error: 'nie ma takiej ścieżki' })
    } catch (err) {
      json(res, 500, { error: err.message })
    }
  })

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
  return { server, port }
}
