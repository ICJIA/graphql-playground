import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { playgroundConfig } from '../../playground.config'

const ROOT = resolve(__dirname, '../..')
const readConfig = () => readFileSync(resolve(ROOT, 'nuxt.config.ts'), 'utf-8')

describe('SEO configuration', () => {
  describe('playground.config SEO values', () => {
    it('liveUrl is a valid HTTPS URL', () => {
      expect(playgroundConfig.app.liveUrl).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/)
    })

    it('app name is non-empty', () => {
      expect(playgroundConfig.app.name.length).toBeGreaterThan(0)
    })

    it('app description is non-empty', () => {
      expect(playgroundConfig.app.description.length).toBeGreaterThan(0)
    })

    it('app description is suitable for meta tags (under 160 chars)', () => {
      expect(playgroundConfig.app.description.length).toBeLessThanOrEqual(160)
    })
  })

  describe('public SEO assets', () => {
    it('og-image.png exists in public/', () => {
      expect(existsSync(resolve(ROOT, 'public/og-image.png'))).toBe(true)
    })

    it('favicon.ico exists in public/', () => {
      expect(existsSync(resolve(ROOT, 'public/favicon.ico'))).toBe(true)
    })

    it('og-image.png is a valid PNG (magic bytes)', () => {
      const buf = readFileSync(resolve(ROOT, 'public/og-image.png'))
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      expect(buf[0]).toBe(0x89)
      expect(buf[1]).toBe(0x50) // P
      expect(buf[2]).toBe(0x4e) // N
      expect(buf[3]).toBe(0x47) // G
    })

    it('og-image.png has reasonable file size (50KB–2MB)', () => {
      const stat = readFileSync(resolve(ROOT, 'public/og-image.png'))
      expect(stat.length).toBeGreaterThan(50_000)
      expect(stat.length).toBeLessThan(2_000_000)
    })
  })

  describe('nuxt.config.ts SEO module', () => {
    const config = readConfig()

    it('includes @nuxtjs/seo module', () => {
      expect(config).toContain("'@nuxtjs/seo'")
    })

    it('has site config block with liveUrl', () => {
      expect(config).toContain('site:')
      expect(config).toContain('playgroundConfig.app.liveUrl')
    })

    it('has sitemap config', () => {
      expect(config).toContain('sitemap:')
      expect(config).toContain("changefreq: 'weekly'")
    })

    it('has robots config', () => {
      expect(config).toContain('robots:')
      expect(config).toContain("allow: '/'")
    })

    it('disables ogImage sub-module (static image used)', () => {
      expect(config).toContain('ogImage:')
      expect(config).toContain('enabled: false')
    })

    it('disables schemaOrg (incompatible with ssr: false)', () => {
      expect(config).toContain('schemaOrg:')
      expect(config).toContain('ssr: false')
    })
  })

  describe('meta tags in nuxt.config.ts', () => {
    const config = readConfig()

    it('has og:type meta tag', () => {
      expect(config).toContain("og:type")
      expect(config).toContain("'website'")
    })

    it('has og:title meta tag', () => {
      expect(config).toContain("og:title")
    })

    it('has og:description meta tag', () => {
      expect(config).toContain("og:description")
    })

    it('has og:image meta tag pointing to og-image.png', () => {
      expect(config).toContain("og:image")
      expect(config).toContain('/og-image.png')
    })

    it('has og:image dimensions (1200x630)', () => {
      expect(config).toContain("og:image:width")
      expect(config).toContain("'1200'")
      expect(config).toContain("og:image:height")
      expect(config).toContain("'630'")
    })

    it('has og:image alt text', () => {
      expect(config).toContain("og:image:alt")
    })

    it('has og:url meta tag', () => {
      expect(config).toContain("og:url")
    })

    it('has og:site_name meta tag', () => {
      expect(config).toContain("og:site_name")
    })

    it('has twitter:card set to summary_large_image', () => {
      expect(config).toContain("twitter:card")
      expect(config).toContain("'summary_large_image'")
    })

    it('has twitter:title meta tag', () => {
      expect(config).toContain("twitter:title")
    })

    it('has twitter:description meta tag', () => {
      expect(config).toContain("twitter:description")
    })

    it('has twitter:image meta tag', () => {
      expect(config).toContain("twitter:image")
    })

    it('has twitter:image:alt meta tag', () => {
      expect(config).toContain("twitter:image:alt")
    })

    it('has theme-color meta tag', () => {
      expect(config).toContain("theme-color")
      expect(config).toContain("'#030712'")
    })

    it('has author meta tag', () => {
      expect(config).toContain("'author'")
      expect(config).toContain("'ICJIA'")
    })

    it('has keywords meta tag', () => {
      expect(config).toContain("'keywords'")
      expect(config).toContain("graphql")
    })
  })

  describe('link tags in nuxt.config.ts', () => {
    const config = readConfig()

    it('has favicon link', () => {
      expect(config).toContain("rel: 'icon'")
      expect(config).toContain('/favicon.ico')
    })

    it('has canonical link', () => {
      expect(config).toContain("rel: 'canonical'")
      expect(config).toContain('playgroundConfig.app.liveUrl')
    })
  })

  describe('HTML attributes', () => {
    const config = readConfig()

    it('sets lang attribute to en', () => {
      expect(config).toContain("lang: 'en'")
    })

    it('has a title', () => {
      expect(config).toContain('title: playgroundConfig.app.name')
    })
  })
})
