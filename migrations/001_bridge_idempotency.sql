-- ac-bridge/migrations/001_bridge_idempotency.sql
-- Aplicada como parte do schema fleet.* (ver fleet-repo/migrations/001_fleet_schema.sql Task D1)
-- Esta tabela vive no schema fleet por simetria; ac-bridge lê/escreve aqui.

create table if not exists fleet.bridge_idempotency (
  key                  text primary key,
  pipedrive_deal_id    bigint,
  pipedrive_org_id     bigint,
  pipedrive_person_id  bigint,
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null,
  request_payload      jsonb,
  response_payload     jsonb
);

create index if not exists idx_bridge_idempotency_expires
  on fleet.bridge_idempotency (expires_at);
