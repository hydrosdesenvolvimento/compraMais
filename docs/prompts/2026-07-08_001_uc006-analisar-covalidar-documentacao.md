# Prompt log — 2026-07-08_001 · UC006 — Analisar e Covalidar Documentação (Antifraude)

## Prompt do solicitante (sanitizado)
> Vamos implementar UC006 do @spec/docs/casos-de-uso.md em uma nova branch

## Interpretação (Senior Developer / Tech Lead)
Implementar UC006 (bloco C — Credenciamento & Covalidação): **verificação humana** dos documentos
declaratórios pela CPL, com parecer de habilitação/inabilitação. Rastreável a Story 2.2 (épicos) ·
RF004 · RN003, RN006, RN011 · RNF003 · AD-15.

## Diagnóstico do estado atual (pré-implementação)
A covalidação **em nível de documento** já existia (`credenciamento/`): `Covalidar.aprovar/reprovar`,
`Documento.aprovar/reprovar`, `AnaliseCovalidacao` (histórico imutável, justificativa obrigatória),
fila QBE (`GET /fornecedores/:id/documentos/pendentes`), controller com RBAC CPL/SMGA, e a UI
`FilaCovalidacao.tsx` + Cypress. **Faltava o que é próprio do UC006 como caso de uso** — o veredito do
**conjunto**:
- **Passo 3** — "ao aprovar o conjunto, o status vai a **Credenciado**": nenhuma transição do
  Fornecedor acontecia; aprovar documentos só mudava o status do documento.
- **A1** — reprovar coloca o fornecedor em **Em Correção** e o notifica (laço UC016): também ausente.
- **RN011** — a fila deve exibir o **tempo decorrido por documento** (sem SLA fixo): não era exposto.

## Plano de ação (executado)
1. **Domínio `Fornecedor`** (`catalogo/domain/fornecedor.ts`): `credenciar()` (`pendente_analise →
   credenciado`) e `devolverParaCorrecao()` (`pendente_analise → em_correcao`, idempotente quando já
   em correção). Guardas via `TransicaoStatusInvalida`. + testes unitários.
2. **Eventos** (`credenciamento/domain/eventos.ts`): `FornecedorCredenciado` e `FornecedorEmCorrecao`
   (aggregateId = fornecedorId; auditoria AD-18). Registrados no `AuditConsumer`.
3. **Caso de uso `Covalidar`**: recebe o `FornecedorRepository` (opcional). Após aprovar, `avaliarVeredito`
   promove a `credenciado` quando **todos** os documentos do fornecedor estão aprovados (≥1). Ao reprovar,
   devolve a `em_correcao` e emite o gancho de notificação. A fila (`buscarFila`/`listarPendentes`) passa a
   carregar `enviadoEm` (registerDate) para o tempo decorrido (RN011). + testes de integração de veredito.
4. **Wiring** (`server.ts`): injeta `fornecedores` no `Covalidar`; catálogo de eventos atualizado.
5. **Frontend**: `DocPendente` ganha `status`/`enviadoEm`; helper `tempoDecorrido` (Intl.RelativeTimeFormat,
   maior unidade sensível) + teste; `FilaCovalidacao` exibe "Enviado há …" por documento; chaves i18n
   `admin.covalidacao.enviadoHa` em pt-BR/en/es.
6. **Gate**: suíte no container (DEC-STR-34) — backend (46 arquivos / 225 testes) e frontend (6/17),
   ambos lint + typecheck + test verdes.

## Decisões de projeto
- **"Conjunto aprovado" (MVP):** o fornecedor é credenciado quando possui ≥1 documento e **todos** estão
  `aprovado` (nenhum pendente/reprovado). A checagem vive no caso de uso; o domínio só valida a transição.
- **Fornecedor opcional no `Covalidar`:** quando não há entidade Fornecedor (fluxo apenas documental /
  testes de nível de documento), somente o documento transita — o veredito é ignorado sem quebrar o fluxo.
- **"Notificado" (A1):** representado pelo status `em_correcao` + motivo já surfados no painel do fornecedor
  (Início/PainelTitular, laço UC016) e pelo evento `FornecedorEmCorrecao`. Sem gateway de e-mail (LAC-07,
  UC013/R2).
- **Persistência de documentos** segue em memória (estado pré-existente do módulo); o veredito do fornecedor
  é durável (repo pg quando configurado).

## Segurança
- RBAC inalterado: covalidar continua restrito a CPL/SMGA (403 caso contrário). Reprovar sem justificativa
  → 422 (RN003).
- Sem segredos/tokens/PII persistidos no log deste prompt.

## Rastreabilidade
UC006 · Story 2.2 (`spec/docs/epics.md`) · RF004 · RN003, RN006, RN011 · RNF003 · AD-15, AD-18 ·
DEC-STR-32 (PR→develop) · DEC-STR-33 (i18n) · DEC-STR-34 (testes no container).
