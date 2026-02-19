import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHistory } from '../../app/composables/useHistory'
import { playgroundConfig } from '../../app/playground.config'

// localStorage is mocked in setup.ts via happy-dom

describe('useHistory', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset the shared state
    const { clearHistory } = useHistory()
    clearHistory()
  })

  it('starts with empty history', () => {
    const { getEntriesForEndpoint } = useHistory()
    expect(getEntriesForEndpoint('https://example.com/graphql')).toEqual([])
  })

  it('adds entries with timestamps', () => {
    const { addEntry, getEntriesForEndpoint } = useHistory()

    addEntry({
      query: '{ users { id } }',
      variables: '',
      endpoint: 'https://example.com/graphql'
    })

    const entries = getEntriesForEndpoint('https://example.com/graphql')
    expect(entries).toHaveLength(1)
    expect(entries[0].query).toBe('{ users { id } }')
    expect(entries[0].timestamp).toBeTruthy()
  })

  it('filters entries by endpoint', () => {
    const { addEntry, getEntriesForEndpoint } = useHistory()

    addEntry({ query: 'q1', variables: '', endpoint: 'https://a.com/graphql' })
    addEntry({ query: 'q2', variables: '', endpoint: 'https://b.com/graphql' })

    expect(getEntriesForEndpoint('https://a.com/graphql')).toHaveLength(1)
    expect(getEntriesForEndpoint('https://b.com/graphql')).toHaveLength(1)
    expect(getEntriesForEndpoint('https://c.com/graphql')).toHaveLength(0)
  })

  it('adds newest entries first', () => {
    const { addEntry, getEntriesForEndpoint } = useHistory()
    const ep = 'https://example.com/graphql'

    addEntry({ query: 'first', variables: '', endpoint: ep })
    addEntry({ query: 'second', variables: '', endpoint: ep })

    const entries = getEntriesForEndpoint(ep)
    expect(entries[0].query).toBe('second')
    expect(entries[1].query).toBe('first')
  })

  it('limits entries to max configured count', () => {
    const { addEntry, history } = useHistory()
    const ep = 'https://example.com/graphql'
    const max = playgroundConfig.history.maxEntries

    for (let i = 0; i < max + 10; i++) {
      addEntry({ query: `query ${i}`, variables: '', endpoint: ep })
    }

    expect(history.value.length).toBeLessThanOrEqual(max)
  })

  it('persists to localStorage', () => {
    const { addEntry } = useHistory()

    addEntry({
      query: '{ test }',
      variables: '',
      endpoint: 'https://example.com/graphql'
    })

    const stored = localStorage.getItem(playgroundConfig.storageKeys.history)
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(1)
  })

  it('clears all history', () => {
    const { addEntry, clearHistory, history } = useHistory()

    addEntry({ query: 'q1', variables: '', endpoint: 'https://a.com/graphql' })
    addEntry({ query: 'q2', variables: '', endpoint: 'https://b.com/graphql' })

    clearHistory()

    expect(history.value).toHaveLength(0)
  })
})
