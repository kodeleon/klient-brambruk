import { describe, expect, it } from 'vitest'
import { FORMS, type FileField } from '../src/forms.ts'
import { detectImageType } from '../src/files.ts'
import type { ParsedFile, ParsedInput } from '../src/parse.ts'
import { containsLink } from '../src/spam.ts'
import { validate } from '../src/validate.ts'
import { CONTACT_FIELDS, QUOTE_FIELDS } from './helpers.ts'

const contact = FORMS.contact!
const quote = FORMS.quote!
const MiB = 1024 * 1024

function input(values: Record<string, string | string[]>, files: Record<string, ParsedFile[]> = {}): ParsedInput {
  return { values, files, honeypot: '' }
}

function file(kind: 'jpeg' | 'png' | 'webp' | 'text' | 'gif', size = 1000): ParsedFile {
  const head: Record<typeof kind, number[]> = {
    jpeg: [0xff, 0xd8, 0xff, 0xe1],
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    webp: [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50],
    text: [...new TextEncoder().encode('Hello, world')],
    gif: [...new TextEncoder().encode('GIF89a')],
  }
  const bytes = new Uint8Array(Math.min(size, 64))
  bytes.set(head[kind])
  return { size, bytes }
}

const errorsOf = (form = quote, values: Record<string, string | string[]>, files: Record<string, ParsedFile[]> = {}) => {
  const result = validate(form, input(values, files))
  return result.ok ? {} : result.fields
}

const validContact = { ...CONTACT_FIELDS, message: 'Proszę o kontakt.' }
const validQuote = { ...QUOTE_FIELDS }

describe('poprawne zgłoszenia', () => {
  it('pełne zgłoszenie wyceny i kontaktu przechodzą', () => {
    expect(validate(quote, input(validQuote)).ok).toBe(true)
    expect(validate(contact, input(validContact)).ok).toBe(true)
  })

  it('minimalna wycena: tylko pola wymagane', () => {
    expect(errorsOf(quote, { serviceType: 'brukarstwo', name: 'Jan', email: 'jan@example.com' })).toEqual({})
  })

  it('dane po walidacji zawierają tylko pola niepuste', () => {
    const result = validate(quote, input({ serviceType: 'budownictwo', name: 'Jan', email: 'j@x.pl' }))
    expect(result.ok && Object.keys(result.data.values)).toEqual(['serviceType', 'name', 'email'])
  })
})

describe('text', () => {
  it('required', () => expect(errorsOf(contact, { ...validContact, name: '' }).name).toBe('required'))
  it('too_long (101 znaków przy limicie 100)', () =>
    expect(errorsOf(contact, { ...validContact, name: 'a'.repeat(101) }).name).toBe('too_long'))
  it('dokładnie na limicie przechodzi', () =>
    expect(errorsOf(contact, { ...validContact, name: 'a'.repeat(100) })).toEqual({}))
  it('opcjonalne pole tekstowe może być puste', () =>
    expect(errorsOf(quote, { ...validQuote, amount: '', location: '' })).toEqual({}))
})

describe('email', () => {
  it('required', () => expect(errorsOf(contact, { ...validContact, email: '' }).email).toBe('required'))
  it('too_long', () =>
    expect(errorsOf(contact, { ...validContact, email: `${'a'.repeat(195)}@x.pl.pl` }).email).toBe('too_long'))
  it.each(['jan', 'jan@wp', '@wp.pl', 'jan@.pl', 'Jan jan@wp.pl', 'jan@wp.pl extra'])('invalid_format: %j', (email) =>
    expect(errorsOf(contact, { ...validContact, email }).email).toBe('invalid_format'),
  )
  it.each(['jan@wp.pl', 'j.kowalski+wycena@firma.com.pl', 'ANNA@O2.PL', 'ó@ż.pl'])('luźna walidacja przepuszcza %j', (email) =>
    expect(errorsOf(contact, { ...validContact, email })).toEqual({}),
  )
})

describe('tel', () => {
  it.each(['+48 123 456 789', '123456789', '(83) 343-11-22', '+48-600-700-800'])('przechodzi: %j', (phone) =>
    expect(errorsOf(contact, { ...validContact, phone })).toEqual({}),
  )
  it('pusty telefon jest dozwolony', () => expect(errorsOf(contact, { ...validContact, phone: '' })).toEqual({}))
  it.each(['abc', '12', '123 456 789 wew. 12', '600700800!'])('invalid_phone: %j', (phone) =>
    expect(errorsOf(contact, { ...validContact, phone }).phone).toBe('invalid_phone'),
  )
  it('too_long (21 znaków)', () =>
    expect(errorsOf(contact, { ...validContact, phone: '+48 123 456 789 00 00' }).phone).toBe('too_long'))
})

describe('textarea', () => {
  it('required (contact.message)', () =>
    expect(errorsOf(contact, { ...validContact, message: '' }).message).toBe('required'))
  it('too_long (2001 przy limicie 2000)', () =>
    expect(errorsOf(contact, { ...validContact, message: 'a'.repeat(2001) }).message).toBe('too_long'))
  it('opcjonalna textarea (quote.description) może być pusta', () =>
    expect(errorsOf(quote, { ...validQuote, description: '' })).toEqual({}))
  it.each([
    'Zobacz http://spam.example',
    'Zobacz https://spam.example',
    'Zobacz HTTPS://SPAM.EXAMPLE',
    'Zobacz www.spam.example',
    'Zobacz WWW.Spam.Example',
  ])('links_blocked: %j', (message) => {
    expect(errorsOf(contact, { ...validContact, message }).message).toBe('links_blocked')
    expect(errorsOf(quote, { ...validQuote, description: message }).description).toBe('links_blocked')
  })
  it('bez linku przechodzi (np. adres e-mail, "http" bez "://")', () => {
    expect(containsLink('Piszę z jan@wp.pl, http to protokół, strona brambruk.pl')).toBe(false)
  })
  it('linki blokowane tylko w textarea - nie w polach tekstowych', () =>
    expect(errorsOf(quote, { ...validQuote, location: 'www.mapa.example' })).toEqual({}))
})

describe('select', () => {
  it('required', () => expect(errorsOf(quote, { ...validQuote, serviceType: '' }).serviceType).toBe('required'))
  it.each(['xyz', 'Ogrodzenia', 'constructor', '__proto__', 'toString'])('invalid_option: %j', (serviceType) =>
    expect(errorsOf(quote, { ...validQuote, serviceType, subtype: '' }).serviceType).toBe('invalid_option'),
  )
  it('opcjonalny select może być pusty', () =>
    expect(errorsOf(quote, { ...validQuote, timeline: '', budget: '' })).toEqual({}))
  it('tablica w polu select -> invalid_option', () =>
    expect(errorsOf(quote, { ...validQuote, budget: ['unknown', 'over_30k'] }).budget).toBe('invalid_option'))
})

describe('select zależny (subtype od serviceType)', () => {
  it('subtype z właściwej grupy przechodzi', () => {
    expect(errorsOf(quote, { ...validQuote, serviceType: 'brukarstwo', subtype: 'podjazd' })).toEqual({})
    expect(errorsOf(quote, { ...validQuote, serviceType: 'budownictwo', subtype: 'inne-budownictwo' })).toEqual({})
  })
  it('subtype spoza grupy -> invalid_option', () => {
    expect(errorsOf(quote, { ...validQuote, serviceType: 'ogrodzenia', subtype: 'podjazd' }).subtype).toBe(
      'invalid_option',
    )
    expect(errorsOf(quote, { ...validQuote, serviceType: 'brukarstwo', subtype: 'inne-ogrodzenia' }).subtype).toBe(
      'invalid_option',
    )
  })
  it('subtype bez serviceType -> oba błędy', () =>
    expect(errorsOf(quote, { ...validQuote, serviceType: '', subtype: 'panelowe' })).toEqual({
      serviceType: 'required',
      subtype: 'invalid_option',
    }))
  it('subtype pusty przy dowolnym serviceType przechodzi', () =>
    expect(errorsOf(quote, { ...validQuote, subtype: '' })).toEqual({}))
})

describe('multiselect', () => {
  it('wszystkie 11 kluczy terenu przechodzi', () => {
    const terrain = Object.keys((quote.fields.terrain as { options: object }).options)
    expect(terrain).toHaveLength(11)
    expect(errorsOf(quote, { ...validQuote, terrain })).toEqual({})
  })
  it('jeden nieznany klucz -> invalid_option', () =>
    expect(errorsOf(quote, { ...validQuote, terrain: ['flat', 'lava'] }).terrain).toBe('invalid_option'))
  it('pusty multiselect przechodzi', () => expect(errorsOf(quote, { ...validQuote, terrain: [] })).toEqual({}))
})

describe('pliki', () => {
  const photos = quote.fields.photos as FileField

  it('JPEG, PNG i WebP przechodzą, nazwy generowane z sygnatury', () => {
    const result = validate(quote, input(validQuote, { photos: [file('png'), file('webp')] }))
    expect(result.ok && result.data.files.photos!.map((a) => [a.filename, a.mime])).toEqual([
      ['zdjecie-1.png', 'image/png'],
      ['zdjecie-2.webp', 'image/webp'],
    ])
  })

  it('too_many_files (3 przy limicie 2)', () =>
    expect(errorsOf(quote, validQuote, { photos: [file('jpeg'), file('jpeg'), file('jpeg')] }).photos).toBe(
      'too_many_files',
    ))

  it('file_too_large (1 MiB + 1 B przy limicie 1 MiB)', () => {
    expect(photos.maxFileSize).toBe(MiB)
    expect(errorsOf(quote, validQuote, { photos: [file('jpeg', MiB + 1)] }).photos).toBe('file_too_large')
  })

  it('dokładnie 1 MiB przechodzi', () => expect(errorsOf(quote, validQuote, { photos: [file('jpeg', MiB)] })).toEqual({}))

  it.each(['text', 'gif'] as const)('invalid_file_type: %s', (kind) =>
    expect(errorsOf(quote, validQuote, { photos: [file('jpeg'), file(kind)] }).photos).toBe('invalid_file_type'),
  )

  it('RIFF bez WEBP (np. WAV) odrzucony', () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])
    expect(detectImageType(wav)).toBeUndefined()
  })
})

describe('wszystkie błędy naraz', () => {
  it('zwraca każde błędne pole, nie tylko pierwsze', () => {
    const fields = errorsOf(
      quote,
      {
        serviceType: 'xyz',
        subtype: 'panelowe',
        amount: 'a'.repeat(51),
        terrain: ['lava'],
        description: 'www.spam.example',
        name: '',
        email: 'nie-email',
        phone: 'abc',
      },
      { photos: [file('text')] },
    )
    expect(fields).toEqual({
      serviceType: 'invalid_option',
      subtype: 'invalid_option',
      amount: 'too_long',
      terrain: 'invalid_option',
      description: 'links_blocked',
      photos: 'invalid_file_type',
      name: 'required',
      email: 'invalid_format',
      phone: 'invalid_phone',
    })
  })
})
