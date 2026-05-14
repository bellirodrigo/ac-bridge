# ac-bridge

Generic Clay → Pipedrive bridge service for Água Camelo.

## Why this repo exists

Extracted from `agua-camelo-clipping` (where it originally lived at `webapp/src/app/api/clay/to-pipedrive/`) for clean architectural isolation. The bridge has no Supabase dependency on the clipping pipeline — it's a pure Clay ↔ Pipedrive integration that any Clay table/campaign can use.

Originally constructed 2026-04-06 by Rodrigo (commit `d5f2ef2`). Extracted 2026-05-13 with enhancements: idempotency-key handling, deal dedup by external_id, retry policy, configurable pipeline/stage.

## What it does

Receives POSTs from Clay column "Send to Pipedrive" (manually triggered, no autorun). Creates Org + Person + Deal + Note in Pipedrive. Returns deal_id.

## How to extend

See `src/app/api/clay/to-pipedrive/route.ts`. Auth via `Authorization: Bearer ${CLAY_INBOUND_SECRET}`.

## Related ADRs

- `agent-fleet/fleet-repo/docs/adr/ADR-001-twilio-whatsapp-integration.md` (canal A4)
- `agent-fleet/fleet-repo/docs/superpowers/specs/2026-05-13-pivot-a1-design.md` (contexto do pivot)
