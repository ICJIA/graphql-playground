/**
 * Post-build script: Generates a Netlify _headers file with a hash-based
 * Content Security Policy (CSP).
 *
 * Nuxt injects inline <script> blocks (color-mode, __NUXT__ config) that
 * change every build. Instead of using the weak 'unsafe-inline' directive,
 * this script computes SHA-256 hashes of each inline script and adds them
 * to the CSP header, so only those exact scripts are permitted to execute.
 *
 * Run automatically via the `postbuild` npm script.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const OUTPUT_DIR = resolve('.output/public')
const HTML_FILE = resolve(OUTPUT_DIR, 'index.html')
const HEADERS_FILE = resolve(OUTPUT_DIR, '_headers')

if (!existsSync(HTML_FILE)) {
  // SSR builds (e.g. Netlify preset) have no static index.html.
  // Write a safe fallback CSP without script hashes and exit cleanly.
  console.log('[generate-csp] No index.html found (SSR build) — writing fallback CSP')
  const fallbackCsp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "frame-ancestors 'none'"
  ].join('; ')
  if (existsSync(OUTPUT_DIR)) {
    writeFileSync(resolve(OUTPUT_DIR, '_headers'), `/*\n  Content-Security-Policy: ${fallbackCsp}\n`, 'utf-8')
    console.log('[generate-csp] Wrote fallback _headers to', OUTPUT_DIR)
  }
  process.exit(0)
}

const html = readFileSync(HTML_FILE, 'utf-8')

// Match inline <script> tags that contain executable JS (skip type="application/json")
const scriptRegex = /<script(?![^>]*\btype\s*=\s*"application\/json"[^>]*)(?:[^>]*)>([\s\S]*?)<\/script>/gi
const hashes = []
let match

while ((match = scriptRegex.exec(html)) !== null) {
  const content = match[1]
  if (content.trim()) {
    const hash = createHash('sha256').update(content, 'utf-8').digest('base64')
    hashes.push(`'sha256-${hash}'`)
  }
}

const scriptSrc = hashes.length > 0 ? `'self' ${hashes.join(' ')}` : "'self' 'unsafe-inline'" // fallback if no inline scripts detected

const csp = [
  `default-src 'self'`,
  `script-src ${scriptSrc}`,
  `style-src 'self' 'unsafe-inline'`,
  `connect-src 'self'`,
  `img-src 'self' data:`,
  `font-src 'self' data:`,
  `frame-ancestors 'none'`
].join('; ')

// Netlify _headers file format
const headersContent = `/*
  Content-Security-Policy: ${csp}
`

writeFileSync(HEADERS_FILE, headersContent, 'utf-8')

console.log(`[generate-csp] Wrote _headers with ${hashes.length} script hash(es)`)
hashes.forEach((h, i) => console.log(`  script ${i + 1}: ${h}`))
