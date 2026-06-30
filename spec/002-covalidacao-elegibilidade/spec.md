# Especificação de Feature: Covalidação Antifraude e Elegibilidade Fiscal

**Feature Branch**: `002-covalidacao-elegibilidade`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Descrição do usuário: "Abrir a feature 002 — credenciamento: covalidação documental antifraude
(aprovar/reprovar com justificativa) e verificação de inadimplência com bloqueio transitório, mais
o fluxo de regularização. Sequência da feature 001 (onboarding)."

## Visão Geral

Depois que o fornecedor se cadastrou e montou seu repositório documental (feature 001), esta feature
governa a etapa de **habilitação**: a CPL **covalida** os documentos submetidos (barreira antifraude),
e o sistema verifica **inadimplência** nas bases de débito, **bloqueando de forma transitória** o avanço
do fornecedor para "Credenciado". O fornecedor bloqueado ou reprovado tem um caminho claro de
**regularização/contestação**. Não cobre o motor de distribuição, a geração de malote nem o onboarding.

Esta feature consome entidades da 001 (Fornecedor, Documento, Conta de Acesso, Edital) e produz a
decisão de elegibilidade que o motor de distribuição (feature futura) usará.

## Clarifications

### Session 2026-06-29

- Q: De onde vem a data de término de penalidade/inidoneidade? → A: **Híbrido** — usa a data retornada pela base oficial de sanções quando disponível; a CPL registra manualmente como fallback quando a fonte não traz o prazo.
- Q: Qual o SLA de resposta da CPL à covalidação? → A: **Sem SLA obrigatório** — o sistema registra e exibe a fila pendente e o tempo decorrido por documento, para acompanhamento gerencial, sem prazo fixo.

### Session 2026-06-30

- Q: A quais endpoints da 002 se aplica o princípio de busca por instância parcial (QBE, Constituição v3.3.0)? → A: **Só à listagem de coleção de uma entidade** — `GET .../documentos/pendentes` passa a aceitar um probe parcial de `Documento` (status, tipo) como filtro; a agregação `/pendencias` e as leituras de recurso único ficam **isentas**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Covalidação documental antifraude (Priority: P1)

Um servidor da CPL abre a fila de documentos pendentes de um fornecedor, visualiza cada PDF na
plataforma e decide aprovar ou reprovar. Ao reprovar, é obrigado a registrar uma justificativa textual,
que é notificada ao fornecedor. A decisão é registrada de forma irrefutável.

**Why this priority**: É a barreira antifraude central (combate a PDFs forjados e balanços maquiados) e a
porta de entrada da habilitação. Entrega valor isolado: a CPL passa a habilitar documentação com rastro,
sem papel.

**Independent Test**: Com um fornecedor que submeteu documentos, um servidor da CPL aprova um e reprova
outro; verificar que a reprovação exige justificativa, que o fornecedor é notificado e que ambas as
decisões ficam auditáveis.

**Acceptance Scenarios**:

1. **Given** um documento com status "Pendente", **When** o servidor da CPL o visualiza e o aprova,
   **Then** o documento passa a "Aprovado" e a ação é registrada na trilha (quem, quando, o quê).
2. **Given** um documento "Pendente", **When** o servidor reprova sem preencher a justificativa,
   **Then** o sistema bloqueia a ação e exige o motivo antes de concluir.
3. **Given** um documento "Pendente", **When** o servidor reprova com justificativa,
   **Then** o documento passa a "Reprovado", a justificativa é gravada e o fornecedor é notificado.
4. **Given** um documento declaratório (Balanço Patrimonial), **When** é analisado, **Then** o sistema
   exige a covalidação humana antes de qualquer habilitação (não há aprovação automática).

---

### User Story 2 - Verificação de inadimplência e bloqueio transitório (Priority: P1)

Quando um fornecedor tenta avançar para "Credenciado" em um edital, o sistema consulta as bases de
débito (municipal e federais/estaduais). Havendo débito ativo, o avanço é bloqueado — mas de forma
**transitória**: o bloqueio é reavaliado a cada porta e nunca é permanente. Se a base estiver
indisponível, aplica-se a política padrão (liberar com sinalização à CPL).

**Why this priority**: É uma trava legal obrigatória (não credenciar inadimplente) e, ao mesmo tempo, o
ponto onde a feature precisa respeitar o direito de regularização da ME/EPP. A verificação em si é
independente da covalidação documental.

**Independent Test**: Com fornecedores em diferentes estados (sem débito, com débito ativo, com base
indisponível), verificar que cada um é respectivamente liberado, bloqueado transitoriamente, ou liberado
com sinalização — e que o estado é reavaliado em nova tentativa.

**Acceptance Scenarios**:

1. **Given** um fornecedor sem débito ativo, **When** tenta avançar para "Credenciado", **Then** o
   sistema permite o avanço e registra a verificação com origem e data.
2. **Given** um fornecedor com débito ativo, **When** tenta avançar, **Then** o sistema bloqueia o
   avanço, informa o motivo (fonte e data) e mantém o bloqueio enquanto o débito persistir.
3. **Given** um fornecedor bloqueado que quitou o débito, **When** tenta avançar novamente, **Then** a
   reconsulta libera o avanço (o bloqueio é transitório, nunca permanente).
4. **Given** a base de débito indisponível, **When** o fornecedor tenta avançar, **Then** o sistema
   aplica a política padrão de liberação com sinalização obrigatória à CPL, registrando o frescor do dado.
5. **Given** uma penalidade com prazo ou declaração de inidoneidade ativa, **When** o fornecedor tenta
   avançar, **Then** o bloqueio vigora até a data de término do impedimento.

---

### User Story 3 - Regularização e contestação (Priority: P2)

Um fornecedor reprovado ou bloqueado vê, no seu painel, o motivo e o próximo passo, e aciona a
regularização (reenvio de documento corrigido ou solicitação de reconsulta após quitar o débito), sem
ficar em beco sem saída.

**Why this priority**: Fecha o ciclo de habilitação e protege o direito de defesa/regularização. Depende
das decisões das US1 e US2.

**Independent Test**: A partir de uma reprovação e de um bloqueio, verificar que o fornecedor enxerga o
motivo, consegue reenviar/regularizar e que a nova análise/reconsulta reflete o resultado.

**Acceptance Scenarios**:

1. **Given** um documento reprovado, **When** o fornecedor acessa o painel, **Then** vê o motivo e a
   opção de reenviar o documento, que volta a "Pendente" e notifica a CPL.
2. **Given** um bloqueio por débito, **When** o fornecedor regulariza e solicita reconsulta, **Then** o
   sistema reavalia e, se o débito sumiu, libera o avanço.
3. **Given** múltiplas pendências (documento + débito), **When** o fornecedor acessa a contestação,
   **Then** vê todas as pendências e o próximo passo de cada uma num só lugar.

---

### Edge Cases

- Documento aprovado que expira antes da habilitação concluir — deve voltar a exigir documento vigente.
- Débito que surge entre a aprovação documental e a geração de contrato — a reavaliação em porta posterior
  deve capturá-lo (o bloqueio não é "ok permanente").
- Base de débito retorna resultado desatualizado (stale) — o sistema deve sinalizar o frescor e tratar
  conforme a política.
- Procurador tentando covalidar — apenas perfis CPL/SMGA podem aprovar/reprovar; procurador do fornecedor não.
- Reprovação seguida de reenvio idêntico — a CPL deve poder reprovar novamente com novo motivo, mantendo o histórico.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que perfis CPL/SMGA visualizem os documentos submetidos por um
  fornecedor e os aprovem ou reprovem. *(RF004)*
- **FR-002**: O sistema MUST exigir justificativa textual obrigatória em toda reprovação, bloqueando a
  conclusão da reprovação sem o motivo. *(RN003)*
- **FR-003**: O sistema MUST exigir covalidação humana de documentos declaratórios sensíveis (Balanço
  Patrimonial, Atestado de Capacidade Técnica) antes de qualquer habilitação; não há aprovação automática
  desses documentos. *(RN003/RN006)*
- **FR-004**: O sistema MUST notificar o fornecedor do resultado da covalidação (aprovado/reprovado +
  motivo) e refletir o status no painel.
- **FR-005**: O sistema MUST verificar a inadimplência do fornecedor consultando as bases de débito
  (municipal e federais/estaduais) ao tentar avançar para "Credenciado". *(RF011)*
- **FR-006**: O sistema MUST aplicar bloqueio **transitório** por inadimplência, reavaliado em cada porta
  (credenciamento → distribuição → contrato), nunca permanente, preservando o direito de regularização da
  ME/EPP. *(RN002)*
- **FR-007**: O sistema MUST distinguir e tratar três estados de impedimento: débito regularizável
  (bloqueia enquanto ativo), penalidade com prazo (bloqueia até a data), e inidoneidade (bloqueia pelo
  termo declarado). A **data de término** vem da base oficial de sanções quando disponível; a CPL a
  registra manualmente como fallback (híbrido). *(RN002)*
- **FR-008**: Quando a base de débito estiver indisponível, o sistema MUST aplicar a política padrão de
  **liberação com sinalização obrigatória à CPL** (fail-open + flag), registrando o frescor do dado; a
  política é parâmetro configurável, ratificável pela Procuradoria.
- **FR-009**: O sistema MUST registrar cada verificação de inadimplência e cada decisão de covalidação na
  trilha de auditoria, com identificação do ator, evento, data/hora, origem e resultado. *(RNF003)*
- **FR-010**: O sistema MUST permitir ao fornecedor reprovado reenviar o documento, recolocando-o em
  "Pendente" e notificando a CPL. *(parte de RF016)*
- **FR-011**: O sistema MUST permitir ao fornecedor bloqueado por débito solicitar reconsulta após
  regularizar, reavaliando a elegibilidade. *(parte de RF016)*
- **FR-012**: O sistema MUST apresentar ao fornecedor, num ponto único, todas as suas pendências de
  habilitação (documentos reprovados e bloqueios) com o próximo passo de cada uma. *(RF016)*
- **FR-013**: O sistema MUST restringir as ações de covalidação aos perfis CPL/SMGA; o fornecedor e seus
  procuradores não podem aprovar/reprovar. *(RBAC)*
- **FR-014**: O sistema MUST registrar e exibir a fila de covalidação pendente e o **tempo decorrido por
  documento** (acompanhamento gerencial). **Não há SLA obrigatório** de resposta; escalonamento por prazo
  está fora do escopo desta feature.
- **FR-015**: O endpoint de **listagem de documentos** (fila de covalidação) MUST aceitar uma **instância
  parcial de `Documento`** como critério de busca (Query-by-Example, Constituição §IV / v3.3.0): campos
  preenchidos no probe — no mínimo `status` e `tipo` — filtram por correspondência (AND); campos ausentes
  são ignorados; paginação/ordenação ficam fora do probe. As leituras agregadas (`/pendencias`) e as
  leituras de recurso único por `fornecedorId` ficam **isentas** do QBE.

### Key Entities *(include if feature involves data)*

- **Análise de Covalidação**: decisão da CPL sobre um Documento — resultado (aprovado/reprovado),
  justificativa (obrigatória se reprovado), analista, data/hora. N:1 com o Documento (histórico).
- **Verificação de Inadimplência**: resultado de uma consulta às bases para um Fornecedor — estado (sem
  débito / débito ativo / penalidade / inidoneidade), fonte, data/hora, frescor (verificado/stale/
  indisponível) e a porta em que ocorreu.
- **Bloqueio**: impedimento transitório associado a um Fornecedor/edital — tipo (débito/penalidade/
  inidoneidade), data de término quando aplicável (origem: fonte oficial ou registro manual da CPL),
  situação (ativo/liberado), motivo.
- **Documento (referência da 001)**: alvo da covalidação; muda de status por esta feature.
- **Fornecedor / Edital / Conta de Acesso (referências da 001)**: contexto da habilitação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das reprovações documentais possuem justificativa textual registrada.
- **SC-002**: 100% das decisões de covalidação e verificações de inadimplência geram registro de
  auditoria consultável.
- **SC-003**: Nenhum fornecedor com débito ativo avança para "Credenciado"; e nenhum fornecedor que
  regularizou permanece bloqueado após uma reconsulta (bloqueio sempre reversível).
- **SC-004**: Em 100% das indisponibilidades da base de débito, o sistema aplica a política padrão e
  sinaliza à CPL (nenhuma indisponibilidade trava silenciosamente o fornecedor adimplente).
- **SC-005**: Um fornecedor reprovado consegue ver o motivo e reenviar o documento sem atendimento
  presencial, em menos de 3 minutos.
- **SC-006**: 100% dos documentos declaratórios sensíveis passam por covalidação humana antes da
  habilitação (zero aprovação automática desses documentos).

## Assumptions

- A política padrão de indisponibilidade é **liberar com sinalização à CPL** (fail-open + flag), conforme
  a Constituição do projeto; a ratificação final do default é da Procuradoria e o comportamento é
  parametrizável sem alterar o fluxo.
- A "idoneidade" de documentos declaratórios é aferida por **análise humana** da CPL (integridade,
  legibilidade e exercício fiscal pertinente — mínimo o exercício anterior ao edital); o sistema não
  calcula índices contábeis automaticamente.
- As bases de débito (PGM municipal e federais/estaduais) são as integrações previstas no projeto; a
  disponibilidade efetiva das chaves é dependência externa e não bloqueia a modelagem.
- A reconsulta de inadimplência é acionada pelo fornecedor (após regularizar) e também automaticamente nas
  portas seguintes do fluxo.
- Os perfis de acesso (CPL/SMGA vs Fornecedor/Procurador) já existem (feature 001).

## Out of Scope

- Motor de distribuição e Cadastro de Reserva (feature futura).
- Geração e exportação do malote SEI.
- Onboarding/cadastro do fornecedor e repositório documental (feature 001).
- Biometria facial (fora do MVP).
- Notificações por SMS/e-mail (mecanismo externo — feature posterior); aqui a notificação é o reflexo de
  status no painel.
