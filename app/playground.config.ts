/**
 * GraphQL Playground — Single Source of Truth Configuration
 *
 * Build-time constants and default values for the entire project.
 * Runtime user preferences are persisted in localStorage and
 * managed by the settings store (app/stores/settings.ts).
 */

export const playgroundConfig = {
  /** Application metadata */
  app: {
    name: 'ICJIA GraphQL Playground',
    description: 'A modern, configurable GraphQL playground',
    version: '1.1.0',
    repository: 'https://github.com/cschweda/graphql-playground',
    liveUrl: 'https://icjia-graphql-playground.netlify.app',
    netlifyProject: 'https://app.netlify.com/projects/icjia-graphql-playground/overview'
  },

  /** Proxy security settings */
  proxy: {
    allowedOrigins: [
      'https://icjia-graphql-playground.netlify.app',
      'http://localhost:3000',
      'http://localhost:3001'
    ],
    allowedHeaders: [
      'authorization',
      'content-type',
      'accept',
      'x-api-key',
      'x-request-id'
    ],
    blockedHostnames: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '[::1]',
      'metadata.google.internal',
      '169.254.169.254'
    ],
    maxQueryLength: 100_000,
    requestTimeout: 30_000
  },

  /** Schema introspection settings */
  schema: {
    largeSchemaThreshold: 500
  },

  /** Query history settings */
  history: {
    maxEntries: 50
  },

  /** localStorage keys */
  storageKeys: {
    endpoints: 'gql-playground-endpoints',
    activeEndpoint: 'gql-playground-active-endpoint',
    workspaces: 'gql-playground-workspaces',
    history: 'gql-playground-history',
    settings: 'gql-playground-settings'
  },

  /** Default runtime settings (user can override in Settings panel) */
  defaults: {
    editorFontSize: 14,
    autocomplete: true
  },

  /** Example endpoints shown in the quick-start guide */
  exampleEndpoints: [
    {
      url: 'https://countries.trevorblades.com/graphql',
      label: 'Countries API',
      description: 'Public API for country data — no auth required',
      exampleQuery: '{\n  countries {\n    name\n    capital\n    emoji\n    currency\n  }\n}'
    },
    {
      url: 'https://rickandmortyapi.com/graphql',
      label: 'Rick and Morty API',
      description: 'Characters, episodes, and locations — no auth required',
      exampleQuery: '{\n  characters(page: 1) {\n    results {\n      name\n      species\n      status\n    }\n  }\n}'
    }
  ]
} as const

export type PlaygroundConfig = typeof playgroundConfig
