/**
 * KONTRAKT Z WORKEREM FORMULARZY - wartości przepisane z `forms-worker/src/forms.ts`
 * (oraz wzorce z `validate.ts` i `spam.ts`).
 *
 * Front niczego nie importuje z katalogu workera (`forms-worker/INTEGRATION.md`):
 * kontrakt jest jawny, a nie współdzielony przez kod. Po każdej zmianie
 * `forms.ts` ten plik trzeba przejrzeć według listy z INTEGRATION.md, pkt 2.
 * Zasada w obie strony: front nie może być ostrzejszy od workera (odrzuciłby
 * poprawne dane) ani łagodniejszy (przepuściłby to, co worker odrzuci).
 *
 * Klucze opcji (`serviceType`, `subtype`, `terrain`, `timeline`, `budget`)
 * mieszkają w `src/content/wycena.json` - tam też muszą się zgadzać z workerem.
 *
 * Czytają go strony (limity w znaczniku) i skrypty przeglądarki (walidacja,
 * zdjęcia), więc same dane, bez importów.
 */

export type SlugFormularza = 'contact' | 'quote'

/** Maksymalna liczba znaków pól tekstowych (`maxLength`), liczona po `trim()`. */
export const LIMITY = {
  contact: { name: 100, email: 200, phone: 20, message: 2000 },
  quote: { amount: 50, location: 200, description: 5000, name: 100, email: 200, phone: 20 },
} as const satisfies Record<SlugFormularza, Record<string, number>>

/** Pole `photos` formularza `quote`. */
export const ZDJECIA = {
  maksPlikow: 2,
  /** Twardy limit workera na plik (4 MiB). Front sprawdza go PO kompresji. */
  maksRozmiar: 4 * 1024 * 1024,
  /** Co worker przyjmuje - rozpoznaje typ po bajtach, nie po nazwie. */
  typyWorkera: ['image/jpeg', 'image/png', 'image/webp'],
  /** Co przyjmuje pole pliku. HEIC/HEIF wychodzi z kompresji jako JPEG. */
  typyWejscia: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  /** Rozszerzenia na wypadek pustego `File.type` (bywa przy HEIC). */
  rozszerzeniaWejscia: /\.(jpe?g|png|webp|heic|heif)$/i,
} as const

/** `EMAIL_PATTERN` i `PHONE_PATTERN` z validate.ts, `LINK_PATTERN` z spam.ts. */
export const WZORZEC_EMAIL = /^\S+@\S+\.\S+$/
export const WZORZEC_TELEFONU = /^[+\d\s\-()]{3,}$/
export const WZORZEC_LINKU = /https?:\/\/|www\./i

/** `HONEYPOT_FIELD` z spam.ts. */
export const POLE_PULAPKA = '_hp'
