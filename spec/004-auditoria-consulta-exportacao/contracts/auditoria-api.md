# Phase 1 — Contracts: Auditoria (Consulta & Exportação) — REST/JSON

> Envelope de erro `{codigo, mensagem, detalhe?}`. **Somente leitura** — nenhum endpoint escreve na trilha
> (AD-18). RBAC: `cpl`, `administrador`, `auditor` (somente-leitura); demais → 403 (FR-008).

## Consulta (CPL/Administrador/auditor)

### GET /auditoria
- **Busca por instância parcial (QBE — FR-001)**: probe via query string —
  `usuario`, `evento`, `de` (ISO), `ate` (ISO), `editalId`. Campos preenchidos filtram por AND; ausentes
  ignorados. `page`/`size`/`sort` separados, **fora** do probe.
- 200: `[{ id, usuario, evento, timestamp, ip, payload }]`, ordenado cronologicamente (determinístico, FR-004).
- 400 se `de > ate` (erro de filtro — FR-010). 403 se perfil não autorizado.
- Ex.: `GET /auditoria?usuario=cpl1&evento=DocumentoReprovado&de=2026-01-01&ate=2026-06-30&editalId=E1&page=1&size=50`.

## Exportação (CPL/Administrador/auditor)

### GET /auditoria/exportar
- Mesmos parâmetros de filtro da consulta + `formato` (`csv` | `json`). Exporta **exatamente** o conjunto
  filtrado (fidelidade — FR-007), em fluxo/paginação (FR-011).
- 200 (`text/csv` ou `application/json`), `Content-Disposition: attachment; filename="auditoria-<...>.<ext>"`.
- Conjunto vazio → arquivo válido (cabeçalho/coleção vazia), não erro.
- Acima do teto configurável (ex.: 50k): conclui a exportação e inclui sinalização de volume (header/registro).
- 403 se perfil não autorizado; 400 se filtro inválido (`de > ate`).

## Notas
- A trilha é a fonte; o registro completo (incl. dados pessoais) é entregue integralmente ao perfil
  autorizado — **sem mascaramento** (clarify Q1); a salvaguarda é o RBAC.
- Nenhuma rota desta feature cria/edita/remove registros (FR-003 / AD-18).
