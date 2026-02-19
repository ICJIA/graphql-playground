// app/composables/useGraphQL.ts
export function useGraphQL() {
  const endpointsStore = useEndpointsStore()
  const workspaceStore = useWorkspaceStore()
  const toast = useToast()
  const { addEntry } = useHistory()

  const isExecuting = ref(false)

  async function executeQuery() {
    const endpoint = endpointsStore.activeEndpointData
    const tab = workspaceStore.activeTab
    if (!endpoint || !tab) return

    isExecuting.value = true

    let variables: Record<string, any> | undefined
    if (tab.variables?.trim()) {
      try {
        variables = JSON.parse(tab.variables)
      } catch {
        toast.add({ title: 'Invalid JSON in variables panel', color: 'error' })
        isExecuting.value = false
        return
      }
    }

    const headers: Record<string, string> = {}
    if (endpoint.bearerToken) {
      headers['Authorization'] = `Bearer ${endpoint.bearerToken}`
    }

    try {
      const result = await $fetch('/api/graphql-proxy', {
        method: 'POST',
        body: {
          endpoint: endpoint.url,
          query: tab.query,
          variables,
          headers
        }
      })

      workspaceStore.updateTab(endpoint.url, tab.id, {
        results: JSON.stringify(result, null, 2)
      })

      addEntry({
        query: tab.query,
        variables: tab.variables,
        endpoint: endpoint.url
      })
    } catch (error: any) {
      const errorResult = {
        error: error?.data?.message || error?.message || 'Request failed'
      }
      workspaceStore.updateTab(endpoint.url, tab.id, {
        results: JSON.stringify(errorResult, null, 2)
      })
      toast.add({ title: 'Query failed', description: errorResult.error, color: 'error' })
    } finally {
      isExecuting.value = false
    }
  }

  return { isExecuting, executeQuery }
}
