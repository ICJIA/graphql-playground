/**
 * Vitest global setup
 *
 * Provides the Vue auto-imports that Nuxt normally handles
 * (ref, computed, watch, inject, provide, etc.)
 */
import { ref, computed, watch, inject, provide, reactive, toRef, nextTick, onMounted, onUnmounted } from 'vue'
import { vi } from 'vitest'

// Make Vue composition API globals available (Nuxt auto-imports these)
globalThis.ref = ref as any
globalThis.computed = computed as any
globalThis.watch = watch as any
globalThis.inject = inject as any
globalThis.provide = provide as any
globalThis.reactive = reactive as any
globalThis.toRef = toRef as any
globalThis.nextTick = nextTick as any
globalThis.onMounted = onMounted as any
globalThis.onUnmounted = onUnmounted as any

// Mock $fetch (Nuxt's built-in fetch wrapper)
globalThis.$fetch = vi.fn() as any

// Mock useToast (from Nuxt UI)
globalThis.useToast = (() => ({
  add: vi.fn()
})) as any

// Mock defineEmits for script setup
globalThis.defineEmits = (() => () => {}) as any
globalThis.defineExpose = (() => {}) as any
globalThis.defineModel = ((name: string, opts: any) => ref(opts?.default)) as any
