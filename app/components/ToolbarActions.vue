<!-- app/components/ToolbarActions.vue -->
<template>
  <div class="flex items-center gap-1">
    <UButton label="PRETTIFY" variant="ghost" color="neutral" size="xs" @click="prettify" />
    <UButton label="HISTORY" variant="ghost" color="neutral" size="xs" @click="historyOpen = true" />
    <UButton label="COPY CURL" variant="ghost" color="neutral" size="xs" @click="copyCurl" />

    <HistoryModal v-model:open="historyOpen" @select="onHistorySelect" />
  </div>
</template>

<script setup lang="ts">
import { parse, print } from 'graphql'
import type { HistoryEntry } from '~/composables/useHistory'

const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()
const toast = useToast()

const historyOpen = ref(false)

function prettify() {
  const tab = workspaceStore.activeTab
  if (!tab) return
  try {
    const formatted = print(parse(tab.query))
    workspaceStore.updateTab(endpointsStore.activeEndpoint, tab.id, { query: formatted })
  } catch {
    toast.add({ title: 'Could not prettify — check query syntax', color: 'error' })
  }
}

function copyCurl() {
  const endpoint = endpointsStore.activeEndpointData
  const tab = workspaceStore.activeTab
  if (!endpoint || !tab) return

  let curl = `curl -X POST '${endpoint.url}' \\\n  -H 'Content-Type: application/json'`

  if (endpoint.bearerToken) {
    curl += ` \\\n  -H 'Authorization: Bearer ${endpoint.bearerToken}'`
  }

  const body: Record<string, any> = { query: tab.query }
  if (tab.variables?.trim()) {
    try {
      body.variables = JSON.parse(tab.variables)
    } catch { /* skip invalid variables */ }
  }

  curl += ` \\\n  -d '${JSON.stringify(body)}'`

  navigator.clipboard.writeText(curl)
  toast.add({ title: 'CURL command copied to clipboard', color: 'success' })
}

function onHistorySelect(entry: HistoryEntry) {
  const tab = workspaceStore.activeTab
  if (!tab) return
  workspaceStore.updateTab(endpointsStore.activeEndpoint, tab.id, {
    query: entry.query,
    variables: entry.variables
  })
}
</script>
