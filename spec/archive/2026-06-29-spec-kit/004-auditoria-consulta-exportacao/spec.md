# Especificação de Feature: Auditoria — Consulta e Exportação da Trilha

**Feature Branch**: `004-auditoria-consulta-exportacao`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Descrição do usuário: "Abrir a feature 004 — Auditoria (Épico 8): consulta filtrada da trilha
append-only (por usuário/ator, data, ação/evento, edital) com busca por instância parcial (QBE), e
exportação segura em CSV/JSON para órgãos de controle (TCE), respeitando RBAC/LGPD. Apenas LÊ e EXPORTA —
não altera a escrita da trilha."

## Visão Geral

A trilha de auditoria append-only já é alimentada pelas features 001/002/003 (cadastro, documentos,
covalidação, inadimplência/bloqueio, editais, contestações) por um único escritor (módulo de Auditoria
consumindo eventos de domínio — AD-18). Falta a **superfície de consulta e prestação de contas**: esta
feature permite que perfis de controle **pesquisem** os registros por usuário, data, ação e edital, e
**exportem** o resultado filtrado em CSV/JSON para órgãos de controle (TCE). É estritamente **somente
leitura** sobre a trilha — não insere, edita nem remove registros, preservando a imutabilidade (Princípio
II da Constituição).

Não cobre o motor de distribuição (Épico 5, bloqueado), o malote SEI, os painéis/BI (Épico 9) nem qualquer
alteração na forma como a trilha é escrita.

## Clarifications

### Session 2026-06-30

- Q: Como tratar PII na consulta/exportação da trilha? → A: **Visível para todo perfil de controle, sem mascaramento** — a autorização de controle (CPL/Administrador/auditor) já pressupõe base legal LGPD; a salvaguarda é o controle de acesso (RBAC, FR-008), não a redação de campos. Não há mascaramento nesta feature.
- Q: Quais perfis acessam a consulta/exportação de auditoria? → A: **CPL/Administrador (reuso) + papel dedicado `auditor` somente-leitura** (consulta+exporta, nunca escreve/aprova) — menor privilégio e separação de funções para órgãos de controle.
- Q: Como exportar conjuntos muito grandes? → A: **Streaming/paginado, sem limite rígido**; acima de um teto **configurável** (ex.: 50k registros) o sistema sinaliza/registra o volume e sugere refinar o filtro, mas conclui a exportação (preserva a fidelidade — FR-007).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulta filtrada da trilha (Priority: P1) 🎯 MVP

Um servidor de controle (CPL/Administrador) abre a consulta de auditoria e filtra os registros informando
um ou mais critérios — usuário/ator, intervalo de datas, ação/evento e/ou edital — e vê a lista de
registros correspondentes, em ordem cronológica, sem conseguir alterá-los.

**Why this priority**: É a base da prestação de contas e da defesa perante o TCE; sem consulta a trilha é
um depósito inerte. Entrega valor isolado: o controle passa a localizar quem fez o quê, quando.

**Independent Test**: Com a trilha populada por ações de features anteriores, filtrar por um usuário e um
intervalo de datas retorna exatamente os registros correspondentes; filtrar por evento ou edital restringe
corretamente; nenhum registro é alterado.

**Acceptance Scenarios**:

1. **Given** uma trilha com registros de vários atores, **When** o servidor de controle filtra por um
   usuário específico, **Then** o sistema retorna apenas os registros daquele ator.
2. **Given** registros em datas distintas, **When** o servidor informa um intervalo (de/até), **Then**
   apenas os registros dentro do intervalo são retornados.
3. **Given** critérios combinados (usuário + ação + edital), **When** a consulta é feita, **Then** o
   sistema aplica todos os filtros informados em conjunto (E) e ignora os campos não informados.
4. **Given** um conjunto grande de registros, **When** a consulta é feita, **Then** o resultado é paginado
   e ordenado cronologicamente de forma determinística (mesma consulta → mesma saída e ordem).
5. **Given** qualquer consulta, **When** executada, **Then** nenhum registro da trilha é criado, alterado
   ou removido (somente leitura).

---

### User Story 2 - Exportação segura CSV/JSON (Priority: P2)

A partir de um resultado filtrado, o servidor de controle exporta os registros em CSV ou JSON para entregar
a um órgão de controle (TCE), com o conteúdo fiel ao que foi consultado e respeitando os limites de acesso a
dados pessoais.

**Why this priority**: É o entregável de prestação de contas para fora do sistema. Depende da consulta
(US1) para definir o conjunto a exportar.

**Independent Test**: A partir de uma consulta filtrada, exportar em CSV e em JSON; verificar que o arquivo
contém exatamente o conjunto filtrado (mesma quantidade e registros), nos dois formatos.

**Acceptance Scenarios**:

1. **Given** um resultado de consulta filtrada, **When** o servidor solicita exportação em CSV, **Then** o
   sistema gera um CSV contendo exatamente os registros do filtro, com cabeçalho de colunas.
2. **Given** o mesmo resultado, **When** o servidor solicita exportação em JSON, **Then** o sistema gera um
   JSON com a mesma coleção de registros.
3. **Given** um perfil sem autorização de controle, **When** tenta consultar ou exportar, **Then** o
   sistema nega o acesso.
4. **Given** dados pessoais no conteúdo de um registro, **When** a exportação é gerada por um perfil de
   controle autorizado, **Then** o conteúdo é incluído integralmente (sem mascaramento) — a autorização de
   controle pressupõe base legal LGPD; o acesso é a salvaguarda (FR-008).

---

### Edge Cases

- Consulta sem nenhum filtro — retorna o conjunto default paginado (não trava nem despeja tudo de uma vez).
- Intervalo de datas invertido (de > até) — o sistema sinaliza erro de filtro em vez de retornar vazio
  silenciosamente.
- Exportação de um conjunto vazio — gera arquivo válido (cabeçalho/coleção vazia), não erro.
- Conjunto muito grande para exportar — o sistema processa em fluxo/paginação e, acima do teto configurável,
  sinaliza o volume e sugere refinar o filtro, mas conclui sem corromper o arquivo (FR-011).
- Tentativa de usar a consulta para alterar um registro — não existe operação de escrita exposta.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que perfis de controle consultem a trilha filtrando por **usuário/ator,
  intervalo de datas (de/até), ação/evento e edital**, usando uma **instância parcial do registro** como
  critério (QBE — Constituição §IV/v3.3.0). *(Princípio II)*
- **FR-002**: Os filtros informados MUST ser combinados por correspondência (E); campos ausentes são
  ignorados. Paginação e ordenação são parâmetros separados do critério.
- **FR-003**: A consulta e a exportação MUST ser **estritamente somente leitura** — nenhuma operação desta
  feature cria, altera ou remove registros da trilha (imutabilidade preservada).
- **FR-004**: O resultado MUST ser ordenado cronologicamente de forma **determinística** (mesma consulta
  produz a mesma saída e ordem), para reauditabilidade.
- **FR-005**: O sistema MUST exportar o resultado filtrado em **CSV** (com cabeçalho de colunas).
- **FR-006**: O sistema MUST exportar o resultado filtrado em **JSON**.
- **FR-007**: A exportação MUST ser **fiel ao resultado consultado** — o arquivo contém exatamente o mesmo
  conjunto de registros do filtro aplicado.
- **FR-008**: O sistema MUST restringir consulta e exportação aos perfis **CPL/Administrador** e ao papel
  dedicado **`auditor` somente-leitura** (consulta+exporta, sem qualquer operação de escrita/aprovação);
  demais perfis são negados. *(RBAC — menor privilégio e separação de funções)*
- **FR-009**: Dados pessoais presentes no conteúdo de um registro MUST ser disponibilizados **integralmente**
  aos perfis de controle autorizados (sem mascaramento) — a autorização de controle pressupõe base legal
  LGPD; a salvaguarda é o **controle de acesso** (FR-008), não a redação de campos.
- **FR-010**: Consulta com **intervalo de datas inválido** (de > até) MUST ser recusada com erro de filtro
  claro, em vez de retornar resultado vazio silencioso.
- **FR-011**: A exportação MUST processar o conjunto de forma **paginada/em fluxo (streaming)**, sem limite
  rígido; ao ultrapassar um **teto configurável** (ex.: 50k registros) o sistema **sinaliza/registra** o
  volume e sugere refinar o filtro, **concluindo** a exportação sem corromper o arquivo nem perder fidelidade.

### Key Entities *(include if feature involves data)*

- **Registro de Auditoria (referência, imutável)**: usuário/ator, evento/ação, data/hora, IP, e o conteúdo
  da mudança (payload, incluindo agregado de origem, empresa representada e, quando aplicável, o edital).
  Já criado pelas features 001/002/003; esta feature apenas o lê.
- **Critério de Consulta (probe)**: instância parcial do Registro — usuário, evento, intervalo (de/até),
  edital. Campos ausentes ignorados (QBE).
- **Exportação**: formato (CSV | JSON) + o conjunto resultante do filtro; artefato de saída para o órgão de
  controle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das consultas retornam exatamente os registros que casam os filtros (nenhum a mais, nenhum
  a menos).
- **SC-002**: A exportação (CSV e JSON) contém exatamente o conjunto filtrado — mesma quantidade e mesmos
  registros do resultado consultado.
- **SC-003**: Nenhum registro da trilha é criado, alterado ou removido por esta feature (imutabilidade
  verificável antes/depois).
- **SC-004**: 100% das tentativas de consulta/exportação por perfil não autorizado são negadas.
- **SC-005**: Um auditor localiza os registros de um edital/usuário/período em menos de 1 minuto.
- **SC-006**: A mesma consulta executada duas vezes produz resultado e ordem idênticos (determinismo).

## Assumptions

- A trilha já é populada pelas features 001/002/003 e escrita por um único responsável (AD-18); esta feature
  não cria nem altera essa escrita — só consulta e exporta.
- "Perfil de controle" reusa CPL/Administrador da fundação, com a possibilidade de um perfil de **auditoria
  somente-leitura**; a base legal LGPD para acesso a dados pessoais é pré-condição de perfil.
- O **edital** associável a um registro é derivável do conteúdo/agregado do evento (eventos de edital e de
  ações vinculadas a edital).
- Para volumes grandes, o conjunto filtrado é paginável; a estratégia de fluxo/streaming da exportação é
  detalhe de implementação que não altera a fidelidade (FR-007).
- A exportação produz o arquivo para download/entrega; o canal de entrega ao TCE (e-mail, protocolo) é
  externo e fora do escopo.

## Out of Scope

- Qualquer alteração na **escrita** da trilha ou na forma como eventos são consumidos (AD-18 inalterado).
- Motor de distribuição e Cadastro de Reserva (Épico 5 — bloqueado pelo gate Item×Lote).
- Geração e exportação do malote SEI (Épico 6).
- Painéis/BI e portal de transparência (Épico 9) — embora consumam visões, não são esta feature.
- Notificação/entrega automática dos arquivos a órgãos externos (mecanismo externo).
