# Registro Técnico — Tela "Cadastro de Reserva" (Painel Admin · Operação)

- **Data:** 2026-07-19
- **Branch:** `feature/tela-cadastro-reserva` (base `develop`)
- **UC/Rastreabilidade:** UC009 (Gerir Cadastro de Reserva — Segunda Demanda) · RF006 · RN004 (saída da distribuição só por substituição; distribuição já feita permanece intacta) · AD-25 (ordem `regra_reserva` cronológica, isonomia LC 123)
- **Ator principal:** SMGA / CPL (operação)
- **Escopo:** **full-stack** — read-model + HTTP + 1 tela frontend + i18n (3 idiomas) + testes. **Sem migration** (composição de portas já existentes dos módulos `distribuicao` e `credenciamento`).

## Contexto

A rota `/admin/cadastro-reserva` era um placeholder (`<EmConstrucao tituloKey="common.nav.cadastroReserva" />`).
O protótipo `spec/Prototipo/painel-administrativo.html` (view `isReserva`) especifica a tela: cabeçalho
("Operação · Cadastro de Reserva" + "Gestão de retardatários sem alterar contratos vigentes (RN004)"),
um aviso âmbar **"Fila de reserva"** e uma **lista numerada** dos fornecedores retardatários (posição ·
razão social · edital/objeto · capacidade declarada · chip "Reserva").

Já existia a **definição** de "reserva" no develop, mas apenas na ótica do fornecedor: `ListarDemandasFornecedor`
(tela `/demandas`, UC008) classifica um credenciamento `aceito` fora da matriz vigente como `reserva`.
Faltava a **projeção global** para a operação: a fila cronológica de **todos** os retardatários, de todos
os editais já distribuídos, ordenada pela regra de reserva (AD-25).

## Decisões (Tech Lead)

| Tema | Decisão | Motivo |
|---|---|---|
| Definição de "reserva" | Credenciamento `aceito` cujo `fornecedorId` **não** tem cota (>0) na matriz vigente do edital | Mesma regra já consolidada em `ListarDemandasFornecedor` (2ª Demanda / UC009); coerência entre a visão do fornecedor e a da operação |
| Ordenação da fila | **Cronológica ascendente** por `termo.aceitoEm` (fallback `registerDate`); posição 1 = próximo a acionar | RN004/AD-25: acionamento por substituição em ordem cronológica (isonomia LC 123). O aceite mais antigo é o primeiro da fila |
| Escopo dos editais candidatos | Editais **publicados** (`buscarPorExemplo({situacao:'publicado'})`), filtrados por existência de matriz vigente | No `develop` a distribuição roda em `publicado` e o edital ali permanece (não há máquina AD-37/`em_distribuicao`); a existência da matriz é o portão real |
| Sem alteração de estado | Tela **somente leitura**; a substituição/promoção do 1º da reserva (fluxo A1) **não** é implementada aqui | RN004: "a distribuição anterior permanece intacta". A promoção depende da máquina de estado do edital (fora do develop) — registrado como pendência |
| Unidade ("un/mês") | Exibição via i18n; o domínio guarda apenas o número (teto) | Não há campo de unidade no domínio (idem Distribuição Inteligente) |

## Alterações

### Backend (composição de portas — sem migration)

- **`distribuicao/application/listar-cadastro-reserva.ts`** (novo) — `ListarCadastroReserva.listar()`:
  varre os editais distribuídos (`EditaisComReservaLookup.distribuidos()`), e para cada um com matriz
  vigente (`repo.ultimaDoEdital`) coleta os credenciados `aceito` **sem cota** na matriz; enriquece com
  razão social (`FornecedorRepository`) e sigla da secretaria (`SecretariaLookup`, opcional); ordena a
  fila global por `credenciadoEm` (aceite) e atribui `posicao` 1-based. View `CadastroReservaView`.
- **`distribuicao/adapters/distribuicao-controller.ts`** — nova rota **`GET /gestao/cadastro-reserva`**
  (RBAC `PERFIS_GESTAO` = smga/cpl/administrador), somente leitura.
- **`server.ts`** — wiring: `editaisComReserva` projeta editais publicados do `editaisRepo`; injeta
  `ListarCadastroReserva` no controller. Reusa `credRepo`, `distribuicaoRepo`, `fornecedores`, `secretariaLookup`.

### Frontend

- **`pages/admin/CadastroReserva.tsx`** (novo) — fiel à view `isReserva` do protótipo: cabeçalho, aviso
  "Fila de reserva" e lista numerada (posição · fornecedor · `numero — objeto` · `Cap. {teto} un/mês` ·
  chip "Reserva"). Estados de carregamento/erro/vazio. `data-cy` para o contrato Cypress.
- **`lib/api.ts`** — tipo `CadastroReservaView` + método `cadastroReserva()` → `GET /gestao/cadastro-reserva`.
- **`router.tsx`** — `rAdminCadastroReserva` repontado do placeholder para `CadastroReserva`.
- **i18n** — namespace `admin.reserva.*` nos 3 idiomas (`pt-BR`, `en`, `es`).

### Testes

- **`backend/tests/unit/listar-cadastro-reserva.spec.ts`** (novo, 3 casos): retardatário fora da matriz;
  ignora editais sem matriz e credenciamentos não aceitos; ordena a fila global por data de aceite.
- **`frontend/src/pages/admin/CadastroReserva.test.tsx`** (novo, 4 casos): cabeçalho + aviso; fila
  cronológica com posição/fornecedor/edital/capacidade; estado vazio; erro de carga.

## Evidências (container — DEC-STR-34)

- `docker compose --profile test run --rm backend-test` → **512 passed** | 14 skipped (era 509 → +3).
- `docker compose --profile test run --rm frontend-test` → **144 passed** (era 140 → +4).
- Lint + typecheck incluídos no gate do profile `test`.

## Pendências

- **Fluxo A1 (substituição/promoção)** do 1º da reserva quando um titular descumpre a entrega: depende da
  máquina de estado do edital (AD-37/`em_distribuicao`), fora do `develop`. Fica como evolução futura.
- **Seed de demonstração**: o mock da Receita tem CNPJs limitados, então o cenário reserva ponta-a-ponta
  não é semeável no ambiente atual — coberto por teste unitário (idem `tela-demandas-distribuidas`).
- Commit/PR aguardando o solicitante.
