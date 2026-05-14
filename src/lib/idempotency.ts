import { createHash } from 'node:crypto'

export interface IdempotencyPayloadFields {
  full_name?: string
  email?: string
  company_name?: string
}

export function generateIdempotencyKey(
  payload: IdempotencyPayloadFields,
  daySuffix: string,
): string {
  const canonical = [
    (payload.full_name ?? '').trim().toLowerCase(),
    (payload.email ?? '').trim().toLowerCase(),
    (payload.company_name ?? '').trim().toLowerCase(),
    daySuffix,
  ].join('|')

  return createHash('sha256').update(canonical).digest('hex').slice(0, 32)
}

export function isExpired(expiresAtIso: string): boolean {
  return new Date(expiresAtIso).getTime() < Date.now()
}

export function ttlExpiresAt(days: number = 7): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}
