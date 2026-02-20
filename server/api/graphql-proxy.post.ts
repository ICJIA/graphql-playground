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
import { request as httpsRequest } from 'node:https'
import { request as httpRequest } from 'node:http'
import { createGunzip, createInflate } from 'node:zlib'
import { playgroundConfig } from '../../playground.config'

const ALLOWED_ORIGINS: readonly string[] = playgroundConfig.proxy.allowedOrigins
const ALLOWED_HEADERS: readonly string[] = playgroundConfig.proxy.allowedHeaders
const BLOCKED_HOSTNAMES: readonly string[] = playgroundConfig.proxy.blockedHostnames
const MAX_QUERY_LENGTH = playgroundConfig.proxy.maxQueryLength
const REQUEST_TIMEOUT = playgroundConfig.proxy.requestTimeout

/**
 * Checks whether an IP address is private, loopback, or reserved (SSRF protection).
 * Blocks IPv4: 10/8, 127/8, 172.16/12, 192.168/16, 169.254/16 (link-local/metadata), 0/8.
 * Blocks IPv6: ::1 (loopback), :: (unspecified), fc00::/7 (unique local), fe80::/10 (link-local).
 * Also handles IPv6-mapped IPv4 addresses (::ffff:x.x.x.x).
 * @param ip - The IP address string to evaluate.
 * @returns True if the address falls within a private/reserved range.
 */
function isPrivateIP(ip: string): boolean {
  // Strip IPv6-mapped IPv4 prefix (e.g., "::ffff:10.0.0.1" → "10.0.0.1")
  let normalized = ip
  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.slice(7)
  }

  // Check IPv4 private/reserved ranges
  const parts = normalized.split('.').map(Number)
  if (parts.length === 4 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    const [a, b] = parts
    return (
      a === 10 ||                          // 10.0.0.0/8 (Class A private)
      a === 127 ||                         // 127.0.0.0/8 (loopback)
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 (Class B private)
      (a === 192 && b === 168) ||          // 192.168.0.0/16 (Class C private)
      (a === 169 && b === 254) ||          // 169.254.0.0/16 (link-local / cloud metadata)
      a === 0                              // 0.0.0.0/8 (reserved)
    )
  }

  // Check IPv6 private/reserved ranges
  const lower = normalized.toLowerCase()
  if (lower === '::1' || lower === '::') return true // loopback / unspecified

  // Parse the first hex group to check range prefixes
  const firstGroup = lower.split(':')[0]
  if (firstGroup) {
    const word = parseInt(firstGroup, 16)
    if (!isNaN(word)) {
      if (word >= 0xfc00 && word <= 0xfdff) return true // fc00::/7 (unique local)
      if (word >= 0xfe80 && word <= 0xfebf) return true // fe80::/10 (link-local)
    }
  }

  return false
}

/**
 * Makes an HTTP(S) request using a pre-resolved IP address to prevent DNS rebinding.
 * Connects directly to the resolved IP, using the original hostname for the Host header
 * and TLS SNI (servername), so certificates validate correctly.
 */
function fetchWithPinnedIP(
  url: URL,
  resolvedIP: string,
  options: { method: string; headers: Record<string, string>; body: string; timeout: number }
): Promise<any> {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:'
    const reqFn = isHttps ? httpsRequest : httpRequest

    const req = reqFn(
      {
        hostname: resolvedIP,
        port: Number(url.port) || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method,
        headers: {
          ...options.headers,
          Host: url.host,
          'Content-Length': Buffer.byteLength(options.body).toString()
        },
        timeout: options.timeout,
        ...(isHttps ? { servername: url.hostname } : {})
      },
      (res) => {
        // Decompress if the upstream sends gzip or deflate
        let stream: NodeJS.ReadableStream = res
        const encoding = res.headers['content-encoding']
        if (encoding === 'gzip') stream = res.pipe(createGunzip())
        else if (encoding === 'deflate') stream = res.pipe(createInflate())

        const chunks: Buffer[] = []
        stream.on('data', (chunk: Buffer) => chunks.push(chunk))
        stream.on('error', reject)
        stream.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8')
          try {
            const data = JSON.parse(body)
            // GraphQL servers often return errors with 4xx/5xx — pass the JSON through
            resolve(data)
          } catch {
            if (res.statusCode && res.statusCode >= 400) {
              reject(Object.assign(new Error('Upstream endpoint returned an error'), {
                statusCode: res.statusCode
              }))
            } else {
              reject(new Error(`Non-JSON response (HTTP ${res.statusCode})`))
            }
          }
        })
      }
    )

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timed out'))
    })

    req.write(options.body)
    req.end()
  })
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
      // Reject values containing CRLF or null bytes (header injection prevention)
      if (/[\r\n\0]/.test(value)) continue
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
  // The resolved IP is reused for the actual request (pinned DNS) to prevent
  // DNS rebinding / TOCTOU attacks where a second lookup returns a different IP.
  let resolvedIP: string
  try {
    const { address } = await lookup(parsedUrl.hostname)
    if (isPrivateIP(address)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Requests to private or internal addresses are not allowed'
      })
    }
    resolvedIP = address
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

  // --- Forward request (using pinned IP to prevent DNS rebinding) ---
  try {
    return await fetchWithPinnedIP(parsedUrl, resolvedIP, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({ query, variables: variables || undefined }),
      timeout: REQUEST_TIMEOUT
    })
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 502,
      statusMessage: 'Failed to reach the GraphQL endpoint'
    })
  }
})
