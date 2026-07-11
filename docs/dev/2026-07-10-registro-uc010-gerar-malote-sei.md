# Registro Técnico — UC010: Gerar Malote Digital (Exportação SEI)

- **Data:** 2026-07-10
- **Branch:** `feature/uc010-gerar-malote-sei` (base `develop`)
- **UC:** UC010 — Gerar Malote Digital Estruturado (Exportação SEI)
- **Rastreabilidade:** RF007 · RN008 · RNF002 · Épico 6 (Stories 6.1/6.2/6.3) · AD-6/AD-21/AD-26/AD-33
- **Ator principal:** Analista CPL

## Contexto e decisão de escopo

A demanda entrou como **UC009 (Gerir Cadastro de Reserva)**, mas UC009 pertence ao **Épico 5
(Motor de Distribuição), explicitamente bloqueado** (`⚠️ Bloqueado até ratificar Item × Lote —
SMGA/TCE`), e sua pré-condição depende da **Story 5.2 (matriz de alocação persistida)**, que o UC008
deixou **deferida** (entregou só o kernel puro do motor). Levado ao solicitante (AskUserQuestion):

1. Escopo UC009 → **"Trocar por UC desbloqueada"** (mantém o bloqueio do Épico 5 intacto).
2. UC alvo → **UC010 — Malote SEI** (Must, Épico 6).

## Estado prévio (gap)

O módulo `backend/src/malote/` já existia (commit hexagonal em massa) com domínio rico, aplicação,
controller (RBAC/QBE/202 async), repo memory, eventos (`MaloteGerado`/`MaloteExportado`, já no
`AuditConsumer`) e testes. **Gap = mesma classe dos fixes 0004/0005/0007/0009/0010:** durabilidade
ausente.

- `Malote` sem `estado()/deEstado()` → não persistível.
- Sem `MaloteRepositoryPg` e sem migração → **core "Must" ainda só em memória**.
- **Fila só em memória** (`FilaMaloteMemory`) → jobs enfileirados se perdiam no restart (**lacuna
  nomeada das Stories 6.1/6.2**: "fila durável com retry, `pendente → gerado` sobrevive a restart").
- Wiring hardcoded `new MaloteRepositoryMemory()` — sem `pool ? pg : memory`.
- Sem testes HTTP; sem superfície de frontend.

## Entrega

### Backend — durabilidade do agregado

- `Malote.estado()/deEstado()` + `MaloteState` (snapshot AD-33): peças e fragmentos serializados.
- `MaloteRepositoryPg` (tabela `malotes`): upsert idempotente (peças/fragmentos em `jsonb`), `porId`,
  `buscarPorExemplo` (QBE parametrizado + paginação estável por `register_date`).

### Backend — fila DURÁVEL (centro da entrega)

- `FilaMalotePg` (tabela `malote_jobs`): troca o array de `FilaMaloteMemory` por tabela — **"mesma
  porta"** `FilaMalote`. Enfileira o payload (peças + ator); reivindica um job por vez com
  `FOR UPDATE SKIP LOCKED` (sem processamento duplicado entre drenagens/instâncias); retry
  (`pendente` com `tentativas++` até `maxTentativas`, depois `falha` = dead-letter rastreável).
- **Recuperação no boot** (`recuperar()`): devolve jobs `processando` órfãos (crash) a `pendente` e
  drena os pendentes — o trabalho de geração sobrevive a reinícios.

### Backend — migração e wiring

- `0013_init_malotes.sql` (forward-only, AD-28): tabelas `malotes` e `malote_jobs` + índices de QBE e
  de drenagem quente (`WHERE situacao = 'pendente'`).
- `server.ts`: `pool ? { MaloteRepositoryPg + FilaMalotePg } : { memory }`; `recuperar()` no boot
  quando pg.

### Backend — testes

- Unit: round-trip `estado()/deEstado()` (durabilidade AD-33).
- Integração HTTP `malote-rotas.spec.ts` (`buildServer`): 202 async → gerado, RBAC 403, QBE,
  exportação idempotente, 404.

### Frontend (admin, i18n 3 idiomas — DEC-STR-33)

- `pages/admin/GerarMalote.tsx`: gerar (fornecedor/edital + editor de peças), lista com QBE
  (fornecedor/edital/status), badge de status, exportação idempotente, auto-refetch (reflete
  `pendente → gerado`), sinalização de peça acima do limite.
- `api.malote*` (`malotesListar`/`maloteDetalhe`/`maloteGerar`/`maloteExportar`), rota `/admin/malote`
  + item de nav, i18n `admin.malote.*` + `common.nav.malote` em pt-BR/en/es, teste de componente
  `GerarMalote.test.tsx`.

## Evidências

- **Gate em container (DEC-STR-34):**
  - Backend: **297 testes** verdes (lint + typecheck + test).
  - Frontend: **30 testes** verdes (+3 `GerarMalote.test`); lint + typecheck ok.
- **Validação live contra Postgres real** (`--profile dev`, `RECEITA_PROVIDER=mock`):
  - Migração `0013` aplicada no boot.
  - `POST /malotes` (peças fora de ordem + peça de 50 MB) → 202 `pendente` → worker processa pela fila
    → `gerado`, **3 fragmentos**, **`pecaAcimaLimite=true`** (FR-009), ordem legal (CNPJ→…→Certidão);
    job `concluido` em `malote_jobs`.
  - **Durabilidade:** malote `gerado` **sobrevive ao restart** do backend.
  - **Recuperação da fila durável:** job `pendente` injetado + restart → `recuperar()` drenou no boot →
    malote `gerado`, job `concluido` (prova de "sem perda silenciosa").
  - **Exportação idempotente:** 1ª `jaExportado=false`, 2ª `jaExportado=true`; persistido `exportado`.
  - **RBAC:** `POST /malotes` sem papel → 403. QBE por status ok.

## Fora de escopo (follow-ups)

- **Compressão real dos bytes** dos PDFs (worker de infra AD-6/AD-21): o domínio ordena e fragmenta;
  a manipulação binária entra por porta de compressão sem alterar o domínio (já documentado no domínio).
- **Fiar o malote aos consumidores** (peças = documentos aprovados reais da covalidação UC006, em vez
  do editor manual da tela) — incremento seguinte, como nos demais UCs.
- **UC009 / Épico 5** permanece **bloqueado** (Item × Lote — SMGA/TCE).

## E2E

Cypress a validar em execução real (QA/CI).
