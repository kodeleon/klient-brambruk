/**
 * KOLEKCJE TREŚCI - schemat i walidacja przy budowaniu.
 *
 * ┌── DLACZEGO KOLEKCJE, A NIE ZWYKŁY IMPORT JSON-A ───────────────────┐
 * │ Treść pisze ostatecznie klient (przez narzędzie korekty), a my ją   │
 * │ tylko przepuszczamy. Zwykły import przyjmie każdy kształt i zepsuje │
 * │ się dopiero na stronie - najczęściej na produkcji i najczęściej     │
 * │ cicho: brak pola to `undefined`, a `undefined` renderuje się jako   │
 * │ nic. Schemat zod wywala BUILD, z nazwą pola i pliku.                │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Pola techniczne (`foto`, `href`, `ikona`, `klucz`) siedzą W TYM SAMYM
 * rekordzie co treść, świadomie. Rozbicie jednej rzeczy na dwa pliki, które
 * muszą się zgadzać po identyfikatorze, jest głównym kosztem, jaki policzyliśmy
 * w bazie (DO-BAZY J.2/J.3). Ochrona przed klientem jest tu zbędna, bo klient
 * nie zapisuje do repozytorium - bramką jest Kodeleon.
 *
 * DWIE DROGI ODCZYTU, obie z tego samego pliku:
 *   · treść redakcyjna (huby, usługi, podstrony) idzie przez `src/lib/tresc.ts`,
 *     bo wymaga ROZWINIĘCIA ZNACZNIKÓW przed wyświetleniem,
 *   · dane firmy, dowody i nawigacja są importowane wprost
 *     (`import firma from '../content/firma.json'`), bo to one są ŹRÓDŁEM
 *     znaczników - i dzięki temu czyta je też skrypt przeglądarki, który
 *     o kolekcjach Astro nie wie nic.
 * Schemat obowiązuje tak samo w obu przypadkach: kolekcje są walidowane przy
 * budowaniu niezależnie od tego, kto po nie sięga.
 *
 * ⚠️ Plik rośnie razem z warstwą treści: kolekcje dochodzą w grupach 2-4
 * planu rozdziału techniki od treści.
 */

import { defineCollection, z } from 'astro:content'
import { file, glob } from 'astro/loaders'

import { KLUCZE_TRAS } from './config/routes'
import { ZNACZNIKI_STATYCZNE, klucze } from './lib/znaczniki'

/* ------------------------------------------------------------------ */
/* Wspólne kawałki schematu                                            */
/* ------------------------------------------------------------------ */

/**
 * Tekst, który trafia do indeksu wyszukiwarki.
 *
 * Przepuszcza wyłącznie znaczniki z białej listy. Wartość liczona przy
 * budowaniu - liczba lat, liczba realizacji - zmieniłaby opis po nowym roku
 * bez niczyjej decyzji, a razem z nim sygnał, na którym podstrona była
 * indeksowana.
 */
export const tekstIndeksowany = z.string().min(1).superRefine((wartosc, ctx) => {
  for (const klucz of klucze(wartosc)) {
    if (ZNACZNIKI_STATYCZNE.has(klucz)) continue
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        `znacznik {${klucz}} nie może stać w polu indeksowanym. ` +
        `Dopuszczone są wyłącznie wartości niezmienne: ${[...ZNACZNIKI_STATYCZNE].join(', ')}.`,
    })
  }
})

/** Tytuł i opis dla wyszukiwarki. Oba wymagane, oba unikalne w skali serwisu. */
export const meta = z.object({
  tytul: tekstIndeksowany,
  opis: tekstIndeksowany,
})

/**
 * Pomocnik dla pliku, który jest JEDNYM rekordem, a nie listą.
 * `file()` oczekuje tablicy albo mapy `id → rekord`; tutaj mapa z jednym
 * kluczem, żeby plik treści mógł zostać płaskim obiektem.
 */
export function jedenRekord(id: string) {
  return { parser: (tekst: string) => ({ [id]: JSON.parse(tekst) }) }
}

/** Klucz trasy z `src/config/routes.ts`. Literówka wywala build. */
const kluczTrasy = z.enum(KLUCZE_TRAS)

/** Pozycja nawigacji: etykieta jest treścią, ścieżka wynika z klucza. */
const pozycjaNawigacji = z.object({
  etykieta: z.string().min(1),
  trasa: kluczTrasy,
})

/* ------------------------------------------------------------------ */
/* Kolekcje                                                            */
/* ------------------------------------------------------------------ */

/**
 * DANE FIRMY - jedna prawda o adresie, kontakcie i rejestrze.
 *
 * `rokZalozenia` jest jedyną przechowywaną wartością związaną z czasem.
 * Liczba lat na rynku LICZY SIĘ z niej przy budowaniu - przechowywana „6"
 * była wartością, o której ktoś musiał pamiętać w Nowy Rok.
 */
const firma = defineCollection({
  loader: file('src/content/firma.json', jedenRekord('firma')),
  schema: z.object({
    nazwa: z.string().min(1),
    nazwaPelna: z.string().min(1),
    opis: z.string().min(1),
    opisSerwisu: z.string().min(1),
    region: z.string().min(1),
    rokZalozenia: z.number().int().gte(1900).lte(2100),
    adres: z.string().min(1),
    adresLinie: z.array(z.string().min(1)).min(1),
    nip: z.string().regex(/^\d{10}$/, 'NIP to dziesięć cyfr bez separatorów'),
    regon: z.string().regex(/^\d{9}(\d{5})?$/, 'REGON to dziewięć albo czternaście cyfr'),
    telefon: z.string().min(1),
    /** Forma dla `href="tel:"` - bez spacji. */
    telefonHref: z.string().regex(/^\+?\d+$/, 'telefonHref bez spacji i nawiasów'),
    email: z.string().email(),
    /** Wiersz na wpis: tydzień i sobota to dwie informacje, nie jedna. */
    godziny: z.array(z.string().min(1)).min(1),
    // Pusty łańcuch = odnośnik się nie renderuje. Nigdy nie zostawiamy "#".
    facebookUrl: z.string().url().or(z.literal('')),
    instagramUrl: z.string().url().or(z.literal('')),
    tiktokUrl: z.string().url().or(z.literal('')),
    mapyUrl: z.string().url().or(z.literal('')),
    administrator: z.string().min(1),
    emailRodo: z.string().email(),
  }),
})

/**
 * DOWODY - to, czym firma potwierdza, że umie: ocena, liczby, opinie.
 *
 * ⚠️ Bez `lata`. Liczba lat jest wyliczana z `rokZalozenia`, a wartość
 * przechowywana obok wyliczanej to dwa miejsca do rozjazdu.
 */
const dowody = defineCollection({
  loader: file('src/content/dowody.json', jedenRekord('dowody')),
  schema: z.object({
    fixly: z.object({
      ocena: z.string().min(1),
      opinie: z.number().int().nonnegative(),
      url: z.string().url(),
    }),
    statystyki: z.object({
      miejscowosci: z.number().int().positive(),
      realizacje: z.string().min(1),
      zasieg: z.string().min(1),
    }),
    opinie: z.array(
      z.object({
        imie: z.string().min(1),
        lokalizacja: z.string().min(1),
        data: z.string().min(1),
        tresc: z.string().min(1),
        ocena: z.number().int().gte(1).lte(5),
      })
    ),
  }),
})

/**
 * NAWIGACJA - same etykiety. Ścieżki przychodzą z `src/config/routes.ts`.
 *
 * Etykieta jest treścią („Usługi i cennik" kontra „Oferta"), ścieżka jest
 * techniką. Trzymanie obu w jednym polu było powodem, dla którego ten sam
 * adres stał wpisany w pięciu plikach.
 */
const nawigacja = defineCollection({
  loader: file('src/content/nawigacja.json', jedenRekord('nawigacja')),
  schema: z.object({
    glowna: z
      .array(pozycjaNawigacji.extend({ podmenu: z.array(pozycjaNawigacji).min(1).optional() }))
      .min(1),
    stopka: z
      .array(z.object({ tytul: z.string().min(1), pozycje: z.array(pozycjaNawigacji).min(1) }))
      .min(1),
  }),
})

/* ------------------------------------------------------------------ */
/* Wspólne kawałki treści redakcyjnej                                  */
/* ------------------------------------------------------------------ */

/** Klucz zdjęcia z manifestu mediów (`media/images.config.mjs`). */
const foto = z.string().min(1)

/** Kafelek galerii: zdjęcie, co na nim jest i gdzie zrobione. */
const galeria = z.array(
  z.object({ foto, tytul: z.string().min(1), lokalizacja: z.string().min(1) })
).min(1)

/** Pytanie i odpowiedź. Odpowiedzi bywają nośnikiem kwot - stąd znaczniki. */
const faq = z.array(
  z.object({ pytanie: z.string().min(1), odpowiedz: z.string().min(1) })
).min(1)

/**
 * Składnik ceny: materiał albo montaż. `max: null` znaczy „od tyle w górę"
 * i wtedy suma też nie ma górnego krańca.
 */
const skladnikCeny = z
  .object({
    min: z.number().positive(),
    max: z.number().positive().nullable(),
  })
  .strict()
  .refine((s) => s.max === null || s.max >= s.min, {
    message: 'górny kraniec widełek nie może być mniejszy od dolnego',
  })

/**
 * Pozycja cennika. DWIE POSTACI, wykluczające się:
 *   · materiał + montaż   - cena całkowita liczy się z nich w `src/lib/cennik.ts`,
 *   · wyliczenie        - `razem` innej pozycji razy mnożnik.
 *
 * ⚠️ POLA `razem` NIE MA I MIEĆ NIE BĘDZIE. Przechowywany komplet obok
 * składowych rozjechał się z nimi w KAŻDEJ z sześciu par, które były tu
 * przed przebudową - `.strict()` pilnuje, żeby nikt go nie dopisał z powrotem.
 */
const pozycjaCennika = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'identyfikator: małe litery, cyfry i dywizy'),
    usluga: z.string().min(1),
    jednostka: z.string().min(1),
    material: skladnikCeny.optional(),
    montaz: skladnikCeny.optional(),
    wyliczenie: z
      .object({ z: z.string().min(1), mnoznik: z.number().positive() })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((pozycja, ctx) => {
    const rozbicie = pozycja.material !== undefined || pozycja.montaz !== undefined
    if (pozycja.wyliczenie) {
      if (rozbicie) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            `pozycja "${pozycja.id}" ma i "wyliczenie", i rozbicie na materiał/montaż. ` +
            'Wyliczana pozycja bierze kwotę wyłącznie z pozycji źródłowej.',
        })
      }
      return
    }
    if (pozycja.material === undefined || pozycja.montaz === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `pozycja "${pozycja.id}" musi mieć ORAZ "material", ORAZ "montaz" ` +
          '(albo zamiast nich "wyliczenie"). Cena całkowita = materiał + montaż.',
      })
    }
  })

/* ------------------------------------------------------------------ */
/* Cennik                                                              */
/* ------------------------------------------------------------------ */

/**
 * CENNIK - jedno źródło wszystkich kwot w serwisie.
 *
 * [decyzja] REKORDEM JEST PODSTRONA, nie typ usług. Klucz to klucz trasy
 * z `src/config/routes.ts`, więc klient otwiera podstronę i widzi dokładnie
 * te pozycje, które ma przed sobą w formularzu korekty. Podział typ → rodzaj,
 * który tu był, nie odpowiadał żadnemu adresowi - nie było jak sprawdzić,
 * gdzie na stronie stoi cena, którą się właśnie zmienia.
 *
 * `przeglad` to LISTA IDENTYFIKATORÓW z innych stron, nigdy kwot: pozycja ma
 * wartości w dokładnie jednym miejscu, a strona wskazuje, co jeszcze pokazać
 * obok swoich własnych pozycji.
 */
const stronaCennika = z
  .object({
    etykieta: z.string().min(1),
    /** Nagłówek tabeli na hubie. Podstrona usługi buduje własny z nazwy usługi. */
    tytulPrzegladu: z.string().min(1).optional(),
    pozycje: z.array(pozycjaCennika).min(1),
    przeglad: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict()

const cennik = defineCollection({
  loader: file('src/content/cennik.json', jedenRekord('cennik')),
  schema: z
    .object({
      wersja: z.literal(1),
      strony: z.record(z.string(), stronaCennika).superRefine((strony, ctx) => {
        for (const klucz of Object.keys(strony)) {
          if (KLUCZE_TRAS.includes(klucz as (typeof KLUCZE_TRAS)[number])) continue
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              `klucz strony "${klucz}" nie istnieje w src/config/routes.ts. ` +
              'Cennik dzieli się po podstronach - klucz musi być kluczem trasy.',
          })
        }
      }),
    })
    .strict(),
})

/* ------------------------------------------------------------------ */
/* Huby kategorii i podstrony rodzajów usług                           */
/* ------------------------------------------------------------------ */

/**
 * HUBY - treść trzech podstron kategorii.
 *
 * ⚠️ BEZ POLA `cennik`. Tabela cen bierze się z klucza trasy tej podstrony,
 * a nie ze wskazania w rekordzie - pole wskazujące znaczyło, że dwa pliki
 * muszą się zgadzać po identyfikatorze, którego nic nie pilnowało.
 *
 * ⚠️ Zasięg (lista województw) jest ROZPISANY W ZDANIU, osobno w każdym
 * z trzech plików. To nie jest niedopatrzenie: lista województw odmienia się
 * („województwa lubelskiego" kontra „lubelskie"), więc nie ma jednej wartości
 * do wstawienia znacznikiem. Klient pisze pełne zdanie i bierze na siebie
 * ewentualną niespójność. Lista MIAST jako samodzielna pozycja zostaje listą.
 */
const huby = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/huby' }),
  schema: z.object({
    meta,
    okruszek: z.string().min(1),
    etykieta: z.string().min(1),
    fotoHero: foto,
    fotoHeroObok: foto,
    tytulHero: z.string().min(1),
    podtytulHero: z.string().min(1),
    opisHero: z.string().min(1),
    tytulSekcji: z.string().min(1),
    uslugi: z
      .array(
        z.object({
          tytul: z.string().min(1),
          opis: z.string().min(1),
          foto,
          /** Brak trasy = rodzaj bez własnej podstrony; karta prowadzi do wyceny. */
          trasa: kluczTrasy.optional(),
        })
      )
      .min(1),
    tresc: z.object({
      zasieg: z.object({
        tytul: z.string().min(1),
        tekst: z.string().min(1),
        miasta: z.array(z.string().min(1)).min(1),
        domkniecie: z.string().min(1),
      }),
      metodyka: z.object({
        tytul: z.string().min(1),
        wstep: z.string().min(1),
        kroki: z.array(z.string().min(1)).min(1),
        tytulDodatkow: z.string().min(1),
        wstepDodatkow: z.string().min(1),
        dodatki: z.array(z.string().min(1)).min(1),
      }),
      sprzet: z.object({ tytul: z.string().min(1), tekst: z.string().min(1) }),
      fotoObok: foto,
      fotoObokAlt: z.string().min(1),
    }),
    cennikOpis: z.object({
      wstep: z.string().min(1),
      czynniki: z.array(z.string().min(1)).min(1),
    }),
    galeria,
    tytulGalerii: z.string().min(1),
    etykietaFaq: z.string().min(1),
    tytulFaq: z.string().min(1),
    faq,
  }),
})

/**
 * PODSTRONY RODZAJÓW USŁUG - dziewięć plików, jeden szablon.
 *
 * ⚠️ BEZ POLA `cennik`, tak samo jak huby: tabela cen idzie po kluczu trasy.
 */
const uslugi = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/uslugi' }),
  schema: z.object({
    meta,
    okruszek: z.string().min(1),
    okruszekNadrzedny: z.object({ etykieta: z.string().min(1), trasa: kluczTrasy }),
    etykieta: z.string().min(1),
    tytul: z.string().min(1),
    podtytul: z.string().min(1),
    nazwaPojedyncza: z.string().min(1),
    nazwaMnoga: z.string().min(1),
    fotoHero: foto,
    /**
     * Kadrowanie zdjęcia w sekcji głównej. Wartości muszą stać DOSŁOWNIE
     * w `SzablonUslugi.astro`, żeby Tailwind wygenerował klasę - stąd
     * zamknięta lista zamiast dowolnego łańcucha.
     */
    pozycjaFoto: z.enum(['0 40%', '0% 0%', '0% 75%']).optional(),
    wstep: z.string().min(1),
    cechy: z
      .array(z.object({ ikona: z.string().min(1), tytul: z.string().min(1), opis: z.string().min(1) }))
      .min(1),
    tresc: z.object({
      tytul1: z.string().min(1),
      tekst1: z.string().min(1),
      tytul2: z.string().min(1),
      tekst2: z.string().min(1),
      tytul3: z.string().min(1),
      tekst3: z.string().min(1),
    }),
    kroki: z.object({
      tytul: z.string().min(1),
      wstep: z.string().min(1),
      lista: z.array(z.string().min(1)).min(1),
    }),
    sprzet: z.string().min(1),
    cennikCzynniki: z.array(z.string().min(1)).min(1),
    galeria,
    faq,
  }),
})

/* ------------------------------------------------------------------ */
/* Pozostała treść                                                     */
/* ------------------------------------------------------------------ */

/** REALIZACJE - galeria z filtrem kategorii. */
const realizacje = defineCollection({
  loader: file('src/content/realizacje.json', jedenRekord('realizacje')),
  schema: z.object({
    kategorie: z.array(z.object({ klucz: z.string().min(1), etykieta: z.string().min(1) })).min(1),
    pozycje: z
      .array(
        z.object({
          kategoria: z.string().min(1),
          tytul: z.string().min(1),
          lokalizacja: z.string().min(1),
          foto,
        })
      )
      .min(1),
  }),
})

/**
 * KREATOR WYCENY - słowniki opcji.
 *
 * ⚠️ KLUCZE OPCJI (`asap`, `up_to_5k`, `panelowe`…) JADĄ W TREŚCI ZGŁOSZENIA
 * do Workera. Zmiana klucza to zmiana formatu danych po drugiej stronie -
 * etykietę wolno poprawiać, klucza nie.
 */
const wycena = defineCollection({
  loader: file('src/content/wycena.json', jedenRekord('wycena')),
  schema: z.object({
    typy: z
      .array(
        z.object({
          klucz: z.string().min(1),
          etykieta: z.string().min(1),
          opis: z.string().min(1),
          ikona: z.string().min(1),
          foto,
        })
      )
      .min(1),
    podtypy: z.record(z.array(z.object({ klucz: z.string().min(1), etykieta: z.string().min(1) })).min(1)),
    teren: z.array(z.object({ klucz: z.string().min(1), etykieta: z.string().min(1) })).min(1),
    termin: z.array(z.object({ klucz: z.string().min(1), etykieta: z.string().min(1) })).min(1),
    budzet: z.array(z.object({ klucz: z.string().min(1), etykieta: z.string().min(1) })).min(1),
  }),
})

/**
 * FORMULARZE - komunikaty kontaktu i kreatora wyceny.
 *
 * Czyta je wyłącznie skrypt przeglądarki (`src/scripts/formularz.ts`,
 * import wprost). ⚠️ Klamry to NIE są znaczniki serwisu: `{telefon}`,
 * `{email}`, `{maks}`, `{czas}`, `{kod}`, `{nazwa}`, `{liczba}` wstawia skrypt
 * w chwili pokazania komunikatu (telefon i e-mail jako klikalne odnośniki
 * z `firma.json`). Nie przepuszczaj tego pliku przez `wpis()` - `rozwin()`
 * zatrzymałby build na nieznanym znaczniku.
 *
 * Klucze w `bledyPol` i `bledyWysylki` to kody z odpowiedzi workera
 * (`forms-worker/INTEGRATION.md`, pkt 3) - brak komunikatu wywala build.
 */
const komunikat = z.string().min(1)
const formularze = defineCollection({
  loader: file('src/content/formularze.json', jedenRekord('formularze')),
  schema: z
    .object({
      bledyPol: z
        .object({
          required: komunikat,
          requiredWybor: komunikat,
          invalid_format: komunikat,
          invalid_phone: komunikat,
          too_long: komunikat,
          invalid_option: komunikat,
          invalid_optionZalezne: komunikat,
          too_many_files: komunikat,
          file_too_large: komunikat,
          invalid_file_type: komunikat,
          links_blocked: komunikat,
          invalid_number: komunikat,
          photo_failed: komunikat,
          photo_input_too_large: komunikat,
          photo_duplicate: komunikat,
        })
        .strict(),
      bledyWysylki: z
        .object({
          validation_failed: komunikat,
          rate_limited: komunikat,
          mail_failed: komunikat,
          siec: komunikat,
          payload_too_large: komunikat,
          odrzucone: komunikat,
          nieczynny: komunikat,
          kodZgloszenia: komunikat,
          minuta: komunikat,
          minuty: komunikat,
        })
        .strict(),
      podsumowanieBledow: z.object({ jedno: komunikat, wiele: komunikat }).strict(),
      etykietyPol: z.record(z.string(), komunikat),
      zdjecia: z
        .object({
          przetwarzanie: komunikat,
          usun: komunikat,
          pelno: komunikat,
          liczba: z.object({ one: komunikat, few: komunikat, many: komunikat }).strict(),
          brak: komunikat,
          /** Krótki powód na karcie zdjęcia, którego kompresja nie dodała (`src/scripts/zdjecia.ts`). */
          nieDodano: z.object({ photo_input_too_large: komunikat, photo_failed: komunikat }).strict(),
          /** Dopisek w podsumowaniu kreatora, np. „1 zdjęcie · 1 nie dodano". */
          nieDodaneLiczba: komunikat,
        })
        .strict(),
    })
    .strict(),
})

/**
 * PODSTRONY - treść stron, które nie mieszczą się w żadnym szablonie.
 *
 * Jedna kolekcja, jeden plik na podstronę. Schemat wymienia WSZYSTKIE pola,
 * jakie któraś z podstron może mieć, i jest `strict()`: literówka w nazwie
 * pola wywala build zamiast po cichu zniknąć ze strony. Wymagalność
 * konkretnego pola pilnuje szablon konkretnej podstrony - tylko on wie,
 * czego potrzebuje, a schemat dzielony przez osiem różnych podstron musiałby
 * albo zgadywać, albo się rozdwoić.
 *
 * ⚠️ NIE MA TU polityki prywatności ani strony ze źródłami. Obie są
 * [decyzja] poza warstwą treści: klient ich nie edytuje, a proza prawna
 * i lista licencji nie są materiałem do korekty. Pobierają z treści tylko
 * wartości, przez znaczniki.
 */
const tekst = z.string().min(1)
const akapity = z.array(tekst).min(1)

/** Sekcja główna. Pola różnią się między podstronami - stąd tyle opcjonalnych. */
const sekcjaHero = z
  .object({
    etykieta: tekst.optional(),
    etykiety: z.array(tekst).min(1).optional(),
    tytul: tekst,
    podtytul: tekst.optional(),
    opis: tekst,
    foto: foto.optional(),
    fotoObok: foto.optional(),
    fotoObokAlt: tekst.optional(),
    kolaz: z.array(foto).min(1).optional(),
    liczby: z.array(z.object({ wartosc: tekst, etykieta: tekst })).min(1).optional(),
    etykietaTypow: tekst.optional(),
    etykietaNawigacji: tekst.optional(),
  })
  .strict()

/** Baner wezwania do działania na końcu podstrony. */
const banerCta = z.object({ tytul: tekst, opis: tekst.optional() }).strict()

const strony = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/strony' }),
  schema: z
    .object({
      meta,
      hero: sekcjaHero.optional(),
      baner: banerCta.optional(),

      // --- /kontakt/, /cennik/, /404 ---
      etykieta: tekst.optional(),
      tytul: tekst.optional(),
      opis: akapity.optional(),
      tytulDanych: tekst.optional(),
      sukces: z
        .object({
          tytul: tekst,
          opis: tekst.optional(),
          opisPrzed: tekst.optional(),
          opisMocny: tekst.optional(),
          /** /wycena/: dopisek przed adresem e-mail, gdy kreator nie dodał któregoś zdjęcia. */
          zdjeciaPrzed: tekst.optional(),
          etykietaOsi: tekst.optional(),
          przycisk: tekst.optional(),
        })
        .strict()
        .optional(),
      przyciski: z
        .object({
          wycena: tekst.optional(),
          glowna: tekst.optional(),
          wstecz: tekst.optional(),
          dalej: tekst.optional(),
          wyslij: tekst.optional(),
        })
        .strict()
        .optional(),
      nawigacja: z.object({ etykieta: tekst, polityka: tekst }).strict().optional(),

      // --- / (strona główna) ---
      uslugi: z
        .object({
          etykieta: tekst,
          tytul: tekst,
          karty: z.array(z.object({ tytul: tekst, opis: tekst, foto, trasa: kluczTrasy })).min(1),
        })
        .strict()
        .optional(),
      realizacje: z.object({ etykieta: tekst, tytul: tekst, galeria }).strict().optional(),
      oFirmie: z.object({ etykieta: tekst, tytul: tekst, akapity, przycisk: tekst }).strict().optional(),
      opinie: z
        .object({ etykieta: tekst, tytul: tekst, podpisPrzed: tekst, podpisPo: tekst })
        .strict()
        .optional(),
      proces: z
        .object({
          etykieta: tekst,
          tytul: tekst,
          akapity,
          kroki: z.array(z.object({ numer: tekst, tytul: tekst, opis: tekst })).min(1),
        })
        .strict()
        .optional(),
      faq: faq.optional(),

      // --- /o-nas/ ---
      kimJestesmy: z
        .object({
          etykieta: tekst,
          tytul: tekst,
          akapity,
          liczby: z.array(z.object({ ikona: tekst, wartosc: tekst, etykieta: tekst })).min(1),
        })
        .strict()
        .optional(),
      dlaczegoMy: z
        .object({
          etykieta: tekst,
          tytul: tekst,
          opis: tekst,
          wartosci: z.array(z.object({ ikona: tekst, tytul: tekst, opis: tekst })).min(1),
        })
        .strict()
        .optional(),
      daneFirmy: z
        .object({
          etykieta: tekst,
          tytul: tekst,
          tytulRejestru: tekst,
          tytulMapy: tekst,
          rejestr: z.array(z.object({ etykieta: tekst, wartosc: tekst })).min(1),
          etykietaGodzin: tekst,
        })
        .strict()
        .optional(),
      obszar: z
        .object({
          etykieta: tekst,
          tytul: tekst,
          opis: tekst,
          foto,
          fotoAlt: tekst,
          tytulListy: tekst,
          miejscowosci: z.array(tekst).min(1),
          domkniecie: tekst,
        })
        .strict()
        .optional(),

      // --- /uslugi/ ---
      uwaga: z.object({ tytul: tekst, tekst: tekst, link: tekst }).strict().optional(),
      etykietaGrupy: tekst.optional(),
      przyciskGrupy: tekst.optional(),
      grupy: z
        .array(
          z
            .object({
              klucz: tekst,
              ikona: tekst,
              przycisk: tekst,
              etykieta: tekst,
              trasa: kluczTrasy,
              karty: z
                .array(
                  z
                    .object({
                      tytul: tekst,
                      /** Znacznik ceny albo tekst w rodzaju „wycena indywidualna". */
                      cena: tekst,
                      nota: tekst.optional(),
                      foto,
                      trasa: kluczTrasy,
                      opis: tekst,
                    })
                    .strict()
                )
                .min(1),
            })
            .strict()
        )
        .min(1)
        .optional(),

      // --- /realizacje/ ---
      filtr: z
        .object({
          tytul: tekst,
          etykietaGrupy: tekst,
          etykietaSzukania: tekst,
          placeholder: tekst,
          licznikPrzed: tekst,
          licznikMiedzy: tekst,
          licznikPo: tekst,
        })
        .strict()
        .optional(),
      pusto: z.object({ tekst: tekst, przycisk: tekst }).strict().optional(),

      // --- /wycena/ ---
      kroki: z.array(z.object({ klucz: tekst, etykieta: tekst, opis: tekst })).min(1).optional(),
      etapy: z.array(z.object({ tytul: tekst, opis: tekst })).min(1).optional(),
      zdjecia: z.object({ tytul: tekst, opis: tekst, przycisk: tekst }).strict().optional(),
      podsumowanie: z
        .object({
          tytul: tekst,
          wiersze: z
            .array(z.object({ pole: tekst, etykieta: tekst, krok: z.number().int().nonnegative() }))
            .min(1),
        })
        .strict()
        .optional(),
      rodo: z.object({ przed: tekst, link: tekst }).strict().optional(),
      licznikKrokow: z.object({ przed: tekst, miedzy: tekst }).strict().optional(),

      // --- /cennik/ (widok administracyjny) ---
      zrodloPrzed: tekst.optional(),
      zrodloStron: tekst.optional(),
      zrodloPo: tekst.optional(),
      zrodloWyliczanych: tekst.optional(),
      legenda: tekst.optional(),
      etykietaStrony: tekst.optional(),
      naglowkiTabeli: z
        .object({ pozycja: tekst, material: tekst, robocizna: tekst, razem: tekst, gdzie: tekst })
        .strict()
        .optional(),
      tytulPrzegladuPrzed: tekst.optional(),
      doklejonePrzed: tekst.optional(),
      stopkaPrzed: tekst.optional(),
    })
    .strict(),
})

export const collections = {
  firma,
  dowody,
  nawigacja,
  cennik,
  huby,
  uslugi,
  realizacje,
  wycena,
  formularze,
  strony,
}
