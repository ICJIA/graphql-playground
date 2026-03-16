# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** — breaking changes to configuration, storage keys, or proxy API
- **MINOR** — new features, new UI capabilities, new endpoints
- **PATCH** — bug fixes, styling tweaks, test additions, dependency bumps

---

## [1.2.0] - 2026-03-16

### Added
- **Copy query button** — new COPY button next to CLEAR and PRETTIFY with check icon feedback
- **`?quickstart=true` URL parameter** — forces the welcome guide to display even for returning users, useful for demos and stakeholder walkthroughs
- **localStorage quota handling** — `safePersist` utility catches `QuotaExceededError` and shows a toast instead of silently failing
- **Cross-tab synchronization** — Pinia stores and query history now sync across browser tabs via `storage` events
- **Exponential backoff for schema introspection** — replaced single retry with 3 retries at 1s, 2s, 4s intervals
- **ICJIA ResearchHub example endpoint** — `https://v2.hub.icjia-api.cloud/graphql` with articles query (title, abstract, date, splash, thumbnail, createdAt, tags sorted by date desc)
- **6 new tests** for storage safety and cross-tab sync (262 total)
- **CHANGELOG.md** — this file

### Changed
- **High-contrast Nuxt green links** — all ghost/link buttons now use `#00DC82` (10.2:1 contrast ratio on dark backgrounds), matching the Nuxt.com brand green
- **Dark backgrounds on slideover and modals** — schema explorer, settings, and history modals forced to `#0a0f1a` with white text for WCAG AA compliance
- **Play button redesign** — larger 56px circle with Nuxt green background, breathing glow animation, and expanding ring pulse
- **Schema sidebar text contrast** — section headings bumped to white, field names to lighter shades, SDL text to `gray-100`
- **DOCS/SCHEMA toggle buttons** — added gap between buttons, green text for visibility
- **Hover state safety** — all hover backgrounds forced dark with explicit CSS to maintain WCAG AA 4.5:1 contrast
- **Dropdown/popover dark backgrounds** — forced dark on all Nuxt UI dropdown menus and popovers

### Removed
- **Countries API example endpoint** — replaced with ICJIA ResearchHub

---

## [1.1.0] - 2026-03-09

### Added
- Session-only token storage option (cleared on browser tab close)
- Content Security Policy generation script with hash-based inline scripts
- Redirect rejection in proxy (prevents SSRF via 3xx redirects)
- Per-IP rate limiting (60 req/min sliding window)
- Response size limit (10 MB) and JSON.parse crash protection
- 34 SEO tests (OG image validation, meta tags, sitemap/robots config)
- @nuxtjs/seo module with sitemap, robots, and canonical link
- OG/Twitter SEO image and full meta tags
- Schema retry on transient failure with endpoint switching guard

### Changed
- Security header hardening (HSTS, X-Frame-Options, CSP, Permissions-Policy, Referrer-Policy)
- Proxy hardening with stricter origin validation and header sanitization

---

## [1.0.0] - 2026-03-01

### Added
- **Core playground** — CodeMirror 6 editor with GraphQL syntax highlighting and schema-aware autocomplete (`Ctrl+Space`)
- **Multi-endpoint management** — save, switch, and remove GraphQL endpoints with persistent workspaces
- **Per-endpoint tabs** — multiple query tabs per endpoint with auto-naming from query content
- **Bearer token authentication** — dedicated token input per endpoint, forwarded as `Authorization: Bearer` header
- **CORS proxy** — serverless function at `/api/graphql-proxy` with SSRF protection (private IP blocking, DNS pinning, header sanitization)
- **Schema introspection** — automatic schema fetching with searchable docs sidebar and SDL view
- **Schema/docs download** — export as `.graphql` SDL or structured JSON for LLM consumption
- **Multi-format export** — download results as JSON, CSV, Markdown, YAML, or TypeScript
- **Copy CURL** — generate shell-safe curl command for any query
- **Query history** — browse and restore last 50 executed queries across all endpoints
- **Settings panel** — font size adjustment, data export/import, full data clear with confirmation
- **Quick-start guide** — example endpoints and keyboard shortcuts shown on first launch
- **Full localStorage persistence** — queries, results, variables, tokens, history, and settings survive browser restarts
- **WCAG 2.1 AA accessibility** — Lighthouse 100 score, semantic HTML, ARIA attributes, keyboard navigation
- **Dark theme** — Tailwind CSS v4 with custom dark theme for all components
- **217 tests** — unit, component, and API test suites via Vitest 4.x
- **Netlify deployment** — `netlify.toml` with security headers and Node 22
