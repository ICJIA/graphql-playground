import { defineStore } from 'pinia'
import type { QueryTab, Workspace, WorkspaceMap } from '~/types'
import { playgroundConfig } from '~~/playground.config'

const STORAGE_KEY = playgroundConfig.storageKeys.workspaces

/** Generates a unique tab ID using a timestamp combined with a random alphanumeric string. */
function generateId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Parses a GraphQL query string to extract the operation name or first root field name, for auto-naming tabs. */
function extractQueryName(query: string): string | null {
  if (!query || !query.trim()) return null
  // Match named operations: query MyQuery { ... } or mutation CreateUser { ... }
  const operationMatch = query.match(/(?:query|mutation|subscription)\s+([A-Za-z_]\w*)/i)
  if (operationMatch) return operationMatch[1]
  // Match first root field: { meetings { ... } } or { users { ... } }
  const fieldMatch = query.match(/\{\s*([A-Za-z_]\w*)/)
  if (fieldMatch) return fieldMatch[1]
  return null
}

/** Creates a new QueryTab with default values (empty query body, no variables, auto-naming enabled). */
function createDefaultTab(): QueryTab {
  return {
    id: generateId(),
    name: 'New Tab',
    autoName: true,
    query: '{\n  \n}',
    variables: '',
    results: null
  }
}

/** Loads saved workspaces from localStorage; returns an empty object on the server or if no data exists. */
function loadWorkspaces(): WorkspaceMap {
  if (import.meta.server) return {}
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : {}
}

/** Pinia store managing query workspaces, providing tabbed query editors per endpoint with auto-naming and persistence. */
export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    workspaces: loadWorkspaces()
  }),

  getters: {
    /** Returns the workspace for the currently active endpoint, or null if no endpoint is selected. */
    currentWorkspace(): Workspace | null {
      const endpointsStore = useEndpointsStore()
      const url = endpointsStore.activeEndpoint
      if (!url) return null
      return this.workspaces[url] || null
    },

    /** Returns the tabs array for the current workspace, or an empty array if no workspace is active. */
    currentTabs(): QueryTab[] {
      return this.currentWorkspace?.tabs || []
    },

    /** Returns the active tab in the current workspace, falling back to the first tab or null. */
    activeTab(): QueryTab | null {
      const ws = this.currentWorkspace
      if (!ws) return null
      return ws.tabs.find((t) => t.id === ws.activeTabId) || ws.tabs[0] || null
    }
  },

  actions: {
    /** Creates a workspace with a default tab for the given endpoint URL if one does not already exist. */
    ensureWorkspace(url: string) {
      if (!this.workspaces[url]) {
        const defaultTab = createDefaultTab()
        this.workspaces[url] = {
          tabs: [defaultTab],
          activeTabId: defaultTab.id
        }
        this.persist()
      }
    },

    /** Adds a new default tab to the workspace for the given URL and sets it as active. */
    addTab(url: string) {
      const ws = this.workspaces[url]
      if (!ws) return
      const tab = createDefaultTab()
      ws.tabs.push(tab)
      ws.activeTabId = tab.id
      this.persist()
    },

    /** Closes the specified tab in the workspace, preventing closure of the last remaining tab. */
    closeTab(url: string, tabId: string) {
      const ws = this.workspaces[url]
      if (!ws || ws.tabs.length <= 1) return
      ws.tabs = ws.tabs.filter((t) => t.id !== tabId)
      if (ws.activeTabId === tabId) {
        ws.activeTabId = ws.tabs[0]!.id
      }
      this.persist()
    },

    /** Sets the active tab in the workspace for the given endpoint URL. */
    setActiveTab(url: string, tabId: string) {
      const ws = this.workspaces[url]
      if (!ws) return
      ws.activeTabId = tabId
      this.persist()
    },

    /** Applies partial updates to a tab and auto-renames it from the query content if auto-naming is enabled. */
    updateTab(url: string, tabId: string, updates: Partial<QueryTab>) {
      const ws = this.workspaces[url]
      if (!ws) return
      const tab = ws.tabs.find((t) => t.id === tabId)
      if (tab) {
        Object.assign(tab, updates)
        // Auto-rename tab from query content (unless user manually renamed)
        if (updates.query && tab.autoName !== false) {
          const name = extractQueryName(updates.query)
          if (name) {
            tab.name = name
            tab.autoName = true
          }
        }
        this.persist()
      }
    },

    /** Deletes the entire workspace for the given endpoint URL. */
    removeWorkspace(url: string) {
      const { [url]: _, ...rest } = this.workspaces
      this.workspaces = rest
      this.persist()
    },

    /** Persists all workspaces to localStorage. */
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workspaces))
    }
  }
})
