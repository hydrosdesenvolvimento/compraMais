# Prompt log — 2026-07-09_001 · UC007 — Validar Identidade por Prova de Vida (Liveness)

## Prompt do solicitante (sanitizado)
> Vamos implementar o UC007 do @spec/docs/casos-de-uso.md em uma nova branch

## Divergência levantada e ratificação (bloqueio de escopo → resolvido)
O UC007 estava marcado como **fora do MVP** na fonte de verdade
([casos-de-uso.md](../../spec/docs/casos-de-uso.md) §UC007, matriz-lacunas, [prd.md](../../spec/docs/prd.md)
RF012, [plano-releases.md](../../spec/docs/plano-releases.md) Onda 3): biometria facial (RF012) **removida
do MVP**, **Release 2 condicional a RIPD** e ratificação do solicitante; o documento dizia explicitamente
"**não deve gerar história no MVP**".

Isso foi **sinalizado ao solicitante** antes de qualquer implementação (DEC-STR-12). Resolução escolhida:
**"Atualizar spec antes"** — antecipar o UC007 para o MVP, registrando a **ratificação do solicitante
(2026-07-09)** e o **RIPD** como gate de LGPD, e só então implementar. A ratificação foi registrada nas
memórias e nos documentos de governança.

## Interpretação (Business Analyst / Senior Developer / Tech Lead)
Duas grandes entregas nesta branch:
1. **Governança/spec (primeiro):** reabrir formalmente o RF012/UC007 no MVP condicional a RIPD; produzir o
   **RIPD** (Relatório de Impacto à Proteção de Dados) do tratamento de dado biométrico (sensível, Art. 11
   LGPD); atualizar casos-de-uso, PRD, épicos, plano de releases e a validação de mockups.
2. **Implementação TDD:** prova de vida no ato do envio do credenciamento (UC004/RN016), como gate
   **desligável por feature flag** (`LIVENESS_ENABLED`, default OFF), preservando o fluxo MVP por Termo de
   Aceite quando desligado. Rastreável a RF012 · RN016 · AD-4/AD-12 (política de indisponibilidade).

## Decisões de projeto
- **Provedor de liveness = ACL mock com circuit breaker + `fail-open + flag` para a CPL** (mesmo padrão de
  `shared/acl/receita` e `shared/acl/divida`; AD-4/AD-12). Sem SDK biométrico real no MVP; o adaptador real
  substitui apenas o `fetchRaw`, preservando breaker e proveniência. A imagem/vídeo não é retido — só o
  veredito e o score (minimização, RIPD).
- **Feature flag `LIVENESS_ENABLED` (default OFF).** Como o UC007 é condicional a RIPD aprovado, o gate só
  atua quando ligado por ambiente; desligado, o credenciamento conclui por Termo de Aceite (UC004) sem
  regressão. `LIVENESS_PROVIDER=mock` seleciona o adaptador.
- **Gate no `aceitarTermo`** via porta opcional (`GateProvaDeVida`, no-op quando a flag está OFF), sem
  reescrever o agregado Credenciamento.
- **Indisponibilidade do provedor → `indisponivel` + flag obrigatória para a CPL** (AD-12), nunca
  auto-aprovação silenciosa; a CPL decide manualmente (mesma filosofia de RN002).

## Plano de ação
1. Fase 1 — spec/governança (PT-BR) + RIPD.
2. Fase 2 — backend hexagonal (domínio + ACL + caso de uso + gate + migração 0010 + repos + controller +
   config + testes unit/integração).
3. Fase 3 — frontend (step condicional no wizard + api + i18n ×3 + teste).
4. Fase 4 — gate em container (DEC-STR-34), registro técnico, memórias. Sem push/PR sem aprovação.

## Rastreabilidade
RF012 (reativado condicional a RIPD) · RN016 · AD-4, AD-12 · UC004/UC007 · Story 5.6 (nova) ·
plano-releases Onda 2/3 · RIPD `spec/docs/lgpd/RIPD-prova-de-vida.md`.
