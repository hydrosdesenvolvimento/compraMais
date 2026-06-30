# Instrucoes do projeto para o Claude

Estas instrucoes derivam do protocolo comum do pacote de agents versionado em
`.github/agents/AGENTS.md`. Esse arquivo e a fonte canonica; em caso de divergencia,
`.github/agents/AGENTS.md` prevalece e este `CLAUDE.md` deve ser realinhado a ele.

## Bootstrap obrigatorio (antes de iniciar qualquer tarefa)

1. Ler `.github/agents/AGENTS.md` como protocolo comum obrigatorio.
2. Ler `.github/agents/memoria/MEMORIA-COMPARTILHADA.md` (memoria geral) e
   `.github/agents/memoria/MEMORIA-PROJETO.md` (memoria de projeto), recuperando
   contexto, decisoes ativas e backlog relevante para a demanda.
3. Detectar a stack (ver tabela abaixo) e consultar a skill correspondente em
   `.github/skills/`, registrando o resultado na memoria de projeto.

## Protocolo comum obrigatorio

- **prompt-logger**: acionar `.github/skills/prompt-logger/` para cada solicitacao,
  criando/atualizando o log em `docs/prompts/`. Sanitizar segredos, credenciais,
  tokens, cookies, chaves e dados pessoais antes de persistir; havendo risco de
  exposicao, registrar apenas versao sanitizada com a justificativa.
- **TDD**: sempre que a tarefa envolver desenvolvimento, refatoracao ou correcao de
  codigo, usar `.github/skills/protocolo-tdd/` como referencia operacional obrigatoria
  (integracao real via Testcontainers e E2E real com Cypress sem mocks de rede quando
  aplicavel).
- **Registro tecnico**: sempre que houver desenvolvimento, refatoracao ou correcao de
  codigo, usar `.github/skills/review-documentation/` para produzir o registro tecnico
  da entrega e o commit exigido pela skill.
- **Documentacao formal**: documentacao de governanca, handoffs, reviews tecnicos,
  changelogs e sync documental devem ser delegados ao subagent
  `.github/agents/documentation-writer.agent.md` (opera com `GPT-5 mini (copilot)`); o
  agent originador revisa antes de fechar.
- **Commits**: mensagens e preparo de commit semantico devem ser delegados ao subagent
  `.github/agents/commit-writer.agent.md` (opera com `GPT-5 mini (copilot)`); o agent
  originador valida diff, escopo e seguranca. Seguir Conventional Commits + Gitflow.
- **Memoria**: decisoes sobre agents, skills, workflow, governanca, templates e regras
  transversais vao para `.github/agents/memoria/MEMORIA-COMPARTILHADA.md` (geral);
  decisoes sobre escopo, arquitetura, implementacao, validacao, riscos e aceite de uma
  demanda concreta vao para `.github/agents/memoria/MEMORIA-PROJETO.md` (projeto), com
  referencia cruzada quando houver impacto nos dois escopos. Manter ambas sucintas e
  orientadas a decisao; detalhamento extenso em `.github/agents/memoria/historico/`.
  Registrar aprovacoes/reaprovacoes explicitas do solicitante sobre testes do QA.
  Manter a memoria versionada com o projeto.
- **Testes E2E**: Cypress como padrao. O Senior Developer prepara prerequisitos de
  projeto/container; o QA Expert valida a execucao real e registra evidencias ou
  bloqueios.
- **Idioma**: salvo indicacao explicita em contrario, elaborar documentos formais de
  governanca em portugues do Brasil, independentemente do idioma do prompt. Comandos,
  identificadores tecnicos, schemas, payloads e codigo permanecem no idioma original.
  Logs do `prompt-logger` seguem o idioma do prompt.
- **Comunicacao enxuta**: reduzir feedbacks visuais e nao narrar microacoes;
  atualizacoes intermediarias breves e limitadas a marco relevante, bloqueio, mudanca
  de decisao ou proximo passo. Concentrar o detalhamento completo no encerramento ou no
  handoff formal.

## Ciclo do developer com subagents utilitarios

1. O Senior Developer implementa e valida tecnicamente o incremento.
2. Antes do handoff para QA, delega ao `documentation-writer.agent.md` o registro
   tecnico da entrega, handoff e evidencias iniciais.
3. O QA Expert valida a implementacao com base no incremento e no registro documental.
4. Em reprovacao, retorna ao Senior Developer e o registro e atualizado novamente.
5. Em aprovacao, o Senior Developer consolida a entrega e delega ao
   `commit-writer.agent.md` a mensagem de commit semantica com base no diff real.
6. O Tech Lead revisa diff, escopo, seguranca e rastreabilidade antes de aprovar o
   fechamento tecnico e encaminhar o PR.

## Deteccao de stack -> skill de referencia

| Stack detectada | Skill |
|---|---|
| Python / Django | `.github/skills/django-expert/`, `django-patterns/`, `django-tdd/` |
| Python / FastAPI | `.github/skills/fastapi-expert/`, `fastapi-templates/`, `fastapi-async-patterns/` |
| Python generico | `.github/skills/python-best-practices/` |
| Node.js / NestJS | `.github/skills/nestjs-best-practices/` |
| Node.js generico | `.github/skills/nodejs-best-practices/` |
| PHP / Laravel | `.github/skills/laravel-best-practices/` |
| PHP generico | `.github/skills/php-best-practices/` |
| React / Next.js | `.github/skills/vercel-react-best-practices/` |
| React generico | `.github/skills/frontend-react-best-practices/` |
| Cloudflare Workers | `.github/skills/workers-best-practices/` |
| Autenticacao | `.github/skills/better-auth-best-practices/`, `api-security-best-practices/` |
| Qualquer stack | `.github/skills/clean-architecture/`, `security-best-practices/`, `best-practices/` |

> Stack atual do projeto (compraMais): ainda nao definida — o repositorio esta em
> bootstrap (apenas `README.md`). O primeiro agent que iniciar implementacao deve
> detectar a stack pelos arquivos do projeto (ver baseline em `.github/agents/AGENTS.md`,
> secao "Deteccao de stack") e registra-la em
> `.github/agents/memoria/MEMORIA-PROJETO.md`.

## Templates operacionais

Usar os templates em `.github/agents/templates/` quando o fluxo correspondente for
acionado: System Design, Design System, validacao QA frontend, aprovacao final e
revisao consolidada do Tech Lead, reprovacao/ciclos de QA, aprovacao do solicitante,
dimensionamento de banco e setup/checklist de Cypress. A lista completa com o uso de
cada template esta em `.github/agents/AGENTS.md` (secao "Templates operacionais").

## Governanca de entrega

- Branch aderente ao Gitflow (`feature/`, `bugfix/`, `release/`, `hotfix/`, `support/`),
  commits semanticos e Pull Request com label de review e review request ativos.
- Governanca de PRs centralizada em um unico workflow (validacoes semanticas,
  transicoes de labels, comentarios automaticos e sincronizacao com issues vinculadas).
- Em fluxos frontend, o System Design deve referenciar o Design System do UX Expert
  (precondicao de validacao do QA e criterio de aceite do Tech Lead).
- O Tech Lead consolida o registro das atividades de todos os agents e registra
  divergencias entre requisitos, arquitetura, implementacao e evidencias antes do
  fechamento final.

## Context7 MCP

Quando operado em VS Code com MCP e sem Context7 no workspace, configurar
`.vscode/mcp.json` versionado (preservando servidores existentes; nao versionar
segredos). Com `context7` disponivel e habilitado, usa-lo como fonte preferencial de
documentacao tecnica atualizada. Sem suporte a MCP de workspace, registrar a restricao
em memoria e seguir sem torna-lo precondicao bloqueante.
