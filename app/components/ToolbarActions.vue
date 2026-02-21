<!-- app/components/ToolbarActions.vue -->
<template>
  <div class="flex items-center gap-1">
    <UButton label="HISTORY" variant="ghost" color="neutral" size="xs" @click="historyOpen = true" />
    <UButton label="COPY CURL" variant="ghost" color="neutral" size="xs" @click="copyCurl" />

    <HistoryModal v-model:open="historyOpen" @select="onHistorySelect" />
  </div>
</template>

<script setup lang="ts">
import type { HistoryEntry } from '~/composables/useHistory'

const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()
const toast = useToast()

const historyOpen = ref(false)

/** Escapes a string for safe inclusion inside single-quoted shell arguments. */
function shellEscape(s: string): string {
  return s.replace(/'/g, "'\\''")
}

/** Generates a curl command for the current query and copies it to the clipboard. */
function copyCurl() {
  const endpoint = endpointsStore.activeEndpointData
  const tab = workspaceStore.activeTab
  if (!endpoint || !tab) return

  let curl = `curl -X POST '${shellEscape(endpoint.url)}' \\\n  -H 'Content-Type: application/json'`

  if (endpoint.bearerToken) {
    curl += ` \\\n  -H 'Authorization: Bearer ${shellEscape(endpoint.bearerToken)}'`
  }

  const body: Record<string, any> = { query: tab.query }
  if (tab.variables?.trim()) {
    try {
      body.variables = JSON.parse(tab.variables)
    } catch {
      /* skip invalid variables */
    }
  }

  curl += ` \\\n  -d '${shellEscape(JSON.stringify(body))}'`

  navigator.clipboard.writeText(curl)
  const preview = curl.length > 300 ? curl.slice(0, 300) + '...' : curl
  toast.add({ title: 'CURL command copied to clipboard', description: preview, icon: 'i-lucide-check-circle', color: 'success', duration: 7000 })
}

/** Restores a history entry's query and variables, switching endpoints if needed. */
async function onHistorySelect(entry: HistoryEntry) {
  const targetEndpoint = entry.endpoint || endpointsStore.activeEndpoint

  // Switch endpoint if the history entry is from a different one
  if (targetEndpoint !== endpointsStore.activeEndpoint) {
    endpointsStore.setActiveEndpoint(targetEndpoint)
    workspaceStore.ensureWorkspace(targetEndpoint)
    // Wait for reactivity to propagate so workspace getters reflect the new endpoint
    await nextTick()
  }

  const tab = workspaceStore.activeTab
  if (!tab) return

  // Clear results and load the historical query
  workspaceStore.updateTab(targetEndpoint, tab.id, {
    query: entry.query,
    variables: entry.variables,
    results: ''
  })
}
</script>
