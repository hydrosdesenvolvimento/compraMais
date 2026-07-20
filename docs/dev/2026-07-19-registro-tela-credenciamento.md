# Registro Técnico — Tela "Credenciamento" (Meus Credenciamentos) · re-adequação ao novo protótipo

- **Data:** 2026-07-19
- **Branch:** `feature/tela-credenciamento-prototipo` (base `develop`)
- **UC/Rastreabilidade:** UC004 — Solicitar Credenciamento · RF002 · RN005 (capacidade) · RN016 (Termo de Aceite) · A2 (cancelamento)
- **Ator principal:** Titular / Procurador do fornecedor
- **Escopo:** **full-stack** — domínio + migração + read models + HTTP + 2 telas frontend + i18n

## Contexto

A tela `frontend/src/pages/publico/MeusCredenciamentos.tsx` (UC004) já existia e estava funcional,
porém adaptada ao protótipo **antigo** `spec/AI-UI-Design/portal-fornecedor.html` (diretório removido).
As telas do portal foram niveladas ao novo `spec/Prototipo/portal-fornecedor.html`; `MeusCredenciamentos`
e `Editais` eram os retardatários (ver [backlog nivelamento](2026-07-17-backlog-nivelamento-spec-codigo.md)).

A captura de tela do novo protótipo impôs 3 deltas, 2 dos quais colidem com o domínio e foram arbitrados
pelo Tech Lead:

| Delta | Protótipo | Antes | Decisão |
|---|---|---|---|
| Subtítulo do objeto | `SIGLA · Etapa n/N` | só sigla (pill) | **Persistir o passo no backend** |
| Ação de "Finalizado" | "Visualizar →" | sem ação primária | **Criar tela de detalhe read-only** |
| `×` cancelar | só em "Em andamento" | em todos não-cancelados | Ajuste frontend |

### Divergências deliberadas (protótipo × domínio)

- **Total de passos = 4/4, não 5/5.** O 5º passo do protótipo é a prova de vida/biometria (UC007), que é
  R2 e está fora do MVP — o credenciamento conclui pelo Termo de Aceite. `TOTAL_PASSOS_CREDENCIAMENTO = 4`
  é a fonte de verdade e alimenta o "Etapa n/N".
- **Tela de detalhe sem mockup.** O protótipo prevê a ação "Visualizar" mas não desenha a tela; o layout
  (`CredenciamentoDetalhe`) segue o Design System e mostra o que o domínio guarda (edital/objeto/secretaria,
  situação, capacidade declarada, etapa, Termo de Aceite).

## Alterações

### Backend

- **Domínio** `credenciamento/domain/credenciamento.ts`
  - `TOTAL_PASSOS_CREDENCIAMENTO = 4`; `CredenciamentoState.passoAtual`; getter `passoAtual`.
  - `iniciar()` nasce no passo 1; `aceitarTermo()` conclui no passo 4.
  - `registrarPasso(passo)` — só em `iniciado`, `1..N-1` (o passo N vem do aceite), sem monotonicidade
    (o wizard permite voltar); no-op quando o passo não muda. Novo erro `PassoInvalido` (→ 422).
  - `deEstado()` tolera linhas legadas sem passo (`?? 1`).
- **Persistência**
  - Migration `backend/migrations/0024_credenciamentos_passo_atual.sql` — forward-only (AD-28):
    `ADD COLUMN passo_atual smallint NOT NULL DEFAULT 1` + backfill `UPDATE ... SET passo_atual = 4 WHERE estado = 'aceito'`.
  - `credenciamento-repository-pg.ts` — `passo_atual` no INSERT/UPDATE e no `mapear`.
  - `credenciamento-repository-memory.ts` — inalterado (guarda o agregado por referência).
- **Read models** (`credenciamento/application/`)
  - `listar-credenciamentos.ts` — `CredenciamentoResumo` expõe `passoAtual` + `totalPassos`.
  - `detalhar-credenciamento.ts` (novo) — `CredenciamentoDetalhe` com posse pelo `fornecedorId`
    (devolve `null` se não é da empresa → controller responde 404, não vaza id alheio).
- **Aplicação** `solicitar-credenciamento.ts` — `registrarPasso(id, passo, actor)` (estado de UI do
  agregado; **não** gera evento de negócio — a trilha AD-18 guarda início/aceite/cancelamento).
- **HTTP** `credenciamento-controller.ts` (+ DI em `server.ts`)
  - `PATCH /credenciamentos/:id/passo` (perfis do fornecedor).
  - `GET /credenciamentos/:id` (detalhe read-only, posse do dono → 404 caso contrário).

### Frontend

- `lib/api.ts` — `passoAtual`/`totalPassos` em `CredenciamentoResumoView`; novos
  `CredenciamentoDetalheView`/`TermoAceiteView`; `registrarPassoCredenciamento`, `detalharCredenciamento`.
- `pages/publico/Credenciamento.tsx` (wizard) — `reportarPasso()` reporta o passo ao navegar
  (Documentos/Termo e no "voltar"), best-effort (falha de rede não trava o wizard; passo do Concluído
  vem do aceite no backend).
- `pages/publico/MeusCredenciamentos.tsx` — subtítulo `SIGLA · Etapa n/N`; ações por estado
  (`continuar`/`visualizar`/`recredenciar`); `×` só em `iniciado`; docstring aponta para `spec/Prototipo`.
- `pages/publico/CredenciamentoDetalhe.tsx` (novo) + rota `/credenciamentos/$id` (`router.tsx`,
  guarda de autenticação) — detalhe read-only com "Voltar".
- i18n `locales/{pt-BR,en,es}.json` — `meusCredenciamentos.etapa`, `meusCredenciamentos.acao.visualizar`,
  bloco `credenciamentoDetalhe.*` (3 idiomas).

## Testes (TDD, execução em container — DEC-STR-34)

- **Unit** `tests/unit/credenciamento.spec.ts` — passo de nascimento, `registrarPasso` (avanço/volta),
  passo inválido, congelamento em aceito/cancelado, passo final no aceite.
- **Integração** `tests/integration/meus-credenciamentos.spec.ts` — `passoAtual`/`totalPassos=4`.
- **Integração** `tests/integration/credenciamento-rotas.spec.ts` — `PATCH /passo` (200 + reflexo no
  resumo), passo inválido (422), `GET /:id` do dono (com Termo), `GET /:id` alheio (404).
- **Componentes** — `MeusCredenciamentos.test.tsx` (subtítulo, "Visualizar" leva ao detalhe, `×` só em
  andamento), `CredenciamentoDetalhe.test.tsx` (novo), `Credenciamento.test.tsx` (reporta o passo).
- **E2E** `cypress/e2e/credenciamento.cy.ts` — stub do `PATCH /passo` para determinismo.

**Gate em container:** `backend-test` 488 ✓ / 14 skip · `frontend-test` 124 ✓ (28 arquivos). Lint +
typecheck + test verdes nos dois.

## Pendências / handoffs

- **QA:** validar o fluxo real (wizard reportando passo → lista mostra "Etapa n/N" → "Visualizar" abre o
  detalhe) e evidenciar a divergência 4/4.
- **Migração:** `0024` aplica no deploy/migrate (forward-only). Backfill leva `aceito` a 4.
- **Autorização de escrita:** `PATCH /passo` segue o padrão das rotas de escrita existentes (RBAC por
  papel, sem checagem de posse por id) — mesma superfície de `POST /termo`/`/cancelar`; endurecer a posse
  nas escritas é item sistêmico fora deste escopo.
