#!/usr/bin/env node
/**
 * CLI narzędzia do kadrowania.
 *
 *   node tools/media/build-crop.mjs            kolejka: kadry bez wpisu + do weryfikacji
 *   node tools/media/build-crop.mjs --all      wszystkie kadry, także już zapisane
 *   node tools/media/build-crop.mjs --port=5178
 *
 * Serwer stoi na 127.0.0.1 i nie wychodzi na zewnątrz.
 */

import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { startCropServer, buildQueue } from './crop-server.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=')[1] : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)

const config = await import(pathToFileURL(path.join(ROOT, 'media', 'images.config.mjs')).href)
const all = flag('all')
const port = Number(arg('port', 5178))

const { items } = await buildQueue({ config, root: ROOT, all })

if (!items.length && !all) {
  console.log('\n  Wszystkie kadry mają wpis w media/crops.json - nie ma czego kadrować.')
  console.log('  Chcesz poprawić już zapisany kadr? --all\n')
  process.exit(0)
}

await startCropServer({ config, root: ROOT, port, all })

console.log('')
console.log(`▸ kadrowanie: http://localhost:${port}`)
console.log(`  w kolejce: ${items.length} ${all ? '(wszystkie kadry)' : 'do zrobienia'}`)
console.log('')
console.log('  Enter zapisz i dalej · S pomiń · X oznacz do wymiany')
console.log('  R propozycja · M maksymalny · C wyśrodkuj · Z strefy bezpieczne')
console.log('  Zapis idzie na bieżąco do media/crops.json. Ctrl+C kończy.')
console.log('')
