import { describe, it, expect, vi } from 'vitest'
import { lookupIdempotency } from '@/lib/supabase'

describe('supabase idempotency client', () => {
  describe('lookupIdempotency', () => {
    it('returns null when key not found', async () => {
      const mockClient = {
        schema: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({data: null, error: null}),
                }),
              }),
            }),
          }),
        }),
      }
      const result = await lookupIdempotency(mockClient as any, 'key-xyz')
      expect(result).toBeNull()
    })

    it('returns existing record when key found and not expired', async () => {
      const mockData = {
        key: 'key-xyz',
        pipedrive_deal_id: 12345,
        expires_at: '2026-05-20T00:00:00Z',
      }
      const mockClient = {
        schema: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({data: mockData, error: null}),
                }),
              }),
            }),
          }),
        }),
      }
      const result = await lookupIdempotency(mockClient as any, 'key-xyz')
      expect(result).toEqual(mockData)
    })

    it('throws on supabase error', async () => {
      const mockClient = {
        schema: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: {message: 'connection failed'},
                  }),
                }),
              }),
            }),
          }),
        }),
      }
      await expect(lookupIdempotency(mockClient as any, 'k')).rejects.toThrow('connection failed')
    })
  })
})
