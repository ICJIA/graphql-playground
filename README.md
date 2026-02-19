# GraphQL Playground

A modern, configurable GraphQL playground built with Nuxt 4, Nuxt UI 4, and CodeMirror 6. Works with any GraphQL endpoint — particularly useful for Strapi APIs — and solves the CORS problem with a built-in serverless proxy.

**Live:** [https://icjia-graphql-playground.netlify.app](https://icjia-graphql-playground.netlify.app)

---

## What is this?

Most GraphQL APIs include a built-in playground (the classic [Prisma GraphQL Playground](https://github.com/graphql/graphql-playground) or [GraphiQL](https://github.com/graphql/graphiql)). These are useful but aging — Prisma's playground was deprecated in 2020, and the built-in tools are locked to a single endpoint with limited customization.

This project is a standalone replacement that you host yourself. Point it at any GraphQL endpoint, run queries, browse the schema, and save your work — all from a modern, dark-themed interface.

### Why use this instead of the default playground?

The default GraphQL Playground (Prisma v1.7) and GraphiQL ship embedded with your API server. They're convenient but limited — locked to one endpoint, no persistence, no CORS proxy, minimal customization. This project exists because developer tools should adapt to how you work, not the other way around.

**Advantages of this playground:**

- **Multi-endpoint** — Switch between production, staging, and local APIs from one tool. Each endpoint remembers its own tabs, queries, variables, and bearer token.
- **Zero CORS headaches** — The built-in serverless proxy means you never have to configure CORS headers on the target API. Connect to any public GraphQL endpoint instantly.
- **Persistent workspaces** — Close the browser, come back tomorrow, and everything is exactly where you left it. Queries, results, tokens — all saved automatically.
- **Schema-aware autocomplete** — Press `Ctrl+Space` to get context-aware field suggestions powered by the introspected schema. The classic playground has this too, but here it works across all your endpoints.
- **Modern editor** — CodeMirror 6 with adjustable font size, one-dark theme, and bracket matching.
- **Export & portability** — Download query results as JSON files, copy curl commands, export/import your entire workspace configuration.
- **Deployable anywhere** — Host it on Netlify, Vercel, Cloudflare, or any platform that supports serverless functions.

**When you should stick with the default:**

- **Zero-setup convenience** — The default playground is already running at your API's `/graphql` endpoint. No deployment needed.
- **Server-side features** — Some built-in playgrounds support subscriptions (WebSocket) out of the box. This project doesn't currently support subscriptions.
- **Offline or air-gapped environments** — If your API is on a private network with no external access, the default playground (served by the API itself) is the only option.
- **Very large schemas** — While this project handles large schemas (with warnings at 500+ types), the default playground running on the same server may be slightly faster for extremely large schemas since there's no proxy hop.

### Feature comparison

| Feature | Classic Playground | This Project |
|---------|-------------------|--------------|
| Endpoint configuration | Hardcoded by the backend | User enters any URL at runtime |
| Multiple endpoints | No | Yes — saved endpoints with instant switching |
| Per-endpoint workspaces | No | Yes — each endpoint has its own tabs, queries, and auth |
| Schema-aware autocomplete | Yes (single endpoint) | Yes (all endpoints, via `Ctrl+Space`) |
| Schema documentation | Basic sidebar | Searchable sidebar with type navigation and SDL view |
| Large schema handling | Slows down or crashes | Warns at 500+ types, lazy rendering |
| Bearer token management | Shared JSON header panel | Dedicated token input, saved per-endpoint |
| CORS handling | Requires backend config | Built-in serverless proxy, works with any endpoint |
| State persistence | Session only | Full localStorage persistence across browser sessions |
| Download results | No | Yes — JSON download and clipboard copy |
| Settings & customization | None | Font size, autocomplete toggle, data export/import |
| Quick-start guide | No | Yes — example endpoints and keyboard shortcuts on launch |
| Modern UI framework | Custom CSS | Nuxt UI 4 component library |
| Theme | Legacy dark theme | Modern dark theme with Tailwind CSS v4 |

---

## Features

- **Configurable endpoint** — enter any GraphQL endpoint URL, no defaults, no restrictions
- **Saved endpoints** — previously used endpoints appear in a dropdown for instant switching
- **Per-endpoint workspaces** — each endpoint has its own query tabs, variables, and bearer token
- **Multi-tab queries** — open multiple query tabs per endpoint, rename them, close them
- **Schema-aware autocomplete** — press `Ctrl+Space` for context-aware field and type suggestions
- **CodeMirror 6 editor** — GraphQL syntax highlighting, bracket matching, adjustable font size
- **Query execution** — click the play button or press `Ctrl+Enter` / `Cmd+Enter`
- **Pretty-printed results** — formatted JSON output in the results panel
- **Copy results** — copy JSON results to clipboard with one click
- **Download results** — download the JSON response as a file
- **Schema introspection** — automatic schema fetching when you connect to an endpoint
- **Schema documentation sidebar** — searchable, collapsible view of Queries, Mutations, and Types
- **Schema SDL view** — raw Schema Definition Language for reference
- **Type navigation** — click any type name in the docs sidebar to jump to its definition
- **Bearer token support** — dedicated input per endpoint, sent as `Authorization: Bearer <token>`
- **Query variables** — JSON variables panel below the editor
- **Prettify** — auto-format your query with one click
- **Query history** — browse and re-run previously executed queries (per-endpoint)
- **Copy CURL** — generate a ready-to-paste `curl` command for the current query
- **CORS proxy** — all requests go through a serverless function, so any endpoint works regardless of CORS headers
- **Settings panel** — adjust editor font size, toggle autocomplete, export/import data, clear all saved data
- **Quick-start guide** — example endpoints and usage instructions shown on first launch
- **Full persistence** — everything is saved to `localStorage` and restored when you return
- **Export / Import** — export all saved data as JSON, import on another machine
- **Large schema detection** — warns when a schema exceeds 500 types and suggests the native playground
- **Dark theme** — optimized for extended use

---

## Quick Start

### Try the live version

Visit [https://icjia-graphql-playground.netlify.app](https://icjia-graphql-playground.netlify.app) and enter a GraphQL endpoint URL to get started. Try one of these public endpoints:

```
https://countries.trevorblades.com/graphql
https://spac.icjia-api.cloud/graphql
```

### Run locally

**Prerequisites:** Node.js 22+ and Yarn 1.22+ (preferred) or npm.

```bash
# Clone the repo
git clone https://github.com/cschweda/graphql-playground.git
cd graphql-playground

# Install dependencies (yarn preferred)
yarn install

# Or with npm
npm install

# Start the dev server
yarn dev
# Or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Installation & Setup

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 22.14.0+ | An `.nvmrc` file is included — run `nvm use` to switch |
| Yarn | 1.22.22 | **Preferred.** npm also works. |
| Git | Any recent version | For cloning and version control |

### Install dependencies

```bash
# Preferred: Yarn
yarn install

# Alternative: npm
npm install
```

### Development

```bash
# Start the dev server with hot reload
yarn dev
# Or: npm run dev
```

The dev server runs at `http://localhost:3000` by default. The GraphQL proxy function runs on the same server — no separate backend is needed.

**Note:** In development mode, the proxy allows HTTP endpoints for testing. In production, only HTTPS endpoints are permitted.

### Production build

```bash
# Build for production (generates static files + serverless functions)
yarn build
# Or: npm run build

# Preview the production build locally
yarn preview
# Or: npm run preview
```

The build outputs to `.output/` and includes both the static SPA and the Netlify serverless function for the proxy.

### Run tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch
```

---

## Configuration

All build-time constants are centralized in `playground.config.ts` at the project root. This is the single source of truth for:

- App metadata (name, version, URLs)
- Proxy security settings (allowed origins, headers, blocked hosts, limits)
- Schema thresholds
- localStorage key names
- Default runtime settings
- Example endpoints shown in the quick-start guide

Runtime user preferences (font size, autocomplete toggle) are managed in the Settings panel and persisted to localStorage.

---

## Deployment

This project is deployed on [Netlify Pro](https://www.netlify.com/) but can be adapted for other platforms.

### Deploy to Netlify (recommended)

The project includes a `netlify.toml` that configures everything automatically.

**Option 1: Git-based deploy (CI/CD)**

1. Push the repo to GitHub, GitLab, or Bitbucket
2. Go to [app.netlify.com](https://app.netlify.com) and click "Add new site" > "Import an existing project"
3. Connect your repo
4. Netlify auto-detects the build settings from `netlify.toml`:
   - Build command: `yarn build`
   - Publish directory: `dist`
   - Node version: 22.14.0
5. Click "Deploy" — your site goes live in about 30 seconds

Every push to `main` will trigger a new deploy automatically.

**Option 2: CLI deploy (manual)**

```bash
# Install the Netlify CLI if you haven't already
npm install -g netlify-cli

# Login to Netlify
netlify login

# Create a new site and link it
netlify sites:create --name my-graphql-playground
netlify link

# Build and deploy
yarn build
netlify deploy --prod
```

### Deploy to other platforms

The project uses Nitro (Nuxt's server engine) which supports [many deployment targets](https://nitro.build/deploy). To deploy elsewhere, change the `nitro.preset` in `nuxt.config.ts`:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    preset: 'vercel'  // or 'cloudflare-pages', 'deno-deploy', etc.
  }
})
```

The key requirement is that the platform must support **serverless functions** for the `/api/graphql-proxy` route. Static-only hosting (like GitHub Pages) will not work because the CORS proxy needs a server.

---

## How It Works

### Architecture

```
Browser (SPA)                  Netlify                     Target API
─────────────                  ───────                     ──────────

 ┌──────────────┐
 │ Query Editor  │
 │ (CodeMirror)  │──── POST /api/graphql-proxy ───┐
 └──────────────┘                                  │
                                           ┌───────▼────────┐
                                           │ Serverless Fn   │
                                           │ (Nitro route)   │──── POST endpoint/graphql ──→ GraphQL API
                                           │                 │                                    │
                                           │ - Validates URL │◄── JSON response ─────────────────┘
                                           │ - Blocks SSRF   │
                                           │ - Filters hdrs  │
                                           └───────┬────────┘
 ┌──────────────┐                                  │
 │ Results Panel │◄── JSON response ───────────────┘
 └──────────────┘
```

The browser never talks directly to the target GraphQL API. All requests are routed through a serverless proxy function deployed alongside the app. This eliminates CORS issues entirely because CORS is a browser restriction that doesn't apply to server-to-server requests.

### Why a proxy?

When you open a GraphQL playground in your browser and try to query an API on a different domain, the browser blocks the request unless the API explicitly allows it via CORS headers. Many APIs (especially Strapi instances) don't configure CORS for arbitrary origins.

The proxy solves this: your browser sends the request to the same domain (the Netlify function), and the function forwards it to the target API server-side. From the browser's perspective, the request never leaves the same origin.

### Data storage

All user data is stored in the browser's `localStorage`. Nothing is sent to any server except the GraphQL queries you explicitly execute.

| Storage Key | Contents |
|-------------|----------|
| `gql-playground-endpoints` | Array of saved endpoints (URL, label, last used, bearer token) |
| `gql-playground-active-endpoint` | Currently selected endpoint URL |
| `gql-playground-workspaces` | Per-endpoint tabs with query content, variables, and results |
| `gql-playground-history` | Query execution history (last 50 entries per endpoint) |
| `gql-playground-settings` | User preferences (font size, autocomplete toggle) |

To clear all saved data, use the Settings panel (gear icon) or open browser DevTools > Application > Local Storage and delete the keys.

---

## Security

### Proxy hardening

The serverless proxy at `/api/graphql-proxy` includes multiple security measures to prevent abuse:

| Protection | Description |
|------------|-------------|
| **Origin validation** | The proxy only accepts requests from the playground app itself. External sites, scripts, and `curl` commands cannot use the proxy in production. Enforced via `Origin` / `Referer` header checking against an allowlist. |
| **GraphQL path check** | The target endpoint URL must contain `graphql` in the path. This prevents the proxy from being used as a general-purpose HTTP relay. |
| **HTTPS enforcement** | In production, only HTTPS endpoints are allowed. HTTP is permitted in development only. |
| **SSRF protection** | Requests to `localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`, private IP ranges (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`), and cloud metadata endpoints (`169.254.169.254`) are blocked. |
| **Header allowlist** | Only safe headers are forwarded: `Authorization`, `Content-Type`, `Accept`, `X-API-Key`, `X-Request-ID`. All other headers from the client are silently dropped. |
| **Query size limit** | Queries exceeding 100KB are rejected with a `413` response. |
| **Request timeout** | Upstream requests time out after 30 seconds. |
| **POST only** | The proxy only accepts POST requests (enforced by Nitro's `.post.ts` file naming). |

All security constants are defined in `playground.config.ts` and imported by the proxy at build time.

### Netlify Pro plan protections

This project is deployed on Netlify Pro, which provides additional platform-level protections:

| Feature | Details |
|---------|---------|
| **DDoS protection** | Automatic Layer 3/4 and Layer 7 DDoS mitigation across the entire CDN. This is included on all Netlify plans (Free and Pro). |
| **Serverless function limits** | 60-second timeout, 1024 MB memory, 6 MB request payload. Same across all plans. |
| **Rate limiting** | Up to 5 code-based rate limiting rules per project (vs 2 on Free). |
| **Secrets controller** | Write-only environment variables with automatic secret detection that fails builds if credentials are exposed. |
| **Visitor access control** | Password-protect non-production deploys. |
| **Extended logging** | 7-day function log retention (vs 24 hours on Free). |

**Note:** Full WAF (Web Application Firewall) with OWASP rules is available only on Netlify Enterprise. For Pro, the proxy's own validation logic (origin checks, SSRF blocking, header filtering) provides the application-layer security.

### What the proxy does NOT protect against

- **Authentication bypass** — The proxy forwards your bearer token to the target API. If the API is misconfigured (e.g., allows unauthenticated writes), the proxy won't stop you. **Security is the target API's responsibility** (e.g., Strapi's role-based permissions).
- **Per-user rate limiting** — There is no per-user rate limiting in the proxy itself. Netlify applies platform-level limits to serverless functions. The Pro plan is more than sufficient for team use.
- **Domain allowlisting** — By default, the proxy allows requests to any public HTTPS endpoint with `graphql` in the path. If you want to restrict it to specific domains, add an allowlist in `playground.config.ts`:

```typescript
// In playground.config.ts, add to the proxy section:
allowedDomains: [
  'spac.icjia-api.cloud',
  'my-strapi.example.com'
]

// Then in server/api/graphql-proxy.post.ts, add a check after URL parsing:
if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
  throw createError({
    statusCode: 403,
    statusMessage: 'This endpoint domain is not allowed'
  })
}
```

### Client-side security

- **Bearer tokens are stored in `localStorage`** — this is acceptable for a developer tool but means any JavaScript on the page can read them. Do not use this tool on shared or untrusted machines with production API tokens.
- **No server-side storage** — the Netlify function is stateless. Nothing is logged or persisted on the server.

---

## Project Structure

```
graphql-playground/
├── playground.config.ts          # Single source of truth: build-time constants & defaults
├── app/
│   ├── assets/css/
│   │   ├── main.css              # Tailwind CSS + Nuxt UI imports, global styles
│   │   └── splitpanes.css        # Dark theme overrides for split panes
│   ├── components/
│   │   ├── PlaygroundLayout.vue  # Main page layout with split panes
│   │   ├── EndpointSelector.vue  # URL input + saved endpoints dropdown
│   │   ├── WelcomeGuide.vue     # Quick-start guide shown when no endpoint is connected
│   │   ├── TabBar.vue            # Per-endpoint query tabs
│   │   ├── QueryEditor.vue       # CodeMirror 6 GraphQL editor with autocomplete
│   │   ├── ResultsPanel.vue      # JSON results with copy and download buttons
│   │   ├── BottomPanels.vue      # Variables + HTTP Headers panels
│   │   ├── ToolbarActions.vue    # Prettify, History, Copy CURL buttons
│   │   ├── HistoryModal.vue      # Query history browser
│   │   ├── SettingsModal.vue     # App settings (font size, autocomplete, data management)
│   │   ├── SchemaSidebar.vue     # Schema documentation slide-out panel
│   │   ├── SchemaSection.vue     # Collapsible Queries/Mutations section
│   │   └── SchemaTypeDetail.vue  # Expandable type detail view
│   ├── composables/
│   │   ├── useGraphQL.ts         # Query execution logic
│   │   ├── useSchema.ts          # Schema introspection + parsing
│   │   └── useHistory.ts         # Query history management
│   ├── stores/
│   │   ├── endpoints.ts          # Pinia store: saved endpoints
│   │   ├── workspace.ts          # Pinia store: per-endpoint workspaces
│   │   └── settings.ts           # Pinia store: user preferences
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── pages/
│   │   └── index.vue             # Single page entry point
│   └── app.vue                   # Root app component with UApp wrapper
├── server/
│   └── api/
│       └── graphql-proxy.post.ts # Serverless CORS proxy with security hardening
├── tests/                        # Vitest test suites
│   ├── unit/                     # Store, composable, and config tests
│   ├── components/               # Vue component tests
│   └── api/                      # Server route tests
├── docs/
│   └── plans/                    # Design and implementation planning documents
├── nuxt.config.ts                # Nuxt configuration (SPA mode, dark theme, Netlify preset)
├── netlify.toml                  # Netlify build and deploy configuration
├── vitest.config.ts              # Vitest configuration
├── package.json                  # Dependencies and scripts
├── .nvmrc                        # Node.js version (22.14.0)
└── yarn.lock                     # Dependency lock file
```

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [Nuxt](https://nuxt.com) | 4.3.x | Vue meta-framework (SPA mode, server routes, auto-imports) |
| [Vue](https://vuejs.org) | 3.5.x | Reactive UI framework |
| [Nuxt UI](https://ui.nuxt.com) | 4.4.x | Component library (buttons, modals, inputs, slideouts, toasts) |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Utility-first CSS framework |
| [CodeMirror](https://codemirror.net) | 6.x | Code editor with GraphQL syntax highlighting and autocomplete |
| [cm6-graphql](https://www.npmjs.com/package/cm6-graphql) | 0.2.x | GraphQL language support for CodeMirror 6 |
| [graphql](https://www.npmjs.com/package/graphql) | 16.x | GraphQL schema parsing, introspection, prettify |
| [Pinia](https://pinia.vuejs.org) | 3.x | State management with localStorage persistence |
| [splitpanes](https://antoniandre.github.io/splitpanes/) | 4.x | Resizable split pane layout |
| [Nitro](https://nitro.build) | 2.13.x | Server engine (powers the proxy function) |
| [Vitest](https://vitest.dev) | 3.x | Unit and component testing |
| [Netlify](https://www.netlify.com) | Pro | Hosting (static files + serverless functions) |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` / `Cmd+Enter` | Execute the current query |
| `Ctrl+Space` | Open autocomplete suggestions |
| `Double-click tab name` | Rename a query tab |

---

## Working with Strapi

This playground is designed to work well with [Strapi](https://strapi.io/) GraphQL endpoints. A few things to know:

1. **Enable the GraphQL plugin** — Strapi includes a GraphQL plugin that exposes a `/graphql` endpoint. Make sure it's enabled in your Strapi project.

2. **Permissions** — Strapi controls what operations are available through its role-based permissions system. If a query returns an authorization error, check your Strapi admin panel under Settings > Roles > Public (or the relevant role) to ensure the content types are readable.

3. **Bearer tokens** — For authenticated queries, create an API token in Strapi (Settings > API Tokens) and paste it into the HTTP Headers panel in the playground.

4. **Schema size** — Large Strapi projects can generate schemas with hundreds of types (filters, pagination, relations all create additional types). If the schema docs sidebar feels slow, use the search feature to quickly find what you need.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run the dev server and test (`yarn dev`)
5. Run the test suite (`yarn test`)
6. Commit (`git commit -m 'feat: add my feature'`)
7. Push to your branch (`git push origin feature/my-feature`)
8. Open a Pull Request

---

## License

MIT
