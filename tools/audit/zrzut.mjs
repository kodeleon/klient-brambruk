#!/usr/bin/env node
/**
 * ON-DEMAND PAGE SNAPSHOTS - one page, several widths, no build.
 *
 *   node tools/audit/zrzut.mjs /ogrodzenia/ --szer=390,1440
 *   node tools/audit/zrzut.mjs / --szer=390 --selektor=".tlo-siatka:nth-of-type(3)"
 *
 * WHY THIS EXISTS NEXT TO `audit.mjs`. `shots.mjs` crops elements that axe
 * reported, off a finished audit run - it answers "what failed", not "how does
 * this section look now". Getting one picture out of it costs a full
 * `npm run build` plus `startPreview`. This tool skips both: it serves the
 * pages straight from source with Astro's dev server, so a layout change is
 * a few seconds away from a picture of itself.
 *
 * It is a LOOKING tool, not a checking one. Nothing here passes or fails,
 * nothing is compared to a baseline - `npm run audit` and `npm run zachowania`
 * keep doing that. Consequence: the dev server, not the hosting emulation.
 * Headers, the 404 page and trailing-slash handling are NOT what this tool
 * shows; for those use `npm run preview`.
 *
 * TWO THINGS THAT WOULD OTHERWISE PRODUCE A LYING PICTURE:
 *
 *   1. Reveal-on-scroll and lazy images. `src/scripts/ruch.ts` hides every
 *      `[data-odslon]` element and releases it when it enters the viewport,
 *      so a full-page screenshot - which never scrolls - would come out empty
 *      below the fold. We emulate `prefers-reduced-motion: reduce`; that path
 *      installs no observer and hides nothing, which is exactly the end state
 *      we want to photograph. It also kills transition timing as a source of
 *      flake. Images still need a scroll pass, because `loading="lazy"` is the
 *      browser's own decision and no media query turns it off.
 *
 *   2. The dev server runs IN THIS PROCESS (`dev()` from `astro`), never
 *      through `spawn` - antipattern #17 in the README. On Windows
 *      `spawn('npx', ..., { shell: true })` leaves the Node process alive
 *      behind a killed `cmd` and the command never returns.
 *
 * Output goes to `.build-state/zrzuty/` - build state, already gitignored,
 * same place the audit keeps its own leftovers.
 *
 * REQUIRES Chrome in the system, or CHROME_PATH pointing at one - same rule
 * as `audit.mjs` and `zachowania.mjs`. Nothing else; no build, no `dist/`.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = path.join(ROOT, '.build-state', 'zrzuty')

/** Padding around a `--selektor` crop, so the section has visible context. */
const PADDING = 24
/** Viewport height. Full-page capture ignores it; element crops do not. */
const VIEWPORT_HEIGHT = 900

const arg = (name, fallback = null) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

async function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  const { Launcher } = await import('chrome-launcher')
  const found = Launcher.getInstallations()
  if (!found.length) throw new Error('no Chrome found - point CHROME_PATH at one')
  return found[0]
}

/**
 * Walks the page top to bottom so `loading="lazy"` images decide to load,
 * then returns to the top. Returning matters: the sticky header is painted
 * wherever the page is scrolled to, and a header parked halfway down the
 * document lands in the middle of every element crop below it.
 */
async function loadLazyContent(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((done) => setTimeout(done, 60))
    }
    window.scrollTo(0, 0)
    await new Promise((done) => setTimeout(done, 120))
  })
  // Bounded on purpose: an image that stays out of view never loads at all,
  // and waiting for it would hang the run instead of producing a picture.
  await page.evaluate(async () => {
    const pending = [...document.images].filter((img) => !img.complete)
    await Promise.race([
      Promise.all(
        pending.map((img) => new Promise((done) => { img.onload = img.onerror = done }))
      ),
      new Promise((done) => setTimeout(done, 2000)),
    ])
  })
}

/** `/ogrodzenia/uslugi/` -> `ogrodzenia-uslugi`; `/` -> `strona-glowna`. */
const slug = (route) =>
  route === '/' ? 'strona-glowna' : route.replace(/^\/|\/$/g, '').replace(/\//g, '-')

async function main() {
  const route = (process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '/').replace(/\/?$/, '/')
  const widths = (arg('szer', '390,1440'))
    .split(',')
    .map((w) => Number(w.trim()))
    .filter((w) => Number.isFinite(w) && w > 0)
  const selector = arg('selektor')
  const name = arg('nazwa', slug(route))
  const port = Number(arg('port', '4330'))

  if (!widths.length) {
    console.error('\n✗ --szer needs at least one width, e.g. --szer=390,1440\n')
    process.exitCode = 1
    return
  }

  // The image pipeline integration resolves its paths off `process.cwd()`.
  process.chdir(ROOT)

  const chromePath = await findChrome()
  const { dev } = await import('astro')

  // `logLevel: 'error'` keeps the dev server's startup banner out of the way;
  // real failures still print. The dev toolbar has to go: it is a floating
  // island over the page and it would sit in the middle of every screenshot.
  const server = await dev({
    root: ROOT,
    logLevel: 'error',
    server: { port },
    devToolbar: { enabled: false },
  })
  const base = `http://localhost:${server.address.port}`

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })

  const written = []
  const problems = []

  try {
    for (const width of widths) {
      const page = await browser.newPage()
      try {
        await page.setViewport({ width, height: VIEWPORT_HEIGHT })
        // See note 1 in the header comment.
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])

        const response = await page.goto(`${base}${route}`, {
          waitUntil: 'networkidle2',
          timeout: 45000,
        })
        if (response && response.status() >= 400) {
          problems.push(`${route} answered HTTP ${response.status()}`)
        }
        // Web fonts change line breaks, which changes every height below.
        await page.evaluate(() => document.fonts.ready)
        await loadLazyContent(page)

        let clip
        if (selector) {
          const element = await page.$(selector)
          if (!element) {
            problems.push(`${selector} not found at ${width} px`)
            continue
          }
          // Page coordinates, taken at scroll 0 - the same frame of reference
          // `captureBeyondViewport` clips in.
          const box = await element.boundingBox()
          if (!box) {
            problems.push(`${selector} has no box at ${width} px (display:none?)`)
            continue
          }
          clip = {
            x: Math.max(0, box.x - PADDING),
            y: Math.max(0, box.y - PADDING),
            width: Math.min(width, box.width + PADDING * 2),
            height: box.height + PADDING * 2,
          }
        }

        // Count first, write second, clean up last - antipattern #18.
        const buffer = await page.screenshot(
          clip ? { clip, captureBeyondViewport: true, type: 'png' } : { fullPage: true, type: 'png' }
        )
        await mkdir(OUT, { recursive: true })
        const file = path.join(OUT, `${name}-${width}.png`)
        await writeFile(file, buffer)
        written.push(path.relative(ROOT, file))
      } finally {
        await page.close().catch(() => {})
      }
    }
  } finally {
    await browser.close().catch(() => {})
    await server.stop().catch(() => {})
  }

  for (const line of written) console.log(`  ${line}`)
  for (const line of problems) console.log(`  ! ${line}`)
  if (!written.length) process.exitCode = 1
}

await main()
