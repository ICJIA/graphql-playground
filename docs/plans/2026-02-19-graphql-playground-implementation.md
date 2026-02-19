# GraphQL Playground Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a custom GraphQL playground SPA with configurable endpoints, per-endpoint workspaces, schema introspection, and Netlify CORS proxy.

**Architecture:** Single-page Nuxt 4 app (SPA mode) with CodeMirror 6 query editor, Pinia stores for state management with localStorage persistence, and a Nitro server route that proxies GraphQL requests to avoid CORS. Deployed on Netlify as static files + one serverless function.

**Tech Stack:** Nuxt 4.3.x, Nuxt UI 4.4.x, CodeMirror 6, cm6-graphql, graphql (npm), splitpanes, Pinia, Yarn 1.22.22, Node 22.14.0

---

### Task 1: Project Scaffolding

**Files:**
- Create: `.nvmrc`
- Create: `package.json` (via nuxi init)
- Create: `nuxt.config.ts`
- Create: `netlify.toml`
- Create: `app/app.vue`

**Step 1: Initialize Nuxt project**

```bash
cd /Volumes/satechi/webdev/graphql-playground-updated
npx nuxi@latest init . --force --packageManager yarn
```

If prompted, accept defaults. This creates the base Nuxt 4 project.

**Step 2: Create .nvmrc**

```
22.14.0
```

**Step 3: Install core dependencies**

```bash
yarn add @nuxt/ui splitpanes graphql
yarn add -D @types/splitpanes
```

**Step 4: Install CodeMirror dependencies**

```bash
yarn add codemirror @codemirror/lang-json @codemirror/theme-one-dark cm6-graphql
```

**Step 5: Configure nuxt.config.ts**

```typescript
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  ssr: false,

  app: {
    head: {
      title: 'GraphQL Playground',
      meta: [
        { name: 'description', content: 'A modern, configurable GraphQL playground' }
      ]
    }
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },

  devtools: { enabled: true },

  compatibilityDate: '2026-02-19'
})
```

**Step 6: Create netlify.toml**

```toml
[build]
  command = "yarn generate"
  publish = ".output/public"

[build.environment]
  NODE_VERSION = "22.14.0"
```

**Step 7: Set up minimal app/app.vue**

```vue
<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
```

**Step 8: Verify dev server starts**

Run: `yarn dev`
Expected: Nuxt dev server starts at http://localhost:3000 with a blank dark page.

**Step 9: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Nuxt 4 project with Nuxt UI, CodeMirror, and Netlify config"
```

---

### Task 2: GraphQL Proxy Server Route

**Files:**
- Create: `server/api/graphql-proxy.post.ts`

**Step 1: Create the proxy route**

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { endpoint, query, variables, headers: customHeaders } = body

  if (!endpoint || typeof endpoint !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid endpoint URL' })
  }

  try {
    new URL(endpoint)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid endpoint URL format' })
  }

  if (!query || typeof query !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid query' })
  }

  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  }

  try {
    const response = await $fetch(endpoint, {
      method: 'POST',
      headers: fetchHeaders,
      body: {
        query,
        variables: variables || undefined
      },
      timeout: 30000
    })

    return response
  } catch (error: any) {
    if (error?.data) {
      return error.data
    }

    throw createError({
      statusCode: error?.statusCode || 502,
      statusMessage: error?.message || 'Failed to reach the GraphQL endpoint'
    })
  }
})
```

**Step 2: Test the proxy manually**

Run dev server: `yarn dev`

Then in another terminal:
```bash
curl -X POST http://localhost:3000/api/graphql-proxy \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"https://spac.icjia-api.cloud/graphql","query":"{ __typename }"}'
```

Expected: `{"data":{"__typename":"Query"}}` (or similar valid response)

**Step 3: Test error case (bad URL)**

```bash
curl -X POST http://localhost:3000/api/graphql-proxy \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"not-a-url","query":"{ __typename }"}'
```

Expected: 400 error with "Invalid endpoint URL format"

**Step 4: Commit**

```bash
git add server/api/graphql-proxy.post.ts
git commit -m "feat: add GraphQL proxy server route for CORS-free requests"
```

---

### Task 3: Pinia Stores — Endpoint & Workspace State

**Files:**
- Create: `app/stores/endpoints.ts`
- Create: `app/stores/workspace.ts`
- Create: `app/types/index.ts`

**Step 1: Define TypeScript types**

```typescript
// app/types/index.ts
export interface SavedEndpoint {
  url: string
  label: string
  lastUsed: string // ISO date
  bearerToken: string
}

export interface QueryTab {
  id: string
  name: string
  query: string
  variables: string
  results: string | null
}

export interface Workspace {
  tabs: QueryTab[]
  activeTabId: string
}

export type WorkspaceMap = Record<string, Workspace>
```

**Step 2: Create endpoints store**

```typescript
// app/stores/endpoints.ts
import { defineStore } from 'pinia'
import type { SavedEndpoint } from '~/types'

const STORAGE_KEY_ENDPOINTS = 'gql-playground-endpoints'
const STORAGE_KEY_ACTIVE = 'gql-playground-active-endpoint'

function loadEndpoints(): SavedEndpoint[] {
  if (import.meta.server) return []
  const raw = localStorage.getItem(STORAGE_KEY_ENDPOINTS)
  return raw ? JSON.parse(raw) : []
}

function loadActiveEndpoint(): string {
  if (import.meta.server) return ''
  return localStorage.getItem(STORAGE_KEY_ACTIVE) || ''
}

export const useEndpointsStore = defineStore('endpoints', {
  state: () => ({
    endpoints: loadEndpoints(),
    activeEndpoint: loadActiveEndpoint()
  }),

  getters: {
    sortedEndpoints: (state) => {
      return [...state.endpoints].sort(
        (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      )
    },

    activeEndpointData: (state) => {
      return state.endpoints.find(e => e.url === state.activeEndpoint) || null
    }
  },

  actions: {
    addEndpoint(url: string, bearerToken: string = '') {
      const existing = this.endpoints.find(e => e.url === url)
      if (existing) {
        existing.lastUsed = new Date().toISOString()
        existing.bearerToken = bearerToken
      } else {
        this.endpoints.push({
          url,
          label: url,
          lastUsed: new Date().toISOString(),
          bearerToken
        })
      }
      this.activeEndpoint = url
      this.persist()
    },

    setActiveEndpoint(url: string) {
      const endpoint = this.endpoints.find(e => e.url === url)
      if (endpoint) {
        endpoint.lastUsed = new Date().toISOString()
        this.activeEndpoint = url
        this.persist()
      }
    },

    updateBearerToken(url: string, token: string) {
      const endpoint = this.endpoints.find(e => e.url === url)
      if (endpoint) {
        endpoint.bearerToken = token
        this.persist()
      }
    },

    removeEndpoint(url: string) {
      this.endpoints = this.endpoints.filter(e => e.url !== url)
      if (this.activeEndpoint === url) {
        this.activeEndpoint = this.endpoints[0]?.url || ''
      }
      this.persist()
    },

    persist() {
      localStorage.setItem(STORAGE_KEY_ENDPOINTS, JSON.stringify(this.endpoints))
      localStorage.setItem(STORAGE_KEY_ACTIVE, this.activeEndpoint)
    }
  }
})
```

**Step 3: Create workspace store**

```typescript
// app/stores/workspace.ts
import { defineStore } from 'pinia'
import type { QueryTab, Workspace, WorkspaceMap } from '~/types'

const STORAGE_KEY = 'gql-playground-workspaces'

function generateId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function createDefaultTab(): QueryTab {
  return {
    id: generateId(),
    name: 'New Tab',
    query: '{\n  \n}',
    variables: '',
    results: null
  }
}

function loadWorkspaces(): WorkspaceMap {
  if (import.meta.server) return {}
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : {}
}

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    workspaces: loadWorkspaces()
  }),

  getters: {
    currentWorkspace() {
      const endpointsStore = useEndpointsStore()
      const url = endpointsStore.activeEndpoint
      if (!url) return null
      return this.workspaces[url] || null
    },

    currentTabs(): QueryTab[] {
      return this.currentWorkspace?.tabs || []
    },

    activeTab(): QueryTab | null {
      const ws = this.currentWorkspace
      if (!ws) return null
      return ws.tabs.find(t => t.id === ws.activeTabId) || ws.tabs[0] || null
    }
  },

  actions: {
    ensureWorkspace(url: string) {
      if (!this.workspaces[url]) {
        const defaultTab = createDefaultTab()
        this.workspaces[url] = {
          tabs: [defaultTab],
          activeTabId: defaultTab.id
        }
        this.persist()
      }
    },

    addTab(url: string) {
      const ws = this.workspaces[url]
      if (!ws) return
      const tab = createDefaultTab()
      ws.tabs.push(tab)
      ws.activeTabId = tab.id
      this.persist()
    },

    closeTab(url: string, tabId: string) {
      const ws = this.workspaces[url]
      if (!ws || ws.tabs.length <= 1) return
      ws.tabs = ws.tabs.filter(t => t.id !== tabId)
      if (ws.activeTabId === tabId) {
        ws.activeTabId = ws.tabs[0].id
      }
      this.persist()
    },

    setActiveTab(url: string, tabId: string) {
      const ws = this.workspaces[url]
      if (!ws) return
      ws.activeTabId = tabId
      this.persist()
    },

    updateTab(url: string, tabId: string, updates: Partial<QueryTab>) {
      const ws = this.workspaces[url]
      if (!ws) return
      const tab = ws.tabs.find(t => t.id === tabId)
      if (tab) {
        Object.assign(tab, updates)
        this.persist()
      }
    },

    removeWorkspace(url: string) {
      delete this.workspaces[url]
      this.persist()
    },

    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workspaces))
    }
  }
})
```

**Step 4: Verify stores load without errors**

Run: `yarn dev`
Open browser console and verify no errors. Stores won't be used yet but should not crash.

**Step 5: Commit**

```bash
git add app/types/index.ts app/stores/endpoints.ts app/stores/workspace.ts
git commit -m "feat: add Pinia stores for endpoint management and per-endpoint workspaces"
```

---

### Task 4: Page Layout Shell with Split Panes

**Files:**
- Create: `app/pages/index.vue`
- Create: `app/components/PlaygroundLayout.vue`
- Modify: `app/app.vue`

**Step 1: Create the main page**

```vue
<!-- app/pages/index.vue -->
<template>
  <PlaygroundLayout />
</template>
```

**Step 2: Create PlaygroundLayout with splitpanes**

```vue
<!-- app/components/PlaygroundLayout.vue -->
<template>
  <div class="h-screen flex flex-col bg-gray-950 text-white">
    <!-- Top bar: Endpoint selector -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
      <div class="flex-1">
        <EndpointSelector />
      </div>
      <UButton icon="i-lucide-settings" variant="ghost" color="neutral" />
    </div>

    <!-- Tab bar + toolbar -->
    <div class="flex items-center justify-between px-4 py-1 border-b border-gray-800">
      <div class="flex-1">
        <TabBar />
      </div>
      <ToolbarActions />
    </div>

    <!-- Main content: split panes -->
    <div class="flex-1 overflow-hidden">
      <Splitpanes class="default-theme h-full">
        <Pane :size="50" :min-size="25">
          <div class="h-full flex flex-col">
            <div class="flex-1 overflow-hidden">
              <QueryEditor />
            </div>
            <BottomPanels />
          </div>
        </Pane>

        <Pane :size="50" :min-size="25">
          <ResultsPanel />
        </Pane>
      </Splitpanes>
    </div>

    <!-- Schema sidebar toggle -->
    <SchemaSidebar />
  </div>
</template>

<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
</script>
```

**Step 3: Create placeholder components**

Create these placeholder files so the layout compiles. Each will be a simple `<template><div>ComponentName</div></template>` stub:

- `app/components/EndpointSelector.vue`
- `app/components/TabBar.vue`
- `app/components/ToolbarActions.vue`
- `app/components/QueryEditor.vue`
- `app/components/BottomPanels.vue`
- `app/components/ResultsPanel.vue`
- `app/components/SchemaSidebar.vue`

Each stub:
```vue
<template>
  <div class="p-2 text-gray-500 text-sm">[ComponentName placeholder]</div>
</template>
```

**Step 4: Add splitpanes dark theme overrides**

Create `app/assets/css/splitpanes.css`:
```css
.splitpanes.default-theme .splitpanes__splitter {
  background-color: #1f2937;
  border-color: #374151;
}
.splitpanes.default-theme .splitpanes__splitter:hover {
  background-color: #3b82f6;
}
```

Import it in `nuxt.config.ts`:
```typescript
css: ['~/assets/css/splitpanes.css'],
```

**Step 5: Verify layout renders**

Run: `yarn dev`
Expected: Dark page with a top bar, tab bar, two split panes with placeholder text, and no errors.

**Step 6: Commit**

```bash
git add app/
git commit -m "feat: add page layout shell with split panes and placeholder components"
```

---

### Task 5: Endpoint Selector Component

**Files:**
- Modify: `app/components/EndpointSelector.vue`

**Step 1: Build the endpoint selector**

```vue
<!-- app/components/EndpointSelector.vue -->
<template>
  <div class="flex items-center gap-2">
    <UIcon name="i-lucide-globe" class="text-gray-400 shrink-0" />

    <div v-if="endpointsStore.endpoints.length > 0 && !isEditing" class="flex-1 flex items-center gap-2">
      <USelectMenu
        v-model="selectedUrl"
        :items="endpointOptions"
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
```

**Step 2: Test manually**

Run: `yarn dev`
1. Page should show a URL input (no endpoints saved yet)
2. Enter `https://spac.icjia-api.cloud/graphql` and click Connect
3. Should show "Connected" toast and switch to dropdown mode
4. Reload page — endpoint should persist

**Step 3: Commit**

```bash
git add app/components/EndpointSelector.vue
git commit -m "feat: add endpoint selector with URL validation, connect flow, and persistence"
```

---

### Task 6: Tab Bar Component

**Files:**
- Modify: `app/components/TabBar.vue`

**Step 1: Build the tab bar**

```vue
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
        v-model="editingName"
        size="xs"
        class="w-24"
        autofocus
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

function startRenaming(tabId: string, currentName: string) {
  editingTabId.value = tabId
  editingName.value = currentName
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
```

**Step 2: Test manually**

1. Connect to an endpoint — should show one "New Tab"
2. Click `+` — adds another tab
3. Double-click a tab name — inline rename
4. Hover tab X button to close
5. Reload — tabs persist

**Step 3: Commit**

```bash
git add app/components/TabBar.vue
git commit -m "feat: add tab bar with rename, close, add, and per-endpoint persistence"
```

---

### Task 7: Query Editor with CodeMirror 6

**Files:**
- Modify: `app/components/QueryEditor.vue`

**Step 1: Build the query editor**

```vue
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
        graphql(),
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
  },
  { immediate: true }
)

onMounted(() => {
  const tab = workspaceStore.activeTab
  if (tab) {
    createEditor(tab.query)
  }
})

onUnmounted(() => {
  editorView?.destroy()
})

defineExpose({
  getView: () => editorView
})
</script>
```

**Step 2: Test manually**

1. Connect to endpoint, should see CodeMirror editor with `{ }` default content
2. Type a query — should have GraphQL syntax highlighting
3. Switch tabs — editor content swaps
4. Reload — query content persists

**Step 3: Commit**

```bash
git add app/components/QueryEditor.vue
git commit -m "feat: add CodeMirror 6 query editor with GraphQL syntax and tab persistence"
```

---

### Task 8: Execute Button & Results Panel

**Files:**
- Create: `app/composables/useGraphQL.ts`
- Modify: `app/components/ResultsPanel.vue`
- Modify: `app/components/PlaygroundLayout.vue` (add execute button to splitter)

**Step 1: Create the GraphQL execution composable**

```typescript
// app/composables/useGraphQL.ts
export function useGraphQL() {
  const endpointsStore = useEndpointsStore()
  const workspaceStore = useWorkspaceStore()
  const toast = useToast()

  const isExecuting = ref(false)

  async function executeQuery() {
    const endpoint = endpointsStore.activeEndpointData
    const tab = workspaceStore.activeTab
    if (!endpoint || !tab) return

    isExecuting.value = true

    let variables: Record<string, any> | undefined
    if (tab.variables?.trim()) {
      try {
        variables = JSON.parse(tab.variables)
      } catch {
        toast.add({ title: 'Invalid JSON in variables panel', color: 'error' })
        isExecuting.value = false
        return
      }
    }

    const headers: Record<string, string> = {}
    if (endpoint.bearerToken) {
      headers['Authorization'] = `Bearer ${endpoint.bearerToken}`
    }

    try {
      const result = await $fetch('/api/graphql-proxy', {
        method: 'POST',
        body: {
          endpoint: endpoint.url,
          query: tab.query,
          variables,
          headers
        }
      })

      workspaceStore.updateTab(endpoint.url, tab.id, {
        results: JSON.stringify(result, null, 2)
      })
    } catch (error: any) {
      const errorResult = {
        error: error?.data?.message || error?.message || 'Request failed'
      }
      workspaceStore.updateTab(endpoint.url, tab.id, {
        results: JSON.stringify(errorResult, null, 2)
      })
      toast.add({ title: 'Query failed', description: errorResult.error, color: 'error' })
    } finally {
      isExecuting.value = false
    }
  }

  return { isExecuting, executeQuery }
}
```

**Step 2: Build the results panel**

```vue
<!-- app/components/ResultsPanel.vue -->
<template>
  <div class="h-full overflow-auto bg-gray-950 p-4 font-mono text-sm">
    <div v-if="!activeTab?.results" class="h-full flex items-center justify-center text-gray-500">
      <div class="text-center">
        <UIcon name="i-lucide-play" class="text-4xl mb-2" />
        <p>Hit the Play Button to</p>
        <p>get a response here</p>
      </div>
    </div>
    <pre v-else class="text-gray-200 whitespace-pre-wrap">{{ activeTab.results }}</pre>
  </div>
</template>

<script setup lang="ts">
const workspaceStore = useWorkspaceStore()
const activeTab = computed(() => workspaceStore.activeTab)
</script>
```

**Step 3: Update PlaygroundLayout to wire up execute**

In `PlaygroundLayout.vue`, update the split panes section to include the execute button overlay. Add between the two `<Pane>` elements, position the execute button absolutely over the splitter:

```vue
<!-- Update the Splitpanes section in PlaygroundLayout.vue -->
<div class="flex-1 overflow-hidden relative">
  <Splitpanes class="default-theme h-full">
    <Pane :size="50" :min-size="25">
      <div class="h-full flex flex-col">
        <div class="flex-1 overflow-hidden">
          <QueryEditor @execute="executeQuery" />
        </div>
        <BottomPanels />
      </div>
    </Pane>

    <Pane :size="50" :min-size="25">
      <ResultsPanel />
    </Pane>
  </Splitpanes>

  <!-- Execute button overlay on the splitter -->
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
    <UButton
      icon="i-lucide-play"
      color="primary"
      variant="solid"
      size="xl"
      class="rounded-full shadow-lg"
      :loading="isExecuting"
      @click="executeQuery"
    />
  </div>
</div>
```

Add the script:
```vue
<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

const { isExecuting, executeQuery } = useGraphQL()
</script>
```

**Step 4: Test end-to-end query execution**

1. Connect to `https://spac.icjia-api.cloud/graphql`
2. Type query: `{ meetings { data { id } } }`
3. Click play button — results should appear formatted in right panel
4. Try Ctrl+Enter / Cmd+Enter — should also execute

**Step 5: Commit**

```bash
git add app/composables/useGraphQL.ts app/components/ResultsPanel.vue app/components/PlaygroundLayout.vue
git commit -m "feat: add query execution with play button, results panel, and keyboard shortcut"
```

---

### Task 9: Bottom Panels — Variables & Headers

**Files:**
- Modify: `app/components/BottomPanels.vue`

**Step 1: Build the bottom panels**

```vue
<!-- app/components/BottomPanels.vue -->
<template>
  <div class="border-t border-gray-800">
    <!-- Panel tabs -->
    <div class="flex items-center">
      <button
        v-for="panel in panels"
        :key="panel.key"
        class="px-3 py-1 text-xs uppercase tracking-wider"
        :class="activePanel === panel.key
          ? 'text-white border-b-2 border-primary-500'
          : 'text-gray-500 hover:text-gray-300'"
        @click="togglePanel(panel.key)"
      >
        {{ panel.label }}
      </button>
    </div>

    <!-- Panel content (collapsible) -->
    <div v-if="isOpen" class="h-32 overflow-auto">
      <!-- Variables -->
      <div v-if="activePanel === 'variables'" class="h-full">
        <textarea
          :value="activeTab?.variables || ''"
          @input="onVariablesChange"
          class="w-full h-full bg-gray-950 text-gray-200 p-2 font-mono text-sm resize-none outline-none"
          placeholder='{"key": "value"}'
        />
      </div>

      <!-- HTTP Headers / Bearer Token -->
      <div v-if="activePanel === 'headers'" class="p-2 space-y-2">
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-400 shrink-0 w-24">Bearer Token</label>
          <UInput
            :model-value="endpointsStore.activeEndpointData?.bearerToken || ''"
            @update:model-value="onTokenChange"
            type="password"
            placeholder="Enter bearer token..."
            class="flex-1"
            size="sm"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()

const activePanel = ref<'variables' | 'headers'>('variables')
const isOpen = ref(false)

const panels = [
  { key: 'variables' as const, label: 'Query Variables' },
  { key: 'headers' as const, label: 'HTTP Headers' }
]

const activeTab = computed(() => workspaceStore.activeTab)

function togglePanel(key: typeof activePanel.value) {
  if (activePanel.value === key && isOpen.value) {
    isOpen.value = false
  } else {
    activePanel.value = key
    isOpen.value = true
  }
}

function onVariablesChange(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  const tab = workspaceStore.activeTab
  if (tab) {
    workspaceStore.updateTab(endpointsStore.activeEndpoint, tab.id, { variables: value })
  }
}

function onTokenChange(value: string) {
  endpointsStore.updateBearerToken(endpointsStore.activeEndpoint, value)
}
</script>
```

**Step 2: Test**

1. Click "Query Variables" — panel toggles open/closed
2. Enter JSON variables — persists with tab
3. Click "HTTP Headers" — shows bearer token input
4. Enter a token — persists with endpoint
5. Execute a query on a protected endpoint — token should be sent

**Step 3: Commit**

```bash
git add app/components/BottomPanels.vue
git commit -m "feat: add collapsible variables and HTTP headers panels with bearer token support"
```

---

### Task 10: Schema Introspection & Sidebar

**Files:**
- Create: `app/composables/useSchema.ts`
- Modify: `app/components/SchemaSidebar.vue`
- Create: `app/components/SchemaTypeDetail.vue`

**Step 1: Create the schema composable**

```typescript
// app/composables/useSchema.ts
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  type GraphQLSchema,
  type IntrospectionQuery,
  type GraphQLObjectType,
  type GraphQLField,
  type GraphQLNamedType
} from 'graphql'

const LARGE_SCHEMA_THRESHOLD = 500

export function useSchema() {
  const endpointsStore = useEndpointsStore()
  const toast = useToast()

  const schema = ref<GraphQLSchema | null>(null)
  const sdl = ref('')
  const isLoading = ref(false)
  const introspectionDisabled = ref(false)
  const isLargeSchema = ref(false)
  const typeCount = ref(0)

  const queryType = computed(() => schema.value?.getQueryType() || null)
  const mutationType = computed(() => schema.value?.getMutationType() || null)

  const allTypes = computed(() => {
    if (!schema.value) return []
    const typeMap = schema.value.getTypeMap()
    return Object.values(typeMap)
      .filter(t => !t.name.startsWith('__'))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  async function fetchSchema() {
    const endpoint = endpointsStore.activeEndpointData
    if (!endpoint) return

    isLoading.value = true
    introspectionDisabled.value = false
    isLargeSchema.value = false

    const headers: Record<string, string> = {}
    if (endpoint.bearerToken) {
      headers['Authorization'] = `Bearer ${endpoint.bearerToken}`
    }

    try {
      const result = await $fetch<{ data: IntrospectionQuery }>('/api/graphql-proxy', {
        method: 'POST',
        body: {
          endpoint: endpoint.url,
          query: getIntrospectionQuery(),
          headers
        }
      })

      if (result?.data) {
        schema.value = buildClientSchema(result.data)
        sdl.value = printSchema(schema.value)

        const types = Object.keys(schema.value.getTypeMap()).filter(t => !t.startsWith('__'))
        typeCount.value = types.length
        isLargeSchema.value = types.length > LARGE_SCHEMA_THRESHOLD
      } else {
        introspectionDisabled.value = true
      }
    } catch {
      introspectionDisabled.value = true
      toast.add({
        title: 'Introspection unavailable',
        description: 'Schema docs are disabled. You can still run queries.',
        color: 'warning'
      })
    } finally {
      isLoading.value = false
    }
  }

  // Re-fetch schema when active endpoint changes
  watch(() => endpointsStore.activeEndpoint, (url) => {
    if (url) fetchSchema()
    else {
      schema.value = null
      sdl.value = ''
    }
  }, { immediate: true })

  return {
    schema,
    sdl,
    isLoading,
    introspectionDisabled,
    isLargeSchema,
    typeCount,
    queryType,
    mutationType,
    allTypes,
    fetchSchema
  }
}
```

**Step 2: Build the schema sidebar**

```vue
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
  <USlideover v-model:open="isOpen" side="right" class="w-96">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-lg font-semibold">
          {{ activeView === 'docs' ? 'Schema Explorer' : 'Schema SDL' }}
        </h3>
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
      <div v-else-if="activeView === 'docs'" class="space-y-2">
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
      <div v-else class="overflow-auto">
        <pre class="text-xs text-gray-300 font-mono whitespace-pre-wrap p-2">{{ schemaState.sdl.value }}</pre>
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
```

**Step 3: Create SchemaSection component**

```vue
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
          <button class="text-green-400 hover:underline" @click="$emit('navigate', getNamedType(arg.type))">
            {{ arg.type.toString() }}
          </button>
          <span v-if="i < field.args.length - 1" class="text-gray-500">, </span>
        </span>
        <span class="text-gray-500">): </span>
        <button class="text-green-400 hover:underline" @click="$emit('navigate', getNamedType(field.type))">
          {{ field.type.toString() }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type GraphQLObjectType, type GraphQLType, isNamedType, getNamedType as gqlGetNamedType } from 'graphql'

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

function getNamedType(type: GraphQLType): string {
  const named = gqlGetNamedType(type)
  return named?.name || type.toString()
}
</script>
```

**Step 4: Create SchemaTypeDetail component**

```vue
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
    <div v-if="expanded && 'getFields' in type" class="ml-4 space-y-0.5">
      <div v-for="field in Object.values((type as any).getFields())" :key="field.name" class="text-xs">
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
import { type GraphQLNamedType, type GraphQLType, getNamedType } from 'graphql'

defineProps<{
  type: GraphQLNamedType
}>()

defineEmits<{
  navigate: [typeName: string]
}>()

const expanded = ref(false)

function getTypeName(type: GraphQLType): string {
  const named = getNamedType(type)
  return named?.name || type.toString()
}
</script>
```

**Step 5: Test**

1. Connect to endpoint
2. Click "DOCS" on right edge — sidebar slides open
3. Expand Queries — should list endpoint's queries with args/return types
4. Click a type name — should filter to that type
5. Toggle to SDL view — shows raw schema
6. Search — filters types

**Step 6: Commit**

```bash
git add app/composables/useSchema.ts app/components/SchemaSidebar.vue app/components/SchemaSection.vue app/components/SchemaTypeDetail.vue
git commit -m "feat: add schema introspection, documentation sidebar with search, and SDL view"
```

---

### Task 11: Toolbar Actions — Prettify, History, Copy CURL

**Files:**
- Modify: `app/components/ToolbarActions.vue`
- Create: `app/components/HistoryModal.vue`
- Create: `app/composables/useHistory.ts`

**Step 1: Create history composable**

```typescript
// app/composables/useHistory.ts
export interface HistoryEntry {
  query: string
  variables: string
  timestamp: string
  endpoint: string
}

const STORAGE_KEY = 'gql-playground-history'
const MAX_ENTRIES = 50

function loadHistory(): HistoryEntry[] {
  if (import.meta.server) return []
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

export function useHistory() {
  const history = ref<HistoryEntry[]>(loadHistory())

  function addEntry(entry: Omit<HistoryEntry, 'timestamp'>) {
    history.value.unshift({
      ...entry,
      timestamp: new Date().toISOString()
    })
    if (history.value.length > MAX_ENTRIES) {
      history.value = history.value.slice(0, MAX_ENTRIES)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
  }

  function getEntriesForEndpoint(endpoint: string) {
    return history.value.filter(e => e.endpoint === endpoint)
  }

  function clearHistory() {
    history.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  return { history, addEntry, getEntriesForEndpoint, clearHistory }
}
```

**Step 2: Update useGraphQL to record history**

Add to `executeQuery()` in `app/composables/useGraphQL.ts`, after a successful result:

```typescript
const { addEntry } = useHistory()
// ... inside executeQuery, after setting results:
addEntry({
  query: tab.query,
  variables: tab.variables,
  endpoint: endpoint.url
})
```

**Step 3: Build HistoryModal**

```vue
<!-- app/components/HistoryModal.vue -->
<template>
  <UModal v-model:open="open">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="font-semibold">Query History</h3>
        <UButton
          v-if="entries.length > 0"
          label="Clear"
          variant="ghost"
          color="error"
          size="xs"
          @click="historyState.clearHistory(); open = false"
        />
      </div>
    </template>

    <template #body>
      <div v-if="entries.length === 0" class="text-gray-500 text-center py-4">
        No history yet. Execute a query to see it here.
      </div>
      <div v-else class="space-y-2 max-h-96 overflow-auto">
        <button
          v-for="(entry, i) in entries"
          :key="i"
          class="w-full text-left p-2 rounded bg-gray-900 hover:bg-gray-800 transition"
          @click="$emit('select', entry); open = false"
        >
          <pre class="text-xs text-gray-300 truncate font-mono">{{ entry.query.slice(0, 120) }}</pre>
          <span class="text-xs text-gray-500">{{ new Date(entry.timestamp).toLocaleString() }}</span>
        </button>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { HistoryEntry } from '~/composables/useHistory'

const open = defineModel<boolean>('open', { default: false })

defineEmits<{
  select: [entry: HistoryEntry]
}>()

const endpointsStore = useEndpointsStore()
const historyState = useHistory()

const entries = computed(() =>
  historyState.getEntriesForEndpoint(endpointsStore.activeEndpoint)
)
</script>
```

**Step 4: Build ToolbarActions**

```vue
<!-- app/components/ToolbarActions.vue -->
<template>
  <div class="flex items-center gap-1">
    <UButton label="PRETTIFY" variant="ghost" color="neutral" size="xs" @click="prettify" />
    <UButton label="HISTORY" variant="ghost" color="neutral" size="xs" @click="historyOpen = true" />
    <UButton label="COPY CURL" variant="ghost" color="neutral" size="xs" @click="copyCurl" />

    <HistoryModal v-model:open="historyOpen" @select="onHistorySelect" />
  </div>
</template>

<script setup lang="ts">
import { parse, print } from 'graphql'
import type { HistoryEntry } from '~/composables/useHistory'

const endpointsStore = useEndpointsStore()
const workspaceStore = useWorkspaceStore()
const toast = useToast()

const historyOpen = ref(false)

function prettify() {
  const tab = workspaceStore.activeTab
  if (!tab) return
  try {
    const formatted = print(parse(tab.query))
    workspaceStore.updateTab(endpointsStore.activeEndpoint, tab.id, { query: formatted })
  } catch {
    toast.add({ title: 'Could not prettify — check query syntax', color: 'error' })
  }
}

function copyCurl() {
  const endpoint = endpointsStore.activeEndpointData
  const tab = workspaceStore.activeTab
  if (!endpoint || !tab) return

  let curl = `curl -X POST '${endpoint.url}' \\\n  -H 'Content-Type: application/json'`

  if (endpoint.bearerToken) {
    curl += ` \\\n  -H 'Authorization: Bearer ${endpoint.bearerToken}'`
  }

  const body: Record<string, any> = { query: tab.query }
  if (tab.variables?.trim()) {
    try {
      body.variables = JSON.parse(tab.variables)
    } catch { /* skip invalid variables */ }
  }

  curl += ` \\\n  -d '${JSON.stringify(body)}'`

  navigator.clipboard.writeText(curl)
  toast.add({ title: 'CURL command copied to clipboard', color: 'success' })
}

function onHistorySelect(entry: HistoryEntry) {
  const tab = workspaceStore.activeTab
  if (!tab) return
  workspaceStore.updateTab(endpointsStore.activeEndpoint, tab.id, {
    query: entry.query,
    variables: entry.variables
  })
}
</script>
```

**Step 5: Test**

1. Execute a query, then click HISTORY — should show the query
2. Click a history entry — loads it into the editor
3. Click PRETTIFY — formats the query
4. Click COPY CURL — pastes a valid curl command

**Step 6: Commit**

```bash
git add app/composables/useHistory.ts app/composables/useGraphQL.ts app/components/HistoryModal.vue app/components/ToolbarActions.vue
git commit -m "feat: add prettify, query history, and copy CURL toolbar actions"
```

---

### Task 12: Polish & Final Integration

**Files:**
- Modify: `app/components/PlaygroundLayout.vue` (final wiring)
- Create: `app/assets/css/main.css` (global styles)
- Modify: `nuxt.config.ts`

**Step 1: Add global dark styles**

```css
/* app/assets/css/main.css */
body {
  background-color: #030712;
  overflow: hidden;
}

/* CodeMirror height fix */
.cm-editor {
  height: 100%;
}

.cm-editor .cm-scroller {
  overflow: auto;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #111827;
}

::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #4b5563;
}
```

Add to `nuxt.config.ts`:
```typescript
css: ['~/assets/css/main.css', '~/assets/css/splitpanes.css'],
```

**Step 2: Update .gitignore**

```
node_modules
.output
.nuxt
.data
.netlify
dist
*.log
```

**Step 3: Verify full flow end-to-end**

Run: `yarn dev`

1. First load — empty state, endpoint URL input visible
2. Enter `https://spac.icjia-api.cloud/graphql`, click Connect
3. Toast shows "Connected", endpoint saved
4. Type query `{ meetings { data { id attributes { title } } } }`, click Play
5. Results appear formatted in right panel
6. Click DOCS — sidebar opens with Queries, Mutations, Types
7. Search for "meeting" — filters results
8. Click SDL — shows raw schema
9. Add a new tab, rename it by double-clicking
10. Click HISTORY — shows previous query
11. Click PRETTIFY — formats query
12. Click COPY CURL — copies command
13. Switch to HTTP Headers tab, enter a bearer token
14. Reload — everything persists
15. Click endpoint dropdown, add a second endpoint
16. Switch between endpoints — workspaces swap

**Step 4: Test Netlify build**

```bash
yarn generate
```

Expected: Builds successfully to `.output/public/`

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: polish styles, finalize integration, and verify full playground flow"
```

---

### Task 13: Deploy to Netlify

**Step 1: Initialize git remote and push**

```bash
# Create GitHub repo first (or use existing)
git remote add origin <repo-url>
git push -u origin main
```

**Step 2: Connect to Netlify**

- Go to Netlify dashboard → "Add new site" → "Import an existing project"
- Connect to the GitHub repo
- Build settings should auto-detect from `netlify.toml`:
  - Build command: `yarn generate`
  - Publish directory: `.output/public`

**Step 3: Verify deployment**

- Visit the Netlify URL
- Test the full flow (connect, query, schema, history, tabs)
- Verify the proxy function works (no CORS errors)

**Step 4: Commit any deployment fixes**

```bash
git add -A
git commit -m "chore: deployment configuration fixes"
```
