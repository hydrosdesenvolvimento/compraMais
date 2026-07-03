# Especificação de Feature: Tela Única de Contestação e Direitos do Titular (LGPD)

**Feature Branch**: `006-contestacao-direitos-lgpd` | **Created**: 2026-06-30 | **Status**: Draft (cadência comprimida)

**Input**: Épico 7 — tela única de contestação consolidada + direitos do titular LGPD (acesso, correção,
exclusão e descarte por retenção).

## Visão Geral

Fecha o ciclo de relacionamento com o fornecedor/titular: (1) consolida **todas as pendências** num só lugar
(documentos reprovados, bloqueios, contestações de CNAE, solicitações em aberto), e (2) implementa os
**direitos do titular LGPD** — acesso, correção, exclusão e descarte por política de retenção. Direitos que
exigem o **próprio titular** NÃO são exercíveis por procurador (Constituição §V).

## Clarifications

### Session 2026-06-30

- Q: O prazo de retenção é único ou por categoria de dado? → A: **Por categoria de dado** (cadastral, fiscal, contratual…), cada um com prazo configurável; o descarte avalia a elegibilidade pelo prazo da categoria do dado, refletindo a realidade legal (14.133/LGPD).
- Q: Quem atende/recusa as solicitações de direito do titular? → A: **Papel `dpo` (Encarregado, LGPD art. 41)** dedicado, com **Administrador** como fallback; CPL não atende direitos do titular.

## User Stories

### US1 — Tela única de contestação consolidada (P1) 🎯 MVP
O fornecedor vê, num ponto único, todas as suas pendências (documento reprovado, bloqueio fiscal, contestação
de CNAE, solicitações LGPD) com o próximo passo de cada uma. **Independent Test**: com pendências de tipos
distintos, o endpoint retorna todas com `tipo` e `proximoPasso`.

### US2 — Direitos do titular: acesso e correção (P1)
O titular solicita acesso aos seus dados pessoais ou a correção de um dado; o sistema registra a solicitação,
permite o atendimento e mantém rastro. **Independent Test**: solicitar acesso → registro `pendente`; atender →
`atendida`; procurador não pode exercer (403).

### US3 — Direito de exclusão e descarte por retenção (P2)
O titular solicita exclusão; o sistema avalia a **política de retenção** (dados sob obrigação legal de guarda
não são apagáveis antes do prazo) e descarta o que é elegível. **Independent Test**: registro dentro do prazo
de retenção → exclusão negada/retida; fora do prazo → elegível a descarte.

## Requirements

- **FR-001**: Apresentar num **ponto único** todas as pendências do fornecedor (documentos reprovados,
  bloqueios, contestações de CNAE, solicitações LGPD) com o próximo passo. *(consolida RF016 + 002/003)*
- **FR-002**: Permitir ao **titular** solicitar **acesso** aos seus dados pessoais (LGPD art. 18).
- **FR-003**: Permitir ao **titular** solicitar **correção** de dado pessoal, com rastro.
- **FR-004**: Permitir ao **titular** solicitar **exclusão**; o atendimento respeita a **política de retenção**
  (dados sob guarda legal não são apagáveis antes do prazo).
- **FR-005**: Direitos que exigem o **próprio titular** NÃO são exercíveis por **procurador**. *(§V)*
- **FR-006**: Toda solicitação e atendimento de direito do titular gera **auditoria** (AD-18).
- **FR-007**: A consulta de solicitações MUST aceitar **busca por instância parcial** (QBE — §IV) por
  titular/tipo/status.
- **FR-008**: O **descarte por retenção** MUST avaliar a elegibilidade pela data de registro vs. o prazo de
  retenção **da categoria do dado** (cadastral, fiscal, contratual…), cada categoria com prazo configurável,
  nunca apagando dado ainda sob obrigação de guarda.
- **FR-009**: O atendimento/recusa de solicitações do titular MUST ser restrito ao papel **`dpo`
  (Encarregado)**, com **Administrador** como fallback; CPL não atende direitos do titular. *(LGPD art. 41)*

## Key Entities

- **SolicitacaoTitular** (extends EntidadeBase): `titularId`, `tipo` (acesso|correcao|exclusao), `detalhe`,
  `status` (pendente|atendida|recusada), `resultado`. Métodos: `atender`, `recusar(motivo)`.
- **PoliticaRetencao**: `prazosPorCategoria: { [categoria]: dias }`; método `elegivelParaDescarte(categoria, dataRegistro, hoje)`.
- **Pendência (visão consolidada)**: `tipo`, `referenciaId`, `motivo?`, `proximoPasso`.

## Success Criteria

- **SC-001**: 100% das pendências do fornecedor aparecem na tela única com próximo passo.
- **SC-002**: 100% das solicitações de direito do titular ficam auditáveis.
- **SC-003**: Procurador nunca exerce direito que exige o próprio titular (negado).
- **SC-004**: Nenhum dado sob obrigação legal de guarda é descartado antes do prazo de retenção.

## Assumptions / Out of Scope

- Identidade/papéis (titular, procurador) reusados de 001; o `titularId` é o CPF/fornecedor.
- A consolidação reusa as fontes de 002/003 (documentos, bloqueios, contestações de CNAE) por portas de leitura.
- O descarte físico real (anonimização/purge em storage) é detalhe de infra; o MVP modela a elegibilidade e a
  decisão. Notificações externas fora do escopo.
