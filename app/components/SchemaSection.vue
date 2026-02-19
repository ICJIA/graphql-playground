<!-- app/components/SchemaSection.vue -->
<template>
  <div>
    <button
      class="flex items-center gap-1 text-sm font-semibold text-gray-300 w-full py-1"
      @click="expanded = !expanded"
    >
      <UIcon :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" />
      {{ title }} ({{ filteredFields.length }})
    </button>
    <div v-if="expanded" class="ml-4 space-y-1">
      <div v-for="field in filteredFields" :key="field.name" class="text-sm">
        <span class="text-blue-400">{{ field.name }}</span>
        <span class="text-gray-500">(</span>
        <span v-for="(arg, i) in field.args" :key="arg.name">
          <span class="text-yellow-300">{{ arg.name }}</span>
          <span class="text-gray-500">: </span>
          <button class="text-green-400 hover:underline" @click="$emit('navigate', getNamedTypeName(arg.type))">
            {{ arg.type.toString() }}
          </button>
          <span v-if="i < field.args.length - 1" class="text-gray-500">, </span>
        </span>
        <span class="text-gray-500">): </span>
        <button class="text-green-400 hover:underline" @click="$emit('navigate', getNamedTypeName(field.type))">
          {{ field.type.toString() }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type GraphQLObjectType, type GraphQLType, getNamedType } from 'graphql'

const props = defineProps<{
  title: string
  type: GraphQLObjectType
  search: string
}>()

defineEmits<{
  navigate: [typeName: string]
}>()

const expanded = ref(false)

const filteredFields = computed(() => {
  const fields = Object.values(props.type.getFields())
  if (!props.search) return fields
  const q = props.search.toLowerCase()
  return fields.filter(f => f.name.toLowerCase().includes(q))
})

function getNamedTypeName(type: GraphQLType): string {
  const named = getNamedType(type)
  return named?.name || type.toString()
}
</script>
