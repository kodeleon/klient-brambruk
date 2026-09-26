// Jedyny plik zależny od projektu (poza layoutem maila i wrangler.jsonc).
// Przy kopiowaniu workera do innego projektu zaczynasz tutaj.
//
// Same dane, zero logiki. Reguły walidacji wynikają z typu pola (src/validate.ts),
// wygląd maila z src/email/layout.ts, kolejność w mailu z `mail.sections`.
// Źródło pól i etykiet: reference/form-config-*.json (eksport starej wtyczki WP).

// ---------------------------------------------------------------------------
// Typy
// ---------------------------------------------------------------------------

/** Typy pól. Tylko te, których używają formularze poniżej. */
export type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'multiselect' | 'file'

/** Klucz opcji (wysyłany przez front jako `value`) -> etykieta w mailu. */
export type Options = Record<string, string>

/** Typy obrazów rozpoznawane po sygnaturze bajtowej (src/files.ts). */
export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp'

interface BaseField {
  /** Etykieta w mailu. */
  label: string
  required?: boolean
}

export interface TextField extends BaseField {
  type: 'text' | 'email' | 'tel' | 'textarea'
  /** Maksymalna liczba znaków po normalizacji (trim, \r\n -> \n). */
  maxLength: number
}

export interface SelectField extends BaseField {
  type: 'select'
  options: Options
}

/** Select, którego dozwolone opcje zależą od wartości innego pola. */
export interface DependentSelectField extends BaseField {
  type: 'select'
  dependsOn: {
    field: string
    /** Wartość pola nadrzędnego -> opcje dozwolone przy tej wartości. */
    options: Record<string, Options>
  }
}

export interface MultiSelectField extends BaseField {
  type: 'multiselect'
  options: Options
}

export interface FileField extends BaseField {
  type: 'file'
  maxFiles: number
  /** Twardy limit na plik, w bajtach. */
  maxFileSize: number
  accept: readonly ImageMime[]
  /** Nazwa załącznika bez numeru i rozszerzenia: `zdjecie` -> `zdjecie-1.jpg`. */
  attachmentName: string
  /** Odmiana do opisu w mailu: 1 zdjęcie, 2 zdjęcia, 5 zdjęć. */
  countWords: readonly [one: string, few: string, many: string]
}

export type FieldDef = TextField | SelectField | DependentSelectField | MultiSelectField | FileField

export interface MailSection {
  title: string
  /** Klucze pól w kolejności wyświetlania. */
  fields: readonly string[]
  /** Drobny dopisek pod sekcją. */
  note?: string
}

export interface FormDef {
  /** Nazwa formularza w stopce maila. */
  name: string
  /** Temat maila. `{pole}` = wartość pola (dla select: etykieta). */
  subject: string
  /** Odrzuca linki (http://, https://, www.) w polach textarea. */
  blockLinks: boolean
  fields: Record<string, FieldDef>
  mail: {
    /** Pasek górny i nagłówek maila. */
    heading: string
    /** Dokończenie zdania "Na stronie {serwis} ..." pod nagłówkiem. */
    intro: string
    sections: readonly MailSection[]
  }
}

// ---------------------------------------------------------------------------
// Wspólne pola
// ---------------------------------------------------------------------------

// DECYZJA: etykiety pól wzięte ze starego szablonu maila `admin` (to, co firma
// widzi od roku), a nie z etykiet pól formularza w JSON-ie (np. "E-mail"
// zamiast "Email", "Typ usługi" zamiast "Usługa").

const name: TextField = { type: 'text', label: 'Imię', required: true, maxLength: 100 }
const email: TextField = { type: 'email', label: 'E-mail', required: true, maxLength: 200 }
// W JSON-ie formularza kontaktowego limit 12 - za mało na "+48 123 456 789".
const phone: TextField = { type: 'tel', label: 'Telefon', maxLength: 20 }

const senderSection: MailSection = { title: 'Dane nadawcy', fields: ['name', 'email', 'phone'] }

// ---------------------------------------------------------------------------
// Formularze. Klucz obiektu = slug w adresie: POST /forms/{slug}
// ---------------------------------------------------------------------------

export const FORMS: Record<string, FormDef> = {
  contact: {
    name: 'Formularz kontaktowy',
    subject: 'Nowe zapytanie od {name}',
    blockLinks: true,
    fields: {
      name,
      email,
      phone,
      message: { type: 'textarea', label: 'Wiadomość', required: true, maxLength: 2000 },
    },
    mail: {
      heading: 'Nowe zapytanie kontaktowe',
      intro: 'zostało przesłane zapytanie przez formularz kontaktowy.',
      sections: [senderSection, { title: 'Treść wiadomości', fields: ['message'] }],
    },
  },

  quote: {
    name: 'Formularz wyceny',
    subject: 'Nowe zapytanie o wycenę - {serviceType}',
    blockLinks: true,
    fields: {
      serviceType: {
        type: 'select',
        label: 'Typ usługi',
        required: true,
        options: {
          ogrodzenia: 'Ogrodzenie / brama',
          brukarstwo: 'Kostka brukowa',
          budownictwo: 'Budownictwo lekkie',
        },
      },
      subtype: {
        type: 'select',
        label: 'Rodzaj',
        dependsOn: {
          field: 'serviceType',
          options: {
            ogrodzenia: {
              panelowe: 'Panelowe 2D/3D',
              murowane: 'Murowane / podmurówki',
              'brama-przesuwna': 'Brama przesuwna',
              'brama-dwuskrzydlowa': 'Brama dwuskrzydłowa',
              furtka: 'Furtka',
              siatka: 'Siatka ogrodzeniowa',
              'inne-ogrodzenia': 'Inne / nie wiem',
            },
            brukarstwo: {
              podjazd: 'Podjazd',
              chodnik: 'Chodnik / alejka',
              taras: 'Taras',
              parking: 'Parking',
              schody: 'Schody terenowe',
              'inne-brukarstwo': 'Inne / nie wiem',
            },
            budownictwo: {
              altana: 'Altana ogrodowa',
              garaz: 'Garaż',
              domek: 'Domek narzędziowy',
              wiata: 'Wiata',
              'inne-budownictwo': 'Inne',
            },
          },
        },
      },
      amount: { type: 'text', label: 'Wymiary', maxLength: 50 },
      location: { type: 'text', label: 'Lokalizacja', maxLength: 200 },
      terrain: {
        type: 'multiselect',
        label: 'Teren',
        options: {
          flat: 'Teren płaski',
          uneven: 'Lekkie nierówności',
          slope: 'Spadek / pochyłość',
          access: 'Utrudniony dojazd',
          'old-fence': 'Stare ogrodzenie do rozbiórki',
          leveling: 'Wyrównanie terenu',
          rocky: 'Kamienisty / twardy grunt',
          wet: 'Podmokły / wysoki poziom wód',
          roots: 'Korzenie drzew / pnie',
          narrow: 'Wąski dojazd maszyn',
          neighbor: 'Granica z sąsiadem',
        },
      },
      timeline: {
        type: 'select',
        label: 'Termin',
        options: {
          asap: 'Jak najszybciej',
          month: 'W ciągu miesiąca',
          quarter: 'W ciągu 3 miesięcy',
          later: 'Później / do ustalenia',
        },
      },
      budget: {
        type: 'select',
        label: 'Budżet',
        options: {
          up_to_5k: 'do 5 000 zł',
          '5k_15k': '5 000 – 15 000 zł',
          '15k_30k': '15 000 – 30 000 zł',
          over_30k: 'powyżej 30 000 zł',
          unknown: 'Nie wiem jeszcze',
        },
      },
      description: { type: 'textarea', label: 'Opis projektu', maxLength: 5000 },
      photos: {
        type: 'file',
        label: 'Zdjęcia',
        maxFiles: 2,
        // Front kompresuje zdjęcia do ~0,3-0,6 MB. 4 MiB to ścieżka awaryjna
        // i ochrona przed botami. Razem z tekstem mieści się w limicie żądania 10 MiB.
        maxFileSize: 4 * 1024 * 1024,
        accept: ['image/jpeg', 'image/png', 'image/webp'],
        attachmentName: 'zdjecie',
        countWords: ['zdjęcie', 'zdjęcia', 'zdjęć'],
      },
      name,
      email,
      phone,
    },
    mail: {
      heading: 'Nowe zapytanie o wycenę',
      intro: 'zostało przesłane zapytanie o wycenę.',
      sections: [
        senderSection,
        {
          title: 'Szczegóły projektu',
          fields: ['serviceType', 'subtype', 'amount', 'location', 'terrain', 'timeline', 'budget', 'photos'],
          note: 'Puste pola oznaczają, że nadawca nie podał tych informacji. Zdjęcia dołączone jako załączniki.',
        },
        { title: 'Opis projektu', fields: ['description'] },
      ],
    },
  },
}

/** Twardy limit całego żądania (sprawdzany przed parsowaniem). */
export const MAX_REQUEST_BYTES = 10 * 1024 * 1024
