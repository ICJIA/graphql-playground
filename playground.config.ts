/**
 * ICJIA GraphQL Playground — Configuration
 *
 * This file is the single source of truth for all build-time constants
 * and default values. It is imported by the app, the server proxy, and
 * the test suite.
 *
 * The file is organized into two sections:
 *
 *   1. **User-configurable** (top)  — values you are expected to change
 *      when deploying your own instance: app metadata, example endpoints,
 *      editor defaults, and allowed origins.
 *
 *   2. **Internal / do not change** (bottom) — security settings, storage
 *      keys, and proxy hardening rules. Changing these can break security
 *      guarantees or cause data loss.
 *
 * @module playground.config
 */

export const playgroundConfig = {
  // ═══════════════════════════════════════════════════════════════════
  //  USER-CONFIGURABLE — safe to change for your deployment
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Application metadata displayed in the UI, README, and settings panel.
   *
   * Change these to match your deployment.
   */
  app: {
    /** Display name shown in the welcome guide and settings modal. */
    name: 'ICJIA GraphQL Playground',

    /** Short description used in meta tags. */
    description: 'A modern, configurable GraphQL playground',

    /** Semver version string. Bump when you release changes. */
    version: '1.1.0',

    /** Public GitHub repository URL (shown in settings). */
    repository: 'https://github.com/ICJIA/graphql-playground',

    /** Production URL where the app is hosted (custom domain). */
    liveUrl: 'https://playground.icjia.app',

    /** Netlify dashboard URL (for maintainers only). */
    netlifyProject: 'https://app.netlify.com/projects/icjia-graphql-playground/overview'
  },

  /**
   * Example endpoints displayed on the quick-start welcome screen.
   *
   * Each entry should be a **public, auth-free** GraphQL API so
   * first-time users can try the playground immediately.
   *
   * @example
   * {
   *   url: 'https://countries.trevorblades.com/graphql',
   *   label: 'Countries API',
   *   description: 'Public API for country data — no auth required',
   *   exampleQuery: '{\n  countries {\n    name\n    capital\n  }\n}'
   * }
   */
  exampleEndpoints: [
    {
      /** Full URL of the GraphQL endpoint (must be HTTPS and contain "graphql" in the path). */
      url: 'https://countries.trevorblades.com/graphql',
      /** Short label for the button. */
      label: 'Countries API',
      /** Description shown below the URL. Include "no auth" if public. */
      description: 'Public API for country data — no auth required',
      /** Sample query pre-loaded when the user clicks this endpoint. */
      exampleQuery: '{\n  countries {\n    name\n    capital\n    emoji\n    currency\n  }\n}'
    },
    {
      url: 'https://rickandmortyapi.com/graphql',
      label: 'Rick and Morty API',
      description: 'Characters, episodes, and locations — no auth required',
      exampleQuery: '{\n  characters(page: 1) {\n    results {\n      name\n      species\n      status\n    }\n  }\n}'
    }
  ],

  /**
   * Default runtime settings applied on first launch or after a data
   * clear. Users override these in the Settings panel; overrides are
   * persisted to localStorage.
   */
  defaults: {
    /** Default editor font size in pixels (range: 10–24). */
    editorFontSize: 14
  },

  /**
   * Allowed origins for the CORS proxy in production.
   *
   * Add your custom domain here if you deploy to a different URL.
   * In development (`import.meta.dev`), origin checking is skipped.
   */
  proxy: {
    /**
     * Origins permitted to call the `/api/graphql-proxy` endpoint.
     * Must include the production URL and any local dev ports.
     */
    allowedOrigins: [
      'https://playground.icjia.app',
      'https://icjia-graphql-playground.netlify.app'
    ],

    // ═════════════════════════════════════════════════════════════════
    //  INTERNAL — do not change unless you understand the security
    //  implications. Incorrect values can expose the proxy to SSRF,
    //  header injection, or abuse.
    // ═════════════════════════════════════════════════════════════════

    /**
     * HTTP headers the proxy will forward to the target API.
     * All other headers from the client are silently dropped.
     *
     * @internal Changing this list can expose sensitive headers.
     */
    allowedHeaders: ['authorization', 'content-type', 'accept', 'x-api-key', 'x-request-id'],

    /**
     * Hostnames blocked by the SSRF filter. Requests to these hosts
     * are rejected before they leave the proxy.
     *
     * @internal Do not remove entries — they protect against SSRF.
     */
    blockedHostnames: ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', 'metadata.google.internal', '169.254.169.254'],

    /**
     * Maximum allowed GraphQL query length in characters.
     * Queries exceeding this limit receive a 413 response.
     *
     * @internal 100 KB is generous for any legitimate query.
     */
    maxQueryLength: 100_000,

    /**
     * Timeout (ms) for upstream requests to the target API.
     *
     * @internal 30 seconds matches Netlify's default function timeout.
     */
    requestTimeout: 30_000
  },

  // ═══════════════════════════════════════════════════════════════════
  //  INTERNAL — do not change
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Schema introspection thresholds.
   *
   * @internal Large schemas degrade UI performance. The threshold
   * triggers a warning but does not block introspection.
   */
  schema: {
    /** Number of types above which a "large schema" warning is shown. */
    largeSchemaThreshold: 500
  },

  /**
   * Query history limits.
   *
   * @internal History entries are stored in localStorage. Keeping the
   * cap reasonable prevents storage bloat.
   */
  history: {
    /** Maximum number of history entries stored (oldest are evicted). */
    maxEntries: 50
  },

  /**
   * localStorage key names used by the app.
   *
   * @internal Changing these will orphan existing user data. If you
   * must rename a key, provide a migration that reads the old key
   * and writes to the new one.
   */
  storageKeys: {
    endpoints: 'gql-playground-endpoints',
    activeEndpoint: 'gql-playground-active-endpoint',
    workspaces: 'gql-playground-workspaces',
    history: 'gql-playground-history',
    settings: 'gql-playground-settings'
  }
} as const

/** TypeScript type derived from the frozen config object. */
export type PlaygroundConfig = typeof playgroundConfig
