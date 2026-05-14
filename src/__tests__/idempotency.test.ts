import { describe, it, expect } from 'vitest'
import { generateIdempotencyKey, isExpired } from '@/lib/idempotency'

describe('idempotency', () => {
  describe('generateIdempotencyKey', () => {
    it('returns deterministic hash for same payload', () => {
      const payload = {
        full_name: 'Maria Silva',
        email: 'maria@empresa.com',
        company_name: 'Empresa LTDA',
      }
      const key1 = generateIdempotencyKey(payload, '2026-05-13')
      const key2 = generateIdempotencyKey(payload, '2026-05-13')
      expect(key1).toBe(key2)
    })

    it('different days → different keys', () => {
      const payload = {full_name: 'X', email: 'x@y.com', company_name: 'Z'}
      const k1 = generateIdempotencyKey(payload, '2026-05-13')
      const k2 = generateIdempotencyKey(payload, '2026-05-14')
      expect(k1).not.toBe(k2)
    })

    it('different payload → different keys', () => {
      const k1 = generateIdempotencyKey(
        {full_name: 'A', email: 'a@a.com', company_name: 'Z'}, '2026-05-13')
      const k2 = generateIdempotencyKey(
        {full_name: 'B', email: 'a@a.com', company_name: 'Z'}, '2026-05-13')
      expect(k1).not.toBe(k2)
    })

    it('missing optional fields → still produces stable key', () => {
      const k1 = generateIdempotencyKey(
        {full_name: 'A', company_name: 'Z'}, '2026-05-13')
      const k2 = generateIdempotencyKey(
        {full_name: 'A', company_name: 'Z'}, '2026-05-13')
      expect(k1).toBe(k2)
      expect(k1.length).toBeGreaterThan(20)
    })
  })

  describe('isExpired', () => {
    it('returns true if expires_at is in the past', () => {
      const past = new Date(Date.now() - 1000).toISOString()
      expect(isExpired(past)).toBe(true)
    })

    it('returns false if expires_at is in the future', () => {
      const future = new Date(Date.now() + 1000).toISOString()
      expect(isExpired(future)).toBe(false)
    })
  })
})
