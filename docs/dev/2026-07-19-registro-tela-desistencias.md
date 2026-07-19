# Registro Técnico — Tela "Desistências" (Painel Admin · Operação)

- **Data:** 2026-07-19
- **Branch:** `feature/tela-desistencias` (base `develop`)
- **UC/Rastreabilidade:** UC009 (Gerir Cadastro de Reserva — Segunda Demanda), fluxo **A1 — Substituição** · RF006 · RN004 (saída da distribuição só por substituição de desistente) · AD-25 (acionamento do próximo da reserva em ordem cronológica) · Story 5.4 (Substituição de desistente)
- **Ator principal:** SMGA / CPL (operação)
- **Escopo:** **full-stack** — read-model + HTTP + 1 tela frontend + i18n (3 idiomas) + testes. **Sem migration** (composição de portas já existentes dos módulos `distribuicao` e `credenciamento`).

## Contexto

A rota `/admin/desistencias` era um placeholder (`<EmConstrucao tituloKey="common.nav.desistencias" />`).
O protótipo `spec/Prototipo/painel-administrativo.html` (view `isDesistencias`) especifica a tela: cabeçalho
("Operação · Desistências" + "Registro de fornecedores que declinaram de cotas atribuídas") e um **estado
vazio azul** (círculo com _check_) explicando a regra: _"Quando um fornecedor titular declinar de uma cota,
o registro aparece aqui e o próximo da fila de reserva é acionado automaticamente."_ O protótipo mostra
**apenas o estado vazio** — não há linha populada especificada.

A tela é o **espelho** do Cadastro de Reserva ([`2026-07-19-registro-tela-cadastro-reserva.md`](2026-07-19-registro-tela-cadastro-reserva.md)):
enquanto a reserva estrutura os **retardatários** (aptos que ficaram **fora** da matriz), Desistências é o
registro auditável dos **titulares que saíram** (estavam **na** matriz e declinaram a cota).

### Achado decisivo (honestidade de escopo)

No `develop` **não existe** persistência de desistência, e isso é **por design do domínio**:
`Credenciamento.cancelar()` lança `CredenciamentoJaDistribuido` quando `distribuidoEm !== null`
(RN016/RN004 — após a distribuição a saída é por substituição, ainda não implementada / Story 5.4).
Ou seja, **hoje um titular distribuído não pode desistir**, e a lista nasce legitimamente **vazia** —
exatamente o estado que o protótipo mostra. A opção adotada **não** é um _stub_ de tela: é um read-model
**real** que passa a listar automaticamente assim que o fluxo de substituição/desistência existir.

## Decisões (Tech Lead)

| Tema | Decisão | Motivo |
|---|---|---|
| Definição de "desistência" | Fornecedor com **cota > 0** na matriz vigente do edital cujo credenciamento **não está mais `aceito`** (ex.: `cancelado`) | Espelho exato da reserva (que é `aceito` **sem** cota); regra computável e coerente com a 2ª Demanda (UC009/RN004) |
| Fonte dos editais candidatos | Mesmo `EditaisComReservaLookup` da reserva (editais **publicados** com matriz vigente) | Reuso; a existência de matriz é o portão real (o `develop` não tem a máquina AD-37/`em_distribuicao`) |
| Ordenação | **Cronológica decrescente** por `desistiuEm` (`updateDate` do credenciamento, fallback `registerDate`) | Registro de auditoria: a desistência mais recente aparece primeiro |
| Somente leitura | Tela **não** aciona a promoção do 1º da reserva (fluxo A1) | RN004: o acionamento depende da máquina de estado do edital (fora do develop) — pendência registrada |
| Estado vazio fiel | Reproduz o card azul do protótipo (círculo `azul-50`/`azul-600` + _check_) | Layout como fonte de verdade |
| Chip da linha populada | `Desistência` em tom **erro** (`--erro-bg`/`--erro-700`) | O protótipo só especifica o vazio; escolha consistente com o Design System para diferenciar do chip âmbar "Reserva" |
| Unidade ("un/mês") | Exibição via i18n; o domínio guarda apenas o número (cota) | Não há campo de unidade no domínio (idem Reserva/Distribuição) |

## Alterações

### Backend (composição de portas — sem migration)

- **`distribuicao/application/listar-desistencias.ts`** (novo) — `ListarDesistencias.listar()`: varre os
  editais distribuídos (reusa `EditaisComReservaLookup`), e para cada um com matriz vigente coleta os
  fornecedores com **cota > 0** cujo credenciamento **não é `aceito`**; enriquece com razão social
  (`FornecedorRepository`) e sigla da secretaria (`SecretariaLookup`, opcional); ordena por `desistiuEm`
  decrescente. View `DesistenciaView` (`fornecedorId`, `nome`, `editalId`, `numero`, `objeto`,
  `secretariaSigla`, `cota`, `desistiuEm`).
- **`distribuicao/adapters/distribuicao-controller.ts`** — nova rota **`GET /gestao/desistencias`**
  (RBAC `PERFIS_GESTAO` = smga/cpl/administrador), somente leitura.
- **`server.ts`** — wiring: `ListarDesistencias` reusa `editaisComReserva`, `credRepo`, `distribuicaoRepo`,
  `fornecedores` e `secretariaLookup`; injetado no controller.

### Frontend

- **`pages/admin/Desistencias.tsx`** (novo) — fiel à view `isDesistencias`: cabeçalho + estado vazio azul.
  Linha populada (não especificada no protótipo): fornecedor · `numero — objeto` · `Cota {cota} un/mês` ·
  chip "Desistência". Estados de carregamento/erro/vazio. `data-cy` para o contrato Cypress
  (`admin-desistencias`, `linha-desistencia`, `vazio`, `erro`, `carregando`).
- **`lib/api.ts`** — tipo `DesistenciaView` + método `desistencias()` → `GET /gestao/desistencias`.
- **`router.tsx`** — `rAdminDesistencias` repontado do placeholder para `Desistencias`; import de
  `EmConstrucao` removido (era o último consumidor no router — o componente stub permanece no repo).
- **i18n** — namespace `admin.desistencias.*` nos 3 idiomas (`pt-BR`, `en`, `es`).

### Testes

- **`backend/tests/unit/listar-desistencias.spec.ts`** (novo, 3 casos): titular na matriz que declinou é
  listado; ignora cancelado **sem** cota (retardatário) e edital sem matriz; ordena por data decrescente.
- **`frontend/src/pages/admin/Desistencias.test.tsx`** (novo, 4 casos): cabeçalho; linha com fornecedor/
  edital/cota/chip; estado vazio ("Nenhuma desistência registrada"); erro de carga.

## Evidências (container — DEC-STR-34)

- `docker compose --profile test run --rm --build backend-test` → **515 passed** | 14 skipped (era 512 → +3).
- `docker compose --profile test run --rm --build frontend-test` → **148 passed** (era 144 → +4).
- Lint + typecheck incluídos no gate do profile `test`.

## Pendências

- **Fluxo A1 (substituição/promoção)**: registrar a desistência de um titular distribuído e acionar o 1º da
  reserva depende da máquina de estado do edital (AD-37/`em_distribuicao`) e da flexibilização de
  `Credenciamento.cancelar` pós-distribuição — fora do `develop`. Até lá, a lista permanece vazia (correto).
- **Seed de demonstração**: como a desistência pós-distribuição é bloqueada pelo domínio, o cenário populado
  não é semeável no ambiente atual — coberto por teste unitário (idem `tela-cadastro-reserva`).
- Commit/PR aguardando o solicitante.
