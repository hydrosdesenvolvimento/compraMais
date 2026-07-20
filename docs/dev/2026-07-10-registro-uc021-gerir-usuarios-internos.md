# Registro técnico — UC021 · Gerir Usuários Internos (Servidores)

**Data:** 2026-07-10 · **Branch:** `feature/uc021-gerir-usuarios-internos` · **Autor:** Senior Developer (orquestrado)
**Rastreabilidade:** UC021 · **RF023** · **RBAC §15** · **RN015** · **AD-35** (reforça AD-20/AD-33/AD-38) · Story 9.7 (Épico 9)

---

## 1. Escopo e decisão

UC021 é a segunda UC do Bloco G (Administração), logo após UC020 (catálogos). Objetivo: **CRUD administrativo
das contas de servidor da Prefeitura** com atribuição de **cargo → papel RBAC**, **reset de senha** e
**inativação lógica** (RN015), distinto do autocadastro do fornecedor (UC001/UC015).

**Decisão-chave — servidores são `Usuario`.** A identidade de login já vive em `shared/identity` (`Usuario`,
emissor do JWT). Modelar servidores num cadastro paralelo criaria duas fontes de verdade sobre "quem loga".
Portanto UC021 **estende `shared/identity`** em vez de criar um módulo novo.

| Decisão | Escolha | Justificativa |
|---|---|---|
| Cargo parametrizável (RF023) | **Mapa canônico fixo** cargo→papel (`cargos-internos.ts`), exposto em `/admin/cargos` | O **papel** é o invariante (AD-35); "permissões seguem o papel" (Story 9.7). CRUD de cargos totalmente editável = follow-up |
| Reset de senha | Admin **define nova senha** direta; usuário troca via UC015 | UC021: "resetar a senha do usuário (o usuário troca a própria em UC015)" |
| `Papel` enum | Estendido: `+administrador, +auditor, +dpo` | Os controllers de auditoria/malote/painéis já autorizam nesses `x-papel`; alinha o enum ao RBAC efetivo |
| Inativação (RN015) | Adicionada ao `Usuario` (`ativo`) + **login rejeita inativo** + guard anti-lockout | Servidor desligado não acessa, mas o histórico/autoria fica (AD-38) |

---

## 2. Implementação (backend — `shared/identity`)

- **Domínio**
  - `identity-provider.ts`: `Papel` estendido; helpers `PAPEIS_INTERNOS`, `ehPapelInterno`.
  - `cargos-internos.ts` (novo): `CARGO_PARA_PAPEL` (administrador→`administrador`, analista_cpl/coordenador_cpl→`cpl`,
    secretario/gestor→`smga`, auditor→`auditor`, dpo→`dpo`), `papelDoCargo` (→ `CargoInvalido`), `catalogoDeCargos`.
  - `usuario.ts`: campos `ativo`/`cargo` no snapshot (`UsuarioState`), getters, e mutações `renomear`,
    `definirCargoEPapel`, `inativar`/`reativar` (idempotentes). `nome`/`papel` viraram getters (mutáveis pela edição).
- **Application** — `gerir-usuarios-internos.ts` (novo): `GerirUsuariosInternos.criar/editar/resetarSenha/inativar/reativar/listar`.
  Regras: unicidade de e-mail (reusa `EmailJaCadastrado`), cargo válido, `exigirInterno` (404 `UsuarioNaoEncontrado`
  / 404 `NaoEUsuarioInterno` p/ alvo fornecedor), guard `NaoPodeInativarPropriaConta`. View de leitura **sem segredos**.
- **Eventos** (`identity/eventos.ts`) — `UsuarioInternoCriado/Editado`, `UsuarioSenhaResetada`,
  `UsuarioInternoInativado/Reativado`; registrados no `AuditConsumer` (AD-18, tabela `auditoria`).
- **Adapters**
  - `usuario-repository.ts` / `-pg.ts`: porta `listarInternos({incluirInativos})` (memory + pg; pg filtra
    `papel NOT IN ('titular','procurador')` + `ativo`).
  - `usuarios-internos-controller.ts` (novo): `/admin/usuarios` (GET/POST/PATCH + `/resetar-senha` `/inativar` `/reativar`)
    e `/admin/cargos`. **Todas exigem `x-papel: administrador`** (403 sem). Mapeamento de erro: 409 (EmailJaCadastrado /
    NaoPodeInativarPropriaConta), 404 (UsuarioNaoEncontrado / NaoEUsuarioInterno), 422 (CargoInvalido / SenhaFraca / EmailInvalido).
  - `autenticacao.ts`: `AutenticarLocal` rejeita **usuário inativo** (mensagem genérica — sem enumeração).
- **Migração `0012_usuarios_ativo_cargo.sql`** (aditiva/forward-only): `ADD COLUMN ativo boolean NOT NULL DEFAULT true`,
  `ADD COLUMN cargo text`, índice parcial de servidores internos ativos.
- **Wiring** `server.ts`: `new GerirUsuariosInternos(usuarioRepo, bus)` + `registrarRotasUsuariosInternos`; catálogo de eventos.
- **Seed**: novo `administrador@compramais.local` (papel `administrador`); cargos nos servidores semeados.

## 3. Implementação (frontend)

- `pages/admin/GerirUsuarios.tsx` (novo): form (Nome/E-mail/Cargo/Senha), lista com papel efetivo, reset de senha inline,
  inativar/reativar, toggle "mostrar inativos". `data-cy` no padrão do contrato de testes.
- `lib/api.ts`: `cargos`, `usuariosListar`, `usuarioCriar/Editar/ResetarSenha/Inativar/Reativar` + tipos.
- `router.tsx`: rota `/admin/usuarios` + item de nav `common.nav.usuarios`.
- **i18n** pt-BR/en/es: `admin.usuarios.*` (+ rótulos de cargo) e `common.nav.usuarios` (DEC-STR-33).

---

## 4. Validação

**Gate no container (DEC-STR-34) — verde:**
- Backend: **273 testes** (+18: `tests/unit/usuarios-internos.spec.ts` + `tests/integration/usuarios-internos-rotas.spec.ts`), lint + typecheck ok.
- Frontend: **27 testes** (+3: `GerirUsuarios.test.tsx`), lint + typecheck + build ok.

**Live contra Postgres real (`--profile dev`, RECEITA_PROVIDER=mock):**
- Migração 0012 aplicada; colunas `ativo`/`cargo` + índice parcial presentes.
- Criar servidor → **papel derivado do cargo** (analista_cpl→`cpl`); RBAC não-admin **403**; e-mail duplicado **409**.
- Editar cargo→`auditor` reflete `papel=auditor`; reset de senha → **login 200** com a nova senha.
- **RN015**: inativar some do default, persiste em `?incluirInativos=true`, **login do inativo → 401**; reativar volta.
- Guard anti-lockout: admin inativando a própria conta → **409**.
- **Durabilidade**: servidor inativado **sobrevive ao restart** do backend (ativo=false, papel/cargo preservados).
- Trilha AD-18: eventos `UsuarioInterno*` registrados no `AuditConsumer` (tabela `auditoria`; emissão coberta por unit test).

---

## 5. Fora de escopo (follow-up)

- **Cargos totalmente parametrizáveis** (CRUD editável pelo Administrador, no estilo UC020) — hoje o mapa cargo→papel é
  canônico e fixo; o papel permanece o invariante (AD-35).
- **MFA** (diferido, como em UC015) e fluxo de reset por **link/e-mail** para servidores (gateway de e-mail = LAC-07).
- **Edição de e-mail** do servidor (hoje imutável após criação, evita divergência de chave de login) — avaliar se necessário.
- E2E Cypress do Painel Admin de usuários (QA/CI).
