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

export interface PlaygroundSettings {
  editorFontSize: number
  autocomplete: boolean
}
