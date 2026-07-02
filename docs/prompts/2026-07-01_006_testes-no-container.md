# Prompt Log — Testes executados no container

- **Data:** 2026-07-01
- **Agente de entrada:** Tech Lead
- **Skill acionada:** prompt-logger (registro obrigatório do pacote)

## Prompt do solicitante (verbatim)

> @tech-lead lembre-se todos os teste devem ser realizados no container, faça os ajustes necessários

## Interpretação

Regra permanente: **toda a suite de testes deve ser executada dentro do container**, não no host.
Ajustar o ferramental (compose + CI) para que a execução dos testes seja conteinerizada.

## Diagnóstico

- O CI (`.github/workflows/ci.yml`) rodava os testes no runner (`setup-node` + `npm ci` + `npm test`), no host.
- O `docker-compose.yml` tinha apenas profiles `dev`/`prod`, sem serviço de teste.
- O `.dockerignore` (backend/frontend) exclui `tests/`, `vitest.config`, specs e `eslint.config` da
  imagem de produção — logo, um stage de teste no Dockerfile de produção não é o caminho.

## Ajustes realizados

1. **`docker-compose.yml`** — novo profile `test` com `backend-test` e `frontend-test`, reutilizando o
   stage `build` (toolchain + devDependencies), bind mount do código e volume de `node_modules`,
   executando `npm ci && npm run lint && npm run typecheck && npm test` no container.
2. **`.github/workflows/ci.yml`** — job `test` passou a rodar o gate em container:
   `docker compose --profile test run --rm --build <servico>-test` (matriz backend/frontend), em vez
   de `setup-node` + `npm` no host.
3. **Governança** — DEC-STR-34 (memória geral) + PRJ-DEC-13 (memória de projeto); seção no CLAUDE.md.

## Validação (no container)

- `docker compose --profile test run --rm --build backend-test` → **128/128** testes verdes (lint + typecheck + test).
- `docker compose --profile test run --rm --build frontend-test` → **4/4** testes verdes (lint + typecheck + test).

## Sanitização

Nenhum segredo, credencial, token ou PII presente no prompt ou nos artefatos.
