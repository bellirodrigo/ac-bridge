# Migration Dual-Run: jornal-camelo → ac-bridge

## Contexto

Endpoint `jornal-camelo.vercel.app/api/clay/to-pipedrive` está em produção há 6 semanas (06-abr-2026). Substituído por `ac-bridge.vercel.app/api/clay/to-pipedrive` (mesmo path, repo separado, com melhorias: idempotency, dedup deal, retry, pipeline/stage configurable).

Migração dual-running 7 dias zero downtime.

## Pré-requisitos

- [ ] ac-bridge deployado em produção (Task A9)
- [ ] Smoke test OK
- [ ] CLAY_INBOUND_SECRET_NEW configurado no Vercel (diferente do antigo)

## Plano de migração

### Dia 0 (hoje): Setup

1. Identificar TODAS as Clay columns "Send to Pipedrive" no workspace AC que apontam pra `jornal-camelo.vercel.app/api/clay/to-pipedrive`
   - **Owner**: Caio inventaria
   - **Lista esperada**: ~3-5 columns (1 por table de campanha ativa)
2. Anotar cada uma em planilha: table_name | column_id | current_url | new_url | migrated_at

### Dia 1: Migração da menos crítica primeiro

3. Caio escolhe 1 column (a menos crítica, ex: campanha em pausa)
4. Caio edita column no Clay UI:
   - URL: `https://jornal-camelo.vercel.app/api/clay/to-pipedrive` → `https://ac-bridge.vercel.app/api/clay/to-pipedrive`
   - Header: `Authorization: Bearer ${CLAY_INBOUND_SECRET}` → `Authorization: Bearer ${CLAY_INBOUND_SECRET_NEW}`
5. Roda a column em 1 row de teste
6. Confirma visualmente no Pipedrive sandbox que deal apareceu corretamente
7. Anota `migrated_at` na planilha

### Dia 2-6: Migração incremental

8. 1 column/dia, sempre validando visualmente
9. Se algo dá errado: reverte URL pra `jornal-camelo` (config no Clay = 30s)

### Dia 7: Decommission do endpoint antigo

10. Confirma com Caio que TODAS columns foram migradas
11. Modifica `agua-camelo-clipping/webapp/src/app/api/clay/to-pipedrive/route.ts`:

```typescript
export async function POST() {
  return NextResponse.json(
    {error: 'This endpoint is deprecated. Use https://ac-bridge.vercel.app/api/clay/to-pipedrive'},
    {status: 410},
  )
}
```

12. Deploy + observa 7 dias se algum chamador legacy bate (não deveria)
13. Após 14 dias sem hits: remove rotas Clay do `agua-camelo-clipping/webapp` (mantém só clipping Fase 1.5: `/api/clay/enriched`)

## Rollback

Se algum problema durante a migração:
1. Caio reverte URL da column problemática pra `jornal-camelo` no Clay UI (30s)
2. Se TUDO der errado: reverte commit em agua-camelo-clipping pra reativar endpoint legacy
