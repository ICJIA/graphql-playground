// Polyfill crypto.getRandomValues for Node environments where it's missing.
// Loaded via --import flag BEFORE vitest/vite starts, ensuring the global
// is available when Vite's resolveConfig() calls crypto.getRandomValues().
import { webcrypto } from 'node:crypto'

if (!globalThis.crypto?.getRandomValues) {
  globalThis.crypto = webcrypto
}
