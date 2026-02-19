<!-- app/components/ResultsPanel.vue -->
<template>
  <div class="h-full overflow-auto bg-gray-950 p-4 font-mono text-sm">
    <div v-if="!activeTab?.results" class="h-full flex items-center justify-center text-gray-500">
      <div class="text-center">
        <UIcon name="i-lucide-play" class="text-4xl mb-2" />
        <p>Hit the Play Button to</p>
        <p>get a response here</p>
      </div>
    </div>
    <pre v-else class="text-gray-200 whitespace-pre-wrap">{{ activeTab.results }}</pre>
  </div>
</template>

<script setup lang="ts">
const workspaceStore = useWorkspaceStore()
const activeTab = computed(() => workspaceStore.activeTab)
</script>
