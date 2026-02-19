<!-- app/components/TabBar.vue -->
<template>
  <div class="flex items-center gap-1 overflow-x-auto" v-if="endpointsStore.activeEndpoint">
    <div
      v-for="tab in workspaceStore.currentTabs"
      :key="tab.id"
      class="flex items-center gap-1 px-3 py-1 rounded-t text-sm cursor-pointer shrink-0 group"
      :class="tab.id === workspaceStore.activeTab?.id
        ? 'bg-gray-800 text-white'
        : 'bg-gray-900 text-gray-400 hover:text-gray-200'"
      @click="workspaceStore.setActiveTab(endpointsStore.activeEndpoint, tab.id)"
    >
      <span
        v-if="editingTabId !== tab.id"
        @dblclick="startRenaming(tab.id, tab.name)"
        class="max-w-32 truncate"
      >
        {{ tab.name }}
      </span>
      <UInput
        v-else
        ref="renameInputRef"
        v-model="editingName"
        size="xs"
        class="w-24"
        @keydown.enter="finishRenaming(tab.id)"
        @blur="finishRenaming(tab.id)"
      />
      <UButton
        v-if="workspaceStore.currentTabs.length > 1"
        icon="i-lucide-x"
        variant="ghost"
        color="neutral"
        size="2xs"
        class="opacity-0 group-hover:opacity-100"
        @click.stop="workspaceStore.closeTab(endpointsStore.activeEndpoint, tab.id)"
      />
    </div>

    <UButton
      icon="i-lucide-plus"
      variant="ghost"
      color="neutral"
      size="xs"
      @click="workspaceStore.addTab(endpointsStore.activeEndpoint)"
    />
  </div>
</template>

<script setup lang="ts">
const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()

const editingTabId = ref<string | null>(null)
const editingName = ref('')
const renameInputRef = ref<InstanceType<typeof UInput> | null>(null)

function startRenaming(tabId: string, currentName: string) {
  editingTabId.value = tabId
  editingName.value = currentName
  nextTick(() => {
    const el = renameInputRef.value
    if (el) {
      // UInput exposes the native input via $el or we find it in the DOM
      const input = (el as any)?.$el?.querySelector?.('input') ?? (el as any)?.inputRef
      if (input && typeof input.focus === 'function') {
        input.focus()
        input.select()
      }
    }
  })
}

function finishRenaming(tabId: string) {
  if (editingName.value.trim()) {
    workspaceStore.updateTab(
      endpointsStore.activeEndpoint,
      tabId,
      { name: editingName.value.trim() }
    )
  }
  editingTabId.value = null
}
</script>
