# Memoria de Projeto dos Agents

> Arquivo versionavel para registrar decisoes de demandas concretas do projeto em andamento.

## Regras de persistencia

- Todo agent deve ler este arquivo antes de atuar, em conjunto com `MEMORIA-COMPARTILHADA.md`.
- Este arquivo deve manter decisoes do projeto e da demanda atual: escopo, requisitos, arquitetura, implementacao, validacao, riscos, aceite e backlog de trabalho.
- Decisoes transversais sobre agents, skills, workflow, templates e governanca do pacote devem ser registradas em `MEMORIA-COMPARTILHADA.md` e tambem refletidas nesta memoria de projeto, com referencia cruzada.
- Quando houver solicitacao explicita para registrar em ambos os escopos, a mesma decisao deve ser persistida nas duas memorias com referencia cruzada.
- Detalhes extensos, cronologia de mudancas e evidencias completas devem ficar em `historico/`.

## Contexto do projeto atual

| Campo | Valor |
|---|---|
| Projeto | compraMais |
| Foco atual | Bootstrap do repositorio: pacote de agents, skills e instrucoes do Claude versionados |
| Estado | Bootstrap (apenas `README.md` de codigo; stack ainda nao definida) |
| Responsavel de consolidacao | Tech Lead |

## Decisoes ativas de projeto

| ID | Decisao | Impacto no projeto | Dono | Status |
|---|---|---|---|---|
| PRJ-DEC-01 | Pacote de agents, skills e `CLAUDE.md` sincronizado a partir de `ai_team/.github` como baseline de governanca do compraMais. | Estabelece protocolo comum, ciclo do developer e tabela stack->skill desde o inicio do projeto. | Tech Lead | Ativa |
| PRJ-DEC-02 | Stack do projeto ainda nao definida; deteccao e registro nesta memoria delegados ao primeiro agent que iniciar implementacao. | Evita premissas de stack incorretas e mantem a tabela stack->skill como referencia ate a definicao. | Tech Lead | Ativa |

## Backlog de projeto

| Item | Estado |
|---|---|
| Definir a stack do projeto e registrar a skill de referencia correspondente | Pendente |
| Revisar/atualizar `README.md` com o proposito e escopo real do compraMais | Pendente |
| Revisar periodicamente se decisoes ativas ainda representam o estado real do projeto | Em andamento |

## Historico de referencia

- Mudancas estruturais relevantes desta memoria devem gerar registro em `historico/`.
- Bootstrap do projeto: `historico/2026-06-24-0001-bootstrap-compramais-agents-skills.md`.
