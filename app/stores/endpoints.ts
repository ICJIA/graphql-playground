import { defineStore } from 'pinia'
import type { SavedEndpoint } from '~/types'
import { playgroundConfig } from '~/playground.config'

const STORAGE_KEY_ENDPOINTS = playgroundConfig.storageKeys.endpoints
const STORAGE_KEY_ACTIVE = playgroundConfig.storageKeys.activeEndpoint

function loadEndpoints(): SavedEndpoint[] {
  if (import.meta.server) return []
  const raw = localStorage.getItem(STORAGE_KEY_ENDPOINTS)
  return raw ? JSON.parse(raw) : []
}

function loadActiveEndpoint(): string {
  if (import.meta.server) return ''
  return localStorage.getItem(STORAGE_KEY_ACTIVE) || ''
}

export const useEndpointsStore = defineStore('endpoints', {
  state: () => ({
    endpoints: loadEndpoints(),
    activeEndpoint: loadActiveEndpoint()
  }),

  getters: {
    sortedEndpoints: (state) => {
      return [...state.endpoints].sort(
        (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      )
    },

    activeEndpointData: (state) => {
      return state.endpoints.find(e => e.url === state.activeEndpoint) || null
    }
  },

  actions: {
    addEndpoint(url: string, bearerToken: string = '') {
      const existing = this.endpoints.find(e => e.url === url)
      if (existing) {
        existing.lastUsed = new Date().toISOString()
        existing.bearerToken = bearerToken
      } else {
        this.endpoints.push({
          url,
          label: url,
          lastUsed: new Date().toISOString(),
          bearerToken
        })
      }
      this.activeEndpoint = url
      this.persist()
    },

    setActiveEndpoint(url: string) {
      const endpoint = this.endpoints.find(e => e.url === url)
      if (endpoint) {
        endpoint.lastUsed = new Date().toISOString()
        this.activeEndpoint = url
        this.persist()
      }
    },

    updateBearerToken(url: string, token: string) {
      const endpoint = this.endpoints.find(e => e.url === url)
      if (endpoint) {
        endpoint.bearerToken = token
        this.persist()
      }
    },

    removeEndpoint(url: string) {
      this.endpoints = this.endpoints.filter(e => e.url !== url)
      if (this.activeEndpoint === url) {
        this.activeEndpoint = this.endpoints[0]?.url || ''
      }
      this.persist()
    },

    persist() {
      localStorage.setItem(STORAGE_KEY_ENDPOINTS, JSON.stringify(this.endpoints))
      localStorage.setItem(STORAGE_KEY_ACTIVE, this.activeEndpoint)
    }
  }
})
