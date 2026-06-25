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
| Projeto | Pacote de agents reutilizaveis (Agentes) |
| Foco atual | Governanca de fluxo, documentacao e automacoes do pacote |
| Estado | Ativo |
| Responsavel de consolidacao | Tech Lead |

## Decisoes ativas de projeto

| ID | Decisao | Impacto no projeto | Dono | Status |
|---|---|---|---|---|
| PRJ-DEC-01 | O ciclo do developer deve integrar `documentation-writer.agent.md` antes do QA e `commit-writer.agent.md` apos aprovacao do QA. | Padroniza handoff documental e fechamento semantico de commit no fluxo de entrega. | Tech Lead | Ativa |
| PRJ-DEC-02 | A memoria do pacote foi separada em memoria geral e memoria de projeto, com regra explicita de persistencia por escopo. | Reduz ambiguidade de rastreabilidade e melhora governanca de decisoes. | Tech Lead | Ativa |

## Backlog de projeto

| Item | Estado |
|---|---|
| Revisar periodicamente se decisoes ativas ainda representam o estado real do projeto | Em andamento |

## Historico de referencia

- Mudancas estruturais relevantes desta memoria devem gerar registro em `historico/`.
