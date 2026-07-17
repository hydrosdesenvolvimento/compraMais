# Registro técnico — Épico 5: wiring do Motor de Distribuição (Stories 5.1 + 5.2)

- **Data:** 2026-07-17
- **Autor:** Tech Lead (orquestrando)
- **Pré-condição:** [AD-37 — máquina de estado do Edital](2026-07-17-registro-ad37-maquina-estado-edital.md) (mesma sessão).

## O que estava pronto e o que faltava

`distribuicao/domain/motor.ts` já entregava o **kernel determinístico** (Story 5.1): função pura,
water-filling limitado ao teto (RN005), resto por Hamilton, desempate `ordem_credenciamento → CNPJ`,
déficit. Estava **órfão** — importado por ninguém. Faltava a Story 5.2 (persistência canônica) e todo
o wiring (reunir aptos, rodar, persistir, expor por HTTP, exibir).

## Entrega

**Domínio (`distribuicao/domain/`)**
- `registro-distribuicao.ts`: registro canônico da matriz + `serializarCanonico`/`hashDistribuicao`
  (SHA-256 do conteúdo, exclui id/versão/geradoEm) — **prova de reprodutibilidade** (AD-24/RNF008);
  `montarRegistro` converte o resultado puro do motor em fato versionado.
- `eventos.ts`: `DistribuicaoExecutada` (payload leva `hash` + `regraDesempate` — a semente vai à trilha).

**Aplicação (`distribuicao/application/executar-distribuicao.ts`)**
- Porta `DistribuicaoRepository` **append-only**: `append`, `ultimaDoEdital`, `contarDoEdital`,
  `cotasDoFornecedor`.
- Caso de uso `ExecutarDistribuicao`: guarda AD-37 (`EditalNaoDistribuivel` se ≠ `em_distribuicao`),
  reúne os credenciados `aceito` como aptos (`teto`=capacidadeTeto, `ordemCredenciamento`=registerDate,
  `cnpj` do FornecedorRepository), roda o kernel, numera a versão (append-only), persiste e emite o
  evento. Reexecutar antes da homologação **acrescenta** versão; homologado (congelado, AD-10) a guarda barra.

**Adapters**
- `distribuicao-repository-memory.ts` / `-pg.ts` (matriz vigente = maior versão; `cotasDoFornecedor`
  via containment jsonb `@>`).
- `distribuicao-controller.ts`: `POST /editais/:id/distribuir` (gestão), `GET /editais/:id/distribuicao`
  (gestão, matriz vigente), `GET /distribuicao/minhas` (fornecedor, cotas enriquecidas com número/objeto
  do edital). RBAC AD-20/AD-35. Mapa de erros: 404 / 409 (guarda) / 422 (SemAptos, DemandaInvalida).
- **Migração `0020_init_distribuicao.sql`** (forward-only): tabela `distribuicoes` (matriz jsonb + hash),
  índice único `(edital_id, versao)`, GIN em `alocacoes`, e **trigger append-only** (bloqueia UPDATE/DELETE
  — mesma defesa de `auditoria`/`consentimentos`).
- `server.ts`: wiring `pool ? pg : memory`; `EditalParaDistribuir` e `EditalResumoLookup` adaptados do
  `editaisRepo`; evento `DistribuicaoExecutada` registrado no `AuditConsumer`.
- `credenciamento`: `listarPorEdital` na porta + memory/pg (fonte dos aptos).

**Frontend**
- `pages/publico/DemandasDistribuidas.tsx` (+ conectada): o fornecedor vê suas cotas (número do edital,
  objeto, quantidade, data, protocolo=hash curto). Rota `/demandas` (guard de autenticação); **nav
  "Demandas distribuídas" repontada de `/transparencia` → `/demandas`** (estava mis-apontada, mesma classe
  do fix de "Meus Credenciamentos").
- `pages/admin/GerirEditais.tsx`: ação **Distribuir** para editais `em_distribuicao` (dispara o motor).
- `lib/api.ts`: `distribuirEdital`, `distribuicaoMinhas` + tipos `MatrizDistribuicao`/`CotaDistribuida`.
- i18n `demandasDistribuidas.*` + `admin.gerirEditais.distribuir` nos 3 idiomas.

## Testes (gates em container — DEC-STR-34)

- **Backend: 440 passed / 14 skipped** (specs pg opt-in). Novos:
  - `tests/unit/registro-distribuicao.spec.ts` (4): hash reprodutível (ordem de entrada irrelevante),
    hash muda com edital/demanda/cotas, serialização canônica.
  - `tests/integration/distribuicao.spec.ts` (8): rateio respeitando teto, só `aceito` conta, guarda AD-37,
    edital inexistente, SemAptos, append-only (v1→v2, mesma matriz mesmo hash), `cotasDoFornecedor`.
  - `tests/integration/distribuicao-rotas.spec.ts` (7): fluxo HTTP real (credenciar→termo→analise→
    distribuicao→distribuir→matriz→minhas), RBAC 403, guarda 409, 404.
- **Frontend: 79 passed** (+`DemandasDistribuidas.test.tsx`).

## Fora de escopo / pendências

- **Stories 5.3 (Cadastro de Reserva/UC009) e 5.4 (substituição de desistente)** — o déficit já é
  computado e persistido; falta o fluxo de acionamento da reserva.
- **Item × Lote:** a demanda é o `quantitativos` agregado do edital (MVP). ARBITRAGEM-01 ratificou
  **7 = item**; a granularidade por item entra quando a modelagem de itens existir (o kernel já é
  invocável por unidade).
- **Visualização da matriz no admin** (`GET /editais/:id/distribuicao` existe; falta a tela).
- **Homologar não congela credenciamentos** (`distribuidoEm` segue null) — a matriz é a fonte canônica;
  amarrar o freeze ao `homologar` é incremento seguinte.
- **`/transparencia` perdeu o item de nav do fornecedor** (era o alvo do "Demandas" mis-apontado) —
  decidir se a transparência pública (US2/FR-003) ganha nav próprio.
- **Marcadores de bloqueio vencidos** em `spec/docs/epics.md` e `ARCHITECTURE-SPINE.md` (Épico 5 ainda
  "Bloqueado") — spec é mantido pelo solicitante; **sinalizado, não editado**.
- E2E Cypress a validar (QA/CI).
