// app/composables/useSchema.ts
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  type GraphQLSchema,
  type IntrospectionQuery
} from 'graphql'
import { playgroundConfig } from '~~/playground.config'

const LARGE_SCHEMA_THRESHOLD = playgroundConfig.schema.largeSchemaThreshold

/**
 * Composable for fetching and managing a GraphQL schema via introspection, providing the schema object, SDL, and type information.
 * @returns Reactive schema state, computed type helpers, and the `fetchSchema` function.
 */
export function useSchema() {
  const endpointsStore = useEndpointsStore()
  const toast = useToast()

  const schema = ref<GraphQLSchema | null>(null)
  const sdl = ref('')
  const isLoading = ref(false)
  const introspectionDisabled = ref(false)
  const isLargeSchema = ref(false)
  const typeCount = ref(0)

  let activeAbortController: AbortController | null = null

  /** The root Query type from the introspected schema, or null if unavailable. */
  const queryType = computed(() => schema.value?.getQueryType() || null)
  /** The root Mutation type from the introspected schema, or null if unavailable. */
  const mutationType = computed(() => schema.value?.getMutationType() || null)

  /** All non-introspection types from the schema, sorted alphabetically by name. */
  const allTypes = computed(() => {
    if (!schema.value) return []
    const typeMap = schema.value.getTypeMap()
    return Object.values(typeMap)
      .filter((t) => !t.name.startsWith('__'))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * Sends an introspection query to the proxy and processes the result.
   * Returns true on success, false on failure.
   */
  async function attemptIntrospection(
    fetchUrl: string,
    headers: Record<string, string>,
    abortController: AbortController
  ): Promise<boolean> {
    const result = await $fetch<{ data: IntrospectionQuery }>('/api/graphql-proxy', {
      method: 'POST',
      body: {
        endpoint: fetchUrl,
        query: getIntrospectionQuery(),
        headers
      },
      signal: abortController.signal
    })

    // Guard: ignore result if endpoint changed while awaiting
    if (endpointsStore.activeEndpoint !== fetchUrl) return false

    if (result?.data) {
      schema.value = buildClientSchema(result.data)
      sdl.value = printSchema(schema.value)

      const types = Object.keys(schema.value.getTypeMap()).filter((t) => !t.startsWith('__'))
      typeCount.value = types.length
      isLargeSchema.value = types.length > LARGE_SCHEMA_THRESHOLD
      return true
    }
    return false
  }

  /**
   * Sends an introspection query to the active endpoint's proxy and builds the client schema.
   * Cancels any in-flight request before starting a new one to prevent race conditions
   * when rapidly switching endpoints. Retries once on transient failures.
   */
  async function fetchSchema() {
    const endpoint = endpointsStore.activeEndpointData
    if (!endpoint) return

    // Cancel any in-flight request
    if (activeAbortController) {
      activeAbortController.abort()
    }
    const abortController = new AbortController()
    activeAbortController = abortController

    const fetchUrl = endpoint.url

    // Clear previous state
    schema.value = null
    sdl.value = ''
    isLoading.value = true
    introspectionDisabled.value = false
    isLargeSchema.value = false

    const headers: Record<string, string> = {}
    if (endpoint.bearerToken) {
      headers['Authorization'] = `Bearer ${endpoint.bearerToken}`
    }

    try {
      const success = await attemptIntrospection(fetchUrl, headers, abortController)
      if (!success && endpointsStore.activeEndpoint === fetchUrl) {
        introspectionDisabled.value = true
      }
    } catch (error: unknown) {
      // Silently ignore aborted requests — a newer fetch is already in progress
      if ((error as any)?.name === 'AbortError') return
      if (endpointsStore.activeEndpoint !== fetchUrl) return

      // Retry once after a short delay for transient failures
      try {
        await new Promise((r) => setTimeout(r, 1000))
        // Re-check: endpoint may have changed during the delay
        if (endpointsStore.activeEndpoint !== fetchUrl) return
        if (abortController.signal.aborted) return

        const success = await attemptIntrospection(fetchUrl, headers, abortController)
        if (!success && endpointsStore.activeEndpoint === fetchUrl) {
          introspectionDisabled.value = true
        }
      } catch (retryError: unknown) {
        if ((retryError as any)?.name === 'AbortError') return
        if (endpointsStore.activeEndpoint !== fetchUrl) return

        introspectionDisabled.value = true
        toast.add({
          title: 'Introspection unavailable',
          description: 'Schema docs are disabled. You can still run queries.',
          icon: 'i-lucide-alert-triangle',
          color: 'warning'
        })
      }
    } finally {
      // Only clear loading if this is still the active request
      if (endpointsStore.activeEndpoint === fetchUrl) {
        isLoading.value = false
      }
      if (activeAbortController === abortController) {
        activeAbortController = null
      }
    }
  }

  // Re-fetch schema when active endpoint changes
  watch(
    () => endpointsStore.activeEndpoint,
    (url) => {
      if (url) fetchSchema()
      else {
        schema.value = null
        sdl.value = ''
      }
    },
    { immediate: true }
  )

  return {
    schema,
    sdl,
    isLoading,
    introspectionDisabled,
    isLargeSchema,
    typeCount,
    queryType,
    mutationType,
    allTypes,
    fetchSchema
  }
}
