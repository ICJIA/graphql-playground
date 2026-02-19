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

import { playgroundConfig } from '../../app/playground.config'

const {
  allowedOrigins: ALLOWED_ORIGINS,
  allowedHeaders: ALLOWED_HEADERS,
  blockedHostnames: BLOCKED_HOSTNAMES,
  maxQueryLength: MAX_QUERY_LENGTH,
  requestTimeout: REQUEST_TIMEOUT
} = playgroundConfig.proxy

function isPrivateIP(hostname: string): boolean {
  // Block private/reserved IP ranges (SSRF protection)
  const parts = hostname.split('.').map(Number)
  if (parts.length === 4 && parts.every(n => !isNaN(n))) {
    // 10.x.x.x
    if (parts[0] === 10) return true
    // 172.16.x.x - 172.31.x.x
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    // 192.168.x.x
    if (parts[0] === 192 && parts[1] === 168) return true
    // 0.x.x.x
    if (parts[0] === 0) return true
  }
  return false
}

function sanitizeHeaders(
  customHeaders: Record<string, string> | undefined
): Record<string, string> {
  const sanitized: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (!customHeaders || typeof customHeaders !== 'object') {
    return sanitized
  }

  for (const [key, value] of Object.entries(customHeaders)) {
    if (
      typeof key === 'string' &&
      typeof value === 'string' &&
      ALLOWED_HEADERS.includes(key.toLowerCase())
    ) {
      sanitized[key] = value
    }
  }

  return sanitized
}

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
  if (
    BLOCKED_HOSTNAMES.includes(parsedUrl.hostname) ||
    isPrivateIP(parsedUrl.hostname)
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Requests to private or internal addresses are not allowed'
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
      timeout: REQUEST_TIMEOUT
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
