/**
 * RAPORT ZBIORCZY - jeden plik markdown do czytania.
 *
 * Układ wynika wprost z briefu narzędzia:
 *   1. tabela wyników Lighthouse: podstrona × tryb × kategoria,
 *   2. naruszenia axe ZAGREGOWANE PO REGULE, nie po podstronie - to samo
 *      naruszenie na dwunastu podstronach ma być jedną pozycją do naprawienia,
 *      nie dwunastoma,
 *   3. lista `incomplete` z axe, osobno - to NIE są przypadki zaliczone,
 *      tylko rzeczy wymagające decyzji człowieka,
 *   4. stała lista punktów do przejścia ręcznie,
 *   5. ostrzeżenia o kompletności.
 *
 * Markdown, nie HTML: ten plik ma być czytany, wklejany modelowi i trzymany
 * obok notatek projektu. Raporty per podstrona zostają w pełnej formie HTML,
 * bo to interaktywny wynik Lighthouse'a i jego skrócenie niczego nie daje.
 */

const pct = (v) => (v === null || v === undefined ? '-' : String(v))
const ms = (v) => (v === null || v === undefined ? '-' : `${Math.round(v)} ms`)
const liczba = (v) => (v === null || v === undefined ? '-' : v.toFixed(3))

export function summaryReport({
  wyniki,
  ostrzezenia,
  punktyReczne,
  bazowy,
  stempel,
  swiadomiePominiete = [],
}) {
  const l = []

  l.push('# Audyt automatyczny')
  l.push('')
  const [dzien, godzina] = stempel.split('_')
  l.push(`Data: ${dzien} ${godzina.replace('-', ':')}`)
  l.push(`Adres bazowy: ${bazowy}`)
  l.push(`Podstron: ${new Set(wyniki.map((w) => w.sciezka)).size} · pomiarów: ${wyniki.length}`)
  l.push('')
  l.push('> Ten plik jest MATERIAŁEM WEJŚCIOWYM do audytu przedwdrożeniowego,')
  l.push('> nie jego wynikiem. Werdykt per punkt stawia człowiek, po przeczytaniu')
  l.push('> tego raportu i przejściu listy z sekcji 4.')
  l.push('')

  /* ---------------------------------------------------------------- */
  l.push('## 1. Lighthouse')
  l.push('')
  l.push('Wynik dostępności z Lighthouse to LICZBA DO WGLĄDU, nie wynik audytu dostępności.')
  l.push('Narzędzie uruchamia podzbiór reguł - właściwa warstwa automatyczna jest w sekcji 2.')
  l.push('')
  l.push('| Podstrona | Tryb | Wydajność | Dostępność | Dobre praktyki | SEO | LCP | CLS | TBT |')
  l.push('|---|---|---:|---:|---:|---:|---:|---:|---:|')
  for (const w of wyniki) {
    const lh = w.lighthouse ?? {}
    const m = w.metryki ?? {}
    l.push(
      `| ${w.sciezka} | ${w.tryb} | ${pct(lh.performance)} | ${pct(lh.accessibility)} | ` +
        `${pct(lh['best-practices'])} | ${pct(lh.seo)} | ${ms(m.lcp)} | ${liczba(m.cls)} | ${ms(m.tbt)} |`
    )
  }
  l.push('')

  const bledy = wyniki.filter((w) => w.blad)
  if (bledy.length) {
    l.push('**Pomiary, które się nie udały:**')
    l.push('')
    for (const w of bledy) l.push(`- ${w.sciezka} · ${w.tryb}: ${w.blad}`)
    l.push('')
  }

  /* ---------------------------------------------------------------- */
  l.push('## 2. axe-core - naruszenia (WCAG 2.1 AA)')
  l.push('')

  const poRegule = new Map()
  for (const w of wyniki) {
    for (const n of w.axe?.violations ?? []) {
      if (!poRegule.has(n.id)) {
        poRegule.set(n.id, { opis: n.help, waga: n.impact, url: n.helpUrl, gdzie: new Map(), przyklady: new Set() })
      }
      const wpis = poRegule.get(n.id)
      const klucz = `${w.sciezka} (${w.tryb})`
      wpis.gdzie.set(klucz, (wpis.gdzie.get(klucz) ?? 0) + n.nodes.length)
      for (const wezel of n.nodes.slice(0, 2)) wpis.przyklady.add(wezel.target.join(' '))
    }
  }

  if (!poRegule.size) {
    l.push('Brak naruszeń.')
    l.push('')
  } else {
    const WAGA = { critical: 0, serious: 1, moderate: 2, minor: 3 }
    const posortowane = [...poRegule.entries()].sort(
      (a, b) => (WAGA[a[1].waga] ?? 9) - (WAGA[b[1].waga] ?? 9)
    )
    for (const [id, w] of posortowane) {
      const suma = [...w.gdzie.values()].reduce((a, b) => a + b, 0)
      l.push(`### \`${id}\` · ${w.waga ?? 'brak wagi'} · ${suma} wystąpień`)
      l.push('')
      l.push(w.opis)
      l.push('')
      l.push('Występuje na:')
      for (const [gdzie, ile] of w.gdzie) l.push(`- ${gdzie} - ${ile}×`)
      if (w.przyklady.size) {
        l.push('')
        l.push('Przykładowe elementy:')
        for (const p of w.przyklady) l.push(`- \`${p}\``)
      }
      l.push('')
      l.push(`Opis reguły: ${w.url}`)
      l.push('')
    }
  }

  /* ---------------------------------------------------------------- */
  l.push('## 3. axe-core - `incomplete`')
  l.push('')
  l.push('**To nie jest „przeszło".** Tutaj siedzą przypadki, których automat nie')
  l.push('rozstrzygnął i które wymagają decyzji człowieka. Najczęściej: kontrast')
  l.push('tekstu na zdjęciu albo na gradiencie. Przeczytaj, nie pomijaj.')
  l.push('')

  const niepewne = new Map()
  for (const w of wyniki) {
    for (const n of w.axe?.incomplete ?? []) {
      if (!niepewne.has(n.id)) niepewne.set(n.id, { opis: n.help, gdzie: new Set(), przyklady: new Set() })
      niepewne.get(n.id).gdzie.add(`${w.sciezka} (${w.tryb})`)
      for (const wezel of n.nodes.slice(0, 2)) niepewne.get(n.id).przyklady.add(wezel.target.join(' '))
    }
  }

  if (!niepewne.size) {
    l.push('Brak.')
    l.push('')
  } else {
    for (const [id, w] of niepewne) {
      l.push(`- **\`${id}\`** - ${w.opis}`)
      l.push(`  - podstrony: ${[...w.gdzie].join(', ')}`)
      if (w.przyklady.size) l.push(`  - elementy: ${[...w.przyklady].map((p) => `\`${p}\``).join(', ')}`)
    }
    l.push('')
  }

  /* ---------------------------------------------------------------- */
  l.push('## 4. Konsola i żądania')
  l.push('')
  l.push('Checklista wymaga czystej konsoli i zera nieudanych żądań na KAŻDEJ podstronie.')
  l.push('')

  const konsola = wyniki.filter((w) => w.konsola.length)
  const zadania = wyniki.filter((w) => w.nieudaneZadania.length)

  if (!konsola.length && !zadania.length) {
    l.push('Konsola czysta, wszystkie żądania powiodły się.')
    l.push('')
  } else {
    for (const w of konsola) {
      l.push(`**${w.sciezka} (${w.tryb}) - konsola:**`)
      l.push('')
      for (const wpis of w.konsola) l.push(`- \`${wpis.typ}\` ${wpis.tekst}`)
      l.push('')
    }
    for (const w of zadania) {
      l.push(`**${w.sciezka} (${w.tryb}) - nieudane żądania:**`)
      l.push('')
      for (const z of w.nieudaneZadania) l.push(`- ${z.url} - ${z.powod}`)
      l.push('')
    }
  }

  /* ---------------------------------------------------------------- */
  l.push('## 5. Do przejścia ręcznie')
  l.push('')
  l.push('Lista stała, wypisywana przy każdym audycie niezależnie od wyników.')
  l.push('Punkt, który nie dotyczy tego projektu, odhacza się z adnotacją NIE DOTYCZY -')
  l.push('nie znika z listy.')
  l.push('')

  let obszar = null
  for (const p of punktyReczne) {
    if (p.obszar !== obszar) {
      obszar = p.obszar
      l.push(`**${obszar}**`)
      l.push('')
    }
    l.push(`- [ ] **${p.punkt}** - ${p.co}`)
  }
  l.push('')

  /* ---------------------------------------------------------------- */
  l.push('## 6. Kompletność')
  l.push('')
  if (swiadomiePominiete.length) {
    l.push(
      'Świadomie poza mapą strony (`pozaMapaStrony` w site.ts): ' +
        swiadomiePominiete.join(', ') +
        '. Sprawdzone przez audyt mimo to.'
    )
    l.push('')
  }
  if (!ostrzezenia.length) {
    l.push('Mapa strony i lista podstron builda zgadzają się, wszystkie adresy osiągalne.')
  } else {
    l.push('Rozbieżności i braki wykryte przy zbieraniu listy adresów:')
    l.push('')
    for (const o of ostrzezenia) l.push(`- ${o}`)
  }
  l.push('')

  l.push('---')
  l.push('')
  l.push('Raporty per podstrona: pliki `*.html` obok tego dokumentu (pełny wynik Lighthouse).')
  l.push('')

  return l.join('\n')
}
