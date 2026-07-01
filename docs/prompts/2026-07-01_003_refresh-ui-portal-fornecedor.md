# Prompt Log — Refresh de UI do Portal do Fornecedor

- **Data:** 2026-07-01
- **Agente de entrada:** Tech Lead (orquestrando Senior Developers em paralelo)
- **Skill acionada:** prompt-logger (registro obrigatório do pacote)

## Prompt do solicitante (verbatim)

> @tech-lead spec/AI-UI-Design/Compra Mais - Portal do Fornecedor .html apresenta o layout atualizado da aplicação, atualize o aplicação a partir dele

(Precedido de: "load instructions and agents in project".)

## Interpretação

Atualizar o frontend (`frontend/`) para reproduzir fielmente o layout do mockup
`spec/AI-UI-Design/Compra Mais - Portal do Fornecedor .html` (design compilado navy + âmbar, Poppins).

## Decisões de escopo confirmadas com o solicitante (AskUserQuestion)

1. **Fidelidade:** Rebuild fiel por tela.
2. **Abrangência:** Portal do Fornecedor + consistência visual no Admin.
3. **Onboarding:** Incluir todos os fluxos (cadastro, login, declaração de capacidade,
   documentos exigidos, prova de vida facial, "credenciamento enviado").

## Plano de ação executado

1. Extração da marcação/CSS ground-truth do mockup (13 telas) para arquivos de referência.
2. Reescrita da foundation compartilhada: `index.css` (tokens + shell `cm-*` + aliases legados),
   `AppShell`, `AuthLayout`, `AuthPanel`, `icons`.
3. Delegação paralela (7 sub-devs) das telas de conteúdo, cada uma com o markup exato e o
   contrato de `data-cy` a preservar.
4. Integração no `router.tsx` (rotas novas `/inicio` e `/credenciamento`) + consistência no Admin.
5. Validação: `tsc` (0 erros), `eslint` (0), `vitest` (4/4), `vite build` (ok). E2E Cypress
   pendente de execução real (QA/CI); contrato de seletores verificado como preservado.

## Sanitização

Nenhum segredo, credencial, token ou PII presente no prompt ou nos artefatos. Sem necessidade de
mascaramento adicional.
