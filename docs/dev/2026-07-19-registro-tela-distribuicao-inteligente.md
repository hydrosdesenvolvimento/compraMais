# Registro Técnico — Tela "Distribuição Inteligente" (Painel Admin · Operação)

- **Data:** 2026-07-19
- **Branch:** `feature/tela-distribuicao-inteligente` (base `develop`)
- **UC/Rastreabilidade:** UC008 (Distribuir Demanda Equitativamente) · RF005 · RN005 (teto de distribuição por capacidade declarada)
- **Ator principal:** SMGA / CPL (operação)
- **Escopo:** **full-stack** — read-model + HTTP + 1 tela frontend + i18n + testes. **Sem migration** (composição de portas do módulo `distribuicao` já existente).

## Contexto

A rota `/admin/distribuicao` era um placeholder (`<EmConstrucao tituloKey="common.nav.distribuicao" />`).
O protótipo `spec/Prototipo/painel-administrativo.html` (view `isDistribuicao`) especifica a tela de
operação: dado um edital, mostrar o **rateio equitativo** do Motor respeitando a capacidade declarada
(RN005), com cabeçalho do edital, os totais (Total da demanda / Distribuído / Habilitados), a tabela
"Resultado da distribuição" (Fornecedor · Capacidade · Cota atribuída · % da demanda) e o botão
**"Homologar distribuição"**.

O módulo `distribuicao` (Épico 5 / UC008) **já existia no develop**: Motor puro (`motor.ts`), matriz
canônica append-only (`registro-distribuicao.ts`, migration 0022), execução (`ExecutarDistribuicao`,
`POST /editais/:id/distribuir`) e a matriz vigente (`GET /editais/:id/distribuicao`). Faltava apenas a
projeção de leitura **enriquecida** para a tela: a matriz canônica guarda só `{fornecedorId, cota}` —
não o **nome** do fornecedor nem a **capacidade** (teto). Nenhum endpoint entregava isso montado.

## Decisões (Tech Lead)

| Tema | Decisão | Motivo |
|---|---|---|
| Semântica de "Homologar" | **Homologar = executar + congelar a matriz** (reusa `POST /editais/:id/distribuir`) | UC008: o Motor "gera o relatório final com as frações homologadas". O `develop` não tem a máquina de estado AD-37/`em_distribuicao`, então não há um passo de homologação separado da execução |
| Preview × homologado | Sem matriz congelada → roda o Motor puro como **preview** (não persiste); com matriz → mostra o resultado homologado | O gestor confere o rateio antes de congelar; o preview usa **os mesmos aptos** da execução (`montarAptosDoEdital`), logo é idêntico ao que será homologado (determinístico) |
| Chip de situação | Reflete o **estado do rateio** (Em Distribuição × Homologada), não um estado do edital | `develop` não tem `em_distribuicao`; honesto ao domínio |
| Unidades ("conjuntos", "un/mês") | Exibição via i18n; o domínio guarda apenas números | Não há campo de unidade no domínio |

## Alterações

### Backend (composição de portas — sem migration)

- **`distribuicao/application/montar-aptos.ts`** (novo) — `montarAptosDoEdital(creds, fornecedores, editalId)`:
  extrai a montagem dos aptos (credenciados `aceito` + teto RN005 + desempates ordem→CNPJ) que estava
  **inline** em `ExecutarDistribuicao`. Agora **compartilhado** entre a execução (congela) e o resumo
  (preview), garantindo `preview ≡ homologação`.
- **`distribuicao/application/executar-distribuicao.ts`** — refatorado para usar `montarAptosDoEdital`
  (comportamento inalterado; suíte existente continua verde).
- **`distribuicao/application/resumir-distribuicao-edital.ts`** (novo) — `ResumoDistribuicaoEdital.resumir(editalId)`:
  carrega o edital (404 `EditalNaoEncontrado`); se há matriz vigente (`repo.ultimaDoEdital`) usa-a
  (`homologada=true`, `versao`); senão roda o Motor puro como preview (`homologada=false`, `versao=null`);
  enriquece cada linha com `nome` (razão social) e `capacidade` (teto do credenciamento `aceito`).
  Sem aptos ou sem demanda → rateio vazio com déficit total (não estoura `SemAptos`). Somente leitura.
- **`distribuicao/adapters/distribuicao-controller.ts`** — nova rota `GET /gestao/editais/:id/distribuicao`
  (RBAC `PERFIS_GESTAO` = smga/cpl/administrador), mesmo mapeamento de erros (404/409/422).
- **`server.ts`** — instancia `ResumoDistribuicaoEdital(editaisRepo, credRepo, fornecedores, distribuicaoRepo, secretariaLookup)`
  (a instância `Edital` satisfaz o lookup mínimo estruturalmente — inclui `quantitativos`) e injeta em `registrarRotasDistribuicao`.

### Frontend

- **`pages/admin/DistribuicaoInteligente.tsx`** (novo) — fiel à view `isDistribuicao`: seletor de editais
  publicados (`editaisOperacao('publicado')`, default 1º), card do edital + chip, 3 stats, tabela do
  rateio (% da demanda = `cota/total` via `Intl.NumberFormat`), aviso de **déficit** (exceção do UC008)
  e botão "Homologar" (oculto quando o rateio está vazio; vira "Distribuição homologada · versão N" após
  congelar). `data-cy` no padrão do contrato de testes.
- **`lib/api.ts`** — `ResumoDistribuicaoView`/`RateioLinhaView`, `resumoDistribuicao(editalId)` e
  `homologarDistribuicao(editalId)` (POST `/editais/:id/distribuir`).
- **`router.tsx`** — `/admin/distribuicao` repontado do placeholder para `DistribuicaoInteligente`
  (guard `exigirTelaAdmin('distribuicao')` já existia; tela visível ao perfil SMGA por padrão).
- **i18n** — bloco `admin.distribuicao.*` nos 3 idiomas (pt-BR, en, es).

## Divergências deliberadas (protótipo × domínio)

| Item | Protótipo | Decisão |
|---|---|---|
| "Homologar distribuição" | ação de finalização | Reusa `POST /distribuir` (executa + congela append-only) — não há passo separado no develop |
| Chip "Em Distribuição" | estado do edital | Reflete o estado do **rateio** (preview × homologada) |
| "600 conjuntos" / "800 un/mês" | unidades fixas | Números do domínio + rótulo de unidade só na exibição (i18n) |
| Cadastro de Reserva (view irmã) | tela separada | Fora deste escopo (UC009/RN004) — `/admin/cadastro-reserva` segue placeholder |

## Testes / Evidências (execução em container — DEC-STR-34)

- **Backend** `docker compose --profile test run --rm backend-test`: **509 testes** (era 498) — lint + typecheck + test verdes.
  - Unit `tests/unit/resumir-distribuicao-edital.spec.ts` (7 casos): cabeçalho, preview, filtro `aceito`,
    vazio/déficit total, déficit RN005, matriz homologada, 404.
  - Integração `tests/integration/resumo-distribuicao-rotas.spec.ts` (4 casos): 401/403 (RBAC), 404, shape 200.
- **Frontend** `docker compose --profile test run --rm frontend-test`: lint + typecheck + test verdes.
  - `src/pages/admin/DistribuicaoInteligente.test.tsx` (9 casos): default, rateio+%, homologar, chip
    homologada, déficit, vazio, troca de edital, sem editais, erro.

## Pendências

- Commit/PR aguardando o solicitante.
- Seed de demonstração ponta-a-ponta limitado (mock Receita com 1 CNPJ) — cenário multi-fornecedor coberto por teste unitário.
