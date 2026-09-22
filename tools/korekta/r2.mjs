#!/usr/bin/env node
/**
 * ZRZUT TREŚCI DLA NARZĘDZIA KOREKTA - dwa kierunki, jeden plik.
 *
 *   npm run korekta:push      src/content → R2
 *   npm run korekta:pull      R2 → src/content
 *   npm run korekta:push -- --bucket=inny-kubelek
 *   npm run korekta:push -- --sucho          pokaż polecenia, nie uruchamiaj
 *
 * ┌── PO CO ────────────────────────────────────────────────────────────┐
 * │ Klient nie ma dostępu do repozytorium - bramką jest Kodeleon. Ale    │
 * │ ceny i dane firmy ma zweryfikować on, bo tylko on zna prawdziwe.     │
 * │ Kubełek R2 jest miejscem spotkania: my wgrywamy stan wydany, klient  │
 * │ poprawia go w Korekcie, my ściągamy wynik i oglądamy jako `git diff`.│
 * │                                                                      │
 * │ DWIE KOPIE PRZY WGRANIU, i to jest cały mechanizm:                   │
 * │   · `cennik.json`            - plik roboczy, po nim pisze klient,    │
 * │   · `wyjsciowe/cennik.json`  - stan wydany, NIKT go nie zmienia.     │
 * │ Bez drugiej kopii narzędzie nie ma jak pokazać, co klient właściwie  │
 * │ zmienił, a my nie mamy jak odróżnić jego decyzji od naszej pomyłki.  │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * ⚠️ WYSYŁKA WYCHODZI POZA REPOZYTORIUM. `push` nadpisuje kopię roboczą
 * klienta - jeżeli akurat coś poprawiał, jego praca przepada. Dlatego
 * polecenie pyta o potwierdzenie, a `--sucho` pokazuje, co by zrobiło,
 * bez ruszania czegokolwiek.
 *
 * ⚠️ `pull` NADPISUJE PLIKI W `src/content/`. To jest zamierzone: różnicę
 * ogląda się przez `git diff`, a nie przez porównywanie dwóch katalogów.
 * Plik, który nie jest poprawnym JSON-em, nie wchodzi - schemat kolekcji
 * wywaliłby build dopiero na następnym etapie, a wtedy nie wiadomo już,
 * czy winna jest treść, czy pobranie.
 *
 * WRANGLER CELOWO NIE JEST ZALEŻNOŚCIĄ (patrz `wrangler.jsonc`): to narzędzie
 * wdrożeniowe, nie zależność builda. Bierze je `npx` na żądanie.
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * Pliki objęte korektą. Świadomie DWA, a nie cała `src/content`: reszta to
 * proza, której klient nie weryfikuje pole po polu, a każdy dodany plik to
 * kolejny kształt do obsłużenia po drugiej stronie.
 */
const PLIKI = ['cennik.json', 'firma.json']

/** Prefiks kopii wzorcowej. Ta sama nazwa musi stać w narzędziu Korekta. */
const WYJSCIOWE = 'wyjsciowe'

/**
 * Nazwa kubełka R2 na koncie Cloudflare - ta sama, którą wiąże Worker
 * Korekty (`content-editor/wrangler.toml`, binding `MY_R2_BUCKET`).
 * `--bucket=` albo `KOREKTA_BUCKET` przykrywa ją bez ruszania kodu, bo
 * kubełek testowy i produkcyjny to ta sama operacja na innym koncie.
 */
const KUBELEK_DOMYSLNY = 'brambruk'

const arg = (nazwa, domyslna = null) => {
  const trafienie = process.argv.find((a) => a.startsWith(`--${nazwa}=`))
  return trafienie ? trafienie.slice(nazwa.length + 3) : domyslna
}
const flaga = (nazwa) => process.argv.includes(`--${nazwa}`)

const kubelek = arg('bucket', process.env.KOREKTA_BUCKET ?? KUBELEK_DOMYSLNY)
const sucho = flaga('sucho')
const kierunek = process.argv[2]

/** Ścieżka pliku treści w repozytorium. */
const wRepo = (nazwa) => path.join(ROOT, 'src', 'content', nazwa)

/**
 * Uruchomienie wranglera. `spawnSync` bez `shell`, bo argumenty przychodzą
 * z konfiguracji, a nie od użytkownika - i bo `shell: true` na Windows
 * potrafi zostawić proces żyjący za zabitym `cmd` (antywzorzec #17 z README).
 */
function wrangler(argumenty) {
  const polecenie = ['wrangler', ...argumenty]
  if (sucho) {
    console.log('  npx ' + polecenie.join(' '))
    return true
  }
  const wynik = spawnSync('npx', polecenie, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (wynik.status !== 0) {
    console.error(`\n✗ Nie powiodło się: npx ${polecenie.join(' ')}`)
    return false
  }
  return true
}

/** Poprawny JSON, czy tylko coś, co się pobrało. */
function sprawdzJson(sciezka, skad) {
  try {
    JSON.parse(readFileSync(sciezka, 'utf8'))
  } catch (blad) {
    throw new Error(`${skad} nie jest poprawnym JSON-em: ${blad.message}`)
  }
}

/* ------------------------------------------------------------------ */
/* push                                                                */
/* ------------------------------------------------------------------ */

async function push() {
  for (const nazwa of PLIKI) sprawdzJson(wRepo(nazwa), `src/content/${nazwa}`)

  console.log(`\nWgranie do kubełka „${kubelek}":`)
  for (const nazwa of PLIKI) {
    console.log(`  ${nazwa}  →  ${nazwa} oraz ${WYJSCIOWE}/${nazwa}`)
  }
  console.log(
    '\n⚠️ Kopia robocza klienta zostanie NADPISANA. Jeżeli ma w Korekcie\n' +
      '   niedokończone poprawki, przepadną.'
  )

  if (!sucho && !(await potwierdz())) {
    console.log('Przerwane, nic nie wysłano.')
    process.exitCode = 1
    return
  }

  console.log('')
  for (const nazwa of PLIKI) {
    const plik = wRepo(nazwa)
    for (const klucz of [nazwa, `${WYJSCIOWE}/${nazwa}`]) {
      const ok = wrangler([
        'r2',
        'object',
        'put',
        `${kubelek}/${klucz}`,
        `--file=${plik}`,
        '--content-type=application/json',
        '--remote',
      ])
      if (!ok) {
        process.exitCode = 1
        return
      }
    }
  }
  console.log(sucho ? '\nSucho - nic nie wysłano.' : '\n✓ Wgrane.')
}

/* ------------------------------------------------------------------ */
/* pull                                                                */
/* ------------------------------------------------------------------ */

async function pull() {
  console.log(`\nPobranie z kubełka „${kubelek}" do src/content/:`)
  for (const nazwa of PLIKI) console.log(`  ${nazwa}`)
  console.log('\n⚠️ Pliki w src/content/ zostaną NADPISANE. Różnicę obejrzyj przez `git diff`.')

  if (!sucho && !(await potwierdz())) {
    console.log('Przerwane, nic nie pobrano.')
    process.exitCode = 1
    return
  }

  console.log('')
  const tymczasowy = sucho ? null : mkdtempSync(path.join(tmpdir(), 'korekta-'))
  try {
    for (const nazwa of PLIKI) {
      const docelowy = wRepo(nazwa)
      const przejsciowy = tymczasowy ? path.join(tymczasowy, nazwa) : docelowy

      const ok = wrangler(['r2', 'object', 'get', `${kubelek}/${nazwa}`, `--file=${przejsciowy}`, '--remote'])
      if (!ok) {
        process.exitCode = 1
        return
      }
      if (sucho) continue

      // Sprawdzenie PRZED podmianą: plik w repozytorium ma zostać nietknięty,
      // jeżeli to, co przyszło z kubełka, nie jest treścią.
      sprawdzJson(przejsciowy, `${kubelek}/${nazwa}`)
      const tresc = readFileSync(przejsciowy, 'utf8')
      writeFileSync(docelowy, tresc.endsWith('\n') ? tresc : tresc + '\n', 'utf8')
      console.log(`  ✓ src/content/${nazwa}`)
    }
  } finally {
    if (tymczasowy) rmSync(tymczasowy, { recursive: true, force: true })
  }

  if (sucho) {
    console.log('\nSucho - nic nie pobrano.')
    return
  }
  console.log('\n✓ Pobrane. Teraz: `git diff src/content/` i `npm run build`.')
}

/* ------------------------------------------------------------------ */

async function potwierdz() {
  const pytanie = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const odpowiedz = await pytanie.question('\nKontynuować? [tak/nie] ')
    return odpowiedz.trim().toLowerCase() === 'tak'
  } finally {
    pytanie.close()
  }
}

if (kierunek === 'push') await push()
else if (kierunek === 'pull') await pull()
else {
  console.error(
    'Użycie:\n' +
      '  npm run korekta:push          src/content → R2\n' +
      '  npm run korekta:pull          R2 → src/content\n' +
      '  ... -- --bucket=nazwa         inny kubełek niż domyślny\n' +
      '  ... -- --sucho                pokaż polecenia, nie uruchamiaj\n'
  )
  process.exitCode = 1
}
