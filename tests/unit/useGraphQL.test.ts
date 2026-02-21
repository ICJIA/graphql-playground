import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGraphQL } from '../../app/composables/useGraphQL'

describe('useGraphQL', () => {
  const mockUpdateTab = vi.fn()
  const mockAddEntry = vi.fn()
  const mockToastAdd = vi.fn()

  const defaultEndpoint = {
    url: 'https://example.com/graphql',
    label: 'Example',
    lastUsed: new Date().toISOString(),
    bearerToken: ''
  }

  const defaultTab = {
    id: 'tab-1',
    name: 'Test',
    autoName: true,
    query: '{ users { name } }',
    variables: '',
    results: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).useEndpointsStore = () => ({
      activeEndpointData: defaultEndpoint
    })
    ;(globalThis as any).useWorkspaceStore = () => ({
      activeTab: defaultTab,
      updateTab: mockUpdateTab
    })
    ;(globalThis as any).useToast = () => ({
      add: mockToastAdd
    })
    ;(globalThis as any).useHistory = () => ({
      addEntry: mockAddEntry
    })
    ;(globalThis as any).$fetch = vi.fn()
  })

  it('returns isExecuting ref and executeQuery function', () => {
    const { isExecuting, executeQuery } = useGraphQL()
    expect(isExecuting.value).toBe(false)
    expect(typeof executeQuery).toBe('function')
  })

  it('returns early when no endpoint data', async () => {
    ;(globalThis as any).useEndpointsStore = () => ({ activeEndpointData: null })
    const { executeQuery, isExecuting } = useGraphQL()
    await executeQuery()
    expect(isExecuting.value).toBe(false)
    expect(globalThis.$fetch).not.toHaveBeenCalled()
  })

  it('returns early when no active tab', async () => {
    ;(globalThis as any).useWorkspaceStore = () => ({ activeTab: null, updateTab: mockUpdateTab })
    const { executeQuery } = useGraphQL()
    await executeQuery()
    expect(globalThis.$fetch).not.toHaveBeenCalled()
  })

  it('sends query to proxy endpoint', async () => {
    const mockResult = { data: { users: [{ name: 'Alice' }] } }
    ;(globalThis.$fetch as any).mockResolvedValue(mockResult)

    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/graphql-proxy', {
      method: 'POST',
      body: {
        endpoint: 'https://example.com/graphql',
        query: '{ users { name } }',
        variables: undefined,
        headers: {}
      }
    })
  })

  it('stores formatted result in tab', async () => {
    const mockResult = { data: { users: [{ name: 'Alice' }] } }
    ;(globalThis.$fetch as any).mockResolvedValue(mockResult)

    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(mockUpdateTab).toHaveBeenCalledWith(
      'https://example.com/graphql',
      'tab-1',
      { results: JSON.stringify(mockResult, null, 2) }
    )
  })

  it('records history entry on success', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: {} })
    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(mockAddEntry).toHaveBeenCalledWith({
      query: '{ users { name } }',
      variables: '',
      endpoint: 'https://example.com/graphql'
    })
  })

  it('does not record history on failure', async () => {
    ;(globalThis.$fetch as any).mockRejectedValue(new Error('fail'))
    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(mockAddEntry).not.toHaveBeenCalled()
  })

  it('parses valid JSON variables', async () => {
    const tabWithVars = { ...defaultTab, variables: '{"id": 1, "name": "test"}' }
    ;(globalThis as any).useWorkspaceStore = () => ({
      activeTab: tabWithVars,
      updateTab: mockUpdateTab
    })
    ;(globalThis.$fetch as any).mockResolvedValue({ data: {} })

    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/graphql-proxy', expect.objectContaining({
      body: expect.objectContaining({
        variables: { id: 1, name: 'test' }
      })
    }))
  })

  it('shows error toast for invalid JSON variables', async () => {
    const tabWithBadVars = { ...defaultTab, variables: '{ bad json }' }
    ;(globalThis as any).useWorkspaceStore = () => ({
      activeTab: tabWithBadVars,
      updateTab: mockUpdateTab
    })

    const { executeQuery, isExecuting } = useGraphQL()
    await executeQuery()

    expect(mockToastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Invalid JSON in variables panel',
      color: 'error'
    }))
    expect(globalThis.$fetch).not.toHaveBeenCalled()
    expect(isExecuting.value).toBe(false)
  })

  it('skips variable parsing when variables is empty', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: {} })
    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/graphql-proxy', expect.objectContaining({
      body: expect.objectContaining({
        variables: undefined
      })
    }))
  })

  it('skips variable parsing when variables is whitespace', async () => {
    const tabWhitespace = { ...defaultTab, variables: '   ' }
    ;(globalThis as any).useWorkspaceStore = () => ({
      activeTab: tabWhitespace,
      updateTab: mockUpdateTab
    })
    ;(globalThis.$fetch as any).mockResolvedValue({ data: {} })

    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/graphql-proxy', expect.objectContaining({
      body: expect.objectContaining({
        variables: undefined
      })
    }))
  })

  it('adds Authorization header when bearer token exists', async () => {
    ;(globalThis as any).useEndpointsStore = () => ({
      activeEndpointData: { ...defaultEndpoint, bearerToken: 'my-secret-token' }
    })
    ;(globalThis.$fetch as any).mockResolvedValue({ data: {} })

    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/graphql-proxy', expect.objectContaining({
      body: expect.objectContaining({
        headers: { Authorization: 'Bearer my-secret-token' }
      })
    }))
  })

  it('sends empty headers when no bearer token', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: {} })

    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/graphql-proxy', expect.objectContaining({
      body: expect.objectContaining({
        headers: {}
      })
    }))
  })

  it('handles fetch error with error.message', async () => {
    ;(globalThis.$fetch as any).mockRejectedValue(new Error('Network error'))

    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(mockUpdateTab).toHaveBeenCalledWith(
      'https://example.com/graphql',
      'tab-1',
      { results: JSON.stringify({ error: 'Network error' }, null, 2) }
    )
  })

  it('handles fetch error with error.data.message', async () => {
    const error = new Error('Bad Request')
    ;(error as any).data = { message: 'Missing query field' }
    ;(globalThis.$fetch as any).mockRejectedValue(error)

    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(mockUpdateTab).toHaveBeenCalledWith(
      'https://example.com/graphql',
      'tab-1',
      { results: JSON.stringify({ error: 'Missing query field' }, null, 2) }
    )
  })

  it('shows error toast on failure', async () => {
    ;(globalThis.$fetch as any).mockRejectedValue(new Error('fail'))

    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(mockToastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Query failed',
      color: 'error'
    }))
  })

  it('falls back to "Request failed" when error has no message', async () => {
    ;(globalThis.$fetch as any).mockRejectedValue({})

    const { executeQuery } = useGraphQL()
    await executeQuery()

    expect(mockUpdateTab).toHaveBeenCalledWith(
      'https://example.com/graphql',
      'tab-1',
      { results: JSON.stringify({ error: 'Request failed' }, null, 2) }
    )
  })

  it('sets isExecuting true during execution', async () => {
    let resolve!: (value: any) => void
    ;(globalThis.$fetch as any).mockImplementation(() => new Promise(r => { resolve = r }))

    const { executeQuery, isExecuting } = useGraphQL()
    const promise = executeQuery()
    expect(isExecuting.value).toBe(true)

    resolve({ data: {} })
    await promise
    expect(isExecuting.value).toBe(false)
  })

  it('resets isExecuting on error', async () => {
    ;(globalThis.$fetch as any).mockRejectedValue(new Error('fail'))

    const { executeQuery, isExecuting } = useGraphQL()
    await executeQuery()
    expect(isExecuting.value).toBe(false)
  })
})
