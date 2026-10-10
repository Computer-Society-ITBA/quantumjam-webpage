// Renders the link-preview cards and touch icons into public/ with a
// locally installed Chrome or Edge. Run with `npm run og` after editing
// pages.json or card.html. Needs network access for the Google Fonts.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const here = import.meta.dirname
const root = path.resolve(here, '../..')
const publicDir = path.join(root, 'public')

const BROWSERS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

const ICONS = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
]

const browser = BROWSERS.find(
  (candidate) => candidate && fs.existsSync(candidate),
)
if (!browser) {
  console.error(
    'No Chrome or Edge found. Set CHROME_PATH to a Chromium binary.',
  )
  process.exit(1)
}

const escapeHtml = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const fill = (template, values) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key])

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quantumjam-og-'))

function screenshot(html, file, width, height) {
  const source = path.join(tmpDir, `${file}.html`)
  fs.writeFileSync(source, html)
  execFileSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      '--virtual-time-budget=8000',
      `--screenshot=${path.join(publicDir, file)}`,
      pathToFileURL(source).href,
    ],
    { stdio: 'ignore' },
  )
  console.log(`public/${file}`)
}

const pages = JSON.parse(fs.readFileSync(path.join(here, 'pages.json'), 'utf8'))
const cardTemplate = fs.readFileSync(path.join(here, 'card.html'), 'utf8')
const wordmark = fs.readFileSync(
  path.join(root, 'src/assets/quantum-jam-logo-primary.svg'),
  'utf8',
)
const ibmLogo = pathToFileURL(path.join(publicDir, 'ibm-logo.png')).href

for (const { image, card } of Object.values(pages)) {
  const html = fill(cardTemplate, {
    bodyClass: card.headline ? 'has-headline' : '',
    ibmLogo,
    wordmark,
    headline: escapeHtml(card.headline ?? ''),
    subtitle: escapeHtml(card.subtitle),
    chips: card.chips
      .map((chip) => `<span class="chip"><i></i>${escapeHtml(chip)}</span>`)
      .join(''),
  })
  screenshot(html, image, 1200, 630)
}

const iconHtml = fill(fs.readFileSync(path.join(here, 'icon.html'), 'utf8'), {
  mark: fs.readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8'),
})
for (const { file, size } of ICONS) {
  screenshot(iconHtml, file, size, size)
}

fs.rmSync(tmpDir, { recursive: true, force: true })
