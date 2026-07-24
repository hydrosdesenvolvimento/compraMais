# Registro técnico — Tela "Gestão de Documentos" (RF-007/008)

**Data:** 2026-07-18 · **Branch:** `feature/tela-documentos` · **Rota:** `/documentos` (Portal do Fornecedor)

## Objetivo

Elevar a tela de Documentos à fidelidade do protótipo `spec/Prototipo/portal-fornecedor.html`
(bloco `isDocs`): coluna **VALIDADE**, **4 estados** de status, tarja **"Reprovado pela CPL"** com
motivo + **"Reenviar Documento Corrigido"**, e ações **Visualizar/Baixar**.

## Mudanças

### Backend (mínimo)
- `credenciamento/application/gerir-documentos.ts` — `listar()` passou a incluir `motivoReprovacao`
  no read model (o agregado `Documento` já o armazenava; nenhuma migração necessária). Os demais
  campos (`status`, `situacao`, `dataValidade`) já existiam.

### Frontend
- `pages/publico/Documentos.tsx` — reescrita. Deriva o estado da UI de `status`+`situacao`+
  `dataValidade` (`derivarEstado`): Aprovado / Vence em N dias (janela ≤ 30 dias) / Reprovado /
  Vencido / Em análise. Tarja de reprovação com motivo da CPL e reenvio (`api.reenviarDocumento` →
  UC006, volta a `pendente`, invalida a query + toast de sucesso). Coluna VALIDADE formatada por
  `Intl.DateTimeFormat` no idioma ativo. Ações Visualizar (olho) e Baixar (download) por linha.
- `lib/api.ts` — `DocItem` +`motivoReprovacao: string | null`.
- `design-system/components/Pill.tsx` + `index.css` — novo tom `neutral` (`.pill-neutral`) p/ "Em análise".
- `i18n/locales/{pt-BR,en,es}.json` — bloco `documentos` reescrito (22 chaves), inclui plural de
  `statusVenceEm` e `alertaPendencias`. Sem strings hardcoded (PRJ-DEC-12).

## Estados (mapa)

| Domínio | Situação/validade | Estado UI | Pill |
|---|---|---|---|
| `reprovado` | — | Reprovado (+ motivo + reenviar) | error |
| `pendente` | — | Em análise | neutral |
| `aprovado` | expirado | Vencido | error |
| `aprovado` | vigente, ≤ 30 dias p/ vencer | Vence em N dias | warn |
| `aprovado` | vigente | Aprovado | success |

## Testes (TDD, gate em container — DEC-STR-34)
- Backend: `tests/integration/documentos.spec.ts` — novo caso "expõe o motivo da reprovação no read
  model". Gate: **459 passed / 14 skipped**.
- Frontend: `pages/publico/Documentos.test.tsx` — 2 casos (derivação dos 4 estados; tarja de
  reprovação + reenvio com `docId`). Gate: **102 passed** (lint + typecheck + test).

## Deferimentos / notas
- **"Pendente de envio" (checklist de docs exigidos ausentes)**: não modelado — o domínio só
  representa documentos enviados. Exigiria join com o catálogo `tipos-documento`. Fica como backlog.
- **Seed**: fornecedor demo (`demo-fornecedor`) não tem documentos semeados (limitação pré-existente).
  A tela fica vazia até haver upload pelo fluxo de credenciamento. Semear dados de demonstração é
  follow-up opcional.
- **Responsividade**: cabeçalho usa `cm-hide-sm` (colapsa no mobile, `!important` vence inline);
  linhas mantêm o grid do protótipo.
