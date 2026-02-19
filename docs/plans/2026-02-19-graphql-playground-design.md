# GraphQL Playground Design

## Overview

A custom GraphQL playground that replicates and improves upon the classic Prisma GraphQL Playground (v1.7.31). Targets Strapi sites with GraphQL endpoints but works with any GraphQL API. Deployed as a static SPA on Netlify with a serverless proxy function for CORS.

## Tech Stack

| Item | Choice |
|------|--------|
| Framework | Nuxt 4.3.x, `ssr: false` (SPA) |
| UI Library | Nuxt UI 4.4.x (dark mode only) |
| Code Editor | CodeMirror 6 with `cm6-graphql` |
| GraphQL | `graphql` npm package |
| Node | v22.14.0 (`.nvmrc`) |
| Package Manager | Yarn 1.22.22 |
| Deployment | Netlify (static + 1 serverless function) |
| Split Panes | `splitpanes` library |

## Architecture

Single-page app. Browser talks to a Netlify Function proxy which forwards requests to the target GraphQL endpoint server-side, avoiding CORS.

```
Browser (Nuxt SPA on Netlify CDN)
  └── POST /api/graphql-proxy
        └── Netlify Function
              └── Forwards to target endpoint
```

Security is delegated to the target API (Strapi controls what operations are allowed). The playground is a passthrough.

## Data Model (localStorage)

Endpoints are the top-level entity. Each endpoint has its own workspace with tabs, queries, variables, and a bearer token.

```
gql-playground-endpoints: [
  { url, label, lastUsed, bearerToken }
]
gql-playground-active-endpoint: "https://..."
gql-playground-workspaces: {
  "https://endpoint-a/graphql": {
    tabs: [
      { id, name, query, variables, results, activeTab }
    ],
    activeTabId: "tab-1"
  },
  "https://endpoint-b/graphql": {
    tabs: [...],
    activeTabId: "tab-2"
  }
}
gql-playground-settings: { ... }
```

Key behaviors:
- No default endpoint; user must enter one
- Previous endpoints saved in a dropdown for easy switching
- Switching endpoints swaps the entire workspace (tabs, queries, token)
- Bearer token is per-endpoint
- Tab names are editable
- All state persists across browser sessions

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ▼ [Endpoint Selector Dropdown]                    [Settings Gear]  │
├──────────────────────────────────────────────────────────────────────┤
│  [publications] [New Tab] [+]          PRETTIFY  HISTORY  COPY CURL │
├────────────────────────────┬─────┬───────────────────────────────────┤
│                            │     │                                   │
│   Query Editor             │  ▶  │   Results Panel                  │
│   (CodeMirror 6)           │     │   (JSON pretty-printed,          │
│                            │     │    collapsible nodes)             │
│                            │     │                                   │
├────────────────────────────┤     │                                   │
│  Variables  │ HTTP Headers │     │                                   │
└────────────────────────────┴─────┴──────────────────────┬────────────┤
│                                                         │  DOCS     │
│                                                         │  SCHEMA   │
└─────────────────────────────────────────────────────────┴────────────┘
```

Split pane divider is draggable.

## Components

| Component | Built With | Description |
|-----------|-----------|-------------|
| EndpointSelector | Custom + USelectMenu | Dropdown of saved endpoints + new URL input |
| TabBar | Custom + UTabs | Per-endpoint query tabs, renameable, closeable |
| QueryEditor | CodeMirror 6 | GraphQL syntax highlighting, autocomplete from schema |
| VariablesPanel | CodeMirror 6 (JSON) | Collapsible panel below query editor |
| HeadersPanel | Custom | Bearer token input + raw headers editor |
| ExecuteButton | UButton | Central play button |
| ResultsPanel | Custom | JSON viewer with syntax highlighting, collapsible tree |
| SchemaSidebar | USlideover | Slide-out panel with search, type/field browser |
| ToolbarActions | UButton group | Prettify, History, Copy CURL |
| HistoryModal | UModal | Past queries for this endpoint |
| SettingsMenu | UPopover | App-level settings |

## Proxy Function (server/api/graphql-proxy.post.ts)

Receives from client:
- `endpoint`: target URL
- `query`: GraphQL query string
- `variables`: query variables object
- `headers`: custom headers including Authorization

Behavior:
- Validates endpoint URL format
- Forwards request server-side to the target endpoint
- Returns response as-is (including GraphQL errors)
- Passes through all custom headers

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid URL format | Inline validation on endpoint input |
| Endpoint unreachable | Toast: "Could not reach endpoint" |
| Introspection fails | Warning: "Introspection disabled. Schema docs unavailable." |
| Query returns errors | GraphQL errors shown in results panel |
| Large schema (500+ types) | Warning banner with link to native playground |
| Proxy timeout | Toast: "Request timed out" |
| Invalid JSON in variables | Inline error in variables panel |
| Network error | Toast with retry option |

## Endpoint Validation Flow

1. User enters URL, basic format validation
2. On connect, proxy sends introspection query
3. Success: save endpoint, load schema, show workspace
4. Introspection fails but endpoint responds: connect, disable schema docs
5. Endpoint unreachable: show error, don't save

## Schema Documentation Sidebar

Slide-out panel from right edge with:
- Search bar filtering across queries, mutations, type names, and fields
- Collapsible sections: Queries, Mutations, Types (with counts)
- Clickable type references that navigate within the sidebar (with breadcrumb/back)
- Raw SDL view toggle
- Lazy rendering for performance
- Large schema warning at 500+ types

## Features Included in v1

- Configurable runtime endpoint with saved endpoint history
- Per-endpoint workspaces with multi-tab queries
- Bearer token support (per-endpoint)
- Schema introspection and documentation sidebar
- Query execution with pretty-printed JSON results
- Prettify (auto-format query)
- Query history
- Copy CURL
- Variables panel
- Resizable split panes
- Full localStorage persistence
- CORS proxy via Netlify Function
- Large schema detection with graceful degradation
