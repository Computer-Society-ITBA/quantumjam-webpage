/// <reference types="vitest/config" />
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const SITE_URL = 'https://quantumjam.com.ar'

interface PagePreview {
  title?: string
  description?: string
  image: string
  imageAlt?: string
}

const escapeAttr = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')

function replaceOnce(html: string, pattern: RegExp, value: string) {
  if (!pattern.test(html)) {
    throw new Error(`link previews: ${pattern} not found in index.html`)
  }
  return html.replace(pattern, (_, before, after) => before + value + after)
}

const setMeta = (html: string, key: string, value: string) =>
  replaceOnce(
    html,
    new RegExp(`(<meta\\s+(?:property|name)="${key}"\\s+content=")[^"]*(")`),
    escapeAttr(value),
  )

// Link-preview crawlers don't run JS, so every SPA route would share the
// home page's tags. Emit one static HTML per route in pages.json with its
// own tags; Hosting's cleanUrls serves dist/register.html at /register.
function linkPreviews(): Plugin {
  let outDir = ''
  return {
    name: 'link-previews',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const pages: Record<string, PagePreview> = JSON.parse(
        fs.readFileSync(
          path.resolve(import.meta.dirname, 'scripts/og/pages.json'),
          'utf8',
        ),
      )
      const home = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')

      for (const [route, page] of Object.entries(pages)) {
        if (!page.title || !page.description || !page.imageAlt) continue
        const url = SITE_URL + route
        const image = `${SITE_URL}/${page.image}`

        let html = replaceOnce(
          home,
          /(<title>)[^<]*(<\/title>)/,
          escapeAttr(page.title),
        )
        html = replaceOnce(
          html,
          /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
          url,
        )
        html = setMeta(html, 'description', page.description)
        html = setMeta(html, 'og:url', url)
        for (const prefix of ['og', 'twitter']) {
          html = setMeta(html, `${prefix}:title`, page.title)
          html = setMeta(html, `${prefix}:description`, page.description)
          html = setMeta(html, `${prefix}:image`, image)
          html = setMeta(html, `${prefix}:image:alt`, page.imageAlt)
        }

        const file = path.join(outDir, `${route}.html`)
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, html)
      }
    },
  }
}

// With the emulators on, forward /api/admin to the Functions emulator the
// way Hosting's rewrite does in production. Same origin, so no CORS.
function adminApiProxy(env: Record<string, string>) {
  if (env.VITE_USE_FIREBASE_EMULATORS !== 'true') return undefined
  const fn = `/${env.VITE_FIREBASE_PROJECT_ID}/us-central1/quantumjamAdminApi`
  return {
    '/api/admin': {
      target: 'http://127.0.0.1:5001',
      rewrite: (p: string) => fn + p,
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), linkPreviews()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: adminApiProxy(loadEnv(mode, import.meta.dirname, 'VITE_')),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}))
