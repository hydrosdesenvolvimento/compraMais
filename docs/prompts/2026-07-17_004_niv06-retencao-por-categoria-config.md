---
date: 2026-07-17
sequence: 004
domain: backend (config / titular-LGPD)
action_type: externalizar config / refatorar
status: logged
---

# Log de Prompt — NIV-06 externalizar RETENCAO_POR_CATEGORIA

## Prompt Original

> Prossiga

## Interpretação

Continuação do backlog de nivelamento após o NIV-01. Próximo item acionável sem arbitragem:
**NIV-06 — externalizar `RETENCAO_POR_CATEGORIA`** (AD-36 / RNF007). Os prazos de retenção
por categoria estavam hardcoded no default do construtor de `GerirDireitosTitular`
(`{cadastral:730, fiscal:1825, contratual:1825}`) e não eram injetados no composition root.

## Ação

- `env.ts`: novo bloco `retencaoDias` em `AppConfig`/`loadConfig` (`toInt` + defaults conservadores),
  lido de `RETENCAO_CADASTRAL_DIAS` / `RETENCAO_FISCAL_DIAS` / `RETENCAO_CONTRATUAL_DIAS` /
  `RETENCAO_PADRAO_DIAS`. Mesmo padrão dos demais parâmetros operacionais (INADIMPLENCIA_POLICY etc.).
- `server.ts`: monta `PoliticaRetencao` a partir da config e injeta em `GerirDireitosTitular`.
- `.env.example` e `docker-compose.yml` (dev + prod): vars documentadas com defaults.
- TDD: `tests/unit/env-retencao.spec.ts` (default / override / valor inválido → fallback).

Comportamento preservado: defaults iguais aos valores hardcoded anteriores.

## Verificação (gate container, DEC-STR-34)

Backend: **422 passed / 14 skipped** (pg opt-in) — lint + typecheck + test, exit 0.
Sem alteração no frontend.

## Sanitização

Sem segredos, credenciais, tokens ou PII no prompt ou nos artefatos.
