import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEndpointsStore } from '../../app/stores/endpoints'
import { useWorkspaceStore } from '../../app/stores/workspace'
import { useSettingsStore } from '../../app/stores/settings'
import { safePersist } from '../../app/utils/storage'
import { playgroundConfig } from '../../playground.config'

// Make store factories available as globals (Nuxt auto-imports these)
globalThis.useEndpointsStore = useEndpointsStore as any
globalThis.useWorkspaceStore = useWorkspaceStore as any
globalThis.useSettingsStore = useSettingsStore as any

describe('safePersist — quota exceeded handling', () => {
  const mockToastAdd = vi.fn()

  beforeEach(() => {
    mockToastAdd.mockClear()
    ;(globalThis as any).useToast = () => ({ add: mockToastAdd })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true on successful write', () => {
    expect(safePersist('test-key', 'test-value')).toBe(true)
    expect(localStorage.getItem('test-key')).toBe('test-value')
  })

  it('returns false and shows toast on QuotaExceededError', () => {
    const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError')
    vi.stubGlobal(
      'localStorage',
      createFakeStorage(() => {
        throw quotaError
      })
    )

    const result = safePersist('test-key', 'big-data')
    expect(result).toBe(false)
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Storage full',
        color: 'warning'
      })
    )
  })

  it('returns false silently on non-quota errors', () => {
    vi.stubGlobal(
      'localStorage',
      createFakeStorage(() => {
        throw new Error('SecurityError')
      })
    )

    const result = safePersist('test-key', 'data')
    expect(result).toBe(false)
    expect(mockToastAdd).not.toHaveBeenCalled()
  })
})

describe('syncFromStorage — cross-tab synchronization', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('endpoints store reloads from localStorage on syncFromStorage', () => {
    const store = useEndpointsStore()
    store.addEndpoint('https://a.com/graphql')
    expect(store.endpoints).toHaveLength(1)

    // Simulate another tab writing to localStorage
    const newEndpoints = [
      { url: 'https://b.com/graphql', label: 'B', lastUsed: new Date().toISOString(), bearerToken: '' },
      { url: 'https://c.com/graphql', label: 'C', lastUsed: new Date().toISOString(), bearerToken: '' }
    ]
    localStorage.setItem(playgroundConfig.storageKeys.endpoints, JSON.stringify(newEndpoints))
    localStorage.setItem(playgroundConfig.storageKeys.activeEndpoint, 'https://c.com/graphql')

    store.syncFromStorage()
    expect(store.endpoints).toHaveLength(2)
    expect(store.endpoints[0].url).toBe('https://b.com/graphql')
    expect(store.activeEndpoint).toBe('https://c.com/graphql')
  })

  it('workspace store reloads from localStorage on syncFromStorage', () => {
    const store = useWorkspaceStore()
    store.ensureWorkspace('https://a.com/graphql')
    expect(Object.keys(store.workspaces)).toHaveLength(1)

    // Simulate another tab writing to localStorage
    const newWorkspaces = {
      'https://x.com/graphql': {
        tabs: [{ id: 'tab-1', name: 'Tab X', autoName: true, query: '{ x }', variables: '', results: null }],
        activeTabId: 'tab-1'
      }
    }
    localStorage.setItem(playgroundConfig.storageKeys.workspaces, JSON.stringify(newWorkspaces))

    store.syncFromStorage()
    expect(store.workspaces['https://a.com/graphql']).toBeUndefined()
    expect(store.workspaces['https://x.com/graphql']).toBeDefined()
    expect(store.workspaces['https://x.com/graphql'].tabs[0].name).toBe('Tab X')
  })

  it('settings store reloads from localStorage on syncFromStorage', () => {
    const store = useSettingsStore()
    expect(store.settings.editorFontSize).toBe(14)

    // Simulate another tab writing to localStorage
    localStorage.setItem(playgroundConfig.storageKeys.settings, JSON.stringify({ editorFontSize: 20 }))

    store.syncFromStorage()
    expect(store.settings.editorFontSize).toBe(20)
  })
})

/** Creates a minimal fake localStorage where setItem is replaced with the given function. */
function createFakeStorage(setItemImpl: (key: string, value: string) => void) {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: setItemImpl,
    removeItem: (key: string) => delete store[key],
    clear: () => Object.keys(store).forEach((k) => delete store[k]),
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length
    }
  }
}
