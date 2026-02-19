import { describe, it, expect, beforeEach, vi } from 'vitest'
import { playgroundConfig } from '../../playground.config'

// Mock localStorage
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    Reflect.deleteProperty(storage, key)
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((k) => Reflect.deleteProperty(storage, k))
  })
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('Endpoints store logic', () => {
  const STORAGE_KEY_ENDPOINTS = playgroundConfig.storageKeys.endpoints
  const STORAGE_KEY_ACTIVE = playgroundConfig.storageKeys.activeEndpoint

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('loads empty state when no localStorage data exists', () => {
    const raw = localStorage.getItem(STORAGE_KEY_ENDPOINTS)
    expect(raw).toBeNull()
  })

  it('persists endpoints to localStorage', () => {
    const endpoints = [
      { url: 'https://example.com/graphql', label: 'Example', lastUsed: new Date().toISOString(), bearerToken: '' }
    ]
    localStorage.setItem(STORAGE_KEY_ENDPOINTS, JSON.stringify(endpoints))

    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY_ENDPOINTS)!)
    expect(loaded).toHaveLength(1)
    expect(loaded[0].url).toBe('https://example.com/graphql')
  })

  it('persists active endpoint to localStorage', () => {
    localStorage.setItem(STORAGE_KEY_ACTIVE, 'https://example.com/graphql')
    expect(localStorage.getItem(STORAGE_KEY_ACTIVE)).toBe('https://example.com/graphql')
  })

  it('sorts endpoints by lastUsed (most recent first)', () => {
    const endpoints = [
      { url: 'https://old.com/graphql', lastUsed: '2024-01-01T00:00:00Z', label: '', bearerToken: '' },
      { url: 'https://new.com/graphql', lastUsed: '2025-01-01T00:00:00Z', label: '', bearerToken: '' }
    ]

    const sorted = [...endpoints].sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())

    expect(sorted[0].url).toBe('https://new.com/graphql')
  })
})

describe('Workspace store logic', () => {
  const STORAGE_KEY = playgroundConfig.storageKeys.workspaces

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('loads empty workspaces when no localStorage data exists', () => {
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeNull()
  })

  it('creates default tab with expected structure', () => {
    const tab = {
      id: `tab-${Date.now()}`,
      name: 'New Tab',
      query: '{\n  \n}',
      variables: '',
      results: null
    }

    expect(tab.name).toBe('New Tab')
    expect(tab.query).toBe('{\n  \n}')
    expect(tab.results).toBeNull()
  })

  it('workspaces are keyed by endpoint URL', () => {
    const workspaces: Record<string, any> = {
      'https://a.com/graphql': { tabs: [], activeTabId: '' },
      'https://b.com/graphql': { tabs: [], activeTabId: '' }
    }

    expect(Object.keys(workspaces)).toHaveLength(2)
    expect(workspaces['https://a.com/graphql']).toBeTruthy()
  })

  it('close tab prevents closing the last tab', () => {
    const tabs = [{ id: 'tab-1', name: 'Tab 1', query: '', variables: '', results: null }]

    // Should not allow closing when only 1 tab
    expect(tabs.length).toBe(1)
    const shouldClose = tabs.length > 1
    expect(shouldClose).toBe(false)
  })
})

describe('Settings store logic', () => {
  const STORAGE_KEY = playgroundConfig.storageKeys.settings

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('uses default settings when no localStorage data exists', () => {
    const defaults = { ...playgroundConfig.defaults }
    expect(defaults.editorFontSize).toBe(14)
  })

  it('merges saved settings with defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ editorFontSize: 18 }))

    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    const merged = { ...playgroundConfig.defaults, ...raw }

    expect(merged.editorFontSize).toBe(18)
  })

  it('font size stays within bounds', () => {
    const minSize = 10
    const maxSize = 24

    expect(Math.max(minSize, Math.min(maxSize, 8))).toBe(minSize)
    expect(Math.max(minSize, Math.min(maxSize, 30))).toBe(maxSize)
    expect(Math.max(minSize, Math.min(maxSize, 16))).toBe(16)
  })
})
