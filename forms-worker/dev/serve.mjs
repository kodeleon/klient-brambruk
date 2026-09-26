// Minimalny serwer statyczny dla strony testowej i podglądu maili. Bez zależności.
//   npm run dev:page  ->  http://localhost:4321/            (strona testowa)
//                         http://localhost:4321/out/        (podgląd maili po npm run preview:emails)

import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const PORT = Number(process.env.PORT ?? 4321)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
  const file = normalize(join(ROOT, path === '/' ? 'test-page.html' : path))
  if (!file.startsWith(ROOT)) return send(res, 403, 'text/plain', 'Forbidden')

  try {
    if (path !== '/' && path.endsWith('/')) {
      const names = (await readdir(file)).sort()
      const links = names.map((n) => `<li><a href="${encodeURIComponent(n)}">${n}</a></li>`).join('')
      return send(res, 200, TYPES['.html'], `<!doctype html><meta charset="utf-8"><ul>${links}</ul>`)
    }
    send(res, 200, TYPES[extname(file)] ?? 'application/octet-stream', await readFile(file))
  } catch {
    send(res, 404, 'text/plain', 'Not found')
  }
}).listen(PORT, () => {
  console.log(`Strona testowa: http://localhost:${PORT}/`)
  console.log(`Podgląd maili:  http://localhost:${PORT}/out/  (najpierw npm run preview:emails)`)
})

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(body)
}
