# Phase 1 — Contracts: Credenciamento (Covalidação & Elegibilidade) — REST/JSON

> Envelope de erro `{codigo, mensagem, detalhe?}`. Ações de covalidação exigem perfil CPL/SMGA (RBAC).

## Covalidação (CPL/SMGA)

### GET /fornecedores/{id}/documentos/pendentes
- Fila de covalidação + `tempoDecorrido` por documento (FR-014). 200.
- **Busca por instância parcial (QBE — FR-015 / Constituição §IV)**: aceita um probe parcial de
  `Documento` via query string — no mínimo `status` (`pendente|aprovado|reprovado`) e `tipo`. Campos
  preenchidos filtram por correspondência (AND); ausentes são ignorados. `page`/`size`/`sort` são
  parâmetros separados, **fora** do probe. Sem probe, mantém o default da fila (status=`pendente`).
- Ex.: `GET /fornecedores/{id}/documentos/pendentes?status=reprovado&tipo=balanco&page=1&size=20`.

### POST /documentos/{docId}/covalidar
- Req: `{ "resultado": "aprovado" | "reprovado", "justificativa"? }`
- 200: documento transicionado; evento auditado.
- 422 se `reprovado` sem `justificativa` (FR-002). 403 se não-CPL (FR-013).

## Elegibilidade / inadimplência

### POST /fornecedores/{id}/verificar-elegibilidade
- Req: `{ "porta": "credenciamento|distribuicao|contrato" }`
- 200: `{ "estado", "podeAvancar": boolean, "verificacao": {fonte,timestamp,frescor}, "bloqueio"? }`
- Base indisponível → `podeAvancar: true` + `flagCpl: true` (fail-open + flag, FR-008).

### POST /bloqueios/{id}/registrar-termino  (CPL)
- Req: `{ "dataTermino": "ISO-8601" }` — fallback manual de prazo (clarify D3). 200.

## Regularização (fornecedor)

### GET /fornecedores/{id}/pendencias
- Ponto único: documentos reprovados + bloqueios + próximo passo (FR-012). 200.

### POST /documentos/{docId}/reenviar
- Recoloca em `Pendente`, notifica CPL (FR-010). 201.

### POST /fornecedores/{id}/reconsultar
- Reavalia inadimplência após regularização (FR-011). 200 com novo estado.

## Notas
- Toda ação com efeito é auditada (FR-009) e idempotente onde aplicável.
- Consultas de dívida retornam proveniência (AD-5) — nunca booleano nu.
