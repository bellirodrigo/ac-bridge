<!--
GH Issue body — pronto pra ser disparado pelo team-lead quando GitHub voltar.

Comando a executar (após `gh repo create` + `git push` em A1/A9):

  gh issue create \
    --repo bellirodrigo/ac-bridge \
    --title "Migration: dual-run jornal-camelo → ac-bridge (7 dias)" \
    --body-file docs/MIGRATION_DUAL_RUN_ISSUE.md \
    --label "migration,p0"

Labels `migration` e `p0` precisam existir no repo. Criar via:
  gh label create migration --color "0E8A16" --description "Migration / dual-run tracking"
  gh label create p0 --color "B60205" --description "P0 priority (foundation)"
-->

# Migration: dual-run jornal-camelo → ac-bridge (7 dias)

## Goal

Substituir o endpoint `jornal-camelo.vercel.app/api/clay/to-pipedrive` (em produção há 6 semanas) por `ac-bridge.vercel.app/api/clay/to-pipedrive` com **zero downtime** via dual-running 7 dias, gradual column-by-column.

Ver plano completo em [`docs/MIGRATION_DUAL_RUN.md`](./docs/MIGRATION_DUAL_RUN.md).

## Melhorias vs endpoint atual

- Idempotency-Key handling (deal dedup por TTL 7d)
- Dedup de Deal por external_id (não só Org/Person)
- Retry policy interna pra Pipedrive
- Pipeline/Stage configurável via env (não hardcoded)
- Test coverage (unit + integration) — sem antes

## Checklist execução

### Dia 0 — Setup
- [ ] ac-bridge deployado em produção (A9 completed)
- [ ] Smoke test pós-deploy OK (curl OPTIONS/POST)
- [ ] `CLAY_INBOUND_SECRET_NEW` configurado no Vercel
- [ ] Caio inventaria TODAS as Clay columns "Send to Pipedrive" que apontam pra `jornal-camelo.vercel.app/...`
- [ ] Planilha de tracking criada (table_name | column_id | current_url | new_url | migrated_at)

### Dia 1 — Primeira column (menos crítica)
- [ ] Caio escolhe column piloto (campanha em pausa preferível)
- [ ] Edita URL pra `ac-bridge.vercel.app` + header `Bearer CLAY_INBOUND_SECRET_NEW`
- [ ] Roda em 1 row de teste
- [ ] Valida visualmente no Pipedrive
- [ ] Anota `migrated_at`

### Dias 2-6 — Migração incremental
- [ ] 1 column/dia, validação visual a cada uma
- [ ] Rollback ready: URL no Clay UI volta em 30s se algo quebra

### Dia 7 — Decommission legacy
- [ ] Caio confirma TODAS columns migradas
- [ ] Modifica `agua-camelo-clipping/webapp/.../to-pipedrive/route.ts` para retornar 410 Gone
- [ ] Deploy + observação 7 dias
- [ ] Após 14 dias sem hits no legacy: remove route definitivamente

## Rollback plan

1. Reversão column-level: edita URL no Clay UI → 30s pra voltar ao legacy
2. Reversão total: revert commit em `agua-camelo-clipping` que retornou 410 → endpoint legacy volta a aceitar payloads

## Owner

- **Caio** — inventário + migração column-by-column + validação visual
- **Rodrigo** — autorização Dia 7 decommission + monitora logs Vercel
- **ac-bridge-dev** (Claude) — disponível pra debug se algum payload falhar

## DoD

- 100% das columns migradas pro novo endpoint
- Pipedrive sandbox confirma deals criados corretamente
- Endpoint legacy retorna 410 após Dia 7
- Issue fechada quando 14 dias sem hits no legacy
