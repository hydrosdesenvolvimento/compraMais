---
date: 2026-07-17
sequence: 001
domain: backend + frontend (transversal — identidade/RBAC)
action_type: alinhar / corrigir
status: logged
---

# Log de Prompt — alinhar-implementacao-spec-fase2-ad20

## Prompt Original

> @tech-lead realizei a atualização na documentação do projeto a nova documentação está na pasta spec. Alinhe as implemetações com a documentação

---

## Interpretação

### Intenção Principal

Alinhar o código (`backend/`, `frontend/`) à nova documentação canônica em `spec/docs/`, que passou a
ser fonte de verdade. O pedido é amplo por natureza ("as implementações" × "a documentação"), então o
Tech Lead auditou o board inteiro antes de agir e submeteu o sequenciamento ao solicitante.

### Escopo decidido pelo solicitante (AskUserQuestion)

**Bloco Segurança (AD-20 + AD-19)** — escolhido entre 4 opções (as outras: só Fase 2; Épico 5/Motor;
Paleta 9.3). Motivo: o CI estava vermelho de propósito e havia bypass de autenticação em produção.

Este log cobre a **primeira metade entregue: AD-20**. O AD-19 segue no mesmo bloco.

### Entidades Identificadas

| Entidade | Tipo | Relevância |
|---|---|---|
| `spec/docs/architecture/ARCHITECTURE-SPINE.md` | Espinha (39 ADs) | Fonte de verdade da arquitetura; AD-20 exige JWT HS256 |
| `backend/tests/integration/rbac-identidade-jwt.spec.ts` | Teste vermelho (Fase 2) | Contrato de aceite: 12 casos abertos em `c648b57` |
| `backend/src/shared/http/autenticacao.ts` | Código novo | Camada de identidade transversal criada nesta entrega |
| `spec/docs/ARBITRAGEM-01.md` | Ofício respondido | Destrava Épico 5, fixa paleta; não afeta AD-20 |
| `.github/agents/memoria/*` | Memória do pacote | DEC-STR-34 (testes em container), DEC-STR-33 (i18n) |

### Riscos sinalizados

- **Blast radius alto:** 14 controllers e 22 arquivos de teste dependiam do modelo de header.
- **Testes verdes afirmando o defeito:** `rbac-auditoria.spec.ts` exigia 200 para `x-papel: auditor`
  sem token. Foi **atualizado, não apagado** (instrução explícita do commit que abriu a Fase 2).
- **Regressão de acesso:** ao fechar o bypass, qualquer conta de servidor sem login funcional perde
  acesso ao Painel Admin. Ver achado sobre o seed/volume de dev no registro técnico.

### Sanitização

Nenhum segredo no prompt. As credenciais citadas no registro técnico (`admin@compramais.local` /
`admin12345`) são **seed público de desenvolvimento**, versionado em `backend/src/shared/db/seed.ts`,
sem valor fora do ambiente local. Nenhum token emitido durante a validação foi persistido.

---

## Plano de Ação

1. Auditar spec × código nos 3 eixos (ADs, UC/RF, UX) — 3 agents em paralelo. ✅
2. Submeter sequenciamento ao solicitante. ✅ → Bloco Segurança
3. AD-20: camada `shared/http/autenticacao.ts` + migração dos 14 controllers (5 sub-devs paralelos). ✅
4. Validar no container (DEC-STR-34) e **live contra Postgres real**, repetindo o ataque original. ✅
5. AD-19: consentimento no-op, documentos/PII em memória, cifra base64 → pendente.
