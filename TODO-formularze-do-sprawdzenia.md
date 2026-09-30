# Do sprawdzenia przez Marka - formularze: CPU workera i limity zdjęć

Plan: `PLAN-formularze-cpu-i-bledy.md`. Plik roboczy modelu:
`TODO-formularze-cpu-i-bledy.md`. Tutaj tylko to, czego model nie mógł
zrobić sam: pomiary na Cloudflare, próby na telefonie, decyzje do oceny.

Każdy etap to osobny commit (`git log --oneline --grep="^Etap"`), więc każdy
da się zmierzyć i obejrzeć oddzielnie.

---

## A. Część A (etapy 0-3) - na produkcję

### Jak zmierzyć konkretny etap

Pełna procedura: `forms-worker/README.md`, sekcja "Pomiar CPU".

Pierwsze wdrożenie workera pomiarowego (z `forms-worker/`), raz:

```bash
npx wrangler secret put RESEND_API_KEY --config wrangler.pomiar.jsonc   # wartość zastępcza, np. re_pomiar
npx wrangler secret put MAIL_TO --config wrangler.pomiar.jsonc          # np. pomiar@example.invalid
npx wrangler deploy --config wrangler.pomiar.jsonc
```

Worker pomiarowy `brambruk-forms-test` wdraża kod z bieżącego katalogu
roboczego. Żeby zmierzyć stan po danym etapie, przełącz się na jego commit,
wdróż i wróć (z katalogu `forms-worker/`, przy czystym `git status`):

```bash
git switch --detach <commit etapu>          # hash z: git log --oneline --grep="^Etap"
npx wrangler deploy --config wrangler.pomiar.jsonc
npm run dev:page                             # strona testowa z tego samego commitu
# ... seria wysyłek, odczyt CPU time w Observability ...
git switch main
```

Sekrety workera pomiarowego zostają między kolejnymi `deploy`. Zależności
się nie zmieniają - `npm ci` między etapami niepotrzebne. Po ostatniej
serii: `npx wrangler delete --config wrangler.pomiar.jsonc`.

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

### Punkt kontrolny 1 - body do Resend bez `JSON.stringify` na base64

Zmiana: `buildBody` w `forms-worker/src/resend.ts`. Body jest bajt w bajt
takie samo jak wcześniej (test porównuje stringi), więc mail się nie zmienia.

- [ ] **Profil lokalny "po"** na commicie etapu 1, ten sam scenariusz co
      "przed" (te same 2 zdjęcia) -> `forms-worker/dev/out/po-etapie-1.cpuprofile`.
      Porównaj udział `JSON.stringify` i kodowania body z profilem "przed".
- [ ] **Seria na workerze pomiarowym**, commit etapu 1, warianty (a) i (b).
      Wynik decyduje tylko o dalszych cięciach (mocniejsza kompresja, mniejszy
      bok). Wariant (b) z limitem 4 MiB może nadal nie mieścić się w 10 ms -
      to naprawia etap 3.
- Ryzyko z planu: V8 ma szybką ścieżkę `JSON.stringify` dla stringów
  jednobajtowych (base64 taki jest), więc zysk może być mniejszy niż w
  diagnozie. Zmiana i tak jest tania i bez wpływu na treść maila.
