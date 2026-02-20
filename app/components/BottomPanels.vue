<!-- app/components/BottomPanels.vue -->
<template>
  <div class="border-t border-gray-800">
    <!-- Panel tabs -->
    <div class="flex items-center" role="tablist">
      <button
        v-for="panel in panels"
        :key="panel.key"
        role="tab"
        :aria-selected="activePanel === panel.key && isOpen"
        :aria-expanded="activePanel === panel.key && isOpen"
        class="px-3 py-1 text-xs uppercase tracking-wider"
        :class="
          activePanel === panel.key && isOpen
            ? 'text-white border-b-2 border-primary-500'
            : 'text-gray-400 hover:text-gray-300'
        "
        @click="togglePanel(panel.key)"
      >
        {{ panel.label }}
      </button>
    </div>

    <!-- Panel content (collapsible) -->
    <div v-if="isOpen" role="tabpanel" class="h-32 overflow-auto">
      <!-- Variables -->
      <div v-if="activePanel === 'variables'" class="h-full">
        <textarea
          :value="activeTab?.variables || ''"
          class="w-full h-full bg-gray-950 text-gray-200 p-2 font-mono text-sm resize-none outline-none border-none"
          placeholder='{"key": "value"}'
          @input="onVariablesChange"
        />
      </div>

      <!-- HTTP Headers / Bearer Token -->
      <div v-if="activePanel === 'headers'" class="p-2 space-y-2">
        <div class="flex items-center gap-2">
          <label for="bearer-token-input" class="text-xs text-gray-400 shrink-0 w-24">Bearer Token</label>
          <UInput
            id="bearer-token-input"
            :model-value="endpointsStore.activeEndpointData?.bearerToken || ''"
            type="password"
            placeholder="Enter bearer token..."
            class="flex-1"
            size="sm"
            @update:model-value="onTokenChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()

const activePanel = ref<'variables' | 'headers'>('variables')
const isOpen = ref(false)

const panels = [
  { key: 'variables' as const, label: 'Query Variables' },
  { key: 'headers' as const, label: 'HTTP Headers' }
]

const activeTab = computed(() => workspaceStore.activeTab)

/** Toggles a panel open/closed; if the same panel is clicked while already open, collapses it. */
function togglePanel(key: typeof activePanel.value) {
  if (activePanel.value === key && isOpen.value) {
    isOpen.value = false
  } else {
    activePanel.value = key
    isOpen.value = true
  }
}

/** Syncs the textarea input value to the active tab's variables in the workspace store. */
function onVariablesChange(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  const tab = workspaceStore.activeTab
  if (tab) {
    workspaceStore.updateTab(endpointsStore.activeEndpoint, tab.id, { variables: value })
  }
}

/** Updates the bearer token for the active endpoint. */
function onTokenChange(value: string) {
  endpointsStore.updateBearerToken(endpointsStore.activeEndpoint, value)
}
</script>
