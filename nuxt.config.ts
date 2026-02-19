export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  ssr: false,

  app: {
    head: {
      title: 'GraphQL Playground',
      meta: [
        { name: 'description', content: 'A modern, configurable GraphQL playground' }
      ]
    }
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },

  devtools: { enabled: true },

  compatibilityDate: '2026-02-19'
})
