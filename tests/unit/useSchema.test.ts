import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { reactive, nextTick } from 'vue'

vi.mock('graphql', () => ({
  buildClientSchema: vi.fn(),
  getIntrospectionQuery: vi.fn(() => '{ __schema { queryType { name } } }'),
  printSchema: vi.fn(() => 'type Query { hello: String }')
}))

import { useSchema } from '../../app/composables/useSchema'
import { buildClientSchema, printSchema } from 'graphql'

const flushPromises = () => new Promise<void>(resolve => setTimeout(resolve, 0))

function createMockSchema(overrides: Record<string, any> = {}) {
  const typeMap: Record<string, { name: string }> = {
    Query: { name: 'Query' },
    String: { name: 'String' },
    Boolean: { name: 'Boolean' },
    __Schema: { name: '__Schema' },
    __Type: { name: '__Type' },
    ...overrides
  }
  return {
    getQueryType: () => ({ name: 'Query' }),
    getMutationType: () => null,
    getTypeMap: () => typeMap
  }
}

describe('useSchema', () => {
  const mockToastAdd = vi.fn()
  let mockStore: { activeEndpoint: string; activeEndpointData: any }

  function setupEndpoint(url = 'https://example.com/graphql', token = '') {
    mockStore.activeEndpoint = url
    mockStore.activeEndpointData = { url, bearerToken: token, label: url, lastUsed: new Date().toISOString() }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = reactive({
      activeEndpoint: '',
      activeEndpointData: null as any
    })
    ;(globalThis as any).useEndpointsStore = () => mockStore
    ;(globalThis as any).useToast = () => ({ add: mockToastAdd })
    ;(globalThis as any).$fetch = vi.fn()
    ;(buildClientSchema as any).mockReturnValue(createMockSchema())
  })

  it('returns all expected reactive properties', () => {
    const result = useSchema()
    expect(result).toHaveProperty('schema')
    expect(result).toHaveProperty('sdl')
    expect(result).toHaveProperty('isLoading')
    expect(result).toHaveProperty('introspectionDisabled')
    expect(result).toHaveProperty('isLargeSchema')
    expect(result).toHaveProperty('typeCount')
    expect(result).toHaveProperty('queryType')
    expect(result).toHaveProperty('mutationType')
    expect(result).toHaveProperty('allTypes')
    expect(result).toHaveProperty('fetchSchema')
  })

  it('initializes with null schema when no endpoint', () => {
    const { schema, sdl, isLoading, introspectionDisabled } = useSchema()
    expect(schema.value).toBeNull()
    expect(sdl.value).toBe('')
    expect(isLoading.value).toBe(false)
    expect(introspectionDisabled.value).toBe(false)
  })

  it('fetches and builds schema when endpoint is set before init', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: { __schema: { types: [] } } })
    setupEndpoint()

    const { schema, sdl, isLoading } = useSchema()
    await flushPromises()
    await nextTick()

    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/graphql-proxy', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        endpoint: 'https://example.com/graphql'
      })
    }))
    expect(buildClientSchema).toHaveBeenCalled()
    expect(schema.value).not.toBeNull()
    expect(sdl.value).toBe('type Query { hello: String }')
    expect(isLoading.value).toBe(false)
  })

  it('counts non-introspection types', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: { __schema: {} } })
    setupEndpoint()

    const { typeCount, isLargeSchema } = useSchema()
    await flushPromises()
    await nextTick()

    // Mock schema has Query, String, Boolean (3 non-__ types)
    expect(typeCount.value).toBe(3)
    expect(isLargeSchema.value).toBe(false)
  })

  it('sets introspectionDisabled when result has no data', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: null })
    setupEndpoint()

    const { introspectionDisabled } = useSchema()
    await flushPromises()
    await nextTick()

    expect(introspectionDisabled.value).toBe(true)
  })

  it('sends Authorization header when bearer token exists', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: { __schema: {} } })
    setupEndpoint('https://example.com/graphql', 'my-token')

    useSchema()
    await flushPromises()
    await nextTick()

    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/graphql-proxy', expect.objectContaining({
      body: expect.objectContaining({
        headers: { Authorization: 'Bearer my-token' }
      })
    }))
  })

  it('sends empty headers when no bearer token', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: { __schema: {} } })
    setupEndpoint()

    useSchema()
    await flushPromises()
    await nextTick()

    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/graphql-proxy', expect.objectContaining({
      body: expect.objectContaining({
        headers: {}
      })
    }))
  })

  it('clears schema when endpoint changes to empty', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: { __schema: {} } })
    setupEndpoint()

    const { schema, sdl } = useSchema()
    await flushPromises()
    await nextTick()

    expect(schema.value).not.toBeNull()

    // Clear endpoint
    mockStore.activeEndpoint = ''
    mockStore.activeEndpointData = null
    await nextTick()

    expect(schema.value).toBeNull()
    expect(sdl.value).toBe('')
  })

  it('computed queryType returns Query type from schema', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: { __schema: {} } })
    setupEndpoint()

    const { queryType } = useSchema()
    await flushPromises()
    await nextTick()

    expect(queryType.value).toEqual({ name: 'Query' })
  })

  it('computed mutationType returns null when not present', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: { __schema: {} } })
    setupEndpoint()

    const { mutationType } = useSchema()
    await flushPromises()
    await nextTick()

    expect(mutationType.value).toBeNull()
  })

  it('computed allTypes excludes introspection types and sorts', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: { __schema: {} } })
    setupEndpoint()

    const { allTypes } = useSchema()
    await flushPromises()
    await nextTick()

    const names = allTypes.value.map((t: any) => t.name)
    expect(names).toEqual(['Boolean', 'Query', 'String'])
    expect(names).not.toContain('__Schema')
    expect(names).not.toContain('__Type')
  })

  it('clears previous schema state before fetching', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: { __schema: {} } })
    setupEndpoint()

    const { schema, sdl, fetchSchema } = useSchema()
    await flushPromises()
    await nextTick()

    expect(schema.value).not.toBeNull()

    // Trigger another fetch — schema should be cleared during fetch
    let fetchResolve!: (value: any) => void
    ;(globalThis.$fetch as any).mockImplementation(() => new Promise(r => { fetchResolve = r }))

    const fetchPromise = fetchSchema()
    // During loading, previous schema should be cleared
    expect(schema.value).toBeNull()
    expect(sdl.value).toBe('')

    fetchResolve({ data: { __schema: {} } })
    await fetchPromise
  })

  it('silently ignores AbortError', async () => {
    const abortError = new DOMException('Aborted', 'AbortError')
    ;(globalThis.$fetch as any).mockRejectedValue(abortError)
    setupEndpoint()

    const { introspectionDisabled } = useSchema()
    await flushPromises()
    await nextTick()

    expect(mockToastAdd).not.toHaveBeenCalled()
  })

  it('does not set state when endpoint changes during fetch', async () => {
    let fetchResolve!: (value: any) => void
    ;(globalThis.$fetch as any).mockImplementation(() => new Promise(r => { fetchResolve = r }))
    setupEndpoint('https://first.com/graphql')

    const { introspectionDisabled } = useSchema()
    await nextTick()

    // Change endpoint before fetch resolves
    mockStore.activeEndpoint = 'https://second.com/graphql'

    // Resolve with null data — should not set introspectionDisabled since endpoint changed
    fetchResolve({ data: null })
    await flushPromises()
    await nextTick()
  })

  it('generates SDL from schema', async () => {
    ;(globalThis.$fetch as any).mockResolvedValue({ data: { __schema: {} } })
    setupEndpoint()

    const { sdl } = useSchema()
    await flushPromises()
    await nextTick()

    expect(printSchema).toHaveBeenCalled()
    expect(sdl.value).toBe('type Query { hello: String }')
  })

  it('returns early from fetchSchema when no endpoint data', async () => {
    const { fetchSchema } = useSchema()
    await fetchSchema()
    expect(globalThis.$fetch).not.toHaveBeenCalled()
  })

  describe('retry behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('retries once on transient failure and succeeds', async () => {
      ;(globalThis.$fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { __schema: { types: [] } } })

      setupEndpoint()
      const { schema, introspectionDisabled } = useSchema()

      // First attempt fails
      await vi.advanceTimersByTimeAsync(0)
      await nextTick()

      // Retry after 1s delay
      await vi.advanceTimersByTimeAsync(1000)
      await nextTick()
      await vi.advanceTimersByTimeAsync(0)
      await nextTick()

      expect(globalThis.$fetch).toHaveBeenCalledTimes(2)
      expect(schema.value).not.toBeNull()
      expect(introspectionDisabled.value).toBe(false)
    })

    it('shows toast after retry also fails', async () => {
      ;(globalThis.$fetch as any)
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))

      setupEndpoint()
      const { introspectionDisabled } = useSchema()

      // First attempt fails
      await vi.advanceTimersByTimeAsync(0)
      await nextTick()

      // Retry after 1s
      await vi.advanceTimersByTimeAsync(1000)
      await nextTick()
      await vi.advanceTimersByTimeAsync(0)
      await nextTick()

      expect(globalThis.$fetch).toHaveBeenCalledTimes(2)
      expect(introspectionDisabled.value).toBe(true)
      expect(mockToastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Introspection unavailable',
        color: 'warning'
      }))
    })

    it('does not retry if endpoint changed during delay', async () => {
      ;(globalThis.$fetch as any).mockRejectedValueOnce(new Error('fail'))

      setupEndpoint('https://first.com/graphql')
      useSchema()

      // First attempt fails
      await vi.advanceTimersByTimeAsync(0)
      await nextTick()

      // Change endpoint during the 1s retry delay
      // Set activeEndpointData to null so the watcher's fetchSchema returns early
      mockStore.activeEndpoint = 'https://other.com/graphql'
      mockStore.activeEndpointData = null
      await vi.advanceTimersByTimeAsync(1000)
      await nextTick()

      // Only the first attempt should have called $fetch
      // (retry skipped due to endpoint change, watcher's fetchSchema returned early)
      expect(globalThis.$fetch).toHaveBeenCalledTimes(1)
    })
  })
})
