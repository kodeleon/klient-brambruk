/**
 * RAPORT WIZUALNY - jeden plik `index.html` na cały audyt.
 *
 * Po co, skoro Lighthouse generuje własny raport: bo generuje go PER POMIAR.
 * Przy trzech podstronach i dwóch trybach to sześć osobnych dokumentów bez
 * żadnego połączenia między sobą - żeby porównać stronę główną na telefonie
 * i na komputerze, trzeba otworzyć dwa pliki i przełączać karty.
 *
 * Ten plik jest spinaczem: jedna tabela wszystkich pomiarów, przełącznik
 * telefon/komputer, odnośnik do pełnego raportu Lighthouse przy każdym
 * wierszu, a do tego rzeczy, których Lighthouse w ogóle nie pokazuje -
 * naruszenia axe ZE ZRZUTAMI ELEMENTÓW, które zawiodły, konsola, żądania
 * i lista do przejścia ręcznie.
 *
 * Plik jest samowystarczalny: style i skrypt w środku, zrzuty jako pliki PNG
 * obok. Otwierasz go z dysku, bez serwera.
 *
 * Wersja do wklejenia modelowi zostaje w `RAPORT.md` - markdown czyta się
 * modelowi lepiej niż HTML i nie ma sensu utrzymywać jednego kosztem drugiego.
 */

const h = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Progi Lighthouse: 90+ dobrze, 50-89 do poprawy, poniżej - źle. */
const klasaWyniku = (v) => (v === null || v === undefined ? 'brak' : v >= 90 ? 'ok' : v >= 50 ? 'uwaga' : 'zle')

/** Progi Core Web Vitals. */
const klasaMetryki = (nazwa, v) => {
  if (v === null || v === undefined) return 'brak'
  const progi = { lcp: [2500, 4000], cls: [0.1, 0.25], tbt: [200, 600] }[nazwa]
  if (!progi) return 'brak'
  return v <= progi[0] ? 'ok' : v <= progi[1] ? 'uwaga' : 'zle'
}

const ms = (v) => (v === null || v === undefined ? '-' : `${(v / 1000).toFixed(1)} s`)
const liczba = (v) => (v === null || v === undefined ? '-' : v.toFixed(3))
const pct = (v) => (v === null || v === undefined ? '-' : String(v))

const WAGA_KOLEJNOSC = { critical: 0, serious: 1, moderate: 2, minor: 3 }
const WAGA_PL = {
  critical: 'krytyczna',
  serious: 'poważna',
  moderate: 'średnia',
  minor: 'drobna',
}

/**
 * Dlaczego axe nie potrafił policzyć kontrastu. Klucze pochodzą wprost
 * z axe-core; tłumaczenie mówi, co z tym zrobić, a nie tylko co się stało.
 */
const POWOD_KONTRASTU = {
  bgImage: 'pod tekstem leży obraz - kontrast trzeba sprawdzić okiem, na najjaśniejszym fragmencie zdjęcia',
  bgGradient: 'pod tekstem leży gradient - policz kontrast dla obu jego krańców',
  imgNode: 'pod tekstem leży element graficzny',
  bgOverlap: 'element zasłania inny element - automat nie wie, co jest tłem',
  elmPartiallyObscured: 'element jest częściowo zasłonięty przez inny',
  elmPartiallyObscuring: 'element częściowo zasłania inny',
  equalRatio: 'tekst ma ten sam kolor co tło - prawdopodobnie jest niewidoczny albo pusty',
  shortTextContent: 'za mało tekstu, żeby automat uznał pomiar za wiarygodny',
  fgAlpha: 'kolor tekstu jest półprzezroczysty',
  pseudoContent: 'tło pochodzi z pseudoelementu (::before / ::after)',
  nonBmp: 'treść to znak spoza podstawowej płaszczyzny Unicode (ikona, emoji)',
}

const KATEGORIE = [
  ['performance', 'Wydajność'],
  ['accessibility', 'Dostępność*'],
  ['best-practices', 'Dobre praktyki'],
  ['seo', 'SEO'],
]

/* ------------------------------------------------------------------ */
/* Agregacja                                                           */
/* ------------------------------------------------------------------ */

function zbierzReguly(wyniki, rodzaj) {
  const pole = rodzaj === 'naruszenie' ? 'violations' : 'incomplete'
  const mapa = new Map()

  for (const w of wyniki) {
    for (const regula of w.axe?.[pole] ?? []) {
      if (!mapa.has(regula.id)) {
        mapa.set(regula.id, {
          id: regula.id,
          opis: regula.help,
          szerzej: regula.description,
          waga: regula.impact,
          url: regula.helpUrl,
          wystapienia: 0,
          gdzie: new Map(),
          dowody: [],
        })
      }
      const wpis = mapa.get(regula.id)
      wpis.wystapienia += regula.nodes?.length ?? 0
      const klucz = `${w.sciezka} · ${w.tryb}`
      wpis.gdzie.set(klucz, (wpis.gdzie.get(klucz) ?? 0) + (regula.nodes?.length ?? 0))

      for (const dowod of w.zrzuty?.get(`${rodzaj}:${regula.id}`) ?? []) {
        // Ten sam element na telefonie i na komputerze to JEDEN problem -
        // drugi zrzut dokłada inny scroll, nie nową informację. Zostawiamy
        // wersję z komputera: kadr jest szerszy i widać na nim kontekst,
        // a wąski wycinek z telefonu czyta się gorzej w siatce raportu.
        const juzJest = wpis.dowody.findIndex((d) => d.selektor === dowod.selektor)
        if (juzJest !== -1) {
          if (w.tryb === 'desktop' && wpis.dowody[juzJest].tryb !== 'desktop' && dowod.plik) {
            wpis.dowody[juzJest] = { ...dowod, sciezka: w.sciezka, tryb: w.tryb }
          }
          continue
        }
        wpis.dowody.push({ ...dowod, sciezka: w.sciezka, tryb: w.tryb })
      }
    }
  }

  return [...mapa.values()].sort(
    (a, b) => (WAGA_KOLEJNOSC[a.waga] ?? 9) - (WAGA_KOLEJNOSC[b.waga] ?? 9) || b.wystapienia - a.wystapienia
  )
}

/* ------------------------------------------------------------------ */
/* Kawałki widoku                                                      */
/* ------------------------------------------------------------------ */

function kartaDowodu(d) {
  let kontrast = ''
  if (d.dane?.policzony) {
    kontrast = `<dl class="dane">
         <div><dt>Kontrast</dt><dd class="${d.dane.kontrast >= d.dane.prog ? 'ok' : 'zle'}">${d.dane.kontrast}:1</dd></div>
         <div><dt>Wymagany</dt><dd>${d.dane.prog}:1</dd></div>
         <div><dt>Tekst</dt><dd><i class="probka" style="background:${h(d.dane.tekst)}"></i>${h(d.dane.tekst)}</dd></div>
         <div><dt>Tło</dt><dd><i class="probka" style="background:${h(d.dane.tlo)}"></i>${h(d.dane.tlo)}</dd></div>
       </dl>`
  } else if (d.dane) {
    // Kontrast 0:1 byłby nieprawdą - on nie wynosi zero, tylko nie da się go
    // policzyć automatycznie. Podajemy powód i wymagany próg, resztę robi oko.
    const powod = POWOD_KONTRASTU[d.dane.powod] ?? 'automat nie rozstrzygnął, jakie jest tło'
    kontrast = `<p class="do-oka"><strong>Do sprawdzenia okiem:</strong> ${h(powod)}.
      Wymagany próg: ${h(d.dane.prog ?? '4.5')}:1${
        d.dane.tekst ? ` · kolor tekstu <i class="probka" style="background:${h(d.dane.tekst)}"></i>${h(d.dane.tekst)}` : ''
      }</p>`
  }

  const obraz = d.plik
    ? `<a class="zrzut" href="${h(d.plik)}" target="_blank" rel="noopener">
         <img src="${h(d.plik)}" alt="Zrzut elementu ${h(d.selektor)} - zaznaczony czerwoną obwódką" loading="lazy">
       </a>`
    : '<p class="brak-zrzutu">Nie udało się zrobić zrzutu - element zniknął albo nie ma wymiarów.</p>'

  return `<article class="dowod">
    ${obraz}
    <div class="dowod__opis">
      <p class="sciezka">${h(d.sciezka)} <span class="tryb">${h(d.tryb)}</span></p>
      <code class="selektor">${h(d.selektor)}</code>
      ${kontrast}
      ${d.html ? `<details><summary>Znacznik</summary><pre>${h(d.html)}</pre></details>` : ''}
    </div>
  </article>`
}

function sekcjaRegul(reguly, rodzaj) {
  if (!reguly.length) {
    return `<p class="pusto">${
      rodzaj === 'naruszenie'
        ? 'Brak naruszeń. Warstwa automatyczna nie znalazła nic do poprawienia.'
        : 'Brak. Automat rozstrzygnął wszystko, co miał rozstrzygnąć.'
    }</p>`
  }

  return reguly
    .map(
      (r) => `<section class="regula regula--${rodzaj}">
        <header class="regula__naglowek">
          <span class="waga waga--${h(r.waga ?? 'brak')}">${h(WAGA_PL[r.waga] ?? 'bez wagi')}</span>
          <h3><code>${h(r.id)}</code></h3>
          <span class="licznik">${r.wystapienia} ${r.wystapienia === 1 ? 'wystąpienie' : 'wystąpień'}</span>
        </header>
        <p class="regula__opis">${h(r.opis)}</p>
        ${r.szerzej && r.szerzej !== r.opis ? `<p class="regula__szerzej">${h(r.szerzej)}</p>` : ''}
        <p class="regula__gdzie">${[...r.gdzie.entries()].map(([g, n]) => `${h(g)} (${n}×)`).join(' · ')}</p>
        <div class="dowody">${r.dowody.map(kartaDowodu).join('')}</div>
        <p class="regula__link"><a href="${h(r.url)}" target="_blank" rel="noopener">Opis reguły w dokumentacji axe</a></p>
      </section>`
    )
    .join('')
}

/* ------------------------------------------------------------------ */
/* Dokument                                                            */
/* ------------------------------------------------------------------ */

export function htmlReport({
  wyniki,
  ostrzezenia,
  punktyReczne,
  bazowy,
  stempel,
  swiadomiePominiete = [],
}) {
  const [dzien, godzina] = stempel.split('_')
  const podstrony = [...new Set(wyniki.map((w) => w.sciezka))]
  const naruszenia = zbierzReguly(wyniki, 'naruszenie')
  const niepewne = zbierzReguly(wyniki, 'niepewne')

  const sumaNaruszen = naruszenia.reduce((a, r) => a + r.wystapienia, 0)
  const wpisyKonsoli = wyniki.reduce((a, w) => a + w.konsola.length, 0)
  const nieudane = wyniki.reduce((a, w) => a + w.nieudaneZadania.length, 0)
  const bledyPomiaru = wyniki.filter((w) => w.blad)

  const najgorszy = (kategoria) => {
    const oceny = wyniki.map((w) => w.lighthouse?.[kategoria]).filter((v) => typeof v === 'number')
    return oceny.length ? Math.min(...oceny) : null
  }

  /* --- wiersze tabeli, osobno per tryb --- */
  const wiersze = (tryb) =>
    wyniki
      .filter((w) => w.tryb === tryb)
      .map((w) => {
        const lh = w.lighthouse ?? {}
        const m = w.metryki ?? {}
        const nazwaPliku =
          (w.sciezka === '/' ? 'strona-glowna' : w.sciezka.replace(/^\/|\/$/g, '').replace(/\//g, '-')) +
          `-${w.tryb}.html`
        return `<tr>
          <th scope="row"><code>${h(w.sciezka)}</code></th>
          ${KATEGORIE.map(([k]) => `<td><span class="wynik wynik--${klasaWyniku(lh[k])}">${pct(lh[k])}</span></td>`).join('')}
          <td class="metryka ${klasaMetryki('lcp', m.lcp)}">${ms(m.lcp)}</td>
          <td class="metryka ${klasaMetryki('cls', m.cls)}">${liczba(m.cls)}</td>
          <td class="metryka ${klasaMetryki('tbt', m.tbt)}">${ms(m.tbt)}</td>
          <td><a class="link-raportu" href="${h(nazwaPliku)}" target="_blank" rel="noopener">pełny raport</a></td>
        </tr>`
      })
      .join('')

  const obszary = [...new Set(punktyReczne.map((p) => p.obszar))]

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audyt ${h(dzien)} - ${h(bazowy)}</title>
<style>
:root {
  color-scheme: dark light;
  --tlo: #0d1117; --tlo-2: #151b23; --panel: #1b222c; --kresa: #2b3440;
  --tekst: #e6edf3; --tekst-2: #9aa7b4; --tekst-3: #6e7b8a;
  --ok: #3fb950; --uwaga: #d29922; --zle: #f85149; --akcent: #58a6ff;
  --r: 10px;
}
@media (prefers-color-scheme: light) {
  :root {
    --tlo: #ffffff; --tlo-2: #f6f8fa; --panel: #ffffff; --kresa: #d8dee4;
    --tekst: #1f2328; --tekst-2: #59636e; --tekst-3: #818b98;
    --ok: #1a7f37; --uwaga: #9a6700; --zle: #cf222e; --akcent: #0969da;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--tlo); color: var(--tekst);
  font: 15px/1.6 ui-sans-serif, system-ui, "Segoe UI", sans-serif;
}
code, pre { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-size: .88em; }
a { color: var(--akcent); }
.wrap { max-width: 1180px; margin-inline: auto; padding-inline: 20px; }

header.glowny { border-bottom: 1px solid var(--kresa); background: var(--tlo-2); padding-block: 28px 0; }
header.glowny h1 { margin: 0 0 4px; font-size: 1.5rem; letter-spacing: -.01em; }
header.glowny .meta { color: var(--tekst-2); margin: 0 0 20px; font-size: .9rem; }
header.glowny .meta code { color: var(--tekst); }

.plytki { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 22px; }
.plytka { background: var(--panel); border: 1px solid var(--kresa); border-radius: var(--r); padding: 14px 16px; }
.plytka dt { color: var(--tekst-2); font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 6px; }
.plytka dd { margin: 0; font-size: 1.6rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.plytka dd small { display: block; font-size: .78rem; font-weight: 400; color: var(--tekst-2); margin-top: 2px; }

nav.zakladki { display: flex; gap: 2px; overflow-x: auto; }
nav.zakladki button {
  appearance: none; background: none; border: 0; border-bottom: 2px solid transparent;
  color: var(--tekst-2); font: inherit; font-weight: 600; padding: 10px 14px; cursor: pointer; white-space: nowrap;
}
nav.zakladki button[aria-selected="true"] { color: var(--tekst); border-bottom-color: var(--akcent); }
nav.zakladki button:focus-visible { outline: 2px solid var(--akcent); outline-offset: -2px; }

main { padding-block: 26px 60px; }
section.panel[hidden] { display: none; }
h2 { font-size: 1.15rem; margin: 0 0 6px; }
.podtytul { color: var(--tekst-2); margin: 0 0 18px; font-size: .92rem; max-width: 70ch; }

.przelacznik { display: inline-flex; border: 1px solid var(--kresa); border-radius: 999px; padding: 3px; margin-bottom: 16px; background: var(--tlo-2); }
.przelacznik button { appearance: none; background: none; border: 0; color: var(--tekst-2); font: inherit; font-weight: 600; padding: 6px 16px; border-radius: 999px; cursor: pointer; }
.przelacznik button[aria-pressed="true"] { background: var(--panel); color: var(--tekst); box-shadow: 0 1px 3px rgba(0,0,0,.3); }

table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--kresa); border-radius: var(--r); overflow: hidden; }
th, td { padding: 10px 12px; text-align: center; border-bottom: 1px solid var(--kresa); }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
thead th { background: var(--tlo-2); color: var(--tekst-2); font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; }
th[scope="row"] { text-align: left; font-weight: 500; }
.wynik { display: inline-grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; font-weight: 700; font-variant-numeric: tabular-nums; border: 2px solid; }
.wynik--ok { color: var(--ok); border-color: var(--ok); }
.wynik--uwaga { color: var(--uwaga); border-color: var(--uwaga); }
.wynik--zle { color: var(--zle); border-color: var(--zle); }
.wynik--brak { color: var(--tekst-3); border-color: var(--kresa); }
.metryka { font-variant-numeric: tabular-nums; }
.metryka.ok { color: var(--ok); } .metryka.uwaga { color: var(--uwaga); } .metryka.zle { color: var(--zle); }
.link-raportu { font-size: .85rem; }

.uwaga-box { border: 1px solid var(--kresa); border-left: 3px solid var(--uwaga); background: var(--tlo-2); border-radius: var(--r); padding: 12px 16px; margin: 18px 0; color: var(--tekst-2); font-size: .9rem; }
.uwaga-box strong { color: var(--tekst); }

.regula { background: var(--panel); border: 1px solid var(--kresa); border-radius: var(--r); padding: 18px; margin-bottom: 16px; }
.regula--naruszenie { border-left: 3px solid var(--zle); }
.regula--niepewne { border-left: 3px solid var(--uwaga); }
.regula__naglowek { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.regula__naglowek h3 { margin: 0; font-size: 1rem; }
.waga { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: 3px 8px; border-radius: 999px; border: 1px solid; }
.waga--critical, .waga--serious { color: var(--zle); border-color: var(--zle); }
.waga--moderate { color: var(--uwaga); border-color: var(--uwaga); }
.waga--minor, .waga--brak { color: var(--tekst-2); border-color: var(--kresa); }
/* W sekcji „do rozstrzygnięcia" waga jest informacją o regule, nie werdyktem
   o tej stronie - czerwona plakietka sugerowałaby znaleziony błąd. */
.regula--niepewne .waga { color: var(--tekst-2); border-color: var(--kresa); }
.licznik { margin-left: auto; color: var(--tekst-2); font-size: .85rem; }
.regula__opis { margin: 0 0 4px; }
.regula__szerzej, .regula__gdzie { color: var(--tekst-2); font-size: .88rem; margin: 0 0 10px; }
.regula__link { margin: 12px 0 0; font-size: .85rem; }

.dowody { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; margin-top: 12px; }
.dowod { background: var(--tlo-2); border: 1px solid var(--kresa); border-radius: var(--r); overflow: hidden; }
.zrzut { display: grid; place-items: center; height: 190px; background: #05070b; border-bottom: 1px solid var(--kresa); }
.zrzut img { display: block; max-width: 100%; max-height: 190px; width: auto; height: auto; object-fit: contain; }
.dowod__opis { padding: 12px 14px; }
.sciezka { margin: 0 0 6px; font-size: .85rem; color: var(--tekst-2); }
.tryb { border: 1px solid var(--kresa); border-radius: 999px; padding: 1px 7px; font-size: .75rem; margin-left: 4px; }
.selektor { display: block; color: var(--tekst); word-break: break-all; margin-bottom: 8px; }
.brak-zrzutu { margin: 0; padding: 18px 14px; color: var(--tekst-3); font-size: .85rem; }
.dane { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 0 0 8px; font-size: .85rem; }
.dane > div { display: contents; }
.dane dt { color: var(--tekst-2); }
.dane dd { margin: 0; font-variant-numeric: tabular-nums; }
.dane dd.ok { color: var(--ok); font-weight: 700; }
.dane dd.zle { color: var(--zle); font-weight: 700; }
.do-oka { margin: 0 0 8px; font-size: .85rem; color: var(--tekst-2); background: var(--tlo); border: 1px solid var(--kresa); border-left: 2px solid var(--uwaga); border-radius: 6px; padding: 8px 10px; }
.do-oka strong { color: var(--tekst); }
.probka { display: inline-block; width: 11px; height: 11px; border-radius: 3px; border: 1px solid var(--kresa); margin-right: 6px; vertical-align: -1px; }
details summary { cursor: pointer; color: var(--tekst-2); font-size: .85rem; }
pre { white-space: pre-wrap; word-break: break-all; background: var(--tlo); border: 1px solid var(--kresa); border-radius: 6px; padding: 8px; margin: 8px 0 0; }

.pusto { background: var(--panel); border: 1px solid var(--kresa); border-left: 3px solid var(--ok); border-radius: var(--r); padding: 16px 18px; color: var(--tekst-2); margin: 0; }
ul.lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
ul.lista li { background: var(--panel); border: 1px solid var(--kresa); border-radius: var(--r); padding: 12px 16px; }
.reczne h3 { margin: 22px 0 10px; font-size: .82rem; text-transform: uppercase; letter-spacing: .06em; color: var(--tekst-2); }
.reczne label { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: start; }
.reczne input { margin-top: 5px; width: 16px; height: 16px; accent-color: var(--akcent); }
.reczne b { display: block; }
.reczne span { color: var(--tekst-2); font-size: .9rem; }
footer.stopka { border-top: 1px solid var(--kresa); color: var(--tekst-3); font-size: .85rem; padding-block: 18px 40px; }
</style>
</head>
<body>

<header class="glowny">
  <div class="wrap">
    <h1>Audyt automatyczny</h1>
    <p class="meta">${h(dzien)} ${h(godzina.replace('-', ':'))} · <code>${h(bazowy)}</code> · ${podstrony.length} ${podstrony.length === 1 ? 'podstrona' : 'podstron'} × 2 tryby</p>

    <dl class="plytki">
      <div class="plytka"><dt>Naruszenia axe</dt><dd class="${sumaNaruszen ? 'zle' : 'ok'}" style="color:var(--${sumaNaruszen ? 'zle' : 'ok'})">${sumaNaruszen}<small>WCAG 2.1 AA</small></dd></div>
      <div class="plytka"><dt>Do rozstrzygnięcia</dt><dd style="color:var(--${niepewne.length ? 'uwaga' : 'ok'})">${niepewne.length}<small>reguł niepewnych</small></dd></div>
      <div class="plytka"><dt>Konsola</dt><dd style="color:var(--${wpisyKonsoli ? 'zle' : 'ok'})">${wpisyKonsoli}<small>błędów i ostrzeżeń</small></dd></div>
      <div class="plytka"><dt>Nieudane żądania</dt><dd style="color:var(--${nieudane ? 'zle' : 'ok'})">${nieudane}<small>w zakładce sieci</small></dd></div>
      <div class="plytka"><dt>Najniższa wydajność</dt><dd style="color:var(--${klasaWyniku(najgorszy('performance'))})">${pct(najgorszy('performance'))}<small>z wszystkich pomiarów</small></dd></div>
    </dl>

    <nav class="zakladki" role="tablist" aria-label="Sekcje raportu">
      <button role="tab" aria-selected="true" aria-controls="p-lh" id="t-lh">Lighthouse</button>
      <button role="tab" aria-selected="false" aria-controls="p-a11y" id="t-a11y">Dostępność${sumaNaruszen ? ` (${sumaNaruszen})` : ''}</button>
      <button role="tab" aria-selected="false" aria-controls="p-konsola" id="t-konsola">Konsola i żądania</button>
      <button role="tab" aria-selected="false" aria-controls="p-reczne" id="t-reczne">Do przejścia ręcznie</button>
      <button role="tab" aria-selected="false" aria-controls="p-kompletnosc" id="t-kompletnosc">Kompletność</button>
    </nav>
  </div>
</header>

<main class="wrap">

  <section class="panel" id="p-lh" role="tabpanel" aria-labelledby="t-lh">
    <h2>Wyniki Lighthouse</h2>
    <p class="podtytul">Kliknij „pełny raport", żeby otworzyć oryginalny dokument Lighthouse dla tego pomiaru.</p>

    <div class="przelacznik" role="group" aria-label="Tryb pomiaru">
      <button type="button" data-tryb="mobile" aria-pressed="true">Telefon</button>
      <button type="button" data-tryb="desktop" aria-pressed="false">Komputer</button>
    </div>

    ${['mobile', 'desktop']
      .map(
        (tryb) => `<table data-tabela="${tryb}"${tryb === 'desktop' ? ' hidden' : ''}>
      <caption class="poza-ekranem"></caption>
      <thead><tr>
        <th scope="col" style="text-align:left">Podstrona</th>
        ${KATEGORIE.map(([, etykieta]) => `<th scope="col">${etykieta}</th>`).join('')}
        <th scope="col">LCP</th><th scope="col">CLS</th><th scope="col">TBT</th><th scope="col"></th>
      </tr></thead>
      <tbody>${wiersze(tryb)}</tbody>
    </table>`
      )
      .join('')}

    <div class="uwaga-box">
      <strong>* Wynik dostępności z Lighthouse to liczba do wglądu, nie wynik audytu dostępności.</strong>
      Narzędzie uruchamia podzbiór reguł - setka nie znaczy, że strona jest dostępna.
      Właściwa warstwa automatyczna jest w zakładce „Dostępność".
    </div>

    ${
      bledyPomiaru.length
        ? `<div class="uwaga-box"><strong>Pomiary, które się nie udały:</strong><br>${bledyPomiaru
            .map((w) => `${h(w.sciezka)} · ${h(w.tryb)}: ${h(w.blad)}`)
            .join('<br>')}</div>`
        : ''
    }
  </section>

  <section class="panel" id="p-a11y" role="tabpanel" aria-labelledby="t-a11y" hidden>
    <h2>Naruszenia (WCAG 2.1 AA)</h2>
    <p class="podtytul">Pogrupowane po REGULE, nie po podstronie: to samo naruszenie na dwunastu podstronach to jedna pozycja do naprawienia, nie dwanaście. Czerwona obwódka na zrzucie pokazuje element, który zawiódł.</p>
    ${sekcjaRegul(naruszenia, 'naruszenie')}

    <h2 style="margin-top:34px">Do rozstrzygnięcia przez człowieka</h2>
    <p class="podtytul">To <strong>nie jest</strong> „przeszło". Tutaj siedzą przypadki, których automat nie rozstrzygnął - najczęściej kontrast tekstu na zdjęciu, gradiencie albo półprzezroczystym tle. Przeczytaj, nie pomijaj.</p>
    <div class="uwaga-box">
      <strong>Duża liczba wystąpień przy <code>color-contrast</code> jest tu normalna i nie znaczy, że coś jest zepsute.</strong>
      Jeśli strona ma gradient na tle albo półprzezroczysty nagłówek, axe nie potrafi ustalić koloru tła
      dla ŻADNEGO tekstu i zgłasza wszystkie naraz. Nie przeglądaj ich po kolei - policz kontrast raz,
      dla każdej pary token-tekstu i token-tła z systemu wizualnego, i zapisz wynik w tabeli w <code>tokens.css</code>.
      Zrzuty poniżej pokazują, o które miejsca chodzi.
    </div>
    ${sekcjaRegul(niepewne, 'niepewne')}
  </section>

  <section class="panel" id="p-konsola" role="tabpanel" aria-labelledby="t-konsola" hidden>
    <h2>Konsola i żądania</h2>
    <p class="podtytul">Checklista wymaga czystej konsoli i zera nieudanych żądań na każdej podstronie.</p>
    ${
      wpisyKonsoli || nieudane
        ? `<ul class="lista">${wyniki
            .flatMap((w) => [
              ...w.konsola.map(
                (k) => `<li><strong>${h(w.sciezka)} · ${h(w.tryb)}</strong><br><code>${h(k.typ)}</code> ${h(k.tekst)}</li>`
              ),
              ...w.nieudaneZadania.map(
                (z) => `<li><strong>${h(w.sciezka)} · ${h(w.tryb)}</strong><br>${h(z.url)} - ${h(z.powod)}</li>`
              ),
            ])
            .join('')}</ul>`
        : '<p class="pusto">Konsola czysta, wszystkie żądania powiodły się.</p>'
    }
  </section>

  <section class="panel reczne" id="p-reczne" role="tabpanel" aria-labelledby="t-reczne" hidden>
    <h2>Do przejścia ręcznie</h2>
    <p class="podtytul">Lista stała, wypisywana przy każdym audycie niezależnie od wyników. Punkt, który nie dotyczy tego projektu, odhacza się z adnotacją NIE DOTYCZY - nie znika z listy. Zaznaczenia nie są nigdzie zapisywane.</p>
    ${obszary
      .map(
        (obszar) => `<h3>${h(obszar)}</h3>
      <ul class="lista">${punktyReczne
        .filter((p) => p.obszar === obszar)
        .map(
          (p) => `<li><label><input type="checkbox"><span><b>${h(p.punkt)}</b>${h(p.co)}</span></label></li>`
        )
        .join('')}</ul>`
      )
      .join('')}
  </section>

  <section class="panel" id="p-kompletnosc" role="tabpanel" aria-labelledby="t-kompletnosc" hidden>
    <h2>Kompletność listy adresów</h2>
    <p class="podtytul">Lista adresów to suma mapy strony i listy podstron, które build faktycznie wyprodukował. Rozbieżność między tymi źródłami jest sama w sobie sygnałem.</p>
    ${
      swiadomiePominiete.length
        ? `<div class="uwaga-box"><strong>Świadomie poza mapą strony</strong> (<code>pozaMapaStrony</code> w site.ts): ${swiadomiePominiete
            .map(h)
            .join(', ')}. Audyt sprawdził je mimo to.</div>`
        : ''
    }
    ${
      ostrzezenia.length
        ? `<ul class="lista">${ostrzezenia.map((o) => `<li>${h(o)}</li>`).join('')}</ul>`
        : '<p class="pusto">Mapa strony i lista podstron builda zgadzają się, wszystkie adresy osiągalne.</p>'
    }
  </section>

</main>

<footer class="stopka wrap">
  Wersja do wklejenia modelowi: <code>RAPORT.md</code> obok tego pliku.
  Ten raport jest materiałem wejściowym do audytu przedwdrożeniowego, nie jego wynikiem - werdykt per punkt stawia człowiek.
</footer>

<script>
  const zakladki = [...document.querySelectorAll('[role="tab"]')]
  zakladki.forEach((t) => {
    t.addEventListener('click', () => {
      zakladki.forEach((inny) => {
        const wybrany = inny === t
        inny.setAttribute('aria-selected', String(wybrany))
        document.getElementById(inny.getAttribute('aria-controls')).hidden = !wybrany
      })
    })
  })

  document.querySelectorAll('[data-tryb]').forEach((przycisk) => {
    przycisk.addEventListener('click', () => {
      const tryb = przycisk.dataset.tryb
      document.querySelectorAll('[data-tryb]').forEach((p) => p.setAttribute('aria-pressed', String(p === przycisk)))
      document.querySelectorAll('[data-tabela]').forEach((t) => { t.hidden = t.dataset.tabela !== tryb })
    })
  })
</script>
</body>
</html>`
}
