# Quickstart — Auditoria: Consulta e Exportação (validação)

Guia de validação ponta-a-ponta da feature 004. Detalhes em [data-model.md](data-model.md) e
[contracts/auditoria-api.md](contracts/auditoria-api.md).

## Pré-requisitos
- Backend do monólito em execução com a trilha já populada por ações das features 001/002/003.
- Perfis de teste: `cpl`/`administrador`, `auditor` (somente-leitura) e um perfil não autorizado.

## Comandos
- Unit + integração: `npm test` (Vitest; integração via Testcontainers Postgres).
- E2E: `npm run e2e` (Cypress) — consulta filtrada + download de exportação.

## Cenários de validação (mapeiam US/FR)

1. **Consulta por usuário (US1 / FR-001/002)**: `GET /auditoria?usuario=cpl1` → só registros daquele ator.
2. **Intervalo de datas (US1 / FR-001)**: `?de=...&ate=...` → só registros no intervalo; `de > ate` → 400 (FR-010).
3. **Filtros combinados + edital (US1 / FR-002)**: `?usuario&evento&editalId` → AND; ausentes ignorados.
4. **Determinismo (US1 / FR-004)**: a mesma consulta duas vezes → mesma saída e ordem.
5. **Somente leitura (US1 / FR-003)**: contar registros antes/depois de consultar/exportar → inalterado.
6. **Exportar CSV/JSON (US2 / FR-005/006/007)**: exportar o mesmo filtro nos dois formatos → conteúdo fiel
   (mesma quantidade/registros); conjunto vazio → arquivo válido.
7. **RBAC (US2 / FR-008)**: `auditor` consulta/exporta OK; perfil não autorizado → 403; `auditor` não tem
   nenhuma rota de escrita.
8. **PII sem mascaramento (FR-009)**: perfil autorizado vê o payload integral (sem redação).
9. **Volume (FR-011)**: exportar acima do teto configurável → conclui com sinalização de volume.

## Resultados esperados
- Imutabilidade preservada (SC-003); consultas fiéis (SC-001) e determinísticas (SC-006).
- Exportações fiéis ao filtro (SC-002); acesso restrito (SC-004).
- Cobertura combinada ~90% no CI incluindo a trilha de leitura do módulo `auditoria` (Constituição I).
