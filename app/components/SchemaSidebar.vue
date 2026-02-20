<!-- app/components/SchemaSidebar.vue -->
<template>
  <!-- Toggle buttons on right edge -->
  <div class="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col">
    <button
      class="px-1 py-3 bg-gray-800 text-gray-400 hover:text-white text-xs tracking-widest border border-gray-700 rounded-l"
      style="writing-mode: vertical-lr"
      @click="openPanel('docs')"
    >
      DOCS
    </button>
    <button
      class="px-1 py-3 bg-gray-800 text-gray-400 hover:text-white text-xs tracking-widest border border-gray-700 border-t-0 rounded-l"
      style="writing-mode: vertical-lr"
      @click="openPanel('schema')"
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

        <!-- Search + Download -->
        <div class="flex items-center gap-2">
          <UInput
            v-model="search"
            placeholder="Search types, fields..."
            icon="i-lucide-search"
            size="sm"
            class="flex-1"
          />
          <UButton
            icon="i-lucide-download"
            variant="ghost"
            color="neutral"
            size="sm"
            title="Download docs as JSON (for LLMs)"
            @click="downloadDocsJson"
          />
        </div>

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
            <SchemaTypeDetail v-for="type in filteredTypes" :key="type.name" :type="type" @navigate="navigateTo" />
          </div>
        </div>
      </div>

      <!-- SDL view -->
      <div v-else class="space-y-2 p-2">
        <div class="flex justify-end">
          <UButton
            icon="i-lucide-download"
            label="Download SDL"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="downloadSdl"
          />
        </div>
        <pre class="text-xs text-gray-300 font-mono whitespace-pre-wrap">{{ schemaState.sdl.value }}</pre>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import {
  isObjectType,
  isInterfaceType,
  isInputObjectType,
  isEnumType,
  isUnionType,
  isScalarType,
  type GraphQLObjectType,
  type GraphQLField
} from 'graphql'

const schemaState = inject<ReturnType<typeof useSchema>>('schemaState')!
const endpointsStore = useEndpointsStore()
const toast = useToast()

const isOpen = ref(false)
const activeView = ref<'docs' | 'schema'>('docs')
const search = ref('')
const typesExpanded = ref(false)

function openPanel(view: 'docs' | 'schema') {
  isOpen.value = true
  activeView.value = view
}

const filteredTypes = computed(() => {
  const types = schemaState.allTypes.value
  if (!search.value) return types
  const q = search.value.toLowerCase()
  return types.filter((t) => t.name.toLowerCase().includes(q))
})

/**
 * Sets the search filter to a type name and expands the types section for navigation.
 * @param {string} typeName - The type name to navigate to.
 */
function navigateTo(typeName: string) {
  search.value = typeName
  typesExpanded.value = true
}

/**
 * Converts the active endpoint URL hostname into a filename-safe slug.
 * @returns {string} A slug derived from the hostname with dots replaced by dashes.
 */
function getEndpointSlug(): string {
  try {
    const url = new URL(endpointsStore.activeEndpoint)
    return url.hostname.replace(/\./g, '-')
  } catch {
    return 'schema'
  }
}

/**
 * Creates a temporary Blob URL and triggers a browser file download.
 * @param {string} content - The file content to download.
 * @param {string} filename - The suggested filename for the download.
 * @param {string} type - The MIME type of the file.
 */
function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Downloads the current schema as a `.graphql` SDL file.
 */
function downloadSdl() {
  if (!schemaState.sdl.value) return
  const slug = getEndpointSlug()
  downloadFile(schemaState.sdl.value, `${slug}-schema.graphql`, 'text/plain')
  toast.add({ title: 'Schema SDL downloaded', icon: 'i-lucide-check-circle', color: 'success' })
}

/**
 * Converts a GraphQL object type's fields into a plain JSON-serializable structure.
 * @param {GraphQLObjectType} type - The GraphQL object type whose fields to serialize.
 * @returns {Array<Object>} An array of field descriptors with name, description, type, and args.
 */
function serializeFields(type: GraphQLObjectType) {
  return Object.values(type.getFields()).map((field: GraphQLField<any, any>) => ({
    name: field.name,
    description: field.description || null,
    type: field.type.toString(),
    args: field.args.map((arg) => ({
      name: arg.name,
      description: arg.description || null,
      type: arg.type.toString(),
      defaultValue: arg.defaultValue !== undefined ? arg.defaultValue : null
    }))
  }))
}

/**
 * Exports the full schema documentation as structured JSON, useful for LLM consumption.
 */
function downloadDocsJson() {
  const schema = schemaState.schema.value
  if (!schema) return

  const docs: Record<string, any> = {
    endpoint: endpointsStore.activeEndpoint,
    exportedAt: new Date().toISOString(),
    typeCount: schemaState.typeCount.value
  }

  // Queries
  const queryType = schema.getQueryType()
  if (queryType) {
    docs.queries = serializeFields(queryType)
  }

  // Mutations
  const mutationType = schema.getMutationType()
  if (mutationType) {
    docs.mutations = serializeFields(mutationType)
  }

  // Types
  docs.types = schemaState.allTypes.value.map((type) => {
    const entry: Record<string, any> = {
      name: type.name,
      description: (type as any).description || null,
      kind: getTypeKind(type)
    }

    if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
      entry.fields = Object.values(type.getFields()).map((f: any) => ({
        name: f.name,
        description: f.description || null,
        type: f.type.toString(),
        ...(f.args
          ? {
              args: f.args.map((a: any) => ({
                name: a.name,
                description: a.description || null,
                type: a.type.toString()
              }))
            }
          : {})
      }))
    }

    if (isEnumType(type)) {
      entry.values = type.getValues().map((v) => ({
        name: v.name,
        description: v.description || null
      }))
    }

    if (isUnionType(type)) {
      entry.possibleTypes = type.getTypes().map((t) => t.name)
    }

    return entry
  })

  const slug = getEndpointSlug()
  const json = JSON.stringify(docs, null, 2)
  downloadFile(json, `${slug}-docs.json`, 'application/json')
  toast.add({ title: 'Schema docs JSON downloaded', icon: 'i-lucide-check-circle', color: 'success' })
}

/**
 * Returns the GraphQL type kind string (OBJECT, INTERFACE, ENUM, etc.) for a given type.
 * @param {any} type - The GraphQL named type to classify.
 * @returns {string} The type kind string, or 'UNKNOWN' if unrecognized.
 */
function getTypeKind(type: any): string {
  if (isObjectType(type)) return 'OBJECT'
  if (isInterfaceType(type)) return 'INTERFACE'
  if (isInputObjectType(type)) return 'INPUT_OBJECT'
  if (isEnumType(type)) return 'ENUM'
  if (isUnionType(type)) return 'UNION'
  if (isScalarType(type)) return 'SCALAR'
  return 'UNKNOWN'
}
</script>
