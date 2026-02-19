import { defineStore } from 'pinia'
import type { SavedEndpoint } from '~/types'
import { playgroundConfig } from '~~/playground.config'

const STORAGE_KEY_ENDPOINTS = playgroundConfig.storageKeys.endpoints
const STORAGE_KEY_ACTIVE = playgroundConfig.storageKeys.activeEndpoint

/** Loads saved endpoints from localStorage; returns an empty array on the server or if no data exists. */
function loadEndpoints(): SavedEndpoint[] {
  if (import.meta.server) return []
  const raw = localStorage.getItem(STORAGE_KEY_ENDPOINTS)
  return raw ? JSON.parse(raw) : []
}

/** Loads the active endpoint URL from localStorage; returns an empty string on the server or if no data exists. */
function loadActiveEndpoint(): string {
  if (import.meta.server) return ''
  return localStorage.getItem(STORAGE_KEY_ACTIVE) || ''
}

/** Pinia store managing saved GraphQL endpoints with sorting, selection, and bearer token management. */
export const useEndpointsStore = defineStore('endpoints', {
  state: () => ({
    endpoints: loadEndpoints(),
    activeEndpoint: loadActiveEndpoint()
  }),

  getters: {
    /** Returns all endpoints sorted by most recently used first. */
    sortedEndpoints: (state) => {
      return [...state.endpoints].sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    },

    /** Returns the full SavedEndpoint object for the currently active endpoint, or null if none matches. */
    activeEndpointData: (state) => {
      return state.endpoints.find((e) => e.url === state.activeEndpoint) || null
    }
  },

  actions: {
    /** Adds or updates an endpoint by URL and sets it as active, persisting changes to localStorage. */
    addEndpoint(url: string, bearerToken: string = '') {
      const existing = this.endpoints.find((e) => e.url === url)
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

    /** Sets the given URL as the active endpoint and updates its lastUsed timestamp. */
    setActiveEndpoint(url: string) {
      const endpoint = this.endpoints.find((e) => e.url === url)
      if (endpoint) {
        endpoint.lastUsed = new Date().toISOString()
        this.activeEndpoint = url
        this.persist()
      }
    },

    /** Updates the bearer token for the endpoint matching the given URL. */
    updateBearerToken(url: string, token: string) {
      const endpoint = this.endpoints.find((e) => e.url === url)
      if (endpoint) {
        endpoint.bearerToken = token
        this.persist()
      }
    },

    /** Removes the endpoint matching the given URL and selects the first remaining endpoint if the removed one was active. */
    removeEndpoint(url: string) {
      this.endpoints = this.endpoints.filter((e) => e.url !== url)
      if (this.activeEndpoint === url) {
        this.activeEndpoint = this.endpoints[0]?.url || ''
      }
      this.persist()
    },

    /** Persists the current endpoints list and active endpoint URL to localStorage. */
    persist() {
      localStorage.setItem(STORAGE_KEY_ENDPOINTS, JSON.stringify(this.endpoints))
      localStorage.setItem(STORAGE_KEY_ACTIVE, this.activeEndpoint)
    }
  }
})
