# Registro técnico — Tela "Secretarias" (RF020 / AD-16)

**Data:** 2026-07-18 · **Escopo:** Painel Admin → tela dedicada de Secretarias (unidades demandantes),
fiel a `spec/Prototipo/painel-administrativo.html` e às telas de referência fornecidas.

## Objetivo

Substituir o placeholder `EmConstrucao` da rota `/admin/secretarias` por uma tela dedicada de CRUD, no
mesmo padrão da "Gestão de Fornecedores": lista (Sigla · Nome · Responsável · Contato · Status · Ações),
botão **Novo cadastro** e **modal único** de criar/editar. Exclusão é lógica (RN015): o botão de energia
alterna ativar/inativar; nada é apagado.

## Divergência resolvida (arbitragem)

O protótipo/telas incluem a coluna **Contato** (`{{ s.contato }}`) e o campo **E-mail de contato** no
modal, ausentes no domínio `Secretaria` (só `sigla/nome/responsavel/situacao`). Decisão do solicitante:
**full-stack — adicionar `contato`**. Optou-se por torná-lo **opcional no domínio** (e-mail validado
quando informado) para não quebrar a jornada UC020 (`ManterCatalogos`, que não envia contato) nem os
registros já existentes; a **tela dedicada exige** o campo no formulário (validação de UX). Situação segue
`ativo | inativo` — o texto "Inativo/Bloqueado" do aviso é informativo (reaproveitado do padrão).

## Alterações

### Backend
- `catalogos/domain/item-catalogo.ts`: `EmailInvalido` + helper `emailOpcional()` (trim+lower; formato
  simples; vazio → `undefined`; inválido → 422 via `falha()`).
- `catalogos/domain/secretaria.ts`: campo `_contato?` no estado, `criar`, `deEstado`, `estado`, getter e
  `editar` (com diff auditado; `''` limpa o contato).
- `catalogos/application/manter-catalogos.ts`: `CriarSecretaria`/`EditarSecretaria` com `contato?`.
- `migrations/0019_secretarias_contato.sql`: `ALTER TABLE secretarias ADD COLUMN IF NOT EXISTS contato text`
  (nullable, forward-only AD-28).
- `catalogos/adapters/catalogo-repository-pg.ts`: `SecretariaRepositoryPg` upsert/mapear com `contato`.
- Controller e repo em memória são genéricos (serializam `estado()`) — sem alteração.

### Frontend
- `lib/api.ts`: `CatalogoItemView.contato?`.
- `design-system/icons.tsx`: `IconePower` (alternar situação).
- `pages/admin/Secretarias.tsx`: tela + modal inline (criar/editar), reusa `catalogoListar/Criar/Editar/
  Inativar/Reativar` com slug `secretarias`; lista inclui inativos (protótipo mostra ativas e inativas).
- `router.tsx`: `/admin/secretarias` → componente `Secretarias` (removido o `EmConstrucao` da rota).
- i18n `admin.secretarias.*` nos três idiomas (pt-BR/en/es).

## Testes (gate em container — DEC-STR-34)
- `frontend-test`: lint 0 erros, typecheck OK, **94 testes** (inclui `Secretarias.test.tsx`: lista+contato,
  criar com contato, editar pré-preenchido, alternar situação).
- `backend-test`: lint + typecheck OK, **450 testes** (inclui `catalogos.spec.ts`: contato normalizado,
  editável e opcional; e-mail inválido → `EmailInvalido`).
