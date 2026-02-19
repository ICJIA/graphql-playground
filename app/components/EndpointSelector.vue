<!-- app/components/EndpointSelector.vue -->
<template>
  <div class="flex items-center gap-2">
    <UIcon name="i-lucide-globe" class="text-gray-400 shrink-0" />

    <div v-if="endpointsStore.endpoints.length > 0 && !isEditing" class="flex-1 flex items-center gap-2">
      <USelectMenu
        v-model="selectedUrl"
        :items="endpointOptions"
        value-key="value"
        class="flex-1"
        placeholder="Select an endpoint..."
        @update:model-value="onSelectEndpoint"
      />
      <UButton
        icon="i-lucide-pencil"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="startEditing"
      />
    </div>

    <div v-else class="flex-1 flex items-center gap-2">
      <UInput
        v-model="newUrl"
        placeholder="Enter GraphQL endpoint URL (e.g., https://api.example.com/graphql)"
        class="flex-1"
        :color="urlError ? 'error' : undefined"
        @keydown.enter="connectToEndpoint"
      />
      <UButton
        label="Connect"
        color="primary"
        :loading="isConnecting"
        :disabled="!newUrl.trim()"
        @click="connectToEndpoint"
      />
      <UButton
        v-if="endpointsStore.endpoints.length > 0"
        icon="i-lucide-x"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="cancelEditing"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()
const toast = useToast()

const isEditing = ref(false)
const isConnecting = ref(false)
const newUrl = ref('')
const urlError = ref('')

const selectedUrl = computed({
  get: () => endpointsStore.activeEndpoint,
  set: () => {}
})

const endpointOptions = computed(() =>
  endpointsStore.sortedEndpoints.map(ep => ({
    label: ep.label,
    value: ep.url
  }))
)

function startEditing() {
  isEditing.value = true
  newUrl.value = ''
  urlError.value = ''
}

function cancelEditing() {
  isEditing.value = false
  newUrl.value = ''
  urlError.value = ''
}

function onSelectEndpoint(url: string) {
  endpointsStore.setActiveEndpoint(url)
  workspaceStore.ensureWorkspace(url)
}

async function connectToEndpoint() {
  const url = newUrl.value.trim()
  urlError.value = ''

  try {
    new URL(url)
  } catch {
    urlError.value = 'Invalid URL format'
    toast.add({ title: 'Invalid URL format', color: 'error' })
    return
  }

  isConnecting.value = true

  try {
    await $fetch('/api/graphql-proxy', {
      method: 'POST',
      body: {
        endpoint: url,
        query: '{ __typename }'
      }
    })

    endpointsStore.addEndpoint(url)
    workspaceStore.ensureWorkspace(url)
    isEditing.value = false
    newUrl.value = ''
    toast.add({ title: 'Connected', description: url, color: 'success' })
  } catch (error: any) {
    urlError.value = 'Could not reach endpoint'
    toast.add({
      title: 'Could not reach endpoint',
      description: error?.data?.message || 'Check the URL and try again.',
      color: 'error'
    })
  } finally {
    isConnecting.value = false
  }
}

// Start in editing mode if no endpoints saved
if (endpointsStore.endpoints.length === 0) {
  isEditing.value = true
}
</script>
