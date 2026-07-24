---
date: 2026-07-19
sequence: 003
domain: frontend + backend (editais/credenciamento)
action_type: feature
status: logged
---

# Log de Prompt — tela-credenciamento-em-edital

## Prompt Original

> tech lead em uma nova branch vamos implementar agora a tela de "credenciamento"Credenciamento em
> Edital" http://localhost:5173/#/admin/credenciamento, vamos seguir as regras da documentação e o
> layout do @spec/Prototipo/painel-administrativo.html
> (acompanhado de captura de tela da view "Credenciamento em Edital" do painel admin)

---

## Interpretação

### Intenção Principal

Implementar a tela **Painel Admin · "Credenciamento em Edital"** (`/admin/credenciamento`), hoje um
placeholder `EmConstrucao`, fiel à view `isCredenciamento` de `spec/Prototipo/painel-administrativo.html`:
dado um edital aberto, listar os **fornecedores elegíveis** (filtro CNAE — RN001) com pills de
regularidade (RN002) e um badge de situação por fornecedor.

Não confundir com `/credenciamentos` do Portal do Fornecedor (UC004, "Meus Credenciamentos").

### Decisões do solicitante (Tech Lead)

1. **Full-stack com dados reais** — não havia endpoint que produzisse a lista de elegíveis; criado um
   read-model no backend por **composição de portas já existentes** (sem migration).
2. **Badges honestos ao MVP (dois estados de credenciamento)** — `Requerente` (`iniciado`) e
   `Credenciado` (`aceito`); o badge "Fornecedor" do protótipo implica distribuição (Épico 5,
   `distribuidoEm` sempre null no develop) e fica fora. Elegível sem adesão recebe badge neutro `Elegível`.

### Placeholders honestos

- **PGM × SICAF:** o domínio tem uma única fonte de inadimplência (DividaGateway → bloqueios); as duas
  pills refletem o mesmo sinal `regular` (ausência de bloqueio ativo — RN002).
- **Capacidade:** declarada por edital no credenciamento (RN005) — só aparece quando há credenciamento;
  senão "Capacidade não declarada".

## Rastreabilidade

- Backend: `backend/src/editais/application/listar-elegiveis-edital.ts` (+ rota em
  `editais-gestao-controller.ts`, wiring em `server.ts`); testes `tests/unit/listar-elegiveis-edital.spec.ts`
  e `tests/integration/elegiveis-edital-rotas.spec.ts`.
- Frontend: `frontend/src/pages/admin/CredenciamentoEmEdital.tsx` (+ rota em `router.tsx`, método
  `editaisElegiveis` em `lib/api.ts`, i18n nos 3 locales); teste `CredenciamentoEmEdital.test.tsx`.
- Gate em container (DEC-STR-34): backend 498 ✓ / frontend 131 ✓ (lint + typecheck + test).

## Segurança

Sem segredos, credenciais ou PII no prompt ou no diff. RBAC do endpoint reusa `PERFIS_GESTAO`
(`smga`/`cpl`/`administrador`). Tela somente leitura.
