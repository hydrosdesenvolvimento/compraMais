# Registro técnico — UC020 · Manter Catálogos Base (RF020/RF021/RF022 · RN015)

**Data:** 2026-07-09 · **Branch:** `feature/uc020-manter-catalogos-base` (base `develop`, DEC-STR-32)
**Autor:** Senior Developer (orquestração Tech Lead) · **UC:** [UC020](../../spec/docs/casos-de-uso.md#L311)
**Rastreabilidade:** RF020, RF021, RF022 · RN015 · AD-16, AD-18, AD-28, AD-32, AD-33 · Épico 8 (Admin)

---

## Contexto e desvio da demanda original

A demanda entrou como "implementar **UC008**". Diagnóstico bloqueou: **UC008 = Épico 5 (Motor de
Distribuição)** está **explicitamente bloqueado** até a ratificação de **Item × Lote (SMGA/TCE)**
([index.md](../../spec/docs/index.md#L53), [epics.md](../../spec/docs/epics.md#L339),
[casos-de-uso.md](../../spec/docs/casos-de-uso.md#L216) — *"Não iniciar suas histórias antes disso"*).
Diferente de UC002/UC003/UC005/UC016 (que chegaram ~80% prontas no commit hexagonal em massa), **não há
módulo `distribuicao/`** — UC008 é greenfield **e** bloqueado. O solicitante optou por implementar uma UC
desbloqueada; entre as candidatas (UC020 / UC021 / UC010) escolheu **UC020**, que tem a maior alavancagem:
desbloqueia lacunas já sinalizadas em UC005 (catálogo de Secretarias) e UC003 (nome da secretaria na
vitrine), e é a base de RF002/RF004 (Tipos de Documento).

## Escopo entregue

Módulo novo `backend/src/catalogos/` — "uma jornada, três catálogos" (RF020 Secretarias, RF021
Setores/CNAE, RF022 Tipos de Documento). CRUD completo com **inativação lógica (RN015)**, unicidade de
chave natural, RBAC de Administrador nas escritas, durabilidade em Postgres e tela no Painel Admin (i18n
3 idiomas). **Não** cria fornecedores nem usuários (UC001/UC021) e **não** toca o Motor (Épico 5).

## Arquitetura (Clean/Hexagonal — AD-32/AD-33)

- **Domínio** (`domain/`):
  - `item-catalogo.ts` — base abstrata `ItemCatalogo extends EntidadeBase` que concentra a regra
    transversal de inativação lógica (`inativar()/reativar()` idempotentes, RN015), a chave natural
    (`chave()`, normalizada case-insensitive) e o contrato `estado()` (snapshot AD-33). Helpers
    `exigirTexto`/`normalizarChave` e erro `CampoObrigatorio`.
  - `secretaria.ts` (chave = **sigla**), `setor-cnae.ts` (chave = **código**, valida subclasse CNAE de
    7 dígitos — RF003/RN001), `tipo-documento.ts` (chave = **nome**; `formato`, `categoria`
    cadastral|fiscal|contratual — retenção RN015/UC017, `exigeValidade` — RF009/UC013, `exigeExercicio`
    — Balanço/RN006). Cada entidade tem `criar`/`deEstado`/`estado`/`editar` (diff antes/depois).
  - `eventos.ts` — 4 eventos genéricos com discriminador `catalogo`: `CatalogoItemCriado/Editado/
    Inativado/Reativado` (trilha AD-18).
- **Application** (`application/`):
  - `catalogo-repository.ts` — porta genérica `CatalogoRepository<T>` (`salvar/porId/porChave/listar`).
  - `manter-catalogos.ts` — serviço genérico `CrudCatalogo<T,TCriar,TEditar>` (id, **unicidade**
    `exigirChaveLivre`, inativação lógica, publicação de eventos) + `CatalogoDef` (cada catálogo conhece
    seu `criar`/`aplicarEdicao`) + fachada `ManterCatalogos` compondo os três. Erros `ChaveDuplicada`
    (RN015 "duplicidade → bloqueado") e `ItemCatalogoNaoEncontrado`.
- **Adapters** (`adapters/`):
  - `catalogo-repository-memory.ts` — memória genérica (testes sem banco).
  - `catalogo-repository-pg.ts` — base `CatalogoPgBase<T>` (SQL parametrizado; `tabela`/`chaveCol` são
    constantes internas, sem injeção; converte violação 23505 em `ChavePgDuplicada` como salvaguarda de
    corrida) + `SecretariaRepositoryPg`/`SetorCnaeRepositoryPg`/`TipoDocumentoRepositoryPg`.
  - `catalogos-controller.ts` — um conjunto de rotas parametrizado por `:catalogo`
    (`secretarias`|`setores-cnae`|`tipos-documento`). Escritas exigem `x-papel: administrador` (403 sem);
    **leitura aberta** (dado de referência consumido por editais/upload). Mapeamento de erros:
    404 (não encontrado / catálogo desconhecido), 409 (chave duplicada), 422 (validação de domínio).
- **Migração** `migrations/0011_init_catalogos.sql` — tabelas `secretarias`, `setores_cnae`,
  `tipos_documento` com índice único **global** case-insensitive por chave (`lower(...)`). Forward-only
  (AD-28). Unicidade global = reusar código ⇒ **reativar** o item existente, não recriar.
- **Wiring** (`server.ts`) — `pool ? *RepositoryPg : CatalogoRepositoryMemory<T>` (padrão dos fixes
  0004..0010) + registro dos 4 eventos no `AuditConsumer`.

### Frontend

- `pages/admin/ManterCatalogos.tsx` — página do Painel Admin config-driven (3 abas), formulário dinâmico
  por catálogo, listagem com toggle "mostrar inativos" e ações inativar/reativar (Query/Mutations com
  invalidação). `data-cy` para o contrato de testes.
- `lib/api.ts` — `catalogoListar/Criar/Editar/Inativar/Reativar` (envia `x-papel` da sessão).
- `router.tsx` — rota `/admin/catalogos` + item de nav `common.nav.catalogos`.
- **i18n** — `common.nav.catalogos` + bloco `admin.catalogos.*` preenchidos em **pt-BR, en e es**
  (DEC-STR-33). Backend responde em inglês; `codigo` estável (DEC-STR-33).

## Decisões de projeto

- **Chave imutável? Não** — todos os campos (incl. a chave) são editáveis; a unicidade é re-checada na
  edição (`exigirChaveLivre` sempre). Robustez adicional: o pg mapeia 23505 → `ChaveDuplicada`.
- **Unicidade global (ativos + inativos)**, case-insensitive — coerente com o espírito append-only da
  RN015 (reativar em vez de recriar). Registrado na migração.
- **Leitura aberta** das listas: são dados de referência consumidos por outros fluxos (editais =
  Secretaria/Gestor; upload = fornecedor). Só as **escritas** são restritas ao Administrador.
- **CNAE 7 dígitos** no catálogo (RF021) reaproveita a mesma regra do match da vitrine (RF003/RN001).
- **`Papel` de login não muda** — o RBAC usa o header `x-papel` (papel efetivo, RBAC §15), como
  auditoria/malote/paineis. Criar usuários com papel `administrador` é UC021 (fora deste escopo).

## Evidências (DEC-STR-34 — no container)

- **Backend gate** (`docker compose --profile test run --rm --build backend-test`): lint + typecheck +
  test **verdes — 50 arquivos / 255 testes** (+22: `unit/catalogo.spec.ts`, `integration/catalogos.spec.ts`,
  `integration/catalogos-rotas.spec.ts`).
- **Frontend gate** (`frontend-test`): lint + typecheck + test **verdes — 8 arquivos / 24 testes**
  (+3: `admin/ManterCatalogos.test.tsx`).
- **Validação live** contra Postgres real (`--profile dev`):
  - migração `0011_init_catalogos.sql` aplicada no boot (registrada em `schema_migrations`);
  - criar secretaria/setor/tipo-doc (201); **RBAC** não-admin → **403**; sigla duplicada → **409**;
  - **durabilidade**: secretaria **sobrevive ao restart** do backend (SME, ativo);
  - **RN015**: inativar → some do default (`ativos=0`), persiste em `?incluirInativos=true`
    (`situacao=inativo`); reativar → volta às listas;
  - **trilha AD-18**: `CatalogoItemCriado×3`, `CatalogoItemInativado×1`, `CatalogoItemReativado×1`.

## Fora de escopo / próximos passos

- **Integrar o catálogo aos consumidores**: editais passarem a referenciar `secretariaId` do catálogo
  (dropdown), vitrine exibir o nome da secretaria (UC003), upload/covalidação listar Tipos de Documento.
  Este UC **entrega o catálogo**; a fiação nos consumidores é incremento seguinte.
- **E2E Cypress** de `/admin/catalogos` (QA/CI).
- **UC008/Épico 5** segue bloqueado (Item × Lote).
