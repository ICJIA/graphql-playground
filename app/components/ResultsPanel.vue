<!-- app/components/ResultsPanel.vue -->
<template>
  <div class="h-full flex flex-col overflow-hidden bg-gray-950">
    <!-- Toolbar when results exist -->
    <div v-if="activeTab?.results" class="flex items-center justify-end gap-1 px-2 py-1 border-b border-gray-800">
      <UButton
        label="Copy"
        icon="i-lucide-clipboard-copy"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="copyResults"
      />
      <UButton
        label="Download"
        icon="i-lucide-download"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="downloadResults"
      />
    </div>

    <!-- Results content -->
    <div class="flex-1 overflow-auto p-4 font-mono text-sm">
      <div v-if="!activeTab?.results" class="h-full flex items-center justify-center text-gray-500">
        <div class="text-center">
          <UIcon name="i-lucide-play" class="text-4xl mb-2" />
          <p>Hit the Play Button to</p>
          <p>get a response here</p>
        </div>
      </div>
      <pre v-else class="text-gray-200 whitespace-pre-wrap">{{ activeTab.results }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const workspaceStore = useWorkspaceStore()
const toast = useToast()
const activeTab = computed(() => workspaceStore.activeTab)

function copyResults() {
  if (!activeTab.value?.results) return
  navigator.clipboard.writeText(activeTab.value.results)
  toast.add({ title: 'JSON copied to clipboard', color: 'success' })
}

function downloadResults() {
  if (!activeTab.value?.results) return

  const blob = new Blob([activeTab.value.results], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const tabName = activeTab.value.name.replace(/[^a-zA-Z0-9-_]/g, '_')
  a.download = `${tabName}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)

  toast.add({ title: 'JSON downloaded', color: 'success' })
}
</script>
