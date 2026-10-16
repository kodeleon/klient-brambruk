/**
 * DANE STRUKTURALNE FIRMY - węzeł `LocalBusiness` (schema.org) składany WYŁĄCZNIE
 * z `src/content/firma.json`.
 *
 * Wyszukiwarka wymaga, żeby znaczniki opisywały to, co widać na stronie.
 * Dlatego dwa pola mają w JSON-ie wersję widoczną i maszynową
 * (`godziny` / `godzinyOtwarcia`, `adres` / `adresPocztowy`) i rozjazd
 * między nimi PRZERYWA build - cichy rozjazd to dane, które kłamią.
 *
 * Czego tu świadomie nie ma:
 *   · `AggregateRating` i `Review` - oceny z Fixly to opinie z cudzego serwisu,
 *     a samoopisowe oceny nie kwalifikują się do wyników rozszerzonych;
 *   · `priceRange` - brak potwierdzonej wartości;
 *   · `geo` - Google geokoduje adres sam, a współrzędne wpisane ręcznie to kolejne
 *     dane do rozjazdu (już raz wpisano złą długość). Zasięg opisuje `GeoCircle`.
 */

import { site, adres } from '../config/site'
import firma from '../content/firma.json'
import dowody from '../content/dowody.json'

type DzienTygodnia = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

/** Kształt `firma.json` z polami, których może jeszcze nie być. */
interface DaneFirmy {
  nazwa: string
  nazwaPelna: string
  opisSerwisu: string
  rokZalozenia: number
  adres: string
  nip: string
  telefonHref: string
  email: string
  godziny: string[]
  godzinyOtwarcia: { dni: DzienTygodnia[]; od: string; do: string }[]
  adresPocztowy: { ulica: string; miejscowosc: string; kodPocztowy: string; wojewodztwo: string }
  srodekZasiegu: { szerokosc: number; dlugosc: number }
  facebookUrl: string
  instagramUrl: string
  tiktokUrl: string
  mapyUrl: string
}

// `dni` w JSON-ie to `string[]`; wartości z listy pilnuje schemat kolekcji `firma` (enum).
const f = firma as DaneFirmy

export const ID_FIRMY = `${site.origin}/#firma`

const SKROTY_DNI: Record<DzienTygodnia, string> = {
  Monday: 'Pon',
  Tuesday: 'Wt',
  Wednesday: 'Śr',
  Thursday: 'Czw',
  Friday: 'Pt',
  Sunday: 'Niedz',
  Saturday: 'Sob',
}
const KOLEJNOSC: DzienTygodnia[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** „07:00" -> „7:00" - tak zapisane są godziny widoczne na stronie. */
const bezZera = (g: string) => g.replace(/^0/, '')

/** Tekst widoczny odtworzony z wersji maszynowej, np. „Pon–Pt: 7:00–18:00". */
function tekstGodzin(w: DaneFirmy['godzinyOtwarcia'][number]): string {
  const idx = w.dni.map((d) => KOLEJNOSC.indexOf(d)).sort((a, b) => a - b)
  const ciagly = idx.every((n, i) => i === 0 || n === idx[i - 1] + 1)
  const dni =
    idx.length === 1
      ? SKROTY_DNI[KOLEJNOSC[idx[0]]]
      : ciagly
        ? `${SKROTY_DNI[KOLEJNOSC[idx[0]]]}–${SKROTY_DNI[KOLEJNOSC[idx[idx.length - 1]]]}`
        : idx.map((n) => SKROTY_DNI[KOLEJNOSC[n]]).join(', ')
  return `${dni}: ${bezZera(w.od)}–${bezZera(w.do)}`
}

function sprawdzZgodnosc() {
  const oczekiwane = f.godzinyOtwarcia.map(tekstGodzin)
  if (JSON.stringify(oczekiwane) !== JSON.stringify(f.godziny)) {
    throw new Error(
      `firma.json: \`godzinyOtwarcia\` nie zgadza się z \`godziny\` (tekst widoczny na stronie).\n` +
        `  z godzinyOtwarcia: ${JSON.stringify(oczekiwane)}\n` +
        `  z godziny:         ${JSON.stringify(f.godziny)}`,
    )
  }
  const { ulica, kodPocztowy } = f.adresPocztowy
  if (!f.adres.includes(ulica) || !f.adres.includes(kodPocztowy)) {
    throw new Error(
      `firma.json: \`adresPocztowy\` (${ulica}, ${kodPocztowy}) nie zgadza się z \`adres\` ("${f.adres}").`,
    )
  }
}

/**
 * Promień zasięgu w metrach z tekstu widocznego na stronie ("100 km").
 * Jedno źródło: `dowody.statystyki.zasieg`. Inny format przerywa build,
 * zamiast po cichu wypisać zły promień.
 */
function promienM(): number {
  const tekst = dowody.statystyki.zasieg
  const m = /^(\d+)\s*km$/.exec(tekst.trim())
  if (!m) {
    throw new Error(`dowody.json: \`statystyki.zasieg\` ("${tekst}") nie ma formatu "<liczba> km" - nie da się wyliczyć promienia GeoCircle.`)
  }
  return Number(m[1]) * 1000
}

/** Węzeł firmy do `@graph`. Jedno źródło - wszystkie podstrony dostają ten sam. */
export function wezelFirmy() {
  sprawdzZgodnosc()

  const sameAs = [f.facebookUrl, f.instagramUrl, f.tiktokUrl].filter(Boolean)

  return {
    '@type': 'GeneralContractor',
    '@id': ID_FIRMY,
    name: f.nazwa,
    legalName: f.nazwaPelna,
    description: f.opisSerwisu,
    url: `${site.origin}/`,
    telephone: f.telefonHref,
    email: f.email,
    image: adres('/assets/img/og-image-40x21-1200.jpg'),
    logo: adres('/assets/logo/znak-144.png'),
    foundingDate: String(f.rokZalozenia),
    taxID: f.nip,
    address: {
      '@type': 'PostalAddress',
      streetAddress: f.adresPocztowy.ulica,
      addressLocality: f.adresPocztowy.miejscowosc,
      postalCode: f.adresPocztowy.kodPocztowy,
      addressRegion: f.adresPocztowy.wojewodztwo,
      addressCountry: 'PL',
    },
    openingHoursSpecification: f.godzinyOtwarcia.map((w) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: w.dni,
      opens: w.od,
      closes: w.do,
    })),
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: f.srodekZasiegu.szerokosc,
        longitude: f.srodekZasiegu.dlugosc,
      },
      geoRadius: promienM(),
    },
    ...(f.mapyUrl && { hasMap: f.mapyUrl }),
    ...(sameAs.length > 0 && { sameAs }),
  }
}
