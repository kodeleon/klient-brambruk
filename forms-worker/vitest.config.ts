import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// Testy działają w runtime Workers (workerd), z konfiguracją z wrangler.jsonc.
// DECYZJA: package.json "overrides" podmienia miniflare/wrangler w pool-workers
// 0.22.0 na te same wersje co `wrangler dev` - wersja przypięta w pool-workers
// ma workerd, który nie obsługuje compatibility_date 2026-09-14. Do usunięcia,
// gdy wyjdzie nowsze @cloudflare/vitest-pool-workers.
// Wysyłka do Resend jest w testach zawsze mockowana (vi.spyOn(globalThis, 'fetch')).
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        // Pool czyta też .dev.vars, jeśli istnieje. Testy nie polegają na żadnym z tych
        // źródeł: zmienne istotne dla danego testu podają jawnie (test/helpers.ts `call`).
        bindings: {
          RESEND_API_KEY: 're_test_key',
          ALLOWED_ORIGINS: 'https://brambruk.pl,https://www.brambruk.pl',
          MAIL_DRY_RUN: 'false',
        },
      },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
    // Linie logu workera zaśmiecają wynik testów (treść logu sprawdza test/log.test.ts).
    onConsoleLog: (log) => !log.startsWith('{"requestId"'),
  },
})
