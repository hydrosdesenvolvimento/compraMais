# 2026-07-01 — PRs têm como base a branch `develop` por padrão

## Contexto

Solicitação do responsável do projeto: **todo Pull Request deve ser aberto contra a branch `develop`**, a menos que a branch-alvo seja explicitamente indicada na solicitação. Pedido de persistir a convenção na memória versionada do projeto.

Motivador imediato: em 2026-06-30, após o merge do PR #10, um commit de incremento (`8c6c07e` — autofill de CEP + número/complemento no `/cadastro`) foi feito diretamente na `main` porque a branch ativa local era `main` e o default do GitHub também é `main`. O responsável optou por manter o commit na `main` naquele caso, mas formalizou a regra para evitar recorrência.

## Decisão

- **DEC-STR-32** (memória compartilhada): PR tem base `develop` por padrão; branches de trabalho saem de `develop`; nunca commitar direto em `main`/`develop`. Complementa **DEC-STR-14** (governança de PR) e **DEC-STR-26** (baseline Gitflow).
- **PRJ-DEC-10** (memória de projeto): reflexo da DEC-STR-32 no escopo do compraMais, com referência cruzada.

## Aplicação operacional

- Abrir PR sempre com base explícita: `gh pr create --base develop ...` (o default do GitHub é `main`).
- Ramificar features a partir de `develop`.
- Estado no momento do registro: a branch `develop` existe e aponta para `8c6c07e` (mesmo commit da `main`).

## Rastreabilidade

- `MEMORIA-COMPARTILHADA.md` → DEC-STR-32
- `MEMORIA-PROJETO.md` → PRJ-DEC-10
