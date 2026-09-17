/**
 * KOLEKCJE TREŚCI.
 *
 * `artykuly` to moduł opcjonalny - zakres pakietu Premium (3 artykuły pod SEO,
 * statyczne, bez systemu zarządzania treścią).
 *
 * WŁĄCZENIE MODUŁU:
 *   1. `moduly.artykuly = true` w src/config/site.ts,
 *   2. zmień nazwę katalogu `src/pages/_artykuly/` na `src/pages/artykuly/`
 *      (Astro pomija w routingu wszystko, co zaczyna się od podkreślenia),
 *   3. dopisz pozycję „Artykuły" do `nawigacja` w src/config/dane.ts,
 *   4. wrzuć pliki `.md` do `src/content/artykuly/`.
 *
 * Podstrony trafią do mapy strony i do audytu same - lista bierze się
 * z wyniku builda, nie z osobnego pliku.
 *
 * SCHEMAT JEST WALIDOWANY. Artykuł bez `tytul`, `opis` albo `data` przerywa
 * budowanie z nazwą pliku. To celowe: brakujący opis to duplikat meta
 * description albo pusty wynik w wyszukiwarce, a jedno i drugie wychodzi
 * dopiero po wdrożeniu.
 */

import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const artykuly = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/artykuly' }),
  schema: z.object({
    /** Trafia do <h1> i <title>. Unikalny w skali serwisu. */
    tytul: z.string().min(1),
    /** Trafia do meta description i og:description. 120-160 znaków. */
    opis: z.string().min(1),
    /** Data publikacji. Widoczna przy artykule i w danych strukturalnych. */
    data: z.coerce.date(),
    /** Autor. Pusty = artykuł firmowy bez podpisu. */
    autor: z.string().optional(),
    /** Klucz `uses` obrazu podglądu linku dla tego artykułu. */
    ogImage: z.string().optional(),
    /** Szkic nie trafia do builda. */
    szkic: z.boolean().default(false),
  }),
})

/**
 * Kolekcja jest rejestrowana ZAWSZE, także przy wyłączonym module.
 *
 * Rejestracja warunkowa wydaje się czystsza (brak pustej kolekcji w logu), ale
 * psuje `npm run check`: bez rejestracji `getCollection('artykuly')` w uśpionych
 * podstronach `_artykuly/` traci typ i sypie dwudziestoma błędami. Baza, która
 * nie przechodzi własnej kontroli typów, uczy pomijać jej wynik - a to jest
 * gorsze niż jedna kolekcja więcej w rejestrze.
 *
 * Ostrzeżenie „No files found matching..." nie pojawia się, bo katalog kolekcji
 * ma przykładowy artykuł (`szkic: true`, więc nie trafia do builda).
 */
export const collections = { artykuly }
