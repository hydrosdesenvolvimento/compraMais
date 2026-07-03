# Quickstart — Editais Individualizados (validação)

Guia de validação ponta-a-ponta da feature 003. Detalhes de entidades/endpoints em
[data-model.md](data-model.md) e [contracts/editais-api.md](contracts/editais-api.md).

## Pré-requisitos
- Backend do monólito em execução (módulo `editais` estendido) — `backend/`.
- Identidade/RBAC e auditoria da fundação (001/002) ativos; vitrine (`ListarEditaisCompativeis`) disponível.
- Perfis de teste: Secretaria/Gestor, CPL e um Fornecedor cadastrado/ativo.

## Comandos
- Unit + integração: `npm test` (Vitest; integração via Testcontainers Postgres).
- E2E: `npm run e2e` (Cypress) — criação/publicação de edital e contestação de CNAE.

## Cenários de validação (mapeiam US/FR)

1. **Criar e publicar (US1 / FR-001..005)**: criar edital `{secretaria, objeto, cnaesAlvo, quantitativos,
   prazo}` → `rascunho`; publicar → `publicado`; conferir que aparece na vitrine para fornecedor de CNAE
   compatível. Tentar publicar incompleto → 422 com o que falta.
2. **Invariante 1=1 (FR-002/RN007)**: tentar associar 2ª secretaria/demanda ao mesmo edital → recusado.
3. **Edição auditada (US1 / FR-013, clarify Q1)**: `PATCH` em edital publicado alterando objeto e CNAE →
   200; conferir eventos `EditalEditado{antes,depois}` na trilha e vitrine reavaliada.
4. **Ampliação de público-alvo (FR-014, clarify Q2)**: editar CNAE ampliando alvo → vitrine reflete na hora,
   evento `PublicoAlvoAmpliado` emitido, **prazo mantido** (sem reabertura automática).
5. **Contestação de CNAE (US2 / FR-007..009, clarify Q3)**: fornecedor cadastrado abre contestação com
   justificativa → `pendente`; Secretaria acata → CNAE corrigido + histórico; outra recusa exige motivo;
   usuário sem fornecedor ativo → 403.
6. **Consulta QBE (US3 / FR-011)**: `GET /editais?secretariaId&situacao&cnae` retorna só correspondentes
   (AND); probe vazio → default paginado; `page`/`size` não fazem parte do probe.
7. **Encerramento (FR-005)**: encerrar edital → sai da oferta a novas candidaturas, segue consultável;
   encerrar com contestação `pendente` → 409 (sinaliza pendência).

## Resultados esperados
- Auditoria append-only registra criação/edição/publicação/encerramento/contestação (FR-006; SC-002).
- 100% dos publicados com 1 secretaria/1 demanda (SC-001); correções preservam antes/depois (SC-004).
- Cobertura combinada ~90% no CI incluindo o módulo `editais` (Constituição I).
