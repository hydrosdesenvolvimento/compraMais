# Log de Prompt — UC011 Consultar Painel Público de Transparência

- **Data:** 2026-07-10
- **Sequência do dia:** 003
- **Branch:** `feature/uc011-painel-publico-transparencia` (a partir de `develop`)
- **Skill:** prompt-logger (DEC-STR-16)

## Prompt original (sanitizado)

> "Vamos implemenar a UC011 do @spec/docs/casos-de-uso.md em uma nova branch"

Sem segredos, credenciais, tokens ou PII no prompt — nenhuma sanitização necessária.

## Interpretação semântica

O usuário pediu para implementar o **UC011 (Consultar Painel Público de Transparência)** em nova branch.
UC011 pertence ao **Épico 9 (Painéis — Admin e Transparência Pública), Story 9.2** — priorização
**Should**, **não bloqueado**. A branch foi criada a partir de `develop` (Gitflow).

## Divergência resolvida (governança)

O UC011 lista no fluxo principal "**montantes por setor**", mas a **RN013 (PRD v2.4)** e o critério de
aceite refinado da **Story 9.2** são explícitos: o portal expõe **apenas agregados não-identificáveis**
— editais vigentes (contagem), secretarias e segmentos (CNAE) — e **não** expõe fornecedores, **valores**
nem PII (evita reidentificação em segmentos pequenos). Pela regra do próprio `casos-de-uso.md`
("quando houver divergência… o **PRD arbitra**"), **valores monetários ficam fora do contrato**. A
entrega segue a RN013.

## Estado atual (gap analysis)

O módulo `backend/src/paineis/` e a página `frontend/.../publico/Transparencia.tsx` já existiam desde o
commit hexagonal em massa (`8d7b472`, "features 001–07"), com um contrato mínimo. **Gaps vs. UC011:**

- A rota expunha `secretariaId` **cru (UUID interno)** como "secretaria atendida" — contra o espírito
  não-identificável da RN013 e ruim para o cidadão.
- **Sem o fluxo alternativo A1** — filtro básico por período.
- Sem eco do período aplicado; agregados sem ordenação estável.
- Testes finos (só estrutura), sem cobrir resolução de sigla nem filtro.

## Entrega (resumo)

Backend: `Transparencia.publico(filtro?)` com filtro por período (A1) validado/normalizado e cálculo
**sob demanda** (RN013); fonte resolve `secretariaId → sigla`; rota `GET /transparencia?de&ate`.
Frontend: filtro de período (dois inputs de data + aplicar/limpar) i18n (pt-BR/en/es); testes de
componente; Cypress `transparencia.cy.ts`. Detalhes em
[docs/dev/2026-07-10-registro-uc011-painel-publico-transparencia.md](../dev/2026-07-10-registro-uc011-painel-publico-transparencia.md).

## Validação

Gate em container (DEC-STR-34): `docker compose --profile test run --rm backend-test` (lint + typecheck
+ **305 testes** ✓) e `frontend-test` (lint + typecheck + **34 testes** ✓).
