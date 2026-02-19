import { defineStore } from 'pinia'
import type { PlaygroundSettings } from '~/types'
import { playgroundConfig } from '~~/playground.config'

const STORAGE_KEY = playgroundConfig.storageKeys.settings

/** Loads user settings from localStorage, merging saved values with defaults; returns defaults on the server or on parse failure. */
function loadSettings(): PlaygroundSettings {
  if (import.meta.server) return { ...playgroundConfig.defaults }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return { ...playgroundConfig.defaults, ...JSON.parse(raw) }
    } catch {
      /* fall through */
    }
  }
  return { ...playgroundConfig.defaults }
}

/** Pinia store managing editor settings (font size, autocomplete, etc.) with localStorage persistence. */
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: loadSettings()
  }),

  getters: {
    /** Returns the current editor font size setting. */
    editorFontSize: (state) => state.settings.editorFontSize
  },

  actions: {
    /** Merges partial setting updates into the current settings and persists to localStorage. */
    updateSettings(updates: Partial<PlaygroundSettings>) {
      Object.assign(this.settings, updates)
      this.persist()
    },

    /** Resets all settings to their default values from playgroundConfig and persists the change. */
    resetToDefaults() {
      this.settings = { ...playgroundConfig.defaults }
      this.persist()
    },

    /** Persists the current settings to localStorage. */
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    }
  }
})
