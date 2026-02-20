<!-- app/components/HistoryModal.vue -->
<template>
  <UModal v-model:open="open" title="Query History" description="Browse and restore previous queries">
    <template #body>
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-sm text-gray-300">Query History</h3>
        <UButton
          v-if="entries.length > 0"
          label="Clear"
          variant="ghost"
          color="error"
          size="xs"
          @click="clearAndClose"
        />
      </div>

      <div v-if="entries.length === 0" class="text-gray-400 text-center py-4">
        No history yet. Execute a query to see it here.
      </div>
      <div v-else class="space-y-2 max-h-96 overflow-auto">
        <button
          v-for="(entry, i) in entries"
          :key="i"
          class="w-full text-left p-2 rounded bg-gray-900 hover:bg-gray-800 transition"
          @click="selectAndClose(entry)"
        >
          <pre class="text-xs text-gray-300 truncate font-mono">{{ entry.query.slice(0, 120) }}</pre>
          <span class="text-xs text-gray-400">{{ new Date(entry.timestamp).toLocaleString() }}</span>
        </button>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { HistoryEntry } from '~/composables/useHistory'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  select: [entry: HistoryEntry]
}>()

const endpointsStore = useEndpointsStore()
const historyState = useHistory()

const entries = computed(() => historyState.getEntriesForEndpoint(endpointsStore.activeEndpoint))

function clearAndClose() {
  historyState.clearHistory()
  open.value = false
}

function selectAndClose(entry: HistoryEntry) {
  emit('select', entry)
  open.value = false
}
</script>
