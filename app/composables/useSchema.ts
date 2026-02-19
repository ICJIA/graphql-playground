// app/composables/useSchema.ts
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  type GraphQLSchema,
  type IntrospectionQuery
} from 'graphql'
import { playgroundConfig } from '~/playground.config'

const LARGE_SCHEMA_THRESHOLD = playgroundConfig.schema.largeSchemaThreshold

export function useSchema() {
  const endpointsStore = useEndpointsStore()
  const toast = useToast()

  const schema = ref<GraphQLSchema | null>(null)
  const sdl = ref('')
  const isLoading = ref(false)
  const introspectionDisabled = ref(false)
  const isLargeSchema = ref(false)
  const typeCount = ref(0)

  const queryType = computed(() => schema.value?.getQueryType() || null)
  const mutationType = computed(() => schema.value?.getMutationType() || null)

  const allTypes = computed(() => {
    if (!schema.value) return []
    const typeMap = schema.value.getTypeMap()
    return Object.values(typeMap)
      .filter(t => !t.name.startsWith('__'))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

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

        const types = Object.keys(schema.value.getTypeMap()).filter(t => !t.startsWith('__'))
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
        color: 'warning'
      })
    } finally {
      isLoading.value = false
    }
  }

  // Re-fetch schema when active endpoint changes
  watch(() => endpointsStore.activeEndpoint, (url) => {
    if (url) fetchSchema()
    else {
      schema.value = null
      sdl.value = ''
    }
  }, { immediate: true })

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
