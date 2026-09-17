---
tytul: Przykładowy artykuł - wzór do podmiany
opis: Wzór wpisu kolekcji artykułów. Pokazuje komplet pól schematu i format daty. Skasuj go przed wydaniem albo podmień na prawdziwy artykuł.
data: 2026-01-01
autor: Kodeleon
szkic: true
---

To jest **wzór wpisu**, nie treść projektu. Ma `szkic: true`, więc nie trafia
do builda ani do mapy strony - istnieje po to, żeby kolekcja `artykuly` miała
plik i żeby było z czego kopiować schemat.

Pola obowiązkowe to `tytul`, `opis` i `data`. Artykuł bez któregokolwiek z nich
przerywa budowanie z nazwą pliku - to celowe, bo brakujący opis wychodzi
dopiero po wdrożeniu, jako pusty wynik w wyszukiwarce.

## Nagłówek drugiego poziomu

Hierarchia nagłówków w artykule zaczyna się od `##`. `<h1>` jest już zajęty
przez tytuł wpisu, a dwa `<h1>` na podstronie to błąd struktury dokumentu.

- listy działają,
- odnośniki działają,
- `kod w linii` też.

Włączenie modułu: instrukcja jest w `src/content.config.ts`.
