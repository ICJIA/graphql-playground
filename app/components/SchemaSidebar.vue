<!-- app/components/SchemaSidebar.vue -->
<template>
  <!-- Toggle buttons on right edge -->
  <div class="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col">
    <button
      class="px-1 py-3 bg-gray-800 text-gray-400 hover:text-white text-xs tracking-widest border border-gray-700 rounded-l"
      style="writing-mode: vertical-lr"
      @click="isOpen = true; activeView = 'docs'"
    >
      DOCS
    </button>
    <button
      class="px-1 py-3 bg-gray-800 text-gray-400 hover:text-white text-xs tracking-widest border border-gray-700 border-t-0 rounded-l"
      style="writing-mode: vertical-lr"
      @click="isOpen = true; activeView = 'schema'"
    >
      SCHEMA
    </button>
  </div>

  <!-- Sidebar panel -->
  <USlideover
    v-model:open="isOpen"
    side="right"
    :title="activeView === 'docs' ? 'Schema Explorer' : 'Schema SDL'"
    description="Browse the GraphQL schema documentation"
  >
    <template #actions>
      <div class="flex gap-1">
        <UButton
          :variant="activeView === 'docs' ? 'solid' : 'ghost'"
          size="xs"
          label="Docs"
          @click="activeView = 'docs'"
        />
        <UButton
          :variant="activeView === 'schema' ? 'solid' : 'ghost'"
          size="xs"
          label="SDL"
          @click="activeView = 'schema'"
        />
      </div>
    </template>

    <template #body>
      <div v-if="schemaState.isLoading.value" class="flex items-center justify-center p-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
      </div>

      <div v-else-if="schemaState.introspectionDisabled.value" class="p-4 text-gray-400">
        Introspection is disabled on this endpoint. Schema documentation is not available.
      </div>

      <!-- Docs view -->
      <div v-else-if="activeView === 'docs'" class="space-y-2 p-2">
        <!-- Large schema warning -->
        <UAlert
          v-if="schemaState.isLargeSchema.value"
          title="Large schema detected"
          :description="`This schema has ${schemaState.typeCount.value} types. Consider using the native playground for better performance.`"
          color="warning"
          icon="i-lucide-alert-triangle"
        />

        <!-- Search -->
        <UInput
          v-model="search"
          placeholder="Search types, fields..."
          icon="i-lucide-search"
          size="sm"
        />

        <!-- Queries section -->
        <SchemaSection
          v-if="schemaState.queryType.value"
          title="Queries"
          :type="schemaState.queryType.value"
          :search="search"
          @navigate="navigateTo"
        />

        <!-- Mutations section -->
        <SchemaSection
          v-if="schemaState.mutationType.value"
          title="Mutations"
          :type="schemaState.mutationType.value"
          :search="search"
          @navigate="navigateTo"
        />

        <!-- Types section -->
        <div>
          <button
            class="flex items-center gap-1 text-sm font-semibold text-gray-300 w-full py-1"
            @click="typesExpanded = !typesExpanded"
          >
            <UIcon :name="typesExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" />
            Types ({{ filteredTypes.length }})
          </button>
          <div v-if="typesExpanded" class="ml-4 space-y-1">
            <SchemaTypeDetail
              v-for="type in filteredTypes"
              :key="type.name"
              :type="type"
              @navigate="navigateTo"
            />
          </div>
        </div>
      </div>

      <!-- SDL view -->
      <div v-else class="overflow-auto p-2">
        <pre class="text-xs text-gray-300 font-mono whitespace-pre-wrap">{{ schemaState.sdl.value }}</pre>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
const schemaState = useSchema()

const isOpen = ref(false)
const activeView = ref<'docs' | 'schema'>('docs')
const search = ref('')
const typesExpanded = ref(false)

const filteredTypes = computed(() => {
  const types = schemaState.allTypes.value
  if (!search.value) return types
  const q = search.value.toLowerCase()
  return types.filter(t => t.name.toLowerCase().includes(q))
})

function navigateTo(typeName: string) {
  search.value = typeName
  typesExpanded.value = true
}
</script>
