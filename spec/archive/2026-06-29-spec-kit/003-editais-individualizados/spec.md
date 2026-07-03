# Especificação de Feature: Editais Individualizados por Secretaria

**Feature Branch**: `003-editais-individualizados`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Descrição do usuário: "Abrir a feature 003 — Editais individualizados (Épico 3): criação de
edital individualizado pela Secretaria/Gestor respeitando o invariante '1 Edital = 1 Demanda' (editais
por secretaria isolados e inacumuláveis — RN007/AD-11); o edital declara CNAE(s) alvo, capacidade/
quantitativos e a secretaria dona; mais o micro-fluxo de correção/contestação de CNAE. A vitrine por
CNAE já existe (feature 002) — esta feature a alimenta com editais reais."

## Visão Geral

Esta feature dá às Secretarias/Gestores o poder de **publicar a demanda** de compras de forma estruturada:
cada edital representa **uma única demanda de uma única secretaria** (invariante "1 Edital = 1 Demanda"),
declara os **CNAEs alvo**, os **quantitativos/capacidade** desejados e a **secretaria dona**. Os editais
publicados alimentam a **vitrine filtrada por CNAE** já entregue na feature 002 (esta feature não recria a
vitrine — apenas produz os editais que ela exibe). Inclui o **micro-fluxo de correção de CNAE**: quando um
fornecedor percebe que um edital o exclui (ou inclui) indevidamente pelo enquadramento, ele sinaliza, e a
Secretaria/CPL corrige o CNAE do edital mantendo histórico auditável.

Não cobre o motor de distribuição (Épico 5, bloqueado pelo gate Item×Lote), a geração de malote SEI nem o
onboarding do fornecedor (feature 001).

## Clarifications

### Session 2026-06-30

- Q: O que pode ser editado em um edital já Publicado? → A: **Totalmente editável com auditoria** — a Secretaria/Gestor pode alterar qualquer campo (inclusive CNAE e quantitativos) diretamente, desde que cada alteração gere registro antes/depois na trilha. O micro-fluxo de contestação (US2) permanece como o caminho **iniciado pelo fornecedor** para correção de CNAE, mas não é a única via de mudança.
- Q: Mudança de CNAE em edital Publicado que amplia o público-alvo afeta o prazo de candidatura? → A: **Reavaliação imediata da vitrine + sinalização**, mantendo o prazo original; a **reabertura/extensão de prazo é decisão manual e auditada** da Secretaria (sem reabertura automática), evitando acoplar esta feature ao motor de distribuição (bloqueado).
- Q: Quem tem legitimidade para contestar o CNAE de um edital? → A: **Qualquer fornecedor cadastrado e ativo** pode abrir contestação; a procedência é julgada pela Secretaria/CPL (acatar/recusar com justificativa). Não se restringe a priori por CNAE adjacente nem a quem tentou se candidatar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar e publicar edital individualizado (Priority: P1) 🎯 MVP

Um gestor de uma Secretaria cria um edital descrevendo uma demanda específica (objeto, CNAE(s) alvo,
quantitativos/capacidade desejada, prazo), revisa e o publica. O sistema garante que aquele edital pertence
a exatamente uma secretaria e representa exatamente uma demanda — não é possível acumular demandas de
secretarias distintas no mesmo edital.

**Why this priority**: É a porta de entrada de toda a cadeia: sem editais reais a vitrine fica vazia e
nenhuma habilitação/distribuição acontece. Entrega valor isolado: a Secretaria passa a publicar demandas
estruturadas e rastreáveis, e os fornecedores passam a vê-las na vitrine.

**Independent Test**: Um gestor cria um edital com CNAE e quantitativos, publica, e verifica que ele aparece
na vitrine para fornecedores com CNAE compatível; e que a tentativa de vincular uma segunda secretaria ao
mesmo edital é rejeitada.

**Acceptance Scenarios**:

1. **Given** um gestor autenticado de uma Secretaria, **When** ele cria um edital informando objeto,
   secretaria dona, CNAE(s) alvo e quantitativos, **Then** o edital é salvo como **Rascunho** e a ação é
   registrada na trilha (quem, quando, o quê).
2. **Given** um edital em Rascunho completo e válido, **When** o gestor o publica, **Then** o edital passa a
   **Publicado**, fica visível na vitrine para fornecedores com CNAE compatível, e a publicação é auditada.
3. **Given** uma tentativa de criar/editar edital, **When** se tenta associar mais de uma secretaria dona ou
   mais de uma demanda ao mesmo edital, **Then** o sistema rejeita a operação (invariante "1 Edital = 1
   Demanda", RN007).
4. **Given** um edital em Rascunho com campos obrigatórios faltando (objeto, secretaria, ao menos um CNAE,
   quantitativo), **When** o gestor tenta publicar, **Then** o sistema bloqueia a publicação e indica o que
   falta.
5. **Given** um edital Publicado, **When** o prazo de vigência se encerra ou o gestor o encerra
   manualmente, **Then** o edital passa a **Encerrado** e deixa de ser oferecido a novas candidaturas na
   vitrine (permanece consultável e auditável).

---

### User Story 2 - Correção/contestação de CNAE (Priority: P2)

Um fornecedor que se considera indevidamente excluído (ou incluído) de um edital pelo enquadramento sinaliza
a incompatibilidade, com justificativa. A Secretaria dona ou a CPL avalia e, sendo procedente, corrige o(s)
CNAE(s) do edital; a correção mantém histórico (valor anterior, novo valor, quem corrigiu, motivo) e
reavalia a vitrine. Sendo improcedente, registra a recusa com justificativa.

**Why this priority**: Protege a isonomia e evita que erro de enquadramento exclua MEs/EPPs legítimas (ou
admita incompatíveis). Depende de existir o edital (US1), por isso P2.

**Independent Test**: A partir de um edital publicado, um fornecedor contesta o CNAE; a Secretaria corrige; a
vitrine passa a refletir o novo enquadramento e o histórico da correção fica auditável.

**Acceptance Scenarios**:

1. **Given** um edital Publicado e um fornecedor, **When** o fornecedor sinaliza incompatibilidade de CNAE
   com justificativa, **Then** o sistema registra a contestação como **Pendente** e a vincula ao edital.
2. **Given** uma contestação Pendente, **When** a Secretaria/CPL a acata e corrige o CNAE do edital, **Then**
   o CNAE é alterado, o histórico (antes/depois, autor, motivo) é gravado, a vitrine é reavaliada e a
   correção é auditada.
3. **Given** uma contestação Pendente, **When** a Secretaria/CPL a recusa, **Then** o sistema exige
   justificativa da recusa, mantém o CNAE original e notifica o fornecedor do resultado.
4. **Given** um usuário sem fornecedor cadastrado/ativo, **When** tenta contestar, **Then** o sistema recusa
   (legitimidade = qualquer fornecedor cadastrado e ativo; não exige CNAE adjacente nem candidatura prévia).

---

### User Story 3 - Consulta de editais por critério (Priority: P3)

Gestores e a CPL consultam editais filtrando por atributos (secretaria, situação, CNAE), informando um
exemplo parcial de edital como critério de busca, para acompanhamento e gestão.

**Why this priority**: Suporte gerencial; agrega valor de operação, mas a publicação (US1) e a integridade
do enquadramento (US2) entregam o núcleo antes. Alinha-se à convenção de busca por instância parcial da
Constituição (§IV).

**Independent Test**: Com vários editais em estados distintos, consultar com um probe `{secretaria, situacao}`
retorna apenas os correspondentes; probe vazio retorna o conjunto default paginado.

**Acceptance Scenarios**:

1. **Given** editais de várias secretarias e situações, **When** a CPL consulta informando secretaria e
   situação como critério parcial, **Then** o sistema retorna apenas os editais que correspondem a todos os
   campos informados (campos não informados são ignorados).
2. **Given** uma grande quantidade de editais, **When** a consulta é feita, **Then** o resultado é paginado, e
   a paginação/ordenação são parâmetros separados do critério de busca.

---

### Edge Cases

- Editar um edital **já publicado**: qualquer campo é editável pela Secretaria/Gestor, mas **toda alteração
  gera registro antes/depois na trilha**; alterações de CNAE/quantitativos sobre edital exposto na vitrine
  são auditadas e reavaliam a vitrine. A correção de CNAE também pode ser disparada pelo fornecedor via o
  micro-fluxo da US2.
- CNAE inexistente ou mal formatado informado na criação — o sistema valida o formato/existência antes de
  salvar.
- Quantitativo zero ou negativo — rejeitado na validação.
- Encerramento de edital com contestações de CNAE ainda Pendentes — o sistema sinaliza as pendências antes de
  encerrar.
- Dois gestores editando o mesmo edital em Rascunho ao mesmo tempo — a última gravação válida prevalece, com
  registro de autor e timestamp (sem perda silenciosa).
- Tentar publicar um edital sem nenhum CNAE alvo — bloqueado (a vitrine não teria como casá-lo).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que perfis Secretaria/Gestor criem um edital informando objeto,
  **secretaria dona (única)**, **um ou mais CNAEs alvo**, quantitativos/capacidade e prazo de vigência.
- **FR-002**: O sistema MUST impor o invariante **"1 Edital = 1 Demanda"**: cada edital pertence a
  exatamente uma secretaria e representa uma única demanda; editais são isolados e **inacumuláveis** (regra
  de integridade de dados, não apenas de interface). *(RN007/AD-11)*
- **FR-003**: O sistema MUST manter o ciclo de vida do edital em estados explícitos — **Rascunho →
  Publicado → Encerrado** — e impedir transições inválidas.
- **FR-004**: O sistema MUST validar a completude e a integridade do edital (objeto, secretaria, ≥1 CNAE
  válido, quantitativo > 0, prazo) antes de permitir a **publicação**, bloqueando e sinalizando o que falta.
- **FR-005**: O sistema MUST tornar os editais **Publicados** disponíveis para a vitrine filtrada por CNAE
  (feature 002), e excluir da oferta a novas candidaturas os editais **Encerrados** (mantendo-os
  consultáveis).
- **FR-006**: O sistema MUST registrar na trilha de auditoria append-only toda criação, edição, publicação,
  encerramento e correção de CNAE de edital, com ator, evento, antes/depois quando aplicável, e data/hora.
  *(RNF003)*
- **FR-007**: O sistema MUST permitir que **qualquer fornecedor cadastrado e ativo** **conteste o
  enquadramento de CNAE** de um edital, com justificativa textual obrigatória, registrando a contestação
  como Pendente. A legitimidade não é restrita a priori por CNAE adjacente nem a quem tentou se candidatar; a
  procedência é decidida pela Secretaria/CPL.
- **FR-008**: O sistema MUST permitir que a Secretaria dona ou a CPL **acate** uma contestação corrigindo o(s)
  CNAE(s) do edital, **mantendo histórico** (valor anterior, novo valor, autor, motivo) e reavaliando a
  vitrine.
- **FR-009**: O sistema MUST permitir **recusar** uma contestação exigindo justificativa da recusa, mantendo
  o CNAE original e notificando o fornecedor do resultado.
- **FR-010**: O sistema MUST restringir a criação/edição/publicação/encerramento de editais aos perfis
  Secretaria/Gestor (e CPL onde aplicável); fornecedores não criam nem editam editais. *(RBAC)*
- **FR-011**: O sistema MUST oferecer **consulta de editais por instância parcial** (Query-by-Example,
  Constituição §IV): um exemplo parcial de edital (ex.: secretaria, situação, CNAE) filtra por
  correspondência (AND); campos ausentes são ignorados; paginação e ordenação são parâmetros separados.
- **FR-012**: O sistema MUST validar o **formato/existência do CNAE** informado (estrutura e enquadramento
  pertinente) antes de salvar/publicar, recusando CNAE inválido.
- **FR-013**: O sistema MUST permitir à Secretaria/Gestor **editar qualquer campo de um edital Publicado**
  (inclusive CNAE e quantitativos), registrando obrigatoriamente o valor **antes/depois** na trilha de
  auditoria e **reavaliando a vitrine** quando o CNAE mudar. A edição direta não dispensa o micro-fluxo de
  contestação iniciado pelo fornecedor (US2).
- **FR-014**: Quando uma alteração de CNAE em edital Publicado **amplia o público-alvo**, o sistema MUST
  reavaliar a vitrine imediatamente e **sinalizar/registrar** a ampliação, **mantendo o prazo de candidatura
  original**; a reabertura ou extensão de prazo é **ação manual e auditada** da Secretaria, nunca automática.

### Key Entities *(include if feature involves data)*

- **Edital**: a demanda publicável de uma secretaria — objeto, **secretariaId (única)**, **CNAEs alvo**,
  quantitativos/capacidade, prazo de vigência, **situação** (rascunho | publicado | encerrado). Invariante:
  1 edital ↔ 1 secretaria ↔ 1 demanda. É a entidade que a vitrine (002) consome.
- **ContestacaoCnae**: sinalização de incompatibilidade de enquadramento sobre um Edital — fornecedor autor,
  CNAE contestado, justificativa (obrigatória), situação (pendente | acatada | recusada), resultado/motivo.
  N:1 com Edital (histórico).
- **CorrecaoCnae (histórico)**: registro de alteração de CNAE de um edital — valor anterior, novo valor,
  autor (Secretaria/CPL), motivo, data/hora. Append-only no sentido de histórico rastreável.
- **Secretaria / Gestor (referências)**: dona do edital e autora das ações; RBAC define quem cria/corrige.
- **Fornecedor / CNAE (referências da 001)**: contexto de enquadramento e legitimidade de contestação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos editais publicados pertencem a exatamente uma secretaria e a uma única demanda (zero
  editais acumulando demandas/secretarias).
- **SC-002**: 100% das criações, publicações, encerramentos e correções de CNAE de editais geram registro de
  auditoria consultável.
- **SC-003**: Todo edital publicado com CNAE alvo aparece na vitrine para fornecedores de CNAE compatível, e
  todo edital encerrado deixa de ser oferecido a novas candidaturas.
- **SC-004**: 100% das correções de CNAE preservam o histórico antes/depois com autor e motivo.
- **SC-005**: Um gestor consegue criar e publicar um edital completo, sem apoio técnico, em menos de 5
  minutos.
- **SC-006**: 100% das contestações de CNAE recusadas possuem justificativa de recusa registrada.

## Assumptions

- O cadastro de Secretarias e os perfis Secretaria/Gestor e CPL já existem ou são reusados da fundação
  (features 001/002) — esta feature não cria o modelo de identidade.
- A **vitrine filtrada por CNAE** já está implementada (feature 002, `ListarEditaisCompativeis`); a 003
  apenas produz os editais reais que ela consome — sem recriar a vitrine.
- A noção de "demanda" do edital é a unidade de necessidade de uma secretaria (objeto + quantitativos); o
  detalhamento Item×Lote do **motor de distribuição** está fora desta feature e bloqueado por gate externo.
- Edição de editais já publicados é permitida em qualquer campo, mas sempre auditada (antes/depois); a
  correção de CNAE iniciada pelo fornecedor segue o micro-fluxo de contestação (US2), que coexiste com a
  edição direta da Secretaria.
- Notificações ao fornecedor sobre o resultado de uma contestação são, neste escopo, o reflexo de status no
  painel (SMS/e-mail é mecanismo externo de feature posterior).
- O catálogo/validação de CNAE reusa a fonte já adotada na 001 (consulta de enquadramento via ACL da
  Receita); a disponibilidade efetiva da fonte é dependência externa e não bloqueia a modelagem.

## Out of Scope

- Motor de distribuição, rateio e Cadastro de Reserva (Épico 5 — bloqueado pelo gate Item×Lote).
- Detalhamento de Item × Lote dentro do edital (depende da ratificação SMGA/TCE).
- Geração e exportação do malote SEI (Épico 6).
- Onboarding/cadastro do fornecedor e covalidação documental (features 001/002).
- A vitrine pública em si (já entregue na 002) — aqui apenas a alimentamos.
- Notificações por SMS/e-mail (mecanismo externo — feature posterior).
