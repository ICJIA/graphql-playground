import { defineStore } from 'pinia'
import type { PlaygroundSettings } from '~/types'
import { playgroundConfig } from '~/playground.config'

const STORAGE_KEY = playgroundConfig.storageKeys.settings

function loadSettings(): PlaygroundSettings {
  if (import.meta.server) return { ...playgroundConfig.defaults }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return { ...playgroundConfig.defaults, ...JSON.parse(raw) }
    } catch { /* fall through */ }
  }
  return { ...playgroundConfig.defaults }
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: loadSettings()
  }),

  getters: {
    editorFontSize: (state) => state.settings.editorFontSize,
    autocomplete: (state) => state.settings.autocomplete
  },

  actions: {
    updateSettings(updates: Partial<PlaygroundSettings>) {
      Object.assign(this.settings, updates)
      this.persist()
    },

    resetToDefaults() {
      this.settings = { ...playgroundConfig.defaults }
      this.persist()
    },

    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    }
  }
})
