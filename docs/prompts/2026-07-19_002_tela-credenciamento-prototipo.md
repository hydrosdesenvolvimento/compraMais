---
date: 2026-07-19
sequence: 002
domain: frontend + backend (credenciamento)
action_type: adaptar / feature
status: logged
---

# Log de Prompt — tela-credenciamento-prototipo

## Prompt Original

> @tech-lead em uma nova branch vamos implementar a tela de 'Credenciamento' (Meus credenciamentos
> no html), seguindo as regras que temos na documentação do sistema e o layout do
> @spec/Prototipo/portal-fornecedor.html
> (acompanhado de captura de tela da "Meus Credenciamentos" do protótipo)

---

## Interpretação

### Intenção Principal

Re-adaptar a tela `/credenciamentos` ("Meus Credenciamentos", UC004) do Portal do Fornecedor ao
**novo** protótipo `spec/Prototipo/portal-fornecedor.html`, em nova branch Gitflow. A tela já
existia (`frontend/src/pages/publico/MeusCredenciamentos.tsx`) mas fora construída sobre o protótipo
**antigo** `spec/AI-UI-Design/portal-fornecedor.html` (diretório já removido) — junto de `Editais`,
era um dos dois retardatários do "nivelamento spec/código" (ver
[backlog](../dev/2026-07-17-backlog-nivelamento-spec-codigo.md)).

### Deltas do novo protótipo (captura de tela)

1. Subtítulo do objeto passa a mostrar `SIGLA · Etapa n/N` (ex.: "SEMSA · Etapa 3/5").
2. **Finalizado** ganha ação **"Visualizar →"** (antes: sem ação primária).
3. `×` de cancelar aparece **só em "Em andamento"** (antes: em todos os não-cancelados).

### Divergências protótipo × domínio (arbitragem do Tech Lead)

Duas exigem decisão porque o domínio não as sustenta como estão desenhadas:

- **"Etapa n/N":** o agregado só persistia o **estado** (`iniciado/aceito/cancelado`), não o passo do
  wizard. **Decisão: persistir o passo no backend.** Total de passos = **4** (Capacidade → Documentos
  → Termo → Concluído), não 5 — a prova de vida/UC007 é R2, fora do MVP. Divergência "/5 → /4"
  registrada.
- **"Visualizar":** não havia tela/rota de detalhe. **Decisão: criar tela de detalhe read-only.** O
  protótipo prevê a ação mas não desenha a tela — layout segue o Design System.

> Observação: a extração automatizada do HTML (bundle codificado) reportou um vocabulário de status
> mais rico ("Requerente/Credenciado/Suspenso"). **Descartado** — a captura de tela (fonte
> autoritativa) mostra apenas os 3 estados do domínio (Em andamento / Finalizado / Cancelado).

---

## Execução (resumo)

- Backend: agregado `Credenciamento` ganhou `passoAtual` + `registrarPasso()`; migration `0024`
  (`passo_atual smallint NOT NULL DEFAULT 1`, backfill `aceito→4`); read model `ListarCredenciamentos`
  expõe `passoAtual`/`totalPassos`; novo `DetalharCredenciamento` + `GET /credenciamentos/:id`;
  `PATCH /credenciamentos/:id/passo`.
- Frontend: wizard `Credenciamento.tsx` reporta o passo ao navegar (best-effort); lista
  `MeusCredenciamentos.tsx` com subtítulo `SIGLA · Etapa n/N`, ação "Visualizar", `×` só em andamento;
  nova tela `CredenciamentoDetalhe.tsx` + rota `/credenciamentos/$id`; i18n (pt-BR/en/es).
- Testes: unit do domínio, integração do read model e das rotas, componentes da lista/detalhe/wizard,
  e stub do PATCH no e2e Cypress. Gate em container verde (backend 488 ✓ / frontend 124 ✓).

Rastreabilidade completa: [registro técnico](../dev/2026-07-19-registro-tela-credenciamento.md).
