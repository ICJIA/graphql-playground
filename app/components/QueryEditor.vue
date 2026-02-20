<!-- app/components/QueryEditor.vue -->
<template>
  <div ref="editorContainer" class="h-full w-full overflow-hidden bg-gray-900" aria-label="GraphQL query editor" />
</template>

<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { graphql, updateSchema } from 'cm6-graphql'
import { keymap } from '@codemirror/view'

const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()
const settingsStore = useSettingsStore()
const schemaState = inject<ReturnType<typeof useSchema>>('schemaState')!

const editorContainer = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null
let updatingFromStore = false
const fontSizeCompartment = new Compartment()

const emit = defineEmits<{
  execute: []
}>()

/**
 * Creates a CodeMirror theme extension that applies the given font size to the editor content and gutters.
 * @param {number} size - The font size in pixels.
 * @returns {import('@codemirror/view').Extension} A CodeMirror theme extension.
 */
function fontSizeTheme(size: number) {
  return EditorView.theme({
    '.cm-content': { fontSize: `${size}px` },
    '.cm-gutters': { fontSize: `${size}px` }
  })
}

/**
 * Destroys the existing editor (if any) and creates a new CodeMirror instance with all extensions.
 * @param {string} doc - The initial document content for the editor.
 */
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
    if (update.docChanged && !updatingFromStore) {
      const value = update.state.doc.toString()
      const tab = workspaceStore.activeTab
      if (tab) {
        workspaceStore.updateTab(endpointsStore.activeEndpoint, tab.id, { query: value })
      }
    }
  })

  editorView = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        oneDark,
        ...graphql(schemaState.schema.value || undefined),
        executeKeymap,
        updateListener,
        fontSizeCompartment.of(fontSizeTheme(settingsStore.editorFontSize)),
        EditorView.contentAttributes.of({ 'aria-label': 'GraphQL query editor' }),
        EditorView.theme({
          '&': { height: '100%', backgroundColor: '#111827' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { backgroundColor: '#111827' },
          '.cm-gutters': { backgroundColor: '#111827', borderRight: '1px solid #1f2937' },
          '.cm-completionDetail': { display: 'none' }
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

// Update schema in editor when introspection completes or endpoint changes
watch(
  () => schemaState.schema.value,
  (newSchema) => {
    if (editorView) {
      updateSchema(editorView, newSchema || undefined)
    }
  }
)

// Update font size when settings change
watch(
  () => settingsStore.editorFontSize,
  (newSize) => {
    if (editorView) {
      editorView.dispatch({
        effects: fontSizeCompartment.reconfigure(fontSizeTheme(newSize))
      })
    }
  }
)

// Sync external query changes (e.g. prettify, history) into the editor
watch(
  () => workspaceStore.activeTab?.query,
  (newQuery) => {
    if (!editorView || newQuery == null) return
    const current = editorView.state.doc.toString()
    if (current !== newQuery) {
      updatingFromStore = true
      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: newQuery }
      })
      updatingFromStore = false
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
