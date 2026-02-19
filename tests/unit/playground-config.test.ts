import { describe, it, expect } from 'vitest'
import { playgroundConfig } from '../../app/playground.config'

describe('playground.config', () => {
  describe('app metadata', () => {
    it('has required app fields', () => {
      expect(playgroundConfig.app.name).toBe('ICJIA GraphQL Playground')
      expect(playgroundConfig.app.version).toBeTruthy()
      expect(playgroundConfig.app.liveUrl).toContain('https://')
      expect(playgroundConfig.app.repository).toContain('github.com')
    })

    it('uses the correct Netlify URL', () => {
      expect(playgroundConfig.app.liveUrl).toBe('https://icjia-graphql-playground.netlify.app')
    })
  })

  describe('proxy settings', () => {
    it('includes production origin in allowed origins', () => {
      expect(playgroundConfig.proxy.allowedOrigins).toContain(
        'https://icjia-graphql-playground.netlify.app'
      )
    })

    it('includes localhost origins for development', () => {
      expect(playgroundConfig.proxy.allowedOrigins).toContain('http://localhost:3000')
    })

    it('does not include the old Netlify URL', () => {
      const origins = playgroundConfig.proxy.allowedOrigins
      expect(origins.every(o => !o.includes('graphql-playground-updated'))).toBe(true)
    })

    it('has required security headers in allowlist', () => {
      expect(playgroundConfig.proxy.allowedHeaders).toContain('authorization')
      expect(playgroundConfig.proxy.allowedHeaders).toContain('content-type')
    })

    it('blocks localhost and private IPs', () => {
      expect(playgroundConfig.proxy.blockedHostnames).toContain('localhost')
      expect(playgroundConfig.proxy.blockedHostnames).toContain('127.0.0.1')
      expect(playgroundConfig.proxy.blockedHostnames).toContain('169.254.169.254')
    })

    it('has reasonable limits', () => {
      expect(playgroundConfig.proxy.maxQueryLength).toBe(100_000)
      expect(playgroundConfig.proxy.requestTimeout).toBe(30_000)
    })
  })

  describe('schema settings', () => {
    it('has a large schema threshold', () => {
      expect(playgroundConfig.schema.largeSchemaThreshold).toBe(500)
    })
  })

  describe('history settings', () => {
    it('limits history entries', () => {
      expect(playgroundConfig.history.maxEntries).toBe(50)
    })
  })

  describe('storage keys', () => {
    it('has all required storage keys', () => {
      const keys = playgroundConfig.storageKeys
      expect(keys.endpoints).toBeTruthy()
      expect(keys.activeEndpoint).toBeTruthy()
      expect(keys.workspaces).toBeTruthy()
      expect(keys.history).toBeTruthy()
      expect(keys.settings).toBeTruthy()
    })

    it('all storage keys start with gql-playground-', () => {
      for (const key of Object.values(playgroundConfig.storageKeys)) {
        expect(key).toMatch(/^gql-playground-/)
      }
    })
  })

  describe('defaults', () => {
    it('has sensible editor defaults', () => {
      expect(playgroundConfig.defaults.editorFontSize).toBeGreaterThanOrEqual(10)
      expect(playgroundConfig.defaults.editorFontSize).toBeLessThanOrEqual(24)
      expect(playgroundConfig.defaults.autocomplete).toBe(true)
    })
  })

  describe('example endpoints', () => {
    it('has at least one example endpoint', () => {
      expect(playgroundConfig.exampleEndpoints.length).toBeGreaterThan(0)
    })

    it('all example endpoints have required fields', () => {
      for (const ep of playgroundConfig.exampleEndpoints) {
        expect(ep.url).toMatch(/^https:\/\//)
        expect(ep.url).toContain('graphql')
        expect(ep.label).toBeTruthy()
        expect(ep.description).toBeTruthy()
      }
    })
  })
})
