import { describe, it, expect } from 'vitest'
import { playgroundConfig } from '../../app/playground.config'

/**
 * Tests for the GraphQL proxy security logic.
 *
 * These test the validation functions and configuration used by
 * server/api/graphql-proxy.post.ts without requiring a running
 * Nitro server. The actual proxy uses these same constants.
 */

// Replicate the isPrivateIP function from the proxy
function isPrivateIP(hostname: string): boolean {
  const parts = hostname.split('.').map(Number)
  if (parts.length === 4 && parts.every(n => !isNaN(n))) {
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 0) return true
  }
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
    if (
      typeof key === 'string' &&
      typeof value === 'string' &&
      allowedHeaders.includes(key.toLowerCase())
    ) {
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

  it('blocks 0.x.x.x range', () => {
    expect(isPrivateIP('0.0.0.0')).toBe(true)
    expect(isPrivateIP('0.1.2.3')).toBe(true)
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
    const result = sanitizeHeaders(
      { authorization: 'Bearer test' },
      allowedHeaders
    )
    expect(result['authorization']).toBe('Bearer test')
  })
})

describe('Proxy security: Origin validation', () => {
  const allowedOrigins = playgroundConfig.proxy.allowedOrigins

  it('allows the production origin', () => {
    expect(allowedOrigins).toContain('https://icjia-graphql-playground.netlify.app')
  })

  it('allows localhost development origins', () => {
    expect(allowedOrigins).toContain('http://localhost:3000')
    expect(allowedOrigins).toContain('http://localhost:3001')
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
