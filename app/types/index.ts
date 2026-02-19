/** A saved GraphQL endpoint with its connection details and usage metadata. */
export interface SavedEndpoint {
  /** The full URL of the GraphQL endpoint. */
  url: string
  /** A user-facing display name for this endpoint. */
  label: string
  /** ISO 8601 date string indicating when this endpoint was last queried. */
  lastUsed: string // ISO date
  /** Optional bearer token sent as an Authorization header with requests. */
  bearerToken: string
}

/** A single query tab containing the editor state and execution results. */
export interface QueryTab {
  /** Unique identifier for this tab. */
  id: string
  /** Display name shown on the tab. */
  name: string
  /** When true, the tab name was auto-generated from the query's operation name. */
  autoName?: boolean // true = name was auto-generated from query content
  /** The GraphQL query or mutation string. */
  query: string
  /** JSON string of query variables, or an empty string if none. */
  variables: string
  /** JSON string of the last execution result, or null if the query has not been run. */
  results: string | null
}

/** Per-endpoint workspace state holding the user's open tabs and active selection. */
export interface Workspace {
  /** Ordered list of query tabs open in this workspace. */
  tabs: QueryTab[]
  /** The id of the currently active/visible tab. */
  activeTabId: string
}

/** Maps endpoint URLs to their corresponding workspace state. */
export type WorkspaceMap = Record<string, Workspace>

/** User-configurable preferences for the playground editor. */
export interface PlaygroundSettings {
  /** Font size in pixels used in the query and variables editors. */
  editorFontSize: number
}
