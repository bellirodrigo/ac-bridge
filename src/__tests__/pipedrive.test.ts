import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findOrCreateOrganization, createDeal } from '@/lib/pipedrive'
import type { BridgeConfig } from '@/lib/config'

const testConfig: BridgeConfig = {
  pipedriveApiToken: 'test-token',
  pipedriveBaseUrl: 'https://api.pipedrive.test/v1',
  pipelineId: 1,
  stageId: 67,
  claySecret: 'test-secret',
}

describe('pipedrive helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('findOrCreateOrganization', () => {
    it('returns existing org id when search finds it', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({data: {items: [{item: {id: 999}}]}}),
        }) as any

      const id = await findOrCreateOrganization(testConfig, 'Empresa LTDA')
      expect(id).toBe(999)
    })

    it('creates new org when search returns empty', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({data: {items: []}}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({data: {id: 1001}}),
        }) as any

      const id = await findOrCreateOrganization(testConfig, 'Empresa Nova')
      expect(id).toBe(1001)
    })

    it('returns null on search failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ok: false, status: 500}) as any
      const id = await findOrCreateOrganization(testConfig, 'X')
      expect(id).toBeNull()
    })
  })

  describe('createDeal', () => {
    it('passes pipelineId and stageId from config', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({data: {id: 5050}}),
      })
      global.fetch = fetchMock as any

      const id = await createDeal(testConfig, 'Test Deal', 100, 200)
      expect(id).toBe(5050)

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
      expect(body.pipeline_id).toBe(1)
      expect(body.stage_id).toBe(67)
    })
  })
})
