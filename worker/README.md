# Worker formularza

Osobne wdrożenie. Serwis statyczny nie ma kodu serwerowego, a wysyłka poczty
wymaga klucza API - klucz w bundlu przeglądarki jest kluczem publicznym.

## Uruchomienie

```bash
cd worker
npx wrangler secret put RESEND_API_KEY   # klucz z panelu Resend
npx wrangler deploy
```

Wrangler wypisze adres w postaci `https://<nazwa>.<konto>.workers.dev`.
Ten adres wpisujesz w `endpointy.formularz` w `src/config/site.ts`
i przełączasz `moduly.formularz` na `true`.

Bez tego wpisu przeglądarka zablokuje wysyłkę: adres Workera nie będzie
w `connect-src` polityki bezpieczeństwa.

## Konfiguracja

Zmienne w `wrangler.jsonc`:

| Zmienna | Znaczenie |
|---|---|
| `DOZWOLONY_ORIGIN` | adres serwisu; Worker odrzuca żądania z innych źródeł |
| `NADAWCA` | adres nadawcy na domenie zweryfikowanej w Resend |
| `ODBIORCA` | gdzie mają przychodzić zgłoszenia |
| `POTWIERDZENIE` | `tak` = automatyczne potwierdzenie do nadawcy (pakiet Premium) |

Sekret `RESEND_API_KEY` ustawiasz poleceniem `wrangler secret put`.
Nigdy w pliku konfiguracyjnym, nigdy w repozytorium.

## Konto Resend

Konto zakłada się NA KLIENTA, nie na Kodeleon - tak samo jak repozytorium,
hosting i domenę. Klient jest właścicielem infrastruktury od dnia startu.

## Sprawdzenie po wdrożeniu

Checklista przedwdrożeniowa wymaga testu na żywo, nie w kodzie:

1. wysyłka przechodzi, powiadomienie dochodzi na docelowy adres,
2. komunikat sukcesu się pokazuje,
3. komunikat błędu też - rozłącz sieć i spróbuj ponownie,
4. zgłoszenie testowe z innego urządzenia i innej sieci nie ląduje w spamie.
