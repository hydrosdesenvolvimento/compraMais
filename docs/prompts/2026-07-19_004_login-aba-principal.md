---
date: 2026-07-19
sequence: 004
domain: frontend (auth)
action_type: ajuste de comportamento
status: logged
---

# Log de Prompt — login como aba principal do AuthPanel

## Prompt Original

> Tech lead nessa mesma branch altere um comportamento, sempre que somos direcionados para a tela de
> 'login' ele entra no quadro de 'auto cadastro' mas quero que o login seja o principal
> (acompanhado de captura de tela do AuthPanel abrindo na aba "Criar conta")

## Interpretação

O `AuthPanel` (cartão de acesso, rota `/cadastro`) abria por padrão na aba **"Criar conta"**
(auto cadastro). O solicitante quer que **"Entrar"** (login) seja a aba principal/padrão — retorno
de usuário já cadastrado é o caso comum; "Criar conta" fica a um clique.

## Alteração

- `frontend/src/pages/publico/AuthPanel.tsx` — estado inicial `aba: 'criar' → 'entrar'`.
- `frontend/src/App.test.tsx` — smoke agora assevera o formulário de **login** como padrão
  (`voce@empresa.com` + "Acessar plataforma") no lugar do formulário de CNPJ.
- `frontend/cypress/e2e/cadastro.cy.ts` — os 4 casos de cadastro passam a abrir a aba **"Criar conta"**
  (`[data-cy=aba-criar]`) após `visit('/#/cadastro')`, já que o painel abre em "Entrar"; os casos de
  login já clicavam `aba-entrar` (inalterados).

## Verificação

Gate em container (DEC-STR-34): frontend **131 ✓** (lint + typecheck + test). E2E Cypress a validar em CI (QA).

## Segurança

Sem segredos/PII. Mudança puramente de UX (aba padrão); sem alteração de autenticação/autorização.
