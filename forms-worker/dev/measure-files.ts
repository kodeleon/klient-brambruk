// Pliki do pomiaru CPU, warianty (b) i (c) z README ("Pomiar CPU"): sygnatura JPEG
// i losowe bajty. Worker sprawdza tylko sygnaturę, a worker pomiarowy działa w dry
// run - koszt CPU zależy od liczby bajtów, nie od treści obrazu. Rozmiary liczone
// z limitów w src/forms.ts, więc zmiana limitu nie wymaga zmian tutaj.
//   npm run measure:files  ->  dev/out/pomiar-*.jpg
// Na stronie testowej zaznacz "wyślij bez kompresji" - inaczej front je odrzuci.

import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { FORMS, MAX_REQUEST_BYTES, type FileField } from '../src/forms.ts'

const OUT = new URL('./out/', import.meta.url)
const KiB = 1024
const { maxFiles, maxFileSize } = FORMS.quote!.fields.photos as FileField

function jpeg(size: number): Uint8Array {
  const bytes = new Uint8Array(randomBytes(size))
  bytes.set([0xff, 0xd8, 0xff, 0xe0])
  return bytes
}

const each = (count: number, name: (n: number) => string, size: number, expected: string) =>
  Array.from({ length: count }, (_, i) => ({ name: name(i + 1), size, expected }))

const FILES = [
  // (b) najgorszy przypadek, jaki worker przyjmie: komplet plików tuż pod limitem.
  ...each(maxFiles, (n) => `pomiar-b-${n}.jpg`, maxFileSize - KiB, '(b)  200, outcome dry_run'),
  // (c1) jeden plik tuż nad limitem pliku.
  ...each(1, () => 'pomiar-c1.jpg', maxFileSize + KiB, '(c1) 400 validation_failed, photos: file_too_large'),
  // (c2) komplet plików, razem ponad limit żądania - odrzucony przed parsowaniem.
  ...each(maxFiles, (n) => `pomiar-c2-${n}.jpg`, Math.ceil(MAX_REQUEST_BYTES / maxFiles) + KiB, '(c2) 413 payload_too_large'),
]

await mkdir(OUT, { recursive: true })
for (const file of FILES) {
  await writeFile(new URL(file.name, OUT), jpeg(file.size))
  console.log(`${file.name.padEnd(17)} ${String(file.size).padStart(9)} B   ${file.expected}`)
}
console.log(`\nGotowe: ${OUT.pathname}`)
