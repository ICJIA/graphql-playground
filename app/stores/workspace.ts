import { defineStore } from 'pinia'
import type { QueryTab, Workspace, WorkspaceMap } from '~/types'
import { playgroundConfig } from '~/playground.config'

const STORAGE_KEY = playgroundConfig.storageKeys.workspaces

function generateId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

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

function loadWorkspaces(): WorkspaceMap {
  if (import.meta.server) return {}
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : {}
}

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    workspaces: loadWorkspaces()
  }),

  getters: {
    currentWorkspace(): Workspace | null {
      const endpointsStore = useEndpointsStore()
      const url = endpointsStore.activeEndpoint
      if (!url) return null
      return this.workspaces[url] || null
    },

    currentTabs(): QueryTab[] {
      return this.currentWorkspace?.tabs || []
    },

    activeTab(): QueryTab | null {
      const ws = this.currentWorkspace
      if (!ws) return null
      return ws.tabs.find(t => t.id === ws.activeTabId) || ws.tabs[0] || null
    }
  },

  actions: {
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

    addTab(url: string) {
      const ws = this.workspaces[url]
      if (!ws) return
      const tab = createDefaultTab()
      ws.tabs.push(tab)
      ws.activeTabId = tab.id
      this.persist()
    },

    closeTab(url: string, tabId: string) {
      const ws = this.workspaces[url]
      if (!ws || ws.tabs.length <= 1) return
      ws.tabs = ws.tabs.filter(t => t.id !== tabId)
      if (ws.activeTabId === tabId) {
        ws.activeTabId = ws.tabs[0]!.id
      }
      this.persist()
    },

    setActiveTab(url: string, tabId: string) {
      const ws = this.workspaces[url]
      if (!ws) return
      ws.activeTabId = tabId
      this.persist()
    },

    updateTab(url: string, tabId: string, updates: Partial<QueryTab>) {
      const ws = this.workspaces[url]
      if (!ws) return
      const tab = ws.tabs.find(t => t.id === tabId)
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

    removeWorkspace(url: string) {
      delete this.workspaces[url]
      this.persist()
    },

    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workspaces))
    }
  }
})
