/**
 * INDEKS UŻYĆ - gdzie na serwisie stoi która wartość.
 *
 * ┌── PO CO OSOBNY MODUŁ ───────────────────────────────────────────────┐
 * │ Indeks zbiera dwa źródła: znaczniki rozwijane w treści              │
 * │ (`znaczniki.ts`) i kwoty wstawiane do tabel wprost z cennika        │
 * │ (`cennik.ts`). Gdyby indeks siedział w którymś z nich, drugi        │
 * │ musiałby go zaimportować - a `znaczniki → wartosci → cennik`        │
 * │ zamknęłoby się w cykl. Stąd trzeci moduł, który nie importuje       │
 * │ niczego poza Node.                                                   │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * To jest materiał wejściowy dla narzędzia korekty (W2 w TODO-custom-cms):
 * „pokaż wszystkie miejsca, w których stoi cena bramy przesuwnej".
 * Zbierany PRZY OKAZJI budowania, nie prowadzony osobno - osobna ewidencja
 * rozjechałaby się z treścią przy pierwszej poprawce.
 *
 * ⚠️ MODUŁ WYŁĄCZNIE SERWEROWY (sięga po `node:fs`).
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const uzycia = new Map<string, Set<string>>()

export function zarejestruj(klucz: string, gdzie: string): void {
  const miejsca = uzycia.get(klucz) ?? new Set<string>()
  miejsca.add(gdzie)
  uzycia.set(klucz, miejsca)
  podepnijZapis()
}

/** Indeks jako zwykły obiekt - do zapisu i do testów. */
export function indeksUzyc(): Record<string, string[]> {
  const wynik: Record<string, string[]> = {}
  for (const [klucz, miejsca] of [...uzycia].sort(([a], [b]) => a.localeCompare(b))) {
    wynik[klucz] = [...miejsca].sort()
  }
  return wynik
}

/**
 * Indeks ląduje w katalogu stanu builda, nie w repozytorium: to wynik
 * budowania, odtwarzalny jednym poleceniem, a nie źródło.
 */
const PLIK = path.join(process.cwd(), '.build-state', 'znaczniki.json')

let podpiete = false
function podepnijZapis(): void {
  if (podpiete) return
  podpiete = true
  process.on('exit', () => {
    try {
      mkdirSync(path.dirname(PLIK), { recursive: true })
      writeFileSync(PLIK, JSON.stringify(indeksUzyc(), null, 2) + '\n', 'utf8')
    } catch {
      // Indeks jest materiałem pomocniczym. Nieudany zapis nie może wywrócić
      // builda, który poza tym się udał.
    }
  })
}
