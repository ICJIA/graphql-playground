/**
 * GraphQL Proxy Server Route
 *
 * Forwards GraphQL requests from the browser to external endpoints,
 * bypassing CORS restrictions. Includes security hardening to prevent
 * SSRF, header injection, and abuse.
 *
 * This proxy is locked to same-origin requests only — it cannot be
 * called from external sites or scripts (origin/referer validation).
 */

import { lookup } from 'node:dns/promises'
import { playgroundConfig } from '../../playground.config'

const ALLOWED_ORIGINS: readonly string[] = playgroundConfig.proxy.allowedOrigins
const ALLOWED_HEADERS: readonly string[] = playgroundConfig.proxy.allowedHeaders
const BLOCKED_HOSTNAMES: readonly string[] = playgroundConfig.proxy.blockedHostnames
const MAX_QUERY_LENGTH = playgroundConfig.proxy.maxQueryLength
const REQUEST_TIMEOUT = playgroundConfig.proxy.requestTimeout

/**
 * Checks whether a hostname resolves to a private, loopback, or reserved IP address (SSRF protection).
 * Blocks: 10.x, 172.16-31.x, 192.168.x, 127.x (loopback), 0.x, and IPv6-mapped IPv4 addresses.
 * @param hostname - The hostname string to evaluate.
 * @returns True if the hostname falls within a private/reserved IP range.
 */
function isPrivateIP(hostname: string): boolean {
  // Strip IPv6-mapped IPv4 prefix (e.g., "::ffff:10.0.0.1" → "10.0.0.1")
  let normalized = hostname
  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.slice(7)
  }

  // Block private/reserved IPv4 ranges
  const parts = normalized.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => isNaN(n))) return false
  const [a, b] = parts as [number, number, number, number]
  // 10.x.x.x (Class A private)
  if (a === 10) return true
  // 127.x.x.x (loopback)
  if (a === 127) return true
  // 172.16.x.x - 172.31.x.x (Class B private)
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.x.x (Class C private)
  if (a === 192 && b === 168) return true
  // 0.x.x.x (reserved)
  if (a === 0) return true
  return false
}

/**
 * Filters client-provided headers through the configured allowlist.
 * Always includes `Content-Type: application/json`; other headers are kept only if they appear in the allowlist.
 * @param customHeaders - Optional record of headers supplied by the client.
 * @returns A sanitized record of headers safe to forward to the upstream endpoint.
 */
function sanitizeHeaders(customHeaders: Record<string, string> | undefined): Record<string, string> {
  const sanitized: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (!customHeaders || typeof customHeaders !== 'object') {
    return sanitized
  }

  for (const [key, value] of Object.entries(customHeaders)) {
    if (typeof key === 'string' && typeof value === 'string' && ALLOWED_HEADERS.includes(key.toLowerCase())) {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Main proxy handler that validates the incoming request, enforces security checks
 * (origin, HTTPS, SSRF, query length), and forwards the GraphQL query to the target endpoint.
 */
export default defineEventHandler(async (event) => {
  // --- Origin validation (prevent external abuse) ---
  const origin = getRequestHeader(event, 'origin')
  const referer = getRequestHeader(event, 'referer')

  if (!import.meta.dev) {
    const requestOrigin = origin || (referer ? new URL(referer).origin : null)
    if (!requestOrigin || !ALLOWED_ORIGINS.includes(requestOrigin)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: requests must originate from the playground app'
      })
    }
  }

  const body = await readBody(event)

  // --- Validate endpoint ---
  const { endpoint, query, variables, headers: customHeaders } = body

  if (!endpoint || typeof endpoint !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing or invalid endpoint URL'
    })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(endpoint)
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid endpoint URL format'
    })
  }

  // Enforce HTTPS (allow HTTP only in development)
  if (parsedUrl.protocol !== 'https:' && !import.meta.dev) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only HTTPS endpoints are allowed in production'
    })
  }

  // Block requests to private/internal addresses (SSRF protection)
  if (BLOCKED_HOSTNAMES.includes(parsedUrl.hostname) || isPrivateIP(parsedUrl.hostname)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Requests to private or internal addresses are not allowed'
    })
  }

  // DNS resolution check: resolve hostname and verify the IP is not private.
  // Prevents bypasses via non-standard IP formats (hex, octal, decimal)
  // and domains that resolve to internal addresses.
  try {
    const { address } = await lookup(parsedUrl.hostname)
    if (isPrivateIP(address)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Requests to private or internal addresses are not allowed'
      })
    }
  } catch (error: any) {
    if (error?.statusCode === 403) throw error
    throw createError({
      statusCode: 400,
      statusMessage: 'Could not resolve endpoint hostname'
    })
  }

  // --- Validate query ---
  if (!query || typeof query !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing or invalid query'
    })
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw createError({
      statusCode: 413,
      statusMessage: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`
    })
  }

  // Verify the endpoint path looks like a GraphQL endpoint
  if (!parsedUrl.pathname.includes('graphql')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Endpoint URL must contain "graphql" in the path'
    })
  }

  // --- Build safe headers ---
  const fetchHeaders = sanitizeHeaders(customHeaders)

  // --- Forward request ---
  try {
    const response = await $fetch(endpoint, {
      method: 'POST',
      headers: fetchHeaders,
      body: {
        query,
        variables: variables || undefined
      },
      timeout: REQUEST_TIMEOUT,
      redirect: 'manual'
    })

    return response
  } catch (error: any) {
    // Pass through GraphQL error responses (e.g., validation errors
    // returned with non-2xx status codes)
    if (error?.data) {
      return error.data
    }

    throw createError({
      statusCode: error?.statusCode || 502,
      statusMessage: error?.message || 'Failed to reach the GraphQL endpoint'
    })
  }
})
