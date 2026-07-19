# Registro Técnico — Tela "Malote SEI" · adequação de layout ao painel administrativo

- **Data:** 2026-07-19
- **Branch:** `feature/tela-malote-sei` (base `develop`)
- **UC/Rastreabilidade:** UC010 — Gerar Malote Digital (Exportação SEI) · RF007 · RN008 · RNF002/FR-009 · FR-004
- **Ator principal:** Analista CPL
- **Escopo:** **frontend apenas** (sem migração, sem alteração de backend/domínio)

## Contexto

O backend do UC010 já estava **100% entregue e durável** (ver
[registro UC010](2026-07-10-registro-uc010-gerar-malote-sei.md)): geração assíncrona pela fila durável,
recuperação no boot, QBE, RBAC e exportação idempotente. A tela `frontend/src/pages/admin/GerarMalote.tsx`
era **funcional mas "crua"** (formulários soltos dentro de `Card` + `<ul>` de cards), fora do padrão visual
das telas já elevadas (Secretarias, Usuários, Tipos de Arquivos).

Demanda: **adaptar a tela ao layout do painel administrativo** (`spec/Prototipo/painel-administrativo.html`).
O protótipo é um bundle de **view única** (dashboard "Visão geral") renderizado por JS — "Malote SEI" aparece
somente como **item de navegação** na sidebar (grupo OPERAÇÃO), sem mockup dedicado. Ele fornece portanto a
**linguagem visual** do painel (cabeçalho + ação primária, toolbar de filtros, tabela com pills de status e
ações, modal), já codificada no design-system; o **conteúdo** vem da documentação do UC010.

> Inspeção do protótipo: renderizado headless via `google-chrome-stable --headless` + CDP (o HTML é bundle
> JS, `grep` não acha DOM). Confirmado: shell + dashboard únicos; navegação para "Malote SEI" não tem view
> própria no bundle.

## Entrega (frontend)

### `pages/admin/GerarMalote.tsx` — reescrita no padrão admin

- **Cabeçalho** `page-title`/`page-sub` + ação primária **"+ Gerar malote"** (abre modal), como em
  `TiposArquivos`.
- **Toolbar de filtros** (QBE fornecedor/edital/status) com `IconeFiltro` + "Filtrar" + "Atualizar"
  (`IconeSync`). O QBE é suportado pelo backend (`GET /malotes?...`).
- **Tabela** (`cabecalho`/`celula` do design-system) — colunas **Fornecedor · Edital · Status · Fragmentos ·
  Ações**. Status como **pill** por cor: `pendente` (âmbar), `gerado` (azul institucional), `exportado`
  (verde sucesso). Ação **Exportar** (`IconeDownload`) só quando `status !== pendente`; mensagem de resultado
  inline (`exportado` / `jaExportado`, idempotência FR-004).
- **Estados**: carregando, erro ao carregar, e **vazio** estilizado (título + dica).
- **Auto-refetch** de 5 s preservado (reflete `pendente → gerado` sem recarregar).
- **Modal "Gerar malote"** (`ModalGerarMalote`, overlay + card, header/form/footer, fecha no ESC/overlay):
  fornecedor + edital + **editor de peças** (tipo/ref/tamanho + adicionar + remover), aviso da regra de
  ordenação/fragmentação, bloqueio do envio até fornecedor + edital + ≥1 peça válida. Usa `api.maloteGerar`;
  no sucesso fecha e invalida a listagem.

### Comportamento UC010 preservado

Geração assíncrona (202), QBE, auto-refetch, exportação idempotente e o editor manual de peças. **Follow-up
mantido** (já registrado no UC010): fiar as peças aos documentos aprovados reais da covalidação (UC006) em vez
do editor manual.

### i18n (3 idiomas — DEC-STR-33)

Bloco `admin.malote.*` estendido em `pt-BR`/`en`/`es`: `novoMalote`, `carregando`, `erroCarregar`,
`vazioTitulo`, `vazioDica`, `campos.*` (fornecedor/edital/status/fragmentos/acoes) e `modal.*`
(subtitulo/fechar/cancelar/removerPeca). Chaves existentes de `gerar`/`tipos`/`filtros`/`status`/`lista`
reaproveitadas.

### Teste

`GerarMalote.test.tsx` reescrito para a nova estrutura (tabela + modal), preservando `data-cy`: lista em
tabela + exporta gerado (FR-004), estado vazio, geração pelo modal (ordem legal), bloqueio sem peças, e
remoção de peça no editor.

## Evidências

- **Gate em container (DEC-STR-34)** — `docker compose --profile test run --rm frontend-test`
  (lint + typecheck + test): **27 arquivos / 119 testes verdes**, incluindo os 5 de `GerarMalote.test`.
- Backend **não alterado** — gate de backend não aplicável a esta entrega.

## Fora de escopo

- Backend/domínio, migração e RBAC (já entregues no UC010).
- Fiar peças aos documentos aprovados reais (UC006) — follow-up do UC010.
- Paleta: `develop` segue navy (NIV-04); não reintroduzir navy ao integrar a repintura `#0061AE`.

## E2E

Sem spec Cypress dedicada a malote no repo; validação E2E real a cargo do QA/CI.
