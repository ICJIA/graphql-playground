<!-- app/components/PlaygroundLayout.vue -->
<template>
  <div class="h-screen flex flex-col bg-gray-950 text-white">
    <!-- Top bar: Endpoint selector -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
      <div class="flex-1">
        <EndpointSelector />
      </div>
      <UButton icon="i-lucide-settings" variant="ghost" color="neutral" />
    </div>

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
          <div class="h-full flex flex-col">
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

    <!-- Schema sidebar toggle -->
    <SchemaSidebar />
  </div>
</template>

<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

const { isExecuting, executeQuery } = useGraphQL()
</script>
