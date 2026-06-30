# Phase 1 — Contracts: Onboarding API (REST/JSON)

> Contrato das interfaces expostas pelo backend para o SPA do Fornecedor. Envelope de erro padrão:
> `{ "codigo": string, "mensagem": string, "detalhe": object? }`. Auth via sessão (provedor
> plugável). Todos os campos de data em ISO-8601 UTC.

## Cadastro & Receita

### POST /fornecedores/consulta-cnpj
- Req: `{ "cnpj": "00.000.000/0000-00" }`
- 200: `{ "razaoSocial", "porte", "cnaes": [{"codigoSubclasse","tipo"}], "situacaoCadastral",
  "proveniencia": {"fonte":"Receita","timestamp","frescor":"verificado"} }`
- 422: CNPJ inválido/inexistente (envelope de erro). 409: já cadastrado.
- 503 (Receita indisponível): `{ "frescor":"indisponivel" }` → cliente habilita preenchimento manual (FR-003).

### POST /fornecedores
- Req: `{ "cnpj", "origemDados":"oficial|manual", "dadosManuais"?, "nomeFantasia"?, "endereco",
  "telefone", "consentimento": {"finalidade","versaoTermo"}, "titular": {"identificador","credencial"} }`
- 201: `{ "fornecedorId", "papel":"titular" }` — cria Fornecedor + ContaAcesso(titular) + Consentimento (FR-001/006/015).
- 409: CNPJ duplicado (FR-004). 422: situação cadastral não apta (FR-005).

## Conta & Procurador

### POST /auth/login · POST /auth/reset
- Login por credenciais (MVP); reset de senha (FR-006).

### POST /fornecedores/{id}/procuradores
- (titular) Req: `{ "identificador" }` → convida/adiciona procurador (FR-014, D3). 403 se não-titular.
### DELETE /fornecedores/{id}/procuradores/{contaId}
- (titular) remove procurador.

## Perfil (read-only Receita)

### PATCH /fornecedores/{id}
- Req: somente `{ "nomeFantasia"?, "endereco"?, "telefone"? }`.
- 200 ok. 422 se tentar editar Razão Social/CNAE/Porte (RN009, FR-013).

### POST /fornecedores/{id}/sincronizar
- Re-consulta Receita; atualiza campos oficiais; grava `SincronizacaoReceita {executadaEm,fonte,status,camposAtualizados}` (FR-010/RF018). Erro preserva dados anteriores.

## Documentos

### POST /fornecedores/{id}/documentos  (multipart)
- Req: arquivo (pdf/jpg/png) + `{ "tipo", "dataValidade"? }`.
- 201: `{ "documentoId", "situacao":"vigente" }` (cifrado em repouso, FR-007/015).
- 422: formato/tamanho não suportado (FR-008 edge).
### GET /fornecedores/{id}/documentos
- 200: lista com `situacao` (vigente|expirado) — expirados não reutilizáveis (FR-008).

## Editais (filtro por CNAE)

### GET /editais  (fornecedor autenticado)
- 200: somente editais cujas `subclassesExigidas` têm match exato com algum `CnaeFornecedor` válido
  (FR-009, RN001, D2). Lista vazia → estado vazio orientado (US2 cenário 4).
### GET /editais/{editalId}
- 200 se compatível; **403** se incompatível (bloqueio por link direto, FR-009).

## Notas de contrato
- Toda operação com efeito é auditada (eventos → trilha, FR-011) e idempotente onde aplicável.
- Resultados de consulta externa carregam `proveniencia` (AD-5) — nunca booleano nu.
