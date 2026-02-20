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
            <div class="h-full flex flex-col bg-gray-900 relative">
              <div class="absolute top-1 right-2 z-10 flex gap-1">
                <UButton label="CLEAR" variant="ghost" color="neutral" size="xs" class="cursor-pointer" @click="clearQuery" />
                <UButton label="PRETTIFY" variant="ghost" color="neutral" size="xs" class="cursor-pointer" @click="prettify" />
              </div>
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
      <!-- Status bar -->
      <div class="px-4 py-1 border-t border-gray-800 flex items-center justify-between">
        <button
          class="text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800/60 hover:bg-gray-700/60 cursor-pointer"
          @click="showQuickstart"
        >
          <UIcon name="i-lucide-rocket" class="text-xs" />
          Quickstart
        </button>
        <a
          :href="config.app.repository"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <UIcon name="i-lucide-github" class="text-sm" />
          GitHub
        </a>
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
import { parse, print } from 'graphql'
import { playgroundConfig as config } from '~~/playground.config'
import 'splitpanes/dist/splitpanes.css'

const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()
const { isExecuting, executeQuery } = useGraphQL()
const toast = useToast()

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
      workspaceStore.updateTab(url, tab.id, { query: exampleQuery, results: '' })
    }
  }
}

/** Clears the active tab's query and results. */
function clearQuery() {
  const tab = workspaceStore.activeTab
  if (!tab) return
  workspaceStore.updateTab(endpointsStore.activeEndpoint, tab.id, { query: '', results: '' })
}

/** Parses and re-prints the active tab's GraphQL query for consistent formatting. */
function prettify() {
  const tab = workspaceStore.activeTab
  if (!tab) return
  try {
    const formatted = print(parse(tab.query))
    workspaceStore.updateTab(endpointsStore.activeEndpoint, tab.id, { query: formatted })
  } catch {
    toast.add({ title: 'Could not prettify — check query syntax', icon: 'i-lucide-x-circle', color: 'error' })
  }
}

/** Deactivates the current endpoint to show the full-page welcome guide. All saved data is preserved in localStorage. */
function showQuickstart() {
  endpointsStore.activeEndpoint = ''
  endpointsStore.persist()
}
</script>
