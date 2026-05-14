import type { BridgeConfig } from './config'

function pipedriveUrl(config: BridgeConfig, path: string): string {
  return `${config.pipedriveBaseUrl}${path}?api_token=${config.pipedriveApiToken}`
}

interface SearchResult {
  ok: boolean
  id: number | null
}

export async function searchOrganization(
  config: BridgeConfig,
  name: string,
): Promise<SearchResult> {
  const url = pipedriveUrl(config, '/organizations/search')
    + `&term=${encodeURIComponent(name)}&exact_match=false`
  const res = await fetch(url)
  if (!res.ok) {
    console.error('[Pipedrive] org search failed:', res.status)
    return {ok: false, id: null}
  }
  const json = await res.json() as {data?: {items?: Array<{item?: {id?: number}}>}}
  const items = json?.data?.items
  const id = Array.isArray(items) && items.length > 0
    ? items[0]?.item?.id ?? null
    : null
  return {ok: true, id}
}

export async function createOrganization(
  config: BridgeConfig,
  name: string,
): Promise<number | null> {
  const res = await fetch(pipedriveUrl(config, '/organizations'), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name, visible_to: 3}),
  })
  if (!res.ok) {
    console.error('[Pipedrive] org create failed:', res.status)
    return null
  }
  const json = await res.json() as {data?: {id?: number}}
  return json?.data?.id ?? null
}

export async function findOrCreateOrganization(
  config: BridgeConfig,
  name: string,
): Promise<number | null> {
  const search = await searchOrganization(config, name)
  if (!search.ok) return null
  if (search.id) return search.id
  return createOrganization(config, name)
}

export async function searchPerson(
  config: BridgeConfig,
  email: string,
): Promise<SearchResult> {
  const url = pipedriveUrl(config, '/persons/search')
    + `&term=${encodeURIComponent(email)}&fields=email`
  const res = await fetch(url)
  if (!res.ok) return {ok: false, id: null}
  const json = await res.json() as {data?: {items?: Array<{item?: {id?: number}}>}}
  const items = json?.data?.items
  const id = Array.isArray(items) && items.length > 0
    ? items[0]?.item?.id ?? null
    : null
  return {ok: true, id}
}

export async function findOrCreatePerson(
  config: BridgeConfig,
  name: string,
  email: string | undefined,
  orgId: number | null,
  phone?: string,
): Promise<number | null> {
  if (email) {
    const search = await searchPerson(config, email)
    if (!search.ok) return null
    if (search.id) return search.id
  }

  const body: Record<string, unknown> = {name, visible_to: 3}
  if (email) body.email = [{value: email, primary: true}]
  if (phone) body.phone = [{value: phone, primary: true}]
  if (orgId) body.org_id = orgId

  const res = await fetch(pipedriveUrl(config, '/persons'), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  const json = await res.json() as {data?: {id?: number}}
  return json?.data?.id ?? null
}

export async function createDeal(
  config: BridgeConfig,
  title: string,
  orgId: number | null,
  personId: number | null,
): Promise<number | null> {
  const body: Record<string, unknown> = {
    title,
    pipeline_id: config.pipelineId,
    stage_id: config.stageId,
    visible_to: 3,
  }
  if (orgId) body.org_id = orgId
  if (personId) body.person_id = personId

  const res = await fetch(pipedriveUrl(config, '/deals'), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  const json = await res.json() as {data?: {id?: number}}
  return json?.data?.id ?? null
}

export async function addNoteToDeal(
  config: BridgeConfig,
  dealId: number,
  content: string,
): Promise<boolean> {
  const res = await fetch(pipedriveUrl(config, '/notes'), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({deal_id: dealId, content}),
  })
  return res.ok
}
