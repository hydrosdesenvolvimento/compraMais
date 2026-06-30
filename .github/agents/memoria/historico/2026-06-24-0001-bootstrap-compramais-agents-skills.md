# Bootstrap do compraMais: agents, skills e instrucoes do Claude

- Data: 2026-06-24
- Responsavel de consolidacao: Tech Lead

## Contexto da mudanca

Repositorio `compraMais` iniciado apenas com `README.md`. Necessidade de estabelecer
o baseline de governanca (agents, skills e instrucoes do Claude) reaproveitando o
pacote canonico mantido em `ai_team/.github`.

## Decisao tomada

- Sincronizadas 38 skills em `.github/skills/` (mais `SKILL_HIERARCHY.md`) a partir de
  `ai_team/.github/skills`.
- Sincronizados 8 agents, `AGENTS.md`, templates operacionais e estrutura de memoria em
  `.github/agents/` a partir de `ai_team/.github/agents`.
- Criado `CLAUDE.md` derivado de `.github/agents/AGENTS.md`, com paths reescritos para
  `.github/` e nota de stack ainda nao definida.
- `MEMORIA-PROJETO.md` resetada para o contexto do compraMais e `historico/` herdado do
  `ai_team` removido (mantido apenas o `README.md` do diretorio).

## Impacto tecnico/negocio

- Protocolo comum, ciclo do developer e tabela stack->skill disponiveis desde o inicio.
- Rastreabilidade de governanca versionada junto ao projeto.
- `AGENTS.md` permanece como fonte canonica; `CLAUDE.md` realinha-se a ele em divergencia.

## Proximos passos

- Definir a stack do projeto e registrar a skill de referencia em `MEMORIA-PROJETO.md`.
- Atualizar `README.md` com o proposito e escopo real do compraMais.
- Revisar `MEMORIA-COMPARTILHADA.md` para confirmar aderencia ao contexto do compraMais.
