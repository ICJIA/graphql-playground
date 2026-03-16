import { playgroundConfig } from '~~/playground.config'

/**
 * Client-only plugin that synchronizes Pinia store state across browser tabs
 * by listening for `storage` events fired when another tab writes to localStorage.
 */
export default defineNuxtPlugin(() => {
  const keys = playgroundConfig.storageKeys

  window.addEventListener('storage', (event: StorageEvent) => {
    // Only react to keys we own
    if (!event.key || event.storageArea !== localStorage) return

    try {
      if (event.key === keys.endpoints || event.key === keys.activeEndpoint) {
        const store = useEndpointsStore()
        store.syncFromStorage()
      }

      if (event.key === keys.workspaces) {
        const store = useWorkspaceStore()
        store.syncFromStorage()
      }

      if (event.key === keys.settings) {
        const store = useSettingsStore()
        store.syncFromStorage()
      }

      if (event.key === keys.history) {
        syncHistoryFromStorage()
      }
    } catch {
      // Store may not be initialized yet — ignore
    }
  })
})
