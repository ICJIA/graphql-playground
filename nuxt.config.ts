import { playgroundConfig } from './app/playground.config'

export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt'],

  css: ['~/assets/css/main.css', '~/assets/css/splitpanes.css'],

  ssr: false,

  app: {
    head: {
      title: playgroundConfig.app.name,
      meta: [
        { name: 'description', content: playgroundConfig.app.description }
      ]
    }
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },

  nitro: {
    preset: 'netlify'
  },

  devtools: { enabled: true },

  compatibilityDate: '2026-02-19'
})
