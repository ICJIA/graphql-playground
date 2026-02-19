import { describe, it, expect } from 'vitest'

/**
 * These tests exercise the pure export conversion functions
 * extracted from ResultsPanel.vue's logic.
 *
 * Since the functions are defined inside the SFC, we replicate
 * the logic here to test the conversion algorithms directly.
 */

// --- Replicated helpers (same logic as ResultsPanel.vue) ---

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, path))
    } else if (Array.isArray(value)) {
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

function extractRows(data: any): Record<string, any>[] {
  if (!data) return []
  if (data.data && typeof data.data === 'object') {
    for (const value of Object.values(data.data)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        return value.map((item: any) => flattenObject(item))
      }
    }
    return [flattenObject(data.data)]
  }
  if (Array.isArray(data)) {
    return data.map((item: any) => typeof item === 'object' ? flattenObject(item) : { value: item })
  }
  return [flattenObject(data)]
}

function getColumns(rows: Record<string, any>[]): string[] {
  const cols = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      cols.add(key)
    }
  }
  return [...cols]
}

function escapeCsvField(value: any): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(data: any): string {
  const rows = extractRows(data)
  if (rows.length === 0) return ''
  const columns = getColumns(rows)
  const header = columns.map(escapeCsvField).join(',')
  const body = rows.map(row =>
    columns.map(col => escapeCsvField(row[col])).join(',')
  ).join('\n')
  return `${header}\n${body}`
}

function toMarkdownTable(data: any): string {
  const rows = extractRows(data)
  if (rows.length === 0) return '_No tabular data_'
  const columns = getColumns(rows)
  const header = `| ${columns.join(' | ')} |`
  const separator = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map(row =>
    `| ${columns.map(col => {
      const val = row[col]
      const str = val == null ? '' : String(val)
      return str.replace(/\|/g, '\\|').replace(/\n/g, ' ')
    }).join(' | ')} |`
  ).join('\n')
  return `${header}\n${separator}\n${body}`
}

function toYaml(data: any, indent = 0): string {
  const pad = '  '.repeat(indent)
  if (data == null) return `${pad}null`
  if (typeof data === 'boolean') return `${pad}${data}`
  if (typeof data === 'number') return `${pad}${data}`
  if (typeof data === 'string') {
    if (data.includes('\n') || data.includes(': ') || data.includes('#') ||
        data.startsWith('{') || data.startsWith('[') || data.startsWith('"') ||
        data.startsWith("'") || data === '' || data === 'true' || data === 'false' ||
        data === 'null' || /^\d/.test(data)) {
      return `${pad}"${data.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    }
    return `${pad}${data}`
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return `${pad}[]`
    return data.map(item => {
      if (typeof item === 'object' && item !== null) {
        const inner = toYaml(item, indent + 1).trimStart()
        return `${pad}- ${inner}`
      }
      return `${pad}- ${typeof item === 'string' ? toYaml(item, 0).trim() : item}`
    }).join('\n')
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return `${pad}{}`
    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${pad}${key}:\n${toYaml(value, indent + 1)}`
      }
      return `${pad}${key}: ${toYaml(value, 0).trim()}`
    }).join('\n')
  }
  return `${pad}${String(data)}`
}

function toTypeScript(data: any): string {
  const json = JSON.stringify(data, null, 2)
  return `export const queryResult = ${json} as const;\n`
}

// --- Tests ---

describe('flattenObject', () => {
  it('flattens nested objects with dot notation', () => {
    const result = flattenObject({ a: { b: { c: 1 } } })
    expect(result).toEqual({ 'a.b.c': 1 })
  })

  it('handles arrays of primitives', () => {
    const result = flattenObject({ tags: ['a', 'b', 'c'] })
    expect(result).toEqual({ tags: 'a, b, c' })
  })

  it('stringifies arrays of objects', () => {
    const result = flattenObject({ items: [{ id: 1 }, { id: 2 }] })
    expect(result.items).toBe(JSON.stringify([{ id: 1 }, { id: 2 }]))
  })

  it('handles flat objects unchanged', () => {
    const result = flattenObject({ name: 'Alice', age: 30 })
    expect(result).toEqual({ name: 'Alice', age: 30 })
  })

  it('handles null and undefined values', () => {
    const result = flattenObject({ a: null, b: undefined })
    expect(result.a).toBeNull()
    expect(result.b).toBeUndefined()
  })
})

describe('extractRows', () => {
  it('extracts array from data.field', () => {
    const data = { data: { users: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] } }
    const rows = extractRows(data)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ id: 1, name: 'A' })
    expect(rows[1]).toEqual({ id: 2, name: 'B' })
  })

  it('wraps single object in data as one row', () => {
    const data = { data: { user: 'Alice', role: 'admin' } }
    const rows = extractRows(data)
    expect(rows).toHaveLength(1)
  })

  it('returns empty array for null', () => {
    expect(extractRows(null)).toEqual([])
  })

  it('handles arrays of nested objects', () => {
    const data = { data: { posts: [{ title: 'Hi', author: { name: 'A' } }] } }
    const rows = extractRows(data)
    expect(rows[0]).toEqual({ title: 'Hi', 'author.name': 'A' })
  })
})

describe('toCsv', () => {
  it('converts array result to CSV', () => {
    const data = { data: { users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] } }
    const csv = toCsv(data)
    expect(csv).toContain('id,name')
    expect(csv).toContain('1,Alice')
    expect(csv).toContain('2,Bob')
  })

  it('escapes commas in values', () => {
    const data = { data: { items: [{ note: 'a, b, c' }] } }
    const csv = toCsv(data)
    expect(csv).toContain('"a, b, c"')
  })

  it('escapes double quotes in values', () => {
    const data = { data: { items: [{ note: 'say "hello"' }] } }
    const csv = toCsv(data)
    expect(csv).toContain('"say ""hello"""')
  })

  it('returns empty string for null data', () => {
    expect(toCsv(null)).toBe('')
  })
})

describe('toMarkdownTable', () => {
  it('creates a markdown table from array data', () => {
    const data = { data: { users: [{ id: 1, name: 'Alice' }] } }
    const md = toMarkdownTable(data)
    expect(md).toContain('| id | name |')
    expect(md).toContain('| --- | --- |')
    expect(md).toContain('| 1 | Alice |')
  })

  it('escapes pipes in values', () => {
    const data = { data: { items: [{ note: 'a | b' }] } }
    const md = toMarkdownTable(data)
    expect(md).toContain('a \\| b')
  })

  it('returns fallback for no data', () => {
    expect(toMarkdownTable(null)).toBe('_No tabular data_')
  })
})

describe('toYaml', () => {
  it('converts simple object', () => {
    const yaml = toYaml({ name: 'Alice', active: true })
    expect(yaml).toContain('name: Alice')
    expect(yaml).toContain('active: true')
  })

  it('handles nested objects with indentation', () => {
    const yaml = toYaml({ user: { name: 'Alice' } })
    expect(yaml).toContain('user:')
    expect(yaml).toContain('  name: Alice')
  })

  it('handles arrays', () => {
    const yaml = toYaml({ tags: ['a', 'b'] })
    expect(yaml).toContain('tags:')
    expect(yaml).toContain('  - a')
    expect(yaml).toContain('  - b')
  })

  it('quotes strings that look like numbers', () => {
    const yaml = toYaml({ code: '12345' })
    expect(yaml).toContain('"12345"')
  })

  it('quotes strings containing colons', () => {
    const yaml = toYaml({ note: 'key: value' })
    expect(yaml).toContain('"key: value"')
  })

  it('handles null values', () => {
    const yaml = toYaml({ a: null })
    expect(yaml).toContain('a: null')
  })

  it('handles empty arrays', () => {
    const yaml = toYaml({ items: [] })
    expect(yaml).toContain('items:')
    expect(yaml).toContain('[]')
  })

  it('handles empty objects', () => {
    const yaml = toYaml({ meta: {} })
    expect(yaml).toContain('meta:')
    expect(yaml).toContain('{}')
  })
})

describe('toTypeScript', () => {
  it('wraps data as const export', () => {
    const ts = toTypeScript({ data: { id: 1 } })
    expect(ts).toContain('export const queryResult =')
    expect(ts).toContain('as const;')
    expect(ts).toContain('"id": 1')
  })

  it('preserves full JSON structure', () => {
    const input = { data: { users: [{ id: 1 }] } }
    const ts = toTypeScript(input)
    expect(ts).toContain(JSON.stringify(input, null, 2))
  })
})
