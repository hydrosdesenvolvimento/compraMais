# Prompt Log — Biblioteca de localização (i18n) para todo o site

- **Data:** 2026-07-01
- **Agente de entrada:** Tech Lead (orquestrando subagents em paralelo)
- **Skill acionada:** prompt-logger (registro obrigatório do pacote)

## Prompt do solicitante (verbatim)

> @tech-lead implemente biblioteca de localização para tradução de todo o site, implemente portugês Brasil, como linguagem padrão, inglês e espanhol, lembre-se todas as novas implementações no projeto devem usar a biblioteca de localização, todas as menssagens do backend devem ser sempre geradas em inglês, mesmo os erros, e a localização deve ser tratada pelo frontend

## Interpretação

1. Adotar uma biblioteca de i18n no frontend e traduzir todo o site.
2. Idiomas: **português do Brasil (padrão)**, inglês e espanhol.
3. Regra permanente: toda nova implementação de frontend deve usar o i18n.
4. Backend responde **sempre em inglês** (inclusive erros); a **localização é responsabilidade do frontend**.

## Decisões técnicas

- Biblioteca: **react-i18next + i18next + i18next-browser-languagedetector** (padrão de mercado para
  React+Vite; namespaces, interpolação, plurais, detecção/persistência).
- Namespace único `translation`, chaves aninhadas por área (`common.*`, `auth.*`, `inicio.*`, …).
- Idioma padrão/fallback `pt-BR`; suportados `pt-BR`, `en`, `es`; detecção `localStorage → navegador`,
  persistida em `compramais.lang`. Recursos empacotados (JSON) → sem Suspense.
- Seletor de idioma na topbar do AppShell e na tela de autenticação.
- Backend: todas as `mensagem`/`Error`/logs convertidos para inglês; `codigo`/`name` (identificadores)
  preservados. Frontend localiza a UI (e pode mapear `codigo` → texto localizado quando exibir erros).

## Plano de ação

1. Infra i18n (config, init, seletor) + migração de `common` (shell/nav) e `auth` (referência).
2. Migração das demais telas em paralelo (subagents), uma área por agent, gravando fragmentos JSON.
3. Backend → inglês (subagent), com atualização dos testes que assertavam mensagens em PT.
4. Integração dos fragmentos nos locales, validação (tsc/eslint/build/vitest; back lint/build/test).
5. Governança: DEC na memória + seção no CLAUDE.md tornando o i18n obrigatório e o backend sempre inglês.

## Sanitização

Nenhum segredo, credencial, token ou PII presente no prompt ou nos artefatos. Sem necessidade de mascaramento.
