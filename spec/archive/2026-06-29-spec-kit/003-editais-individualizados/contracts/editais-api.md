# Phase 1 — Contracts: Editais Individualizados — REST/JSON

> Envelope de erro `{codigo, mensagem, detalhe?}`. Criação/edição/publicação/encerramento exigem perfil
> Secretaria/Gestor (RBAC, FR-010); contestação exige fornecedor cadastrado/ativo.

## Gestão de editais (Secretaria/Gestor)

### POST /editais
- Req: `{ "secretariaId", "objeto", "cnaesAlvo": string[], "quantitativos": number, "prazoVigencia": "ISO-8601" }`
- 201: edital criado em `rascunho`; evento `EditalCriado` auditado.
- 422 se faltar campo obrigatório, CNAE inválido (FR-012), quantitativo ≤ 0, ou >1 secretaria (FR-002/RN007).

### POST /editais/{id}/publicar
- Pré: completude válida (FR-004). 200: `situacao=publicado`; visível na vitrine; evento `EditalPublicado`.
- 422 se incompleto (lista o que falta).

### PATCH /editais/{id}
- Req: campos a alterar (qualquer campo, inclusive `cnaesAlvo`/`quantitativos`) — FR-013.
- 200: aplicado; evento `EditalEditado{campo,antes,depois,autor}`; se CNAE ampliou público-alvo →
  `PublicoAlvoAmpliado` + vitrine reavaliada, **prazo mantido** (FR-014). 409 em transição inválida.

### POST /editais/{id}/encerrar
- 200: `situacao=encerrado`; sai da oferta a novas candidaturas (consultável); evento `EditalEncerrado`.
- 409 se houver contestações `pendente` (sinaliza pendências antes de encerrar).

### GET /editais  (busca por instância parcial — QBE / FR-011)
- Probe parcial de `Edital` via query: `secretariaId`, `situacao` (`rascunho|publicado|encerrado`), `cnae`.
  Campos preenchidos filtram por AND; ausentes ignorados. `page`/`size`/`sort` separados, **fora** do probe.
- Ex.: `GET /editais?secretariaId=SEC1&situacao=publicado&cnae=4721102&page=1&size=20`. 200.

## Contestação de CNAE (fornecedor)

### POST /editais/{id}/contestacoes-cnae
- Req: `{ "cnaeContestado", "justificativa" }` (justificativa obrigatória — FR-007).
- 201: contestação `pendente`; evento `ContestacaoCnaeAberta`. 403 se não for fornecedor cadastrado/ativo.

## Resolução de contestação (Secretaria/CPL)

### POST /contestacoes-cnae/{id}/acatar
- Req: `{ "novoCnae"? }` — corrige o CNAE do edital (via edição) com histórico. 200; eventos
  `ContestacaoCnaeAcatada` + `EditalEditado`.

### POST /contestacoes-cnae/{id}/recusar
- Req: `{ "motivo" }` (obrigatório — FR-009). 200: mantém o CNAE; evento `ContestacaoCnaeRecusada`; fornecedor
  notificado (reflexo de status). 422 sem motivo.

### GET /editais/{id}/contestacoes-cnae
- Lista as contestações do edital (situação, autor, justificativa) — acompanhamento. 200.

## Notas
- Toda ação com efeito é auditada (FR-006) — escritor único (AD-18) — e idempotente onde aplicável.
- Editais `publicado` alimentam a vitrine `GET /editais/compativeis` (002) — não recriada aqui.
- Validação de CNAE (formato/enquadramento) via ACL da Receita (proveniência, AD-5).
