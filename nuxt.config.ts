import { playgroundConfig } from './playground.config'

export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint', '@nuxtjs/seo'],

  css: ['~/assets/css/main.css', '~/assets/css/splitpanes.css'],

  ssr: false,

  // ── Site-wide SEO config (consumed by @nuxtjs/seo sub-modules) ──
  site: {
    url: playgroundConfig.app.liveUrl,
    name: playgroundConfig.app.name,
    description: playgroundConfig.app.description,
    defaultLocale: 'en'
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: playgroundConfig.app.name,
      meta: [
        { name: 'description', content: playgroundConfig.app.description },
        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: playgroundConfig.app.name },
        { property: 'og:description', content: playgroundConfig.app.description },
        { property: 'og:image', content: `${playgroundConfig.app.liveUrl}/og-image.png` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'ICJIA GraphQL Playground — a modern, self-hosted GraphQL IDE' },
        { property: 'og:url', content: playgroundConfig.app.liveUrl },
        { property: 'og:site_name', content: playgroundConfig.app.name },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: playgroundConfig.app.name },
        { name: 'twitter:description', content: playgroundConfig.app.description },
        { name: 'twitter:image', content: `${playgroundConfig.app.liveUrl}/og-image.png` },
        { name: 'twitter:image:alt', content: 'ICJIA GraphQL Playground — a modern, self-hosted GraphQL IDE' },
        // Additional SEO
        { name: 'theme-color', content: '#030712' },
        { name: 'author', content: 'ICJIA' },
        { name: 'keywords', content: 'graphql, playground, ide, query, schema, introspection, cors proxy, developer tools' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'canonical', href: playgroundConfig.app.liveUrl }
      ]
    }
  },

  // ── Sitemap ──
  sitemap: {
    urls: [
      { loc: '/', changefreq: 'weekly', priority: 1.0 }
    ]
  },

  // ── Robots ──
  robots: {
    groups: [
      { userAgent: '*', allow: '/' }
    ]
  },

  // ── Disable OG image generation (we use a static image) ──
  ogImage: {
    enabled: false
  },

  // ── Schema.org disabled (requires SSR) ──
  schemaOrg: {
    enabled: false
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },

  nitro: {
    preset: 'netlify'
  },

  devtools: { enabled: false },

  compatibilityDate: '2026-02-19'
})
