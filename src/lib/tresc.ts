/**
 * ODCZYT TREŚCI - jedyna droga z kolekcji do szablonu.
 *
 * Kolekcja daje rekord po walidacji schematem; ten moduł dokłada jedną rzecz:
 * rozwija znaczniki w CAŁYM rekordzie naraz, zanim zobaczy go szablon.
 * Rozwijanie pole po polu w szablonie oznaczałoby, że pierwsze pole dołożone
 * bez rozwinięcia wyświetli klamry wprost na stronie - i nikt tego nie
 * zauważy do czasu, aż zobaczy to klient.
 */

import { getCollection, getEntry, type CollectionEntry, type CollectionKey } from 'astro:content'

import { rozwinGleboko } from './znaczniki'

/** Jeden rekord treści, ze znacznikami już rozwiniętymi. */
export async function wpis<K extends CollectionKey>(
  kolekcja: K,
  id: string
): Promise<CollectionEntry<K>['data']> {
  const rekord = (await getEntry(kolekcja, id as never)) as CollectionEntry<K> | undefined
  if (!rekord) {
    throw new Error(
      `Brak rekordu treści "${id}" w kolekcji "${kolekcja}" (src/content/${kolekcja}).`
    )
  }
  return rozwinGleboko(rekord.data, `${kolekcja}/${id}`)
}

/** Cała kolekcja, w kolejności z pliku, ze znacznikami rozwiniętymi. */
export async function wszystkie<K extends CollectionKey>(
  kolekcja: K
): Promise<CollectionEntry<K>['data'][]> {
  const rekordy = (await getCollection(kolekcja)) as CollectionEntry<K>[]
  return rekordy.map((rekord) => rozwinGleboko(rekord.data, `${kolekcja}/${rekord.id}`))
}
