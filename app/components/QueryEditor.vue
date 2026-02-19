<!-- app/components/QueryEditor.vue -->
<template>
  <div ref="editorContainer" class="h-full w-full overflow-hidden" />
</template>

<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { graphql } from 'cm6-graphql'
import { keymap } from '@codemirror/view'

const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()

const editorContainer = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null

const emit = defineEmits<{
  execute: []
}>()

function createEditor(doc: string) {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }

  if (!editorContainer.value) return

  const executeKeymap = keymap.of([
    {
      key: 'Ctrl-Enter',
      mac: 'Cmd-Enter',
      run: () => {
        emit('execute')
        return true
      }
    }
  ])

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const value = update.state.doc.toString()
      const tab = workspaceStore.activeTab
      if (tab) {
        workspaceStore.updateTab(
          endpointsStore.activeEndpoint,
          tab.id,
          { query: value }
        )
      }
    }
  })

  editorView = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        oneDark,
        ...graphql(),
        executeKeymap,
        updateListener,
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' }
        })
      ]
    }),
    parent: editorContainer.value
  })
}

// Rebuild editor when active tab changes
watch(
  () => workspaceStore.activeTab?.id,
  () => {
    const tab = workspaceStore.activeTab
    if (tab) {
      createEditor(tab.query)
    }
  }
)

onMounted(() => {
  const tab = workspaceStore.activeTab
  if (tab) {
    createEditor(tab.query)
  }
})

onUnmounted(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})

defineExpose({
  getView: () => editorView
})
</script>
