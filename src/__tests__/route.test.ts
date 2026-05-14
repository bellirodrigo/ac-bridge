import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/clay/to-pipedrive/route'

const mockEnv = {
  PIPEDRIVE_API_TOKEN: 'test-token',
  PIPEDRIVE_BASE_URL: 'https://api.pipedrive.test/v1',
  PIPEDRIVE_PIPELINE_ID: '1',
  PIPEDRIVE_STAGE_ID: '67',
  CLAY_INBOUND_SECRET: 'test-secret',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
}

function makeRequest(body: object, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/clay/to-pipedrive', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...headers},
    body: JSON.stringify(body),
  })
}

describe('POST /api/clay/to-pipedrive', () => {
  beforeEach(() => {
    for (const [k, v] of Object.entries(mockEnv)) {
      vi.stubEnv(k, v)
    }
    vi.restoreAllMocks()
  })

  it('returns 401 when Authorization header missing', async () => {
    const res = await POST(makeRequest({full_name: 'X', company_name: 'Y'}) as any)
    expect(res.status).toBe(401)
  })

  it('returns 401 when Authorization wrong', async () => {
    const res = await POST(makeRequest(
      {full_name: 'X', company_name: 'Y'},
      {'Authorization': 'Bearer wrong-secret'},
    ) as any)
    expect(res.status).toBe(401)
  })

  it('returns 400 when both full_name and company_name missing', async () => {
    const res = await POST(makeRequest(
      {},
      {'Authorization': 'Bearer test-secret'},
    ) as any)
    expect(res.status).toBe(400)
  })
})
