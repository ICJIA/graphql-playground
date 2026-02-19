// Polyfill crypto.getRandomValues for Node environments where it's missing.
// Uses CommonJS + --require so it works in Node 18+ (--import requires 18.19+).
// Loaded BEFORE vitest/vite starts, ensuring the global is available when
// Vite's resolveConfig() calls crypto.getRandomValues().
const { webcrypto } = require('node:crypto')

if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto = webcrypto
}
