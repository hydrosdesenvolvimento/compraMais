# Registro técnico — AD-37: máquina de estado do Edital (pré-condição do Épico 5)

- **Data:** 2026-07-17
- **Autor:** Tech Lead (orquestrando)
- **Escopo:** alargar o ciclo de vida do `Edital` de 3 para 6 estados do caminho feliz + terminal
  ortogonal, conforme AD-37 (`spec/docs/architecture/ARCHITECTURE-SPINE.md`). É a **pré-condição** do
  Motor de Distribuição (Épico 5): as telas de Distribuição leem estados que o domínio hoje rejeitaria
  com `TransicaoInvalida`, e o motor só pode rodar a partir de `em_distribuicao`.

## Contexto

Demanda: "continue a alinhar as implementações com a documentação (spec/)". Bloco escolhido na sessão
anterior (AskUserQuestion): **Épico 5 — Motor de Distribuição**. Auditoria confirmou:

- `distribuicao/domain/motor.ts` — kernel determinístico pronto, puro, **órfão** (importado por ninguém).
- `editais/domain/edital.ts` — máquina de **3 estados** (`rascunho | publicado | encerrado`); AD-37 exige
  **6** (`Rascunho → Aberto → Em Análise → Em Distribuição → Homologado → Em Execução`).

## Decisões do solicitante (2026-07-17)

| Ponto | Decisão | Consequência |
|---|---|---|
| Destino de `encerrado` (sem contrapartida nos 6 do AD-37) | **Manter como 7º estado** (terminal ortogonal de encerramento) | Alcançável dos estados ativos; preserva a ação `encerrar` e o contrato. Não é o fim do caminho feliz (esse é `em_execucao`). |
| Nome do estado da vitrine (`publicado` no código × `Aberto` no AD-37) | **Renomear `publicado → aberto`** | Alinha o enum ao vocabulário canônico do spine; exige migração de dados e ajuste de literais/contrato. |

## Máquina resultante (AD-37)

```
rascunho ──publicar──▶ aberto ──iniciarAnalise──▶ em_analise ──iniciarDistribuicao──▶ em_distribuicao
   ──homologar──▶ homologado ──iniciarExecucao──▶ em_execucao
{aberto, em_analise, em_distribuicao, homologado, em_execucao} ──encerrar──▶ encerrado (terminal)
```

**Guardas AD-37 (expostas como getters do domínio):**
- `naVitrine` = `aberto` — só `aberto` entra na vitrine do fornecedor (RF003).
- `podeDistribuir` = `em_distribuicao` — o Motor (AD-7/Épico 5) só roda a partir daqui.
- `congelado` = `homologado | em_execucao` — da homologação em diante a alocação está congelada (AD-10).

## Alterações

**Backend**
- `editais/domain/edital.ts`: `SituacaoEdital` (7 estados); guarda genérica `exigirOrigem`; métodos
  `publicar/iniciarAnalise/iniciarDistribuicao/homologar/iniciarExecucao/encerrar`; getters de guarda.
- `editais/domain/eventos.ts`: 4 eventos de transição (`EditalEmAnalise`, `EditalEmDistribuicao`,
  `EditalHomologado`, `EditalEmExecucao`) — auditados (AD-18/AD-23).
- `editais/application/gerir-editais.ts`: casos de uso das 4 novas transições (salvam + publicam evento).
- `editais/adapters/editais-gestao-controller.ts`: 4 rotas de transição (`POST /editais/:id/{iniciar-analise|iniciar-distribuicao|homologar|iniciar-execucao}`), RBAC `PERFIS_GESTAO`; literal de resposta de `/publicar` `publicado → aberto`.
- `editais/adapters/edital-repository-{pg,memory}.ts`: `abertos()` filtra `aberto`.
- `credenciamento/application/solicitar-credenciamento.ts`: guarda de candidatura `publicado → aberto`.
- `paineis/application/paineis.ts` + `server.ts`: bucket do funil `publicado → aberto`.
- `server.ts`: registra os 4 novos eventos no `AuditConsumer`.
- **Migração `0019_editais_estado_ad37.sql`** (forward-only, idempotente): `UPDATE editais SET situacao='aberto' WHERE situacao='publicado'`. `situacao` é `text` (invariante no domínio, AD-33), sem CHECK a alterar.

**Frontend**
- `lib/api.ts`: `Funil.editaisPorSituacao.publicado → aberto`; 4 novos endpoints de transição.
- `pages/admin/GerirEditais.tsx`: pill + rótulo por estado (mapa `LABEL_SITUACAO`, não mais concat de
  string — snake_case seguro); filtros com os 7 estados; ação primária de avanço por estado + `encerrar`
  nos estados ativos. `data-cy` `publicar`/`encerrar` preservados; novos `iniciar-analise`,
  `iniciar-distribuicao`, `homologar`, `iniciar-execucao`.
- `pages/admin/Dashboard.tsx`: KPI lê `.aberto`.
- i18n `admin.gerirEditais.*` nos 3 idiomas (rótulos dos 7 estados + 4 ações).
- Cypress `editais.cy.ts`: stub de resposta `publicado → aberto`.

## Testes (gates em container — DEC-STR-34)

- **Backend: 423 passed / 14 skipped** (specs pg opt-in por `POSTGRES_HOST`). Novos/atualizados:
  `edital.spec.ts` (caminho feliz completo, guardas, transições fora de ordem, encerramento ortogonal),
  `editais.spec.ts` (cadeia de transições emitindo os 4 eventos), `editais-busca.spec.ts` e
  `paineis.spec.ts` (renome `publicado → aberto`).
- **Frontend: 77 passed.**

## Pendências (para o próximo incremento — Phase B, Motor)

- **Wiring do motor (Story 5.2):** porta de persistência canônica da matriz (append-only + hash +
  sementes, AD-10/AD-24), caso de uso `ExecutarDistribuicao` (exige `em_distribuicao`, reúne aptos dos
  credenciados aceitos, chama `distribuir()`, persiste, homologa/congela), adapter pg + memory + migração,
  controller + rota RBAC.
- **Telas:** Distribuição (admin) e Demandas distribuídas (fornecedor), conforme `spec/Prototipo/*.html`.
- **Marcadores de bloqueio vencidos:** `spec/docs/epics.md` §Épico 5 e `ARCHITECTURE-SPINE.md` §Questões
  Abertas ainda declaram o Épico 5 "Bloqueado por Item × Lote" — resolvido pela ARBITRAGEM-01 (7 = item,
  2026-07-16). **Docs de spec são mantidos pelo solicitante — sinalizado, não editado unilateralmente.**
- E2E Cypress a validar em execução real (QA/CI).
