import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ttlExpiresAt } from './idempotency'

export interface IdempotencyRecord {
  key: string
  pipedrive_deal_id: number | null
  pipedrive_org_id: number | null
  pipedrive_person_id: number | null
  created_at: string
  expires_at: string
  request_payload: Record<string, unknown> | null
  response_payload: Record<string, unknown> | null
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required')
  }
  return createClient(url, key, {auth: {persistSession: false}})
}

export async function lookupIdempotency(
  client: SupabaseClient,
  key: string,
): Promise<IdempotencyRecord | null> {
  const now = new Date().toISOString()
  const {data, error} = await client
    .schema('fleet')
    .from('bridge_idempotency')
    .select('*')
    .eq('key', key)
    .gt('expires_at', now)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as IdempotencyRecord | null
}

export async function saveIdempotency(
  client: SupabaseClient,
  record: {
    key: string
    pipedrive_deal_id: number
    pipedrive_org_id: number | null
    pipedrive_person_id: number | null
    request_payload: Record<string, unknown>
    response_payload: Record<string, unknown>
  },
): Promise<void> {
  const {error} = await client
    .schema('fleet')
    .from('bridge_idempotency')
    .insert({
      ...record,
      expires_at: ttlExpiresAt(7),
    })

  if (error) throw new Error(error.message)
}
