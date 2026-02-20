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
   * Sends an introspection query to the active endpoint's proxy and builds the client schema.
   * Sets `introspectionDisabled` to true if the endpoint does not support introspection.
   */
  async function fetchSchema() {
    const endpoint = endpointsStore.activeEndpointData
    if (!endpoint) return

    isLoading.value = true
    introspectionDisabled.value = false
    isLargeSchema.value = false

    const headers: Record<string, string> = {}
    if (endpoint.bearerToken) {
      headers['Authorization'] = `Bearer ${endpoint.bearerToken}`
    }

    try {
      const result = await $fetch<{ data: IntrospectionQuery }>('/api/graphql-proxy', {
        method: 'POST',
        body: {
          endpoint: endpoint.url,
          query: getIntrospectionQuery(),
          headers
        }
      })

      if (result?.data) {
        schema.value = buildClientSchema(result.data)
        sdl.value = printSchema(schema.value)

        const types = Object.keys(schema.value.getTypeMap()).filter((t) => !t.startsWith('__'))
        typeCount.value = types.length
        isLargeSchema.value = types.length > LARGE_SCHEMA_THRESHOLD
      } else {
        introspectionDisabled.value = true
      }
    } catch {
      introspectionDisabled.value = true
      toast.add({
        title: 'Introspection unavailable',
        description: 'Schema docs are disabled. You can still run queries.',
        icon: 'i-lucide-alert-triangle',
        color: 'warning'
      })
    } finally {
      isLoading.value = false
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
