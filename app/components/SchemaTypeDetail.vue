<!-- app/components/SchemaTypeDetail.vue -->
<template>
  <div>
    <button
      class="flex items-center gap-1 text-sm text-gray-300 w-full py-0.5 hover:text-white"
      @click="expanded = !expanded"
    >
      <UIcon :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="text-xs" />
      <span class="text-purple-400">{{ type.name }}</span>
    </button>
    <div v-if="expanded && hasFields" class="ml-4 space-y-0.5">
      <div v-for="field in fields" :key="field.name" class="text-xs">
        <span class="text-blue-300">{{ field.name }}</span>
        <span class="text-gray-500">: </span>
        <button class="text-green-400 hover:underline" @click="$emit('navigate', getTypeName(field.type))">
          {{ field.type.toString() }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  type GraphQLNamedType,
  type GraphQLType,
  getNamedType,
  isObjectType,
  isInterfaceType,
  isInputObjectType
} from 'graphql'

const props = defineProps<{
  type: GraphQLNamedType
}>()

defineEmits<{
  navigate: [typeName: string]
}>()

const expanded = ref(false)

const hasFields = computed(() => {
  return isObjectType(props.type) || isInterfaceType(props.type) || isInputObjectType(props.type)
})

const fields = computed(() => {
  if (hasFields.value) {
    return Object.values((props.type as any).getFields())
  }
  return []
})

function getTypeName(type: GraphQLType): string {
  const named = getNamedType(type)
  return named?.name || type.toString()
}
</script>
