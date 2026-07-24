# Registro Técnico — Edital sem quantitativo agregado (demanda vem dos itens)

- **Data:** 2026-07-24
- **Demanda:** "os editais não deve mais ter o campo Quantitativo, os quantitativos apenas os dos itens dos editais"
- **Branch:** `feature/edital-sem-quantitativo`
- **Log do prompt:** [`docs/prompts/2026-07-24_002_remover-quantitativo-edital.md`](../prompts/2026-07-24_002_remover-quantitativo-edital.md)
- **Gates:** backend **626** · frontend **185** (lint + typecheck + test em container)

---

## 1. O que mudou

O agregado `Edital` **deixou de ter** o campo `quantitativos`. A quantidade passa a existir **apenas nos itens** do edital (`ItemEdital.quantidade`, entregue em 2026-07-24). Onde antes se usava a demanda agregada do edital, agora se usa a **soma das quantidades dos itens**.

Decisão do solicitante (AskUserQuestion): nas listas de edital (vitrine e gestão), **a coluna de quantidade foi removida** — a quantidade vive por item (visível no gerenciador de itens do edital).

## 2. Decisões

| # | Decisão | Motivação |
|---|---|---|
| D1 | Remover `quantitativos` do domínio, do banco e da UI | Pedido literal |
| D2 | Demanda do Motor/resumo = **Σ `item.quantidade`** | Única fonte possível após remover o campo; "os quantitativos apenas os dos itens" |
| D3 | Listas (vitrine/gestão) **sem coluna de quantidade** | Decisão do solicitante; a quantidade é dos itens |
| D4 | Publicar **não** exige mais `quantitativos > 0`; passa a exigir objeto + CNAE alvo + prazo | A demanda saiu do agregado. Exigir ≥1 item para publicar fica para o fluxo item-cêntrico (follow-on) |
| D5 | Migração **destrutiva** (drop column) como migração **nova** 0029 | Forward-only (AD-28): não altera a 0007; o valor agregado não tem mais lugar no modelo |

## 3. Alcance (arquivos)

**Backend**
- `editais/domain/edital.ts` — remove `quantitativos` de state/criar/editar/deEstado/estado/getter e do `validarParaPublicacao`.
- `migrations/0029_editais_drop_quantitativos.sql` — `ALTER TABLE editais DROP COLUMN quantitativos`.
- `editais/adapters/edital-repository-pg.ts` — remove da persistência e do mapeamento.
- `editais/application/gerir-editais.ts`, `editais/adapters/editais-gestao-controller.ts`, `editais/adapters/editais-controller.ts`, `editais/application/buscar-editais.ts` — remove dos payloads e projeções.
- **Distribuição:** `executar-distribuicao.ts` e `resumir-distribuicao-edital.ts` — a porta de leitura do edital passa a devolver `demanda` (não `quantitativos`); `server.ts` compõe `demandaDoEdital(id) = Σ itensEditalRepo.listarDoEdital(id).quantidade` e injeta nas duas.
- Testes backend atualizados: os que criavam editais com `quantitativos` e dependiam da demanda passam a **adicionar itens** (catálogo → item de edital) para prover a demanda; os que asseriam `quantitativos` no read model / na completude de publicação foram ajustados.

**Frontend**
- `lib/api.ts` — remove `quantitativos` de `EditalItem`/`EditalGestao`.
- `pages/admin/GerirEditais.tsx` — remove o campo do form "Novo edital", a linha "N unidades" da lista e a linha do modal de detalhe.
- `pages/publico/Editais.tsx` (vitrine) — remove a coluna, a ordenação e a coluna de exportação.
- i18n: removidas as chaves órfãs `admin.gerirEditais.{unidades,quantitativosLabel,campoQuantitativos}` e `editais.vitrine.colQuantitativos` nos 3 idiomas.
- Testes frontend atualizados (mocks e a interação com o campo removido).

## 4. Validação live (Postgres real, `--profile dev`, mock)

| # | Cenário | Resultado |
|---|---|---|
| 1 | Migração 0029 aplicada; coluna `quantitativos` **não existe** mais em `editais` | ✅ |
| 2 | Criar edital **sem** `quantitativos` no payload → 201; resposta não traz o campo | ✅ |
| 3 | Adicionar 2 itens (qtd 30 + 20) e publicar | ✅ |
| 4 | Resumo da distribuição: **total (demanda) = 50** (soma dos itens) | ✅ |
| 5 | **Durabilidade:** total = 50 após restart do backend | ✅ |
| 6 | UI: modal "Novo edital" sem o campo Quantitativo (Cypress `not.exist` + captura) | ✅ |

## 5. Follow-ups

1. **Publicar exigir ≥1 item** — quando o edital for plenamente item-cêntrico, faz sentido barrar publicação sem itens (hoje um edital sem itens publica e teria demanda 0 → o Motor lança `DemandaInvalida` ao distribuir).
2. **Credenciamento e distribuição por item** — a direção-alvo já confirmada; este passo (remover o agregado) a destrava. Rewiring do Motor por item segue como Épico 5.

## 6. Rollback

`git revert` do commit. A migração 0029 é destrutiva (a coluna volta a não existir); reverter o código não recria a coluna — se for necessário restaurar, uma nova migração `ADD COLUMN quantitativos integer NOT NULL DEFAULT 0` a recria vazia.
