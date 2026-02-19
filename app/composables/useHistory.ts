// app/composables/useHistory.ts
import { playgroundConfig } from '~~/playground.config'

/** Represents a single query history entry with its query text, variables, timestamp, and target endpoint. */
export interface HistoryEntry {
  query: string
  variables: string
  timestamp: string
  endpoint: string
}

const STORAGE_KEY = playgroundConfig.storageKeys.history
const MAX_ENTRIES = playgroundConfig.history.maxEntries

/** Loads history entries from localStorage, returning an empty array on the server or when no data is stored. */
function loadHistory(): HistoryEntry[] {
  if (import.meta.server) return []
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

// Shared reactive state across all callers
const history = ref<HistoryEntry[]>(loadHistory())

/**
 * Composable for managing query execution history with localStorage persistence.
 * @returns Reactive history state and functions to add, filter, and clear entries.
 */
export function useHistory() {
  /**
   * Adds a new history entry with an auto-generated timestamp, evicting the oldest entries when the maximum is exceeded.
   * @param entry - The query, variables, and endpoint to record (timestamp is generated automatically).
   */
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

  /**
   * Filters history entries by endpoint URL.
   * @param endpoint - The endpoint URL to filter by.
   */
  function getEntriesForEndpoint(endpoint: string) {
    return history.value.filter((e) => e.endpoint === endpoint)
  }

  /** Clears all history entries from reactive state and removes them from localStorage. */
  function clearHistory() {
    history.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  return { history, addEntry, getEntriesForEndpoint, clearHistory }
}
