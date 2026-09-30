# Do sprawdzenia przez Marka - formularze: CPU workera i limity zdjęć

Plan: `PLAN-formularze-cpu-i-bledy.md`. Plik roboczy modelu:
`TODO-formularze-cpu-i-bledy.md`. Tutaj tylko to, czego model nie mógł
zrobić sam: pomiary na Cloudflare, próby na telefonie, decyzje do oceny.

Każdy etap to osobny commit (`git log --oneline --grep="^Etap"`), więc każdy
da się zmierzyć i obejrzeć oddzielnie.

---

## A. Część A (etapy 0-3) - na produkcję

### Jak zmierzyć konkretny etap

Worker pomiarowy `brambruk-forms-test` wdraża kod z bieżącego katalogu
roboczego. Żeby zmierzyć stan po danym etapie, przełącz się na jego commit,
wdróż i wróć (z katalogu `forms-worker/`, przy czystym `git status`):

```bash
git switch --detach <commit etapu>          # hash z: git log --oneline --grep="^Etap"
npx wrangler deploy --config wrangler.pomiar.jsonc
npm run dev:page                             # strona testowa z tego samego commitu
# ... seria wysyłek ...
git switch main
```

Sekrety workera pomiarowego zostają między kolejnymi `deploy`, więc
`secret put` robisz raz, przed pierwszym. Zależności się nie zmieniają -
`npm ci` między etapami niepotrzebne.

Pełna procedura: `forms-worker/README.md`, sekcja "Pomiar CPU".

### Punkt kontrolny 0 - pomiar bazowy (kod sprzed etapu 1)

- [ ] **Unikalność `namespace_id` 1901 i 1902** na koncie Cloudflare
      (`wrangler.pomiar.jsonc`). Wspólny numer z innym workerem = wspólny
      licznik rate limitu. Numery produkcji to 1001/1002.
- [ ] **Profil lokalny "przed"** na commicie etapu 0: w `forms-worker/`
      `npm run dev`, klawisz `d` -> DevTools -> Performance -> nagrywanie ->
      wysyłka wyceny z 2 zdjęciami ze strony testowej (`npm run dev:page`)
      -> stop -> zapis do `forms-worker/dev/out/przed.cpuprofile`.
- [ ] (opcjonalnie, rekomendowane) **seria bazowa** na workerze pomiarowym,
      commit etapu 0, warianty (a) i (b) z README po 5 wysyłek. Odczyt:
      Observability workera `brambruk-forms-test` -> CPU time. Bez tej serii
      efekt etapu 1 będzie widać tylko w proporcjach profilu.

Pierwsze wdrożenie workera pomiarowego (z `forms-worker/`):

```bash
npx wrangler secret put RESEND_API_KEY --config wrangler.pomiar.jsonc   # wartość zastępcza, np. re_pomiar
npx wrangler secret put MAIL_TO --config wrangler.pomiar.jsonc          # np. pomiar@example.invalid
npx wrangler deploy --config wrangler.pomiar.jsonc
```
