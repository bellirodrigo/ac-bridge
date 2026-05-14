import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { POST } from '@/app/api/clay/to-pipedrive/route'
import { getSupabaseAdmin } from '@/lib/supabase'

const sandbox = {
  CLAY_INBOUND_SECRET: process.env.CLAY_INBOUND_SECRET ?? '',
  authHeader: (): string => `Bearer ${sandbox.CLAY_INBOUND_SECRET}`,
}

describe('integration: full create-deal flow', () => {
  beforeAll(() => {
    if (!sandbox.CLAY_INBOUND_SECRET) {
      throw new Error('Set CLAY_INBOUND_SECRET + PIPEDRIVE_API_TOKEN + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars to run integration tests')
    }
    if (!process.env.PIPEDRIVE_API_TOKEN) {
      throw new Error('PIPEDRIVE_API_TOKEN env var required')
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required')
    }
  })

  it('creates deal end-to-end with valid payload', async () => {
    const uniqueSuffix = Date.now()
    const payload = {
      full_name: `Test Lead ${uniqueSuffix}`,
      email: `test+${uniqueSuffix}@example.com`,
      company_name: `Test Empresa ${uniqueSuffix}`,
      campaign_name: 'integration-test',
    }

    const req = new Request('http://localhost/api/clay/to-pipedrive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': sandbox.authHeader(),
        'Idempotency-Key': `integration-test-${uniqueSuffix}`,
      },
      body: JSON.stringify(payload),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json() as {success: boolean, pipedrive_deal_id: number, deduped?: boolean}
    expect(json.success).toBe(true)
    expect(json.pipedrive_deal_id).toBeGreaterThan(0)
    expect(json.deduped).toBeUndefined()
  })

  it('returns deduped=true on second call with same Idempotency-Key', async () => {
    const uniqueSuffix = Date.now() + 1
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': sandbox.authHeader(),
      'Idempotency-Key': `dedup-test-${uniqueSuffix}`,
    }
    const payload = {
      full_name: `Dedup ${uniqueSuffix}`,
      company_name: `DedupCo ${uniqueSuffix}`,
    }

    const req1 = new Request('http://localhost/x', {method: 'POST', headers, body: JSON.stringify(payload)})
    const res1 = await POST(req1 as any)
    const json1 = await res1.json() as {pipedrive_deal_id: number}

    const req2 = new Request('http://localhost/x', {method: 'POST', headers, body: JSON.stringify(payload)})
    const res2 = await POST(req2 as any)
    const json2 = await res2.json() as {pipedrive_deal_id: number, deduped: boolean}

    expect(json2.pipedrive_deal_id).toBe(json1.pipedrive_deal_id)
    expect(json2.deduped).toBe(true)
  })

  afterAll(async () => {
    const client = getSupabaseAdmin()
    await client.schema('fleet').from('bridge_idempotency').delete().like('key', 'integration-test-%')
    await client.schema('fleet').from('bridge_idempotency').delete().like('key', 'dedup-test-%')
  })
})
