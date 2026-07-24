# Prompt log — 2026-07-06_002 · UC019 — Gerir Procuradores da Empresa

## Prompt do solicitante (sanitizado)
> Vamos fazer a UC019 do @spec/docs/casos-de-uso.md em uma nova branch

## Interpretação (Senior Developer / Tech Lead)
Implementar UC019 (bloco A — Cadastro & Identidade): o **Titular** convida/gere **Procuradores** da empresa,
com vínculo `Procurador↔empresa`, rastro de ator + empresa em toda ação (AD-30) e regras de bloqueio
(procurador não se autovincula; direitos LGPD do titular não são delegáveis). Rastreável a
Story 1.7 (épicos) · RN010 · AD-30/AD-35 · RNF003.

## Diagnóstico do estado atual (pré-implementação)
Já existe base de backend em `shared/identity/` (`GerirProcuradores.convidar/remover`, `ContaAcesso`,
eventos `ProcuradorConvidado/Removido`, rotas POST/DELETE). Porém UC019 estava **incompleto e parcialmente quebrado**:

| # | Lacuna | Efeito |
|---|---|---|
| 1 | `CadastrarFornecedor` cria `ContaAcesso(titular)` com `randomUUID()`, mas a rota resolve o titular por `x-user-id` (= id do usuário de login). | `convidar` sempre lança `TitularNaoEncontrado`; fluxo de convite inoperante e sem teste E2E. |
| 2 | Sem endpoint de **listagem** | UC019 passo 1 ("O Titular abre 'Procuradores'") não tinha como listar. |
| 3 | `ContaRepositoryMemory` sempre em memória (mesma classe de bug que UC018 corrigiu no fornecedor) | Vínculos de procurador não sobreviviam a restart. |
| 4 | Sem tela/rota/nav/i18n de "Procuradores" no frontend | Titular não conseguia operar a UC. |
| 5 | Sem testes de procuradores em nenhuma camada | UC sem rede de segurança. |

## Plano de ação
1. **Backend** — alinhar `id` do `ContaAcesso(titular)` ao `usuarioId` de login; adicionar `listar` (use case + `GET /fornecedores/:id/procuradores`); refinar mapeamento de erro (403 papel indevido / 404 conta ausente); `ContaRepositoryPg` + migração `0005` + wiring `pool ? pg : memory`.
2. **Backend TDD** — unit de `GerirProcuradores` (convidar/listar/remover + bloqueio de procurador) e integração das rotas.
3. **Frontend** — página `Procuradores` (lista + convite + remover), `api` (listar/convidar/remover), i18n nos 3 idiomas, rota com guard + item de nav; teste de componente.
4. **Gate** — suite no container (DEC-STR-34): backend e frontend (lint + typecheck + test).

## Rastreabilidade
UC019 · Story 1.7 (`spec/docs/epics.md`) · RN010 · AD-30, AD-35 · RNF003 · DEC-STR-32 (PR→`develop`) · DEC-STR-33 (i18n) · DEC-STR-34 (testes no container).

## Segurança/sanitização
Sem segredos, credenciais, tokens ou PII no prompt ou nos artefatos. Identificador de procurador (e-mail/CPF)
é dado funcional do domínio, tratado como conteúdo de aplicação (não é segredo de infraestrutura).
