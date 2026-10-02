/**
 * KONTRAKT Z WORKEREM FORMULARZY - wartości przepisane z `forms-worker/src/forms.ts`
 * (oraz wzorce z `validate.ts` i `spam.ts`).
 *
 * Front niczego nie importuje z katalogu workera (`forms-worker/INTEGRATION.md`):
 * kontrakt jest jawny, a nie współdzielony przez kod. Po każdej zmianie
 * `forms.ts` ten plik trzeba przejrzeć według listy z INTEGRATION.md, pkt 2.
 * Zasada w obie strony: front nie może być ostrzejszy od workera (odrzuciłby
 * poprawne dane) ani łagodniejszy (przepuściłby to, co worker odrzuci).
 * Jedyny, celowy wyjątek: `ZDJECIA.maksWyniku` - uzasadnienie przy `ZDJECIA`.
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

/**
 * Pole `photos` formularza `quote` i kompresja w przeglądarce (`zdjecia.ts`).
 *
 * ⚠️ CELOWY WYJĄTEK od zasady „front nie ostrzejszy od workera": wynik
 * kompresji ma najwyżej `maksWyniku`, choć Worker przyjmuje do `maksWorkera`.
 * To nie walidacja danych, tylko cel kompresji. Każdy bajt zdjęcia to czas
 * CPU Workera (10 ms na żądanie na planie Free), a przekroczenie kończy się
 * błędem sieci bez maila. Front zmniejsza zdjęcie do tego celu i odrzuca je
 * dopiero wtedy, gdy się nie da. NIE podnoś `maksWyniku` do `maksWorkera`,
 * żeby „wyrównać" limity - to wprost dokłada CPU każdemu zgłoszeniu.
 * `maksWorkera` to siatka bezpieczeństwa dla wysyłki bez kompresji (boty,
 * awaria skryptu), nie cel.
 *
 * MB = 1024 × 1024 B, KB = 1024 B - tak liczy też formatter wagi (`waga`).
 */
export const ZDJECIA = {
  maksPlikow: 2,
  /** Dłuższy bok po kompresji w pikselach. Mniejszych zdjęć nie powiększamy. */
  maksBok: 1600,
  /** Jakość JPEG pierwszego kodowania. */
  jakosc: 0.82,
  /** Jakość jedynego ponownego kodowania (z tej samej bitmapy), gdy wynik przekroczy `maksWyniku`. */
  jakoscAwaryjna: 0.65,
  /**
   * Większego pliku nie dekodujemy wcale (10 MB). Pamięć telefonu zjada
   * liczba pikseli, nie bajty - próg jest przybliżeniem, które chroni
   * słabsze telefony przed dekodowaniem ogromnych zdjęć.
   */
  maksWejscia: 10 * 1024 * 1024,
  /** Cel kompresji (600 KB). Większy wynik po `jakoscAwaryjna` = zdjęcie nie dodane. */
  maksWyniku: 600 * 1024,
  /**
   * = `maxFileSize` pola `photos` w forms.ts. Front go nie sprawdza (ma niższy
   * `maksWyniku`) - dotyczy tylko odpowiedzi Workera `file_too_large`.
   */
  maksWorkera: 1024 * 1024,
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
