import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEndpointsStore } from '../../app/stores/endpoints'
import { useWorkspaceStore } from '../../app/stores/workspace'
import { useSettingsStore } from '../../app/stores/settings'
import { playgroundConfig } from '../../playground.config'

// Make store factories available as globals (Nuxt auto-imports these)
globalThis.useEndpointsStore = useEndpointsStore as any
globalThis.useWorkspaceStore = useWorkspaceStore as any
globalThis.useSettingsStore = useSettingsStore as any

describe('Endpoints Store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('initializes with empty state', () => {
    const store = useEndpointsStore()
    expect(store.endpoints).toEqual([])
    expect(store.activeEndpoint).toBe('')
  })

  it('adds a new endpoint and sets it active', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://example.com/graphql')
    expect(store.endpoints).toHaveLength(1)
    expect(store.endpoints[0].url).toBe('https://example.com/graphql')
    expect(store.endpoints[0].label).toBe('https://example.com/graphql')
    expect(store.activeEndpoint).toBe('https://example.com/graphql')
  })

  it('updates existing endpoint on re-add', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://example.com/graphql', 'token-1')
    store.addEndpoint('https://example.com/graphql', 'token-2')
    expect(store.endpoints).toHaveLength(1)
    expect(store.endpoints[0].bearerToken).toBe('token-2')
  })

  it('stores bearer token on new endpoint', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://example.com/graphql', 'my-token')
    expect(store.endpoints[0].bearerToken).toBe('my-token')
  })

  it('defaults bearer token to empty string', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://example.com/graphql')
    expect(store.endpoints[0].bearerToken).toBe('')
  })

  it('sorts endpoints by most recently used', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://old.com/graphql')
    store.addEndpoint('https://new.com/graphql')
    // Manually set distinct timestamps to avoid ties
    store.endpoints[0].lastUsed = '2024-01-01T00:00:00Z'
    store.endpoints[1].lastUsed = '2025-01-01T00:00:00Z'
    expect(store.sortedEndpoints[0].url).toBe('https://new.com/graphql')
    expect(store.sortedEndpoints[1].url).toBe('https://old.com/graphql')
  })

  it('returns activeEndpointData for active endpoint', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://example.com/graphql', 'tok')
    expect(store.activeEndpointData).not.toBeNull()
    expect(store.activeEndpointData!.url).toBe('https://example.com/graphql')
    expect(store.activeEndpointData!.bearerToken).toBe('tok')
  })

  it('returns null for activeEndpointData when no match', () => {
    const store = useEndpointsStore()
    expect(store.activeEndpointData).toBeNull()
  })

  it('sets active endpoint and updates lastUsed', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://a.com/graphql')
    const firstUsed = store.endpoints[0].lastUsed
    store.addEndpoint('https://b.com/graphql')
    store.setActiveEndpoint('https://a.com/graphql')
    expect(store.activeEndpoint).toBe('https://a.com/graphql')
    expect(store.endpoints[0].lastUsed >= firstUsed).toBe(true)
  })

  it('ignores setActiveEndpoint for unknown URL', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://a.com/graphql')
    store.setActiveEndpoint('https://unknown.com/graphql')
    expect(store.activeEndpoint).toBe('https://a.com/graphql')
  })

  it('updates bearer token for existing endpoint', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://example.com/graphql')
    store.updateBearerToken('https://example.com/graphql', 'new-token')
    expect(store.endpoints[0].bearerToken).toBe('new-token')
  })

  it('ignores updateBearerToken for unknown URL', () => {
    const store = useEndpointsStore()
    store.updateBearerToken('https://unknown.com/graphql', 'token')
    expect(store.endpoints).toHaveLength(0)
  })

  it('removes endpoint and selects first remaining', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://a.com/graphql')
    store.addEndpoint('https://b.com/graphql')
    // b is now active
    store.removeEndpoint('https://b.com/graphql')
    expect(store.endpoints).toHaveLength(1)
    expect(store.activeEndpoint).toBe('https://a.com/graphql')
  })

  it('clears activeEndpoint when last endpoint removed', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://a.com/graphql')
    store.removeEndpoint('https://a.com/graphql')
    expect(store.endpoints).toHaveLength(0)
    expect(store.activeEndpoint).toBe('')
  })

  it('does not change active when non-active endpoint removed', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://a.com/graphql')
    store.addEndpoint('https://b.com/graphql')
    // b is active
    store.removeEndpoint('https://a.com/graphql')
    expect(store.activeEndpoint).toBe('https://b.com/graphql')
  })

  it('persists endpoints and activeEndpoint to localStorage', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://example.com/graphql')
    const saved = JSON.parse(localStorage.getItem(playgroundConfig.storageKeys.endpoints)!)
    expect(saved).toHaveLength(1)
    expect(saved[0].url).toBe('https://example.com/graphql')
    expect(localStorage.getItem(playgroundConfig.storageKeys.activeEndpoint)).toBe('https://example.com/graphql')
  })

  it('loads saved endpoints from localStorage on init', () => {
    const endpoints = [
      { url: 'https://saved.com/graphql', label: 'Saved', lastUsed: new Date().toISOString(), bearerToken: 'tok' }
    ]
    localStorage.setItem(playgroundConfig.storageKeys.endpoints, JSON.stringify(endpoints))
    localStorage.setItem(playgroundConfig.storageKeys.activeEndpoint, 'https://saved.com/graphql')

    setActivePinia(createPinia())
    const store = useEndpointsStore()
    expect(store.endpoints).toHaveLength(1)
    expect(store.endpoints[0].bearerToken).toBe('tok')
    expect(store.activeEndpoint).toBe('https://saved.com/graphql')
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(playgroundConfig.storageKeys.endpoints, 'not-json')
    setActivePinia(createPinia())
    const store = useEndpointsStore()
    expect(store.endpoints).toEqual([])
  })
})

describe('Workspace Store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('initializes with empty workspaces', () => {
    const store = useWorkspaceStore()
    expect(store.workspaces).toEqual({})
  })

  it('creates workspace with a default tab', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    const ws = store.workspaces['https://example.com/graphql']
    expect(ws).toBeDefined()
    expect(ws.tabs).toHaveLength(1)
    expect(ws.tabs[0].name).toBe('New Tab')
    expect(ws.tabs[0].query).toBe('{\n  \n}')
    expect(ws.tabs[0].variables).toBe('')
    expect(ws.tabs[0].results).toBeNull()
    expect(ws.tabs[0].autoName).toBe(true)
    expect(ws.activeTabId).toBe(ws.tabs[0].id)
  })

  it('does not overwrite existing workspace on re-ensure', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    const origId = store.workspaces['https://example.com/graphql'].tabs[0].id
    store.ensureWorkspace('https://example.com/graphql')
    expect(store.workspaces['https://example.com/graphql'].tabs[0].id).toBe(origId)
  })

  it('adds a new tab and sets it active', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    store.addTab('https://example.com/graphql')
    const ws = store.workspaces['https://example.com/graphql']
    expect(ws.tabs).toHaveLength(2)
    expect(ws.activeTabId).toBe(ws.tabs[1].id)
  })

  it('does nothing when adding tab to non-existent workspace', () => {
    const store = useWorkspaceStore()
    store.addTab('https://nope.com/graphql')
    expect(store.workspaces['https://nope.com/graphql']).toBeUndefined()
  })

  it('closes a tab (not the last one)', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    store.addTab('https://example.com/graphql')
    const ws = store.workspaces['https://example.com/graphql']
    const firstId = ws.tabs[0].id
    const secondId = ws.tabs[1].id
    store.closeTab('https://example.com/graphql', firstId)
    expect(ws.tabs).toHaveLength(1)
    expect(ws.tabs[0].id).toBe(secondId)
  })

  it('prevents closing the last tab', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    const ws = store.workspaces['https://example.com/graphql']
    const tabId = ws.tabs[0].id
    store.closeTab('https://example.com/graphql', tabId)
    expect(ws.tabs).toHaveLength(1)
  })

  it('switches active tab when the active one is closed', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    store.addTab('https://example.com/graphql')
    const ws = store.workspaces['https://example.com/graphql']
    const firstId = ws.tabs[0].id
    const secondId = ws.tabs[1].id
    // Make second tab active then close it
    ws.activeTabId = secondId
    store.closeTab('https://example.com/graphql', secondId)
    expect(ws.activeTabId).toBe(firstId)
  })

  it('sets active tab', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    store.addTab('https://example.com/graphql')
    const ws = store.workspaces['https://example.com/graphql']
    const firstId = ws.tabs[0].id
    store.setActiveTab('https://example.com/graphql', firstId)
    expect(ws.activeTabId).toBe(firstId)
  })

  it('updates tab properties', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    const ws = store.workspaces['https://example.com/graphql']
    const tabId = ws.tabs[0].id
    store.updateTab('https://example.com/graphql', tabId, {
      query: '{ users { name } }',
      variables: '{"limit": 10}'
    })
    expect(ws.tabs[0].query).toBe('{ users { name } }')
    expect(ws.tabs[0].variables).toBe('{"limit": 10}')
  })

  it('auto-names tab from named operation', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    const tabId = store.workspaces['https://example.com/graphql'].tabs[0].id
    store.updateTab('https://example.com/graphql', tabId, {
      query: 'query GetUsers { users { name } }'
    })
    expect(store.workspaces['https://example.com/graphql'].tabs[0].name).toBe('GetUsers')
    expect(store.workspaces['https://example.com/graphql'].tabs[0].autoName).toBe(true)
  })

  it('auto-names tab from mutation operation', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    const tabId = store.workspaces['https://example.com/graphql'].tabs[0].id
    store.updateTab('https://example.com/graphql', tabId, {
      query: 'mutation CreateUser { createUser(name: "Alice") { id } }'
    })
    expect(store.workspaces['https://example.com/graphql'].tabs[0].name).toBe('CreateUser')
  })

  it('auto-names tab from first root field', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    const tabId = store.workspaces['https://example.com/graphql'].tabs[0].id
    store.updateTab('https://example.com/graphql', tabId, {
      query: '{ meetings { title } }'
    })
    expect(store.workspaces['https://example.com/graphql'].tabs[0].name).toBe('meetings')
  })

  it('does not auto-name when autoName is false', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    const tabId = store.workspaces['https://example.com/graphql'].tabs[0].id
    // User manually renamed
    store.updateTab('https://example.com/graphql', tabId, { autoName: false, name: 'My Query' })
    // Update query — should NOT auto-rename
    store.updateTab('https://example.com/graphql', tabId, { query: 'query GetUsers { users { name } }' })
    expect(store.workspaces['https://example.com/graphql'].tabs[0].name).toBe('My Query')
  })

  it('removes workspace entirely', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    store.removeWorkspace('https://example.com/graphql')
    expect(store.workspaces['https://example.com/graphql']).toBeUndefined()
  })

  it('currentWorkspace returns workspace for active endpoint', () => {
    const endpointsStore = useEndpointsStore()
    const store = useWorkspaceStore()
    endpointsStore.addEndpoint('https://example.com/graphql')
    store.ensureWorkspace('https://example.com/graphql')
    expect(store.currentWorkspace).not.toBeNull()
    expect(store.currentWorkspace!.tabs).toHaveLength(1)
  })

  it('currentWorkspace returns null when no active endpoint', () => {
    const store = useWorkspaceStore()
    expect(store.currentWorkspace).toBeNull()
  })

  it('currentTabs returns tabs for current workspace', () => {
    const endpointsStore = useEndpointsStore()
    const store = useWorkspaceStore()
    endpointsStore.addEndpoint('https://example.com/graphql')
    store.ensureWorkspace('https://example.com/graphql')
    expect(store.currentTabs).toHaveLength(1)
  })

  it('currentTabs returns empty array when no workspace', () => {
    const store = useWorkspaceStore()
    expect(store.currentTabs).toEqual([])
  })

  it('activeTab returns the active tab in current workspace', () => {
    const endpointsStore = useEndpointsStore()
    const store = useWorkspaceStore()
    endpointsStore.addEndpoint('https://example.com/graphql')
    store.ensureWorkspace('https://example.com/graphql')
    expect(store.activeTab).not.toBeNull()
    expect(store.activeTab!.name).toBe('New Tab')
  })

  it('activeTab falls back to first tab', () => {
    const endpointsStore = useEndpointsStore()
    const store = useWorkspaceStore()
    endpointsStore.addEndpoint('https://example.com/graphql')
    store.ensureWorkspace('https://example.com/graphql')
    // Set invalid active tab ID
    store.workspaces['https://example.com/graphql'].activeTabId = 'nonexistent'
    expect(store.activeTab).not.toBeNull()
  })

  it('activeTab returns null when no workspace', () => {
    const store = useWorkspaceStore()
    expect(store.activeTab).toBeNull()
  })

  it('persists to localStorage', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://example.com/graphql')
    const saved = JSON.parse(localStorage.getItem(playgroundConfig.storageKeys.workspaces)!)
    expect(saved['https://example.com/graphql']).toBeDefined()
    expect(saved['https://example.com/graphql'].tabs).toHaveLength(1)
  })

  it('loads saved workspaces from localStorage on init', () => {
    const tabId = 'tab-saved-1'
    const workspaces = {
      'https://saved.com/graphql': {
        tabs: [{ id: tabId, name: 'Saved Tab', autoName: true, query: '{ foo }', variables: '', results: null }],
        activeTabId: tabId
      }
    }
    localStorage.setItem(playgroundConfig.storageKeys.workspaces, JSON.stringify(workspaces))

    setActivePinia(createPinia())
    const store = useWorkspaceStore()
    expect(store.workspaces['https://saved.com/graphql']).toBeDefined()
    expect(store.workspaces['https://saved.com/graphql'].tabs[0].name).toBe('Saved Tab')
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(playgroundConfig.storageKeys.workspaces, '{broken')
    setActivePinia(createPinia())
    const store = useWorkspaceStore()
    expect(store.workspaces).toEqual({})
  })
})

describe('Settings Store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('initializes with default settings', () => {
    const store = useSettingsStore()
    expect(store.settings.editorFontSize).toBe(playgroundConfig.defaults.editorFontSize)
  })

  it('editorFontSize getter returns current value', () => {
    const store = useSettingsStore()
    expect(store.editorFontSize).toBe(14)
  })

  it('updates settings with partial updates', () => {
    const store = useSettingsStore()
    store.updateSettings({ editorFontSize: 18 })
    expect(store.settings.editorFontSize).toBe(18)
    expect(store.editorFontSize).toBe(18)
  })

  it('resets to defaults', () => {
    const store = useSettingsStore()
    store.updateSettings({ editorFontSize: 22 })
    store.resetToDefaults()
    expect(store.settings.editorFontSize).toBe(playgroundConfig.defaults.editorFontSize)
  })

  it('persists to localStorage on update', () => {
    const store = useSettingsStore()
    store.updateSettings({ editorFontSize: 20 })
    const saved = JSON.parse(localStorage.getItem(playgroundConfig.storageKeys.settings)!)
    expect(saved.editorFontSize).toBe(20)
  })

  it('persists to localStorage on reset', () => {
    const store = useSettingsStore()
    store.updateSettings({ editorFontSize: 20 })
    store.resetToDefaults()
    const saved = JSON.parse(localStorage.getItem(playgroundConfig.storageKeys.settings)!)
    expect(saved.editorFontSize).toBe(playgroundConfig.defaults.editorFontSize)
  })

  it('loads saved settings from localStorage on init', () => {
    localStorage.setItem(playgroundConfig.storageKeys.settings, JSON.stringify({ editorFontSize: 16 }))
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings.editorFontSize).toBe(16)
  })

  it('merges saved settings with defaults', () => {
    // Saved settings may not have all keys — defaults fill in the gaps
    localStorage.setItem(playgroundConfig.storageKeys.settings, JSON.stringify({}))
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings.editorFontSize).toBe(playgroundConfig.defaults.editorFontSize)
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(playgroundConfig.storageKeys.settings, 'not-json!')
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings.editorFontSize).toBe(playgroundConfig.defaults.editorFontSize)
  })
})
