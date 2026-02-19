# ICJIA GraphQL Playground

A modern, configurable GraphQL playground built with Nuxt 4, Nuxt UI 4, and CodeMirror 6. Works with **any public GraphQL endpoint** and supports **bearer token authentication** for secured APIs. Solves the CORS problem with a built-in serverless proxy.

**Live:** [https://playground.icjia.app](https://playground.icjia.app)

---

## What is GraphQL?

[GraphQL](https://graphql.org/) is a query language for APIs developed by Facebook (now Meta) in 2012 and open-sourced in 2015. Unlike REST, where the server decides what data to return for each endpoint, GraphQL lets the **client specify exactly which fields it needs** in a single request.

A typical REST workflow might require three separate calls — `GET /users/1`, `GET /users/1/posts`, `GET /users/1/followers` — to assemble a profile page. With GraphQL, you send one query:

```graphql
{
  user(id: 1) {
    name
    posts { title }
    followers { name }
  }
}
```

The server returns exactly that shape — nothing more, nothing less.

### GraphQL vs REST

| | REST | GraphQL |
|---|---|---|
| **Data fetching** | Fixed data per endpoint (`/users`, `/posts`) — often returns more than you need (over-fetching) or less (under-fetching) | Client requests exactly the fields it needs — no over- or under-fetching |
| **Endpoints** | Many endpoints, one per resource (`/users`, `/users/:id`, `/posts`) | Single endpoint (`/graphql`) handles all operations |
| **Versioning** | Requires explicit versioning (`/api/v1/`, `/api/v2/`) when the shape changes | Schema evolves by adding fields — old clients keep working without breaking |
| **Documentation** | Requires external docs (Swagger/OpenAPI) or manual documentation | Self-documenting via introspection — clients can query the schema itself |
| **Tooling** | Postman, cURL, browser | Playgrounds with autocomplete, schema browsing, query validation |
| **Learning curve** | Lower — HTTP verbs (GET, POST, PUT, DELETE) are widely understood | Higher — new query syntax, schema design, resolver patterns |
| **Caching** | Simple — HTTP caching works out of the box with GET requests | More complex — single POST endpoint means standard HTTP caching doesn't apply |
| **File uploads** | Native multipart support | Requires workarounds (multipart spec, presigned URLs) |
| **Real-time** | Polling or WebSockets (separate implementation) | Built-in subscriptions via WebSocket |
| **Error handling** | HTTP status codes (404, 500, etc.) | Always returns 200 — errors are in the response body |
| **Best for** | Simple CRUD, public APIs, microservices | Complex data relationships, mobile apps, frontend-driven development |

**Bottom line:** REST is simpler and well-suited for straightforward CRUD APIs. GraphQL shines when you have deeply nested or interconnected data, multiple client types (web, mobile, third-party), or when you want the frontend team to move fast without waiting for backend endpoint changes.

---

## What is this?

Most GraphQL APIs include a built-in playground (the classic [Prisma GraphQL Playground](https://github.com/graphql/graphql-playground) or [GraphiQL](https://github.com/graphql/graphiql)). These are useful but aging — Prisma's playground was deprecated in 2020, and the built-in tools are locked to a single endpoint with limited customization.

This project is a standalone replacement that you host yourself. Point it at **any public GraphQL endpoint**, run queries, browse the schema, and save your work — all from a modern, dark-themed interface. For authenticated APIs, add a bearer token per endpoint and the playground sends it with every request.

### Why use this instead of the default playground?

The default GraphQL Playground (Prisma v1.7) and GraphiQL ship embedded with your API server. They're convenient but limited — locked to one endpoint, no persistence, no CORS proxy, minimal customization. This project exists because developer tools should adapt to how you work, not the other way around.

**Advantages of this playground:**

- **Works with any GraphQL endpoint** — Connect to any public GraphQL API. No configuration on the target server required. The built-in CORS proxy handles everything.
- **Bearer token authentication** — Each endpoint has a dedicated token input. Add your API key or JWT and it's sent as `Authorization: Bearer <token>` with every request. Tokens are saved per-endpoint so you can switch between public and authenticated APIs seamlessly.
- **Multi-endpoint** — Switch between production, staging, and local APIs from one tool. Each endpoint remembers its own tabs, queries, variables, and bearer token.
- **Persistent workspaces** — Close the browser, come back tomorrow, and everything is exactly where you left it. Queries, results, tokens — all saved automatically.
- **Schema-aware autocomplete** — Press `Ctrl+Space` to get context-aware field suggestions powered by the introspected schema. Works across all your saved endpoints.
- **Schema & docs download** — Export the schema as SDL or structured JSON for LLM consumption.
- **Modern editor** — CodeMirror 6 with adjustable font size, one-dark theme, and bracket matching.
- **Export & portability** — Download results in five formats (JSON, CSV, Markdown, YAML, TypeScript), copy curl commands, export/import your entire workspace.
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
| Schema/docs export | No | Yes — download SDL or structured JSON (for LLMs) |
| Large schema handling | Slows down or crashes | Warns at 500+ types, lazy rendering |
| Bearer token management | Shared JSON header panel | Dedicated token input, saved per-endpoint |
| CORS handling | Requires backend config | Built-in serverless proxy, works with any endpoint |
| State persistence | Session only | Full localStorage persistence across browser sessions |
| Download results | No | Yes — JSON, CSV, Markdown, YAML, TypeScript |
| Settings & customization | None | Font size, data export/import |
| Quick-start guide | No | Yes — example endpoints and keyboard shortcuts on launch |
| Modern UI framework | Custom CSS | Nuxt UI 4 component library |
| Theme | Legacy dark theme | Modern dark theme with Tailwind CSS v4 |
| Test suite | None | 108 tests (unit, component, API) via Vitest |

---

## Features

**Connectivity**
- **Any GraphQL endpoint** — enter any public GraphQL endpoint URL. No allowlists, no restrictions. If it speaks GraphQL, this playground connects to it.
- **Bearer token authentication** — dedicated token input per endpoint, sent as `Authorization: Bearer <token>`. Tokens are saved per-endpoint so you can switch between public and authenticated APIs without re-entering credentials.
- **Saved endpoints** — previously used endpoints appear in a dropdown for instant switching
- **CORS proxy** — all requests go through a serverless function, so any endpoint works regardless of CORS headers

**Editor**
- **Schema-aware autocomplete** — press `Ctrl+Space` for context-aware field suggestions powered by introspection
- **CodeMirror 6 editor** — GraphQL syntax highlighting, bracket matching, adjustable font size
- **Per-endpoint workspaces** — each endpoint has its own query tabs, variables, and bearer token
- **Multi-tab queries** — open multiple query tabs per endpoint, rename them, close them
- **Prettify** — auto-format your query with one click
- **Query variables** — JSON variables panel below the editor

**Results & Export**
- **Pretty-printed results** — formatted JSON output in the results panel
- **Copy results** — copy JSON results to clipboard with one click
- **Multi-format download** — export query results in five formats:
  - **JSON** — raw API response, ideal for programmatic use
  - **CSV** — flattened tabular data, opens directly in Excel or Google Sheets
  - **Markdown table** — paste into GitHub issues, PRs, docs, or Slack
  - **YAML** — human-readable format, popular in DevOps and config contexts
  - **TypeScript** — typed `as const` export, ready-made test fixtures and mock data
- **Copy CURL** — generate a ready-to-paste `curl` command for the current query

**Schema**
- **Schema introspection** — automatic schema fetching when you connect to an endpoint
- **Schema documentation sidebar** — searchable, collapsible view of Queries, Mutations, and Types
- **Schema SDL view** — raw Schema Definition Language for reference
- **Schema & docs download** — export schema as SDL (`.graphql`) or structured JSON for LLM consumption
- **Type navigation** — click any type name in the docs sidebar to jump to its definition
- **Large schema detection** — warns when a schema exceeds 500 types and suggests the native playground

**Settings & Persistence**
- **Query history** — browse and re-run previously executed queries (per-endpoint)
- **Settings panel** — adjust editor font size, export/import data, clear all saved data (with confirmation)
- **Quick-start guide** — example endpoints and usage instructions shown on first launch
- **Full persistence** — everything is saved to `localStorage` and restored when you return
- **Export / Import** — export all saved data as JSON, import on another machine
- **Dark theme** — optimized for extended use

---

## Quick Start

### Try the live version

Visit [https://playground.icjia.app](https://playground.icjia.app) and enter a GraphQL endpoint URL to get started. Try one of these public endpoints:

```
https://countries.trevorblades.com/graphql
https://rickandmortyapi.com/graphql
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

### Linting

The project uses [@nuxt/eslint](https://eslint.nuxt.com/) with [Prettier](https://prettier.io/) for consistent formatting.

```bash
# Check for lint errors
yarn lint

# Auto-fix lint and formatting errors
yarn lint:fix
```

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

The project includes 108 tests across unit, component, and API categories using [Vitest](https://vitest.dev/) 4.x.

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch
```

| Suite | Tests | What it covers |
|-------|-------|----------------|
| `tests/unit/playground-config.test.ts` | 17 | Config structure, URLs, security settings, storage keys, defaults, example queries |
| `tests/unit/stores.test.ts` | 11 | Pinia store persistence, endpoint sorting, workspace defaults |
| `tests/unit/useHistory.test.ts` | 7 | History CRUD, entry limits, localStorage sync, clear |
| `tests/unit/export-formats.test.ts` | 26 | CSV, Markdown, YAML, TypeScript export — flattening, escaping, edge cases |
| `tests/api/graphql-proxy.test.ts` | 38 | SSRF blocking (IPv4, IPv6-mapped, loopback), header sanitization, origin validation, URL checks, **bearer token security** (token forwarding, header stripping, cookie/host/IP-spoof prevention, HTTPS enforcement) |
| `tests/components/WelcomeGuide.test.ts` | 5 | Rendering, example endpoints, emit events, content |
| `tests/components/ResultsPanel.test.ts` | 4 | Placeholder state, results display, button visibility |

---

## Configuration

All build-time constants are centralized in **`playground.config.ts`** (project root). The file is organized into two sections:

**User-configurable (top of file)** — values you should change for your own deployment:

- App metadata (name, version, URLs)
- Example endpoints shown in the quick-start guide
- Default editor settings (font size)
- Allowed origins for the CORS proxy

**Internal / do not change (bottom of file)** — security and infrastructure settings:

- Proxy hardening (allowed headers, blocked hostnames, SSRF protection)
- Schema introspection thresholds
- Query history limits
- localStorage key names (changing these orphans existing user data)

Every setting has a JSDoc comment explaining what it does and whether it's safe to modify. Runtime user preferences (font size) are managed in the Settings panel and persisted to localStorage.

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
 └──────────────┘     (HTTPS, Leg 1)              │
                                           ┌───────▼────────┐
                                           │ Serverless Fn   │
                                           │ (Nitro route)   │──── POST endpoint/graphql ──→ GraphQL API
                                           │                 │     (HTTPS, Leg 2)                │
                                           │ - Validates URL │◄── JSON response ─────────────────┘
                                           │ - Blocks SSRF   │
                                           │ - Filters hdrs  │
                                           └───────┬────────┘
 ┌──────────────┐                                  │
 │ Results Panel │◄── JSON response ───────────────┘
 └──────────────┘

 localStorage (browser only):
 ┌─────────────────────────────────────────────┐
 │ Endpoints, queries, variables, results,     │
 │ bearer tokens, history, settings            │
 │ *** Never sent to any server ***            │
 └─────────────────────────────────────────────┘
```

The browser never talks directly to the target GraphQL API. All requests are routed through a serverless proxy function deployed alongside the app. This eliminates CORS issues entirely because CORS is a browser restriction that doesn't apply to server-to-server requests.

### Everything is local

**No data is stored on any server.** All queries, results, variables, bearer tokens, endpoints, history, and settings live exclusively in your browser's `localStorage`. The Netlify serverless function is completely stateless — it receives a request, forwards it, returns the response, and retains nothing. There is no database, no user accounts, no analytics, no telemetry.

The only time data leaves your browser is when you explicitly execute a query. At that point, the query text, variables, and any bearer token you've configured are sent through the proxy to the target API. The results come back and are stored locally in your browser. If you close the tab, everything is still there when you return — because it's all in `localStorage`, not on a server.

### Why a proxy?

When you open a GraphQL playground in your browser and try to query an API on a different domain, the browser blocks the request unless the API explicitly allows it via CORS headers. Many APIs (especially Strapi instances) don't configure CORS for arbitrary origins.

The proxy solves this: your browser sends the request to the same domain (the Netlify function), and the function forwards it to the target API server-side. From the browser's perspective, the request never leaves the same origin.

### What is the serverless function?

If you're new to Netlify or serverless architectures, this section explains how the proxy works.

A **serverless function** is a small piece of server-side code that runs on demand — Netlify spins up a temporary container when a request arrives, executes the code, returns the response, and then shuts down. There is no always-running server; the function exists only for the duration of each request. On Netlify, serverless functions are deployed automatically alongside your static site — no separate server, no infrastructure to manage.

This project uses a single serverless function: **`/api/graphql-proxy`** (source: `server/api/graphql-proxy.post.ts`). It acts as a pass-through relay between your browser and the target GraphQL API:

1. Your browser sends a POST request to `/api/graphql-proxy` on the same domain as the playground.
2. The function validates the request (checks origin, URL format, SSRF protection, query size).
3. If validation passes, the function makes its own HTTP request to the target GraphQL API — this is server-to-server, so CORS restrictions don't apply.
4. The function returns the API response to your browser.
5. The function's execution context is destroyed — nothing is saved, logged, or retained.

**Why can't this be a static site?** A static site (HTML, CSS, JS only) has no server-side code. Without the proxy function, the browser would need to call the target API directly — and the browser's [Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) would block the request unless the target API explicitly allows your domain via CORS headers. Most GraphQL APIs don't do this for arbitrary origins.

**What about other hosting platforms?** The serverless function uses [Nitro](https://nitro.build/), Nuxt's server engine, which supports many deployment targets: Vercel, Cloudflare Workers, Deno Deploy, AWS Lambda, and more. Change the `nitro.preset` in `nuxt.config.ts` to deploy elsewhere — the only requirement is that the platform supports server-side code execution (serverless functions or edge functions).

### How the bearer token is transmitted

When you add a bearer token for an endpoint, it's stored in `localStorage` alongside the endpoint URL. When you execute a query, the token travels over **two HTTPS-encrypted hops**:

```
Step 1: Browser → Netlify proxy (HTTPS)
        Token is sent inside the POST request body as:
        { endpoint: "...", query: "...", headers: { "Authorization": "Bearer <token>" } }

Step 2: Netlify proxy → Target API (HTTPS)
        Proxy extracts the Authorization header and forwards it as a real HTTP header:
        Authorization: Bearer <token>
```

**What makes this secure:**

- **Both hops are HTTPS in production.** The token is encrypted in transit on both legs. The proxy enforces HTTPS-only endpoints in production — HTTP targets are rejected.
- **The token never appears in a URL or query string.** It's always in the POST body (Leg 1) or an HTTP header (Leg 2), never in a place that could be cached by browsers, logged by CDNs, or exposed in referrer headers.
- **The proxy is stateless.** The token passes through memory only — it is not logged, stored, or persisted on the Netlify server. After the response is returned, the function's execution context is destroyed.
- **Origin-locked.** The proxy only accepts requests from the playground app itself (origin validation). An attacker cannot call the proxy from a different site to intercept or replay tokens.

**What this does NOT protect against:**

- **localStorage is readable by any JavaScript on the page.** If a browser extension or XSS vulnerability runs code on the playground's origin, it could read tokens from `localStorage`. This is the same trade-off every SPA makes. For a developer tool this is acceptable; do not use production API tokens on shared or untrusted machines.
- **The Netlify function briefly holds the token in memory.** For the duration of the request (~100ms–30s), the token exists in the serverless function's memory. This is equivalent to how any reverse proxy or API gateway handles auth headers — the token must pass through the proxy to reach the target. There is no way to avoid this while also solving CORS.
- **The target API's security is its own responsibility.** The proxy forwards whatever token you provide. If the target API grants excessive permissions for that token, the proxy will not stop you.

### Data storage

All user data is stored in the browser's `localStorage`. Nothing is sent to any server except the GraphQL queries you explicitly execute.

| Storage Key | Contents |
|-------------|----------|
| `gql-playground-endpoints` | Array of saved endpoints (URL, label, last used, bearer token) |
| `gql-playground-active-endpoint` | Currently selected endpoint URL |
| `gql-playground-workspaces` | Per-endpoint tabs with query content, variables, and results |
| `gql-playground-history` | Query execution history (last 50 entries total across all endpoints) |
| `gql-playground-settings` | User preferences (font size) |

To clear all saved data, use the Settings panel (gear icon > Danger Zone) or open browser DevTools > Application > Local Storage and delete the keys.

---

## Security

### Proxy hardening

The serverless proxy at `/api/graphql-proxy` includes multiple security measures to prevent abuse:

| Protection | Description |
|------------|-------------|
| **Origin validation** | The proxy only accepts requests from the playground app itself. External sites, scripts, and `curl` commands cannot use the proxy in production. Enforced via `Origin` / `Referer` header checking against an allowlist. |
| **GraphQL path check** | The target endpoint URL must contain `graphql` in the path. This prevents the proxy from being used as a general-purpose HTTP relay. |
| **HTTPS enforcement** | In production, only HTTPS endpoints are allowed. HTTP is permitted in development only. |
| **SSRF protection** | Requests to `localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`, private IP ranges (`10.x.x.x`, `127.x.x.x`, `172.16-31.x.x`, `192.168.x.x`), IPv6-mapped private addresses (`::ffff:*`), and cloud metadata endpoints (`169.254.169.254`) are blocked. |
| **Header allowlist** | Only safe headers are forwarded: `Authorization`, `Content-Type`, `Accept`, `X-API-Key`, `X-Request-ID`. All other headers from the client are silently dropped. |
| **Query size limit** | Queries exceeding 100KB are rejected with a `413` response. |
| **Request timeout** | Upstream requests time out after 30 seconds. |
| **POST only** | The proxy only accepts POST requests (enforced by Nitro's `.post.ts` file naming). |

All security constants are defined in `playground.config.ts` (project root) and imported by the proxy at build time.

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

- **Bearer tokens are stored in `localStorage`** — this is acceptable for a developer tool but means any JavaScript on the page can read them. Do not use this tool on shared or untrusted machines with production API tokens. See [How the bearer token is transmitted](#how-the-bearer-token-is-transmitted) above for the full security analysis.
- **No server-side storage** — the Netlify function is stateless. Nothing is logged or persisted on the server. Tokens exist in function memory only for the duration of a request.

---

## Project Structure

```
graphql-playground/
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
│   │   ├── SettingsModal.vue     # App settings (font size, data management)
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
├── playground.config.ts           # Single source of truth: build-time constants & defaults
├── nuxt.config.ts                # Nuxt configuration (SPA mode, dark theme, Netlify preset)
├── eslint.config.mjs             # ESLint flat config with @nuxt/eslint + Prettier
├── .prettierrc                   # Prettier formatting rules (no semis, single quotes)
├── netlify.toml                  # Netlify build and deploy configuration
├── vitest.config.ts              # Vitest configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
├── LICENSE                       # MIT license
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
| [Vitest](https://vitest.dev) | 4.x | Unit, component, and API testing (108 tests) |
| [ESLint](https://eslint.org) | 10.x | Linting via [@nuxt/eslint](https://eslint.nuxt.com/) with Prettier integration |
| [Prettier](https://prettier.io) | 3.x | Code formatting (no semis, single quotes, 120 char width) |
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

3. **Bearer tokens** — For authenticated queries, create an API token in Strapi (Settings > API Tokens) and paste it into the bearer token input for the endpoint in the playground.

4. **Schema size** — Large Strapi projects can generate schemas with hundreds of types (filters, pagination, relations all create additional types). If the schema docs sidebar feels slow, use the search feature to quickly find what you need.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run the dev server and test (`yarn dev`)
5. Run the linter (`yarn lint:fix`)
6. Run the test suite (`yarn test`)
7. Commit (`git commit -m 'feat: add my feature'`)
8. Push to your branch (`git push origin feature/my-feature`)
9. Open a Pull Request

---

## License

MIT
