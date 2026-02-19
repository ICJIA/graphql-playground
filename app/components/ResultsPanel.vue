<!-- app/components/ResultsPanel.vue -->
<template>
  <div class="h-full flex flex-col overflow-hidden bg-gray-950">
    <!-- Toolbar when results exist -->
    <div v-if="activeTab?.results" class="flex items-center justify-end gap-1 px-2 py-1 border-b border-gray-800">
      <UButton
        label="Copy"
        icon="i-lucide-clipboard-copy"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="copyResults"
      />
      <UDropdownMenu :items="exportItems">
        <UButton
          label="Download"
          icon="i-lucide-download"
          trailing-icon="i-lucide-chevron-down"
          variant="ghost"
          color="neutral"
          size="xs"
        />
      </UDropdownMenu>
    </div>

    <!-- Results content -->
    <div class="flex-1 overflow-auto p-4 font-mono text-sm">
      <div v-if="!activeTab?.results" class="h-full flex items-center justify-center text-gray-500">
        <div class="text-center">
          <UIcon name="i-lucide-play" class="text-4xl mb-2" />
          <p>Hit the Play Button to</p>
          <p>get a response here</p>
        </div>
      </div>
      <pre v-else class="text-gray-200 whitespace-pre-wrap">{{ activeTab.results }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const workspaceStore = useWorkspaceStore()
const toast = useToast()
const activeTab = computed(() => workspaceStore.activeTab)

/**
 * Converts the active tab name into a filename-safe slug by replacing non-alphanumeric characters.
 * @returns {string} A sanitized slug suitable for use in filenames.
 */
function getTabSlug(): string {
  const name = activeTab.value?.name || 'query'
  return name.replace(/[^a-zA-Z0-9-_]/g, '_')
}

/**
 * Returns an ISO timestamp formatted for filenames (colons replaced with dashes).
 * @returns {string} A filename-safe ISO timestamp string.
 */
function getTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/:/g, '-')
}

/**
 * Creates a Blob URL and triggers a browser file download.
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
 * Parses the active tab's JSON results string into an object.
 * @returns {any} The parsed JSON data, or null if parsing fails or no results exist.
 */
function getParsedData(): any {
  if (!activeTab.value?.results) return null
  try {
    return JSON.parse(activeTab.value.results)
  } catch {
    return null
  }
}

// --- Flatten nested GraphQL data into rows ---

/**
 * Recursively flattens a nested object into dot-notation keys for tabular export.
 * @param {any} obj - The object to flatten.
 * @param {string} [prefix=''] - The key prefix for nested properties.
 * @returns {Record<string, any>} A flat object with dot-notation keys.
 */
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, path))
    } else if (Array.isArray(value)) {
      // For arrays of primitives, join them; for arrays of objects, stringify
      if (value.length > 0 && typeof value[0] === 'object') {
        result[path] = JSON.stringify(value)
      } else {
        result[path] = value.join(', ')
      }
    } else {
      result[path] = value
    }
  }
  return result
}

/**
 * Finds the first array in a GraphQL response and flattens each item into a row.
 * @param {any} data - The parsed GraphQL response data.
 * @returns {Record<string, any>[]} An array of flattened row objects.
 */
function extractRows(data: any): Record<string, any>[] {
  if (!data) return []

  // Look for the first array in the response (e.g., data.users, data.posts)
  if (data.data && typeof data.data === 'object') {
    for (const value of Object.values(data.data)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        return value.map((item: any) => flattenObject(item))
      }
    }
    // Single object result — wrap it
    return [flattenObject(data.data)]
  }

  if (Array.isArray(data)) {
    return data.map((item: any) => (typeof item === 'object' ? flattenObject(item) : { value: item }))
  }

  return [flattenObject(data)]
}

/**
 * Collects all unique column keys across an array of flattened row objects.
 * @param {Record<string, any>[]} rows - The flattened row objects to extract columns from.
 * @returns {string[]} An array of unique column key names.
 */
function getColumns(rows: Record<string, any>[]): string[] {
  const cols = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      cols.add(key)
    }
  }
  return [...cols]
}

// --- Export formats ---

/**
 * Escapes a value for CSV output, wrapping in quotes if it contains commas, quotes, or newlines.
 * @param {any} value - The value to escape.
 * @returns {string} The CSV-safe string representation.
 */
function escapeCsvField(value: any): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Converts GraphQL response data to CSV format with headers and rows.
 * @param {any} data - The parsed GraphQL response data.
 * @returns {string} A CSV-formatted string, or empty string if no rows are found.
 */
function toCsv(data: any): string {
  const rows = extractRows(data)
  if (rows.length === 0) return ''
  const columns = getColumns(rows)
  const header = columns.map(escapeCsvField).join(',')
  const body = rows.map((row) => columns.map((col) => escapeCsvField(row[col])).join(',')).join('\n')
  return `${header}\n${body}`
}

/**
 * Converts GraphQL response data to a GitHub-flavored Markdown table.
 * @param {any} data - The parsed GraphQL response data.
 * @returns {string} A Markdown table string, or a placeholder if no tabular data exists.
 */
function toMarkdownTable(data: any): string {
  const rows = extractRows(data)
  if (rows.length === 0) return '_No tabular data_'
  const columns = getColumns(rows)
  const header = `| ${columns.join(' | ')} |`
  const separator = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows
    .map(
      (row) =>
        `| ${columns
          .map((col) => {
            const val = row[col]
            const str = val == null ? '' : String(val)
            return str.replace(/\|/g, '\\|').replace(/\n/g, ' ')
          })
          .join(' | ')} |`
    )
    .join('\n')
  return `${header}\n${separator}\n${body}`
}

/**
 * Converts any JavaScript value to a YAML string, recursively handling objects, arrays, and primitives.
 * @param {any} data - The value to convert.
 * @param {number} [indent=0] - The current indentation level.
 * @returns {string} A YAML-formatted string.
 */
function toYaml(data: any, indent = 0): string {
  const pad = '  '.repeat(indent)
  if (data == null) return `${pad}null`
  if (typeof data === 'boolean') return `${pad}${data}`
  if (typeof data === 'number') return `${pad}${data}`
  if (typeof data === 'string') {
    if (
      data.includes('\n') ||
      data.includes(': ') ||
      data.includes('#') ||
      data.startsWith('{') ||
      data.startsWith('[') ||
      data.startsWith('"') ||
      data.startsWith("'") ||
      data === '' ||
      data === 'true' ||
      data === 'false' ||
      data === 'null' ||
      /^\d/.test(data)
    ) {
      return `${pad}"${data.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    }
    return `${pad}${data}`
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return `${pad}[]`
    return data
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          const inner = toYaml(item, indent + 1).trimStart()
          return `${pad}- ${inner}`
        }
        return `${pad}- ${typeof item === 'string' ? toYaml(item, 0).trim() : item}`
      })
      .join('\n')
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return `${pad}{}`
    return entries
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${pad}${key}:\n${toYaml(value, indent + 1)}`
        }
        return `${pad}${key}: ${toYaml(value, 0).trim()}`
      })
      .join('\n')
  }
  return `${pad}${String(data)}`
}

/**
 * Wraps the JSON response in a TypeScript `as const` export statement.
 * @param {any} data - The parsed data to export.
 * @returns {string} A TypeScript source string with the data as a const export.
 */
function toTypeScript(data: any): string {
  const json = JSON.stringify(data, null, 2)
  return `export const queryResult = ${json} as const;\n`
}

// --- Actions ---

/**
 * Copies raw JSON results to the clipboard.
 */
function copyResults() {
  if (!activeTab.value?.results) return
  navigator.clipboard.writeText(activeTab.value.results)
  toast.add({ title: 'JSON copied to clipboard', color: 'success' })
}

/**
 * Downloads results as a `.json` file.
 */
function downloadJson() {
  if (!activeTab.value?.results) return
  downloadFile(activeTab.value.results, `${getTabSlug()}-${getTimestamp()}.json`, 'application/json')
  toast.add({ title: 'JSON downloaded', color: 'success' })
}

/**
 * Downloads results as a `.csv` file.
 */
function downloadCsv() {
  const data = getParsedData()
  if (!data) return
  const csv = toCsv(data)
  if (!csv) {
    toast.add({ title: 'No tabular data found to export', color: 'warning' })
    return
  }
  downloadFile(csv, `${getTabSlug()}-${getTimestamp()}.csv`, 'text/csv')
  toast.add({ title: 'CSV downloaded', color: 'success' })
}

/**
 * Downloads results as a `.md` Markdown file.
 */
function downloadMarkdown() {
  const data = getParsedData()
  if (!data) return
  const md = toMarkdownTable(data)
  downloadFile(md, `${getTabSlug()}-${getTimestamp()}.md`, 'text/markdown')
  toast.add({ title: 'Markdown downloaded', color: 'success' })
}

/**
 * Downloads results as a `.yaml` file.
 */
function downloadYaml() {
  const data = getParsedData()
  if (!data) return
  const yaml = toYaml(data)
  downloadFile(yaml, `${getTabSlug()}-${getTimestamp()}.yaml`, 'text/yaml')
  toast.add({ title: 'YAML downloaded', color: 'success' })
}

/**
 * Downloads results as a `.ts` TypeScript file.
 */
function downloadTypeScript() {
  const data = getParsedData()
  if (!data) return
  const ts = toTypeScript(data)
  downloadFile(ts, `${getTabSlug()}-${getTimestamp()}.ts`, 'text/typescript')
  toast.add({ title: 'TypeScript downloaded', color: 'success' })
}

const exportItems = [
  [
    { label: 'JSON', icon: 'i-lucide-braces', onSelect: downloadJson },
    { label: 'CSV', icon: 'i-lucide-table', onSelect: downloadCsv },
    { label: 'Markdown Table', icon: 'i-lucide-hash', onSelect: downloadMarkdown },
    { label: 'YAML', icon: 'i-lucide-file-text', onSelect: downloadYaml },
    { label: 'TypeScript', icon: 'i-lucide-file-code', onSelect: downloadTypeScript }
  ]
]
</script>
