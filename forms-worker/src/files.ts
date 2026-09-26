// Pliki: liczba, rozmiar i typ rozpoznany po sygnaturze bajtowej.
// Nie ufamy `File.type`, rozszerzeniu ani nazwie od klienta - nazwę
// załącznika generujemy sami: `{attachmentName}-{n}.{ext}` (attachmentName z forms.ts).

import type { FileField, ImageMime } from './forms.ts'
import type { ParsedFile } from './parse.ts'

export type FileError = 'too_many_files' | 'file_too_large' | 'invalid_file_type'

export interface Attachment {
  filename: string
  mime: ImageMime
  bytes: Uint8Array
}

interface Signature {
  mime: ImageMime
  ext: string
  matches(bytes: Uint8Array): boolean
}

const startsWith = (bytes: Uint8Array, offset: number, expected: readonly number[]) =>
  expected.every((byte, i) => bytes[offset + i] === byte)

const SIGNATURES: readonly Signature[] = [
  { mime: 'image/jpeg', ext: 'jpg', matches: (b) => startsWith(b, 0, [0xff, 0xd8, 0xff]) },
  { mime: 'image/png', ext: 'png', matches: (b) => startsWith(b, 0, [0x89, 0x50, 0x4e, 0x47]) },
  // RIFF....WEBP
  {
    mime: 'image/webp',
    ext: 'webp',
    matches: (b) => startsWith(b, 0, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, 8, [0x57, 0x45, 0x42, 0x50]),
  },
]

export function detectImageType(bytes: Uint8Array): Signature | undefined {
  return SIGNATURES.find((signature) => signature.matches(bytes))
}

/** Pierwszy błąd w kolejności: liczba plików, rozmiar, typ. */
export function checkFiles(files: readonly ParsedFile[], field: FileField): FileError | null {
  if (files.length > field.maxFiles) return 'too_many_files'
  if (files.some((file) => file.size > field.maxFileSize)) return 'file_too_large'
  const typeOk = (file: ParsedFile) => {
    const type = detectImageType(file.bytes)
    return type !== undefined && field.accept.includes(type.mime)
  }
  if (!files.every(typeOk)) return 'invalid_file_type'
  return null
}

/** Załączniki z nazwami `{attachmentName}-{n}.{ext}`. Wywoływać po checkFiles. */
export function toAttachments(files: readonly ParsedFile[], field: FileField): Attachment[] {
  return files.map((file, i) => {
    const type = detectImageType(file.bytes)!
    return { filename: `${field.attachmentName}-${i + 1}.${type.ext}`, mime: type.mime, bytes: file.bytes }
  })
}
