import { webcrypto } from 'node:crypto'

// Polyfill crypto.getRandomValues for Node environments where it's missing
if (!globalThis.crypto?.getRandomValues) {
  globalThis.crypto = webcrypto as Crypto
}

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts']
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app')
    }
  }
})
