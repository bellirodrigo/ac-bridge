import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { loadConfig } from '@/lib/config'
import { getSupabaseAdmin, lookupIdempotency, saveIdempotency } from '@/lib/supabase'
import { generateIdempotencyKey } from '@/lib/idempotency'
import {
  findOrCreateOrganization,
  findOrCreatePerson,
  createDeal,
  addNoteToDeal,
} from '@/lib/pipedrive'

interface ClayToPipedrivePayload {
  full_name?: string
  company_name?: string
  first_name?: string
  last_name?: string
  email?: string
  linkedin?: string
  title?: string
  company_domain?: string
  phone?: string
  deal_title?: string
  campaign_name?: string
  resposta_lead?: string
}

export async function POST(request: NextRequest): Promise<Response> {
  let config
  try {
    config = loadConfig()
  } catch (e) {
    console.error('[ac-bridge] config error:', e)
    return NextResponse.json({error: 'Server misconfigured'}, {status: 500})
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const provided = authHeader.replace(/^Bearer\s+/i, '')
  if (provided !== config.claySecret) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401})
  }

  let payload: ClayToPipedrivePayload
  try {
    payload = await request.json() as ClayToPipedrivePayload
  } catch {
    return NextResponse.json({error: 'Invalid JSON body'}, {status: 400})
  }

  const companyName = payload.company_name?.trim()
  const fullName = payload.full_name?.trim()
  if (!companyName && !fullName) {
    return NextResponse.json(
      {error: 'At least company_name or full_name is required'},
      {status: 400},
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const idempotencyKey = request.headers.get('Idempotency-Key')
    ?? generateIdempotencyKey(
      {full_name: fullName, email: payload.email, company_name: companyName},
      today,
    )

  const supabase = getSupabaseAdmin()
  const existing = await lookupIdempotency(supabase, idempotencyKey)
  if (existing) {
    return NextResponse.json({
      success: true,
      pipedrive_deal_id: existing.pipedrive_deal_id,
      pipedrive_org_id: existing.pipedrive_org_id,
      pipedrive_person_id: existing.pipedrive_person_id,
      deduped: true,
    })
  }

  try {
    const orgId = companyName ? await findOrCreateOrganization(config, companyName) : null
    const personId = fullName
      ? await findOrCreatePerson(config, fullName, payload.email, orgId, payload.phone)
      : null

    const dealTitle = payload.deal_title ?? `Clay — ${companyName ?? fullName}`
    const dealId = await createDeal(config, dealTitle, orgId, personId)

    if (!dealId) {
      return NextResponse.json({error: 'Failed to create deal'}, {status: 502})
    }

    const noteLines: string[] = []
    if (companyName) noteLines.push(`🏢 ${companyName}`)
    if (payload.company_domain) noteLines.push(`🌐 ${payload.company_domain}`)
    if (fullName) noteLines.push(`👤 ${fullName}`)
    if (payload.title) noteLines.push(`💼 ${payload.title}`)
    if (payload.email) noteLines.push(`📧 ${payload.email}`)
    if (payload.phone) noteLines.push(`📞 ${payload.phone}`)
    if (payload.linkedin) noteLines.push(`🔗 ${payload.linkedin}`)
    if (payload.campaign_name) {
      noteLines.push('')
      noteLines.push(`📋 Campanha: ${payload.campaign_name}`)
    }
    if (payload.resposta_lead) {
      noteLines.push('')
      noteLines.push(`💬 Resposta do Lead:\n${payload.resposta_lead}`)
    }
    noteLines.push('')
    noteLines.push(`⚡ Enviado via Clay em ${new Date().toLocaleDateString('pt-BR')}`)

    await addNoteToDeal(config, dealId, noteLines.join('\n'))

    const response = {
      success: true,
      pipedrive_deal_id: dealId,
      pipedrive_org_id: orgId,
      pipedrive_person_id: personId,
    }

    await saveIdempotency(supabase, {
      key: idempotencyKey,
      pipedrive_deal_id: dealId,
      pipedrive_org_id: orgId,
      pipedrive_person_id: personId,
      request_payload: payload as Record<string, unknown>,
      response_payload: response,
    })

    return NextResponse.json(response)
  } catch (err) {
    console.error('[ac-bridge] error:', err)
    return NextResponse.json({error: 'Internal server error'}, {status: 500})
  }
}
