<!-- app/components/TabBar.vue -->
<template>
  <div v-if="endpointsStore.activeEndpoint" class="flex items-center gap-1 overflow-x-auto">
    <div role="tablist" class="flex items-center gap-1">
      <template v-for="tab in workspaceStore.currentTabs" :key="tab.id">
        <!-- Normal tab: button with role="tab" -->
        <button
          v-if="editingTabId !== tab.id"
          role="tab"
          :aria-selected="tab.id === workspaceStore.activeTab?.id"
          class="flex items-center gap-1 px-3 py-1 rounded-t text-sm cursor-pointer shrink-0 group"
          :class="
            tab.id === workspaceStore.activeTab?.id
              ? 'bg-gray-800 text-white border-b-2 border-primary-500'
              : 'bg-gray-900 text-gray-400 hover:text-gray-200'
          "
          @click="workspaceStore.setActiveTab(endpointsStore.activeEndpoint, tab.id)"
          @dblclick.prevent="startRenaming(tab.id, tab.name)"
          @keydown.delete="workspaceStore.currentTabs.length > 1 && workspaceStore.closeTab(endpointsStore.activeEndpoint, tab.id)"
        >
          <span class="max-w-32 truncate">{{ tab.name }}</span>
          <span
            v-if="workspaceStore.currentTabs.length > 1"
            class="opacity-0 group-hover:opacity-100 rounded hover:bg-gray-700 p-0.5"
            aria-hidden="true"
            @click.stop="workspaceStore.closeTab(endpointsStore.activeEndpoint, tab.id)"
          >
            <UIcon name="i-lucide-x" class="text-xs" />
          </span>
        </button>

        <!-- Rename mode: input replaces the button -->
        <div
          v-else
          role="none"
          class="flex items-center gap-1 px-3 py-1 rounded-t text-sm shrink-0"
          :class="
            tab.id === workspaceStore.activeTab?.id
              ? 'bg-gray-800 text-white border-b-2 border-primary-500'
              : 'bg-gray-900 text-gray-400'
          "
        >
          <UInput
            ref="renameInputRef"
            v-model="editingName"
            size="xs"
            class="w-24"
            @keydown.enter="finishRenaming(tab.id)"
            @blur="finishRenaming(tab.id)"
          />
        </div>
      </template>
    </div>

    <UButton
      icon="i-lucide-plus"
      variant="ghost"
      color="neutral"
      size="xs"
      aria-label="Add new tab"
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

/** Activates inline rename mode for a tab, focusing the input and selecting its text. */
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

/** Saves the new tab name and disables auto-naming to preserve the user's manual rename. */
function finishRenaming(tabId: string) {
  if (editingName.value.trim()) {
    workspaceStore.updateTab(endpointsStore.activeEndpoint, tabId, { name: editingName.value.trim(), autoName: false })
  }
  editingTabId.value = null
}
</script>
