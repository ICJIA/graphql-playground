<!-- app/components/SettingsModal.vue -->
<template>
  <UModal v-model:open="isOpen" title="Settings" description="Configure your playground preferences">
    <template #body>
      <div class="space-y-6 p-1">
        <!-- Editor Font Size -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-300">Editor Font Size</label>
          <div class="flex items-center gap-3">
            <UButton icon="i-lucide-minus" variant="ghost" size="xs" @click="adjustFontSize(-1)" />
            <span class="text-sm font-mono w-8 text-center">{{ settingsStore.editorFontSize }}</span>
            <UButton icon="i-lucide-plus" variant="ghost" size="xs" @click="adjustFontSize(1)" />
            <span class="text-xs text-gray-500 ml-2">px</span>
          </div>
        </div>

        <!-- Autocomplete Toggle -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-300">Autocomplete</p>
            <p class="text-xs text-gray-500">Schema-aware suggestions via Ctrl+Space</p>
          </div>
          <USwitch
            :model-value="settingsStore.autocomplete"
            @update:model-value="settingsStore.updateSettings({ autocomplete: $event })"
          />
        </div>

        <USeparator />

        <!-- Export / Import -->
        <div class="space-y-2">
          <p class="text-sm font-medium text-gray-300">Data Management</p>
          <div class="flex flex-wrap gap-2">
            <UButton
              label="Export Data"
              icon="i-lucide-download"
              variant="outline"
              color="neutral"
              size="sm"
              @click="exportData"
            />
            <UButton
              label="Import Data"
              icon="i-lucide-upload"
              variant="outline"
              color="neutral"
              size="sm"
              @click="triggerImport"
            />
          </div>
          <input ref="fileInput" type="file" accept=".json" class="hidden" @change="importData" />
        </div>

        <USeparator />

        <!-- Danger Zone -->
        <div class="space-y-3 rounded-lg border border-red-900/50 bg-red-950/20 p-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-alert-triangle" class="text-red-400" />
            <p class="text-sm font-semibold text-red-400">Danger Zone</p>
          </div>

          <p class="text-xs text-gray-400 leading-relaxed">
            This will permanently delete <strong class="text-gray-300">all saved data</strong> for
            this playground, including all saved endpoints, query workspaces, query history,
            bearer tokens, and settings. This applies to every GraphQL endpoint you've connected to.
            <strong class="text-red-400">This action cannot be undone.</strong>
          </p>

          <div v-if="!showClearConfirmation">
            <UButton
              label="Clear All Data"
              icon="i-lucide-trash-2"
              variant="outline"
              color="error"
              size="sm"
              @click="showClearConfirmation = true"
            />
          </div>

          <div v-else class="space-y-3 border-t border-red-900/30 pt-3">
            <p class="text-xs text-red-400 font-medium">
              Type <code class="bg-red-950 px-1 py-0.5 rounded font-mono">DELETE</code> to confirm:
            </p>
            <UInput
              v-model="clearConfirmText"
              placeholder="Type DELETE to confirm"
              size="sm"
              class="max-w-48"
              @keydown.enter="executeClear"
            />
            <div class="flex gap-2">
              <UButton
                label="Permanently Delete Everything"
                icon="i-lucide-trash-2"
                color="error"
                size="sm"
                :disabled="clearConfirmText !== 'DELETE'"
                @click="executeClear"
              />
              <UButton
                label="Cancel"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="cancelClear"
              />
            </div>
          </div>
        </div>

        <!-- App Info -->
        <div class="text-xs text-gray-600 space-y-2">
          <p>{{ config.app.name }} v{{ config.app.version }}</p>
          <div class="flex items-center gap-3">
            <a :href="config.app.repository" target="_blank" class="inline-flex items-center gap-1 text-primary-500 hover:underline">
              <UIcon name="i-lucide-github" class="text-sm" />
              GitHub Repository
            </a>
            <a :href="config.app.liveUrl" target="_blank" class="inline-flex items-center gap-1 text-primary-500 hover:underline">
              <UIcon name="i-lucide-external-link" class="text-sm" />
              Live Site
            </a>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { playgroundConfig as config } from '~/playground.config'

const isOpen = defineModel<boolean>('open', { default: false })

const settingsStore = useSettingsStore()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const showClearConfirmation = ref(false)
const clearConfirmText = ref('')

function adjustFontSize(delta: number) {
  const current = settingsStore.editorFontSize
  const next = Math.max(10, Math.min(24, current + delta))
  settingsStore.updateSettings({ editorFontSize: next })
}

function exportData() {
  const data: Record<string, any> = {
    version: config.app.version,
    exportedAt: new Date().toISOString()
  }

  for (const [name, key] of Object.entries(config.storageKeys)) {
    data[name] = localStorage.getItem(key)
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `graphql-playground-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)

  toast.add({ title: 'Data exported', color: 'success' })
}

function triggerImport() {
  fileInput.value?.click()
}

function importData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string)

      for (const [name, key] of Object.entries(config.storageKeys)) {
        if (data[name]) {
          localStorage.setItem(key, data[name])
        }
      }

      toast.add({ title: 'Data imported — reloading', color: 'success' })
      setTimeout(() => window.location.reload(), 500)
    } catch {
      toast.add({ title: 'Invalid export file', color: 'error' })
    }
  }
  reader.readAsText(file)
}

function cancelClear() {
  showClearConfirmation.value = false
  clearConfirmText.value = ''
}

function executeClear() {
  if (clearConfirmText.value !== 'DELETE') return

  for (const key of Object.values(config.storageKeys)) {
    localStorage.removeItem(key)
  }

  toast.add({ title: 'All data cleared — reloading', color: 'success' })
  setTimeout(() => window.location.reload(), 500)
}

// Reset confirmation state when modal closes
watch(isOpen, (open) => {
  if (!open) cancelClear()
})
</script>
