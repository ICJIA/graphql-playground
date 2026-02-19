// app/composables/useHistory.ts
import { playgroundConfig } from '~/playground.config'

export interface HistoryEntry {
  query: string
  variables: string
  timestamp: string
  endpoint: string
}

const STORAGE_KEY = playgroundConfig.storageKeys.history
const MAX_ENTRIES = playgroundConfig.history.maxEntries

function loadHistory(): HistoryEntry[] {
  if (import.meta.server) return []
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

// Shared reactive state across all callers
const history = ref<HistoryEntry[]>(loadHistory())

export function useHistory() {
  function addEntry(entry: Omit<HistoryEntry, 'timestamp'>) {
    history.value.unshift({
      ...entry,
      timestamp: new Date().toISOString()
    })
    if (history.value.length > MAX_ENTRIES) {
      history.value = history.value.slice(0, MAX_ENTRIES)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
  }

  function getEntriesForEndpoint(endpoint: string) {
    return history.value.filter(e => e.endpoint === endpoint)
  }

  function clearHistory() {
    history.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  return { history, addEntry, getEntriesForEndpoint, clearHistory }
}
