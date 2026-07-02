# Prompt Log — Correção: chaves i18n cruas na tela de /cadastro

- **Data:** 2026-07-01
- **Agente de entrada:** UX Expert
- **Skill acionada:** prompt-logger

## Prompt do solicitante (verbatim)

> @ux-expert fix the error in image

(Imagem: painel de /cadastro exibindo as chaves cruas `auth.tabs.login`, `auth.signup.title`,
`auth.signup.subtitle`, `auth.signup.cnpjLabel`, `auth.signup.cnpjPlaceholder`, `auth.signup.consult`,
`auth.signup.submit` em vez do texto traduzido.)

## Diagnóstico

O i18next inicializa de forma **assíncrona** por padrão (`initImmediate: true`). Com os recursos de
tradução empacotados (JSON), o primeiro render do React ocorria antes de o init concluir, exibindo as
chaves cruas. Além disso, `App.tsx` deixou de importar `./i18n`, então os testes passariam a depender
apenas do entrypoint do app.

## Correção

1. `frontend/src/i18n/index.ts`: `initImmediate: false` → init **síncrono**; o primeiro paint já sai traduzido.
2. `frontend/src/test/setup.ts`: importa `../i18n` para inicializar o i18n no ambiente de testes
   (o app inicializa via `main.tsx`).
3. `frontend/src/App.test.tsx`: asserção extra de que **nenhuma chave crua** (`auth.tabs|signup|login.`)
   vaza para a tela — guarda a regressão.

## Validação (no container — DEC-STR-34)

`docker compose --profile test run --rm --build frontend-test` → lint + typecheck + **test 4/4 verdes**.

## Sanitização

Sem segredos/credenciais/PII no prompt ou artefatos.
