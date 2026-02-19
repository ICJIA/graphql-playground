<!-- app/components/PlaygroundLayout.vue -->
<template>
  <div class="h-screen flex flex-col bg-gray-950 text-white">
    <!-- Top bar: Endpoint selector -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
      <div class="flex-1">
        <EndpointSelector ref="endpointSelector" />
      </div>
      <UButton icon="i-lucide-settings" variant="ghost" color="neutral" @click="settingsOpen = true" />
    </div>

    <!-- Connected: show playground -->
    <template v-if="endpointsStore.activeEndpoint">
      <!-- Tab bar + toolbar -->
      <div class="flex items-center justify-between px-4 py-1 border-b border-gray-800">
        <div class="flex-1">
          <TabBar />
        </div>
        <ToolbarActions />
      </div>

      <!-- Main content: split panes -->
      <div class="flex-1 overflow-hidden relative">
        <Splitpanes class="default-theme h-full">
          <Pane :size="50" :min-size="25">
            <div class="h-full flex flex-col bg-gray-900">
              <div class="flex-1 overflow-hidden">
                <QueryEditor @execute="executeQuery" />
              </div>
              <BottomPanels />
            </div>
          </Pane>

          <Pane :size="50" :min-size="25">
            <ResultsPanel />
          </Pane>
        </Splitpanes>

        <!-- Execute button overlay on the splitter -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <UButton
            icon="i-lucide-play"
            color="primary"
            variant="solid"
            size="xl"
            class="rounded-full shadow-lg"
            :loading="isExecuting"
            @click="executeQuery"
          />
        </div>
      </div>
    </template>

    <!-- Not connected: show welcome guide -->
    <template v-else>
      <div class="flex-1 overflow-hidden">
        <WelcomeGuide @connect="onQuickConnect" @manual="onManualConnect" />
      </div>
    </template>

    <!-- Schema sidebar toggle -->
    <SchemaSidebar />

    <!-- Settings modal -->
    <SettingsModal v-model:open="settingsOpen" />
  </div>
</template>

<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()
const { isExecuting, executeQuery } = useGraphQL()

const settingsOpen = ref(false)
const endpointSelector = ref()

// Provide schema state so QueryEditor and SchemaSidebar share one instance
const schemaState = useSchema()
provide('schemaState', schemaState)

/** Handles quick-connect from the welcome guide: connects to the endpoint and optionally pre-populates the first tab with an example query. */
/** Focuses the endpoint URL input for manual entry. */
function onManualConnect() {
  endpointSelector.value?.focusInput()
}

/** Handles quick-connect from the welcome guide: connects to the endpoint and optionally pre-populates the first tab with an example query. */
async function onQuickConnect(url: string, exampleQuery?: string) {
  // Trigger connection via the EndpointSelector and wait for it to complete
  await endpointSelector.value?.connectToUrl(url)

  // Pre-populate the first tab with the example query
  if (exampleQuery) {
    const tab = workspaceStore.activeTab
    if (tab) {
      workspaceStore.updateTab(url, tab.id, { query: exampleQuery })
    }
  }
}
</script>
