# Especificação de Feature: Painéis — Admin e Transparência Pública

**Feature Branch**: `007-paineis-transparencia` | **Created**: 2026-06-30 | **Status**: Draft (cadência comprimida)

**Input**: Épico 9 — dashboard administrativo (funil de pendentes), portal público de transparência (volume/
editais/segmentos) e Design System compartilhado e acessível.

## Visão Geral

Entrega as **visões de leitura** do sistema: (1) um **dashboard administrativo** com o funil operacional
(pendências por etapa) para CPL/Administrador, e (2) um **portal público de transparência** que expõe, sem
autenticação e sem dados restritos, a demanda publicada (editais vigentes, secretarias/segmentos atendidos).
Ambos consomem **projeções somente leitura** das features anteriores; o **Design System** compartilhado e
acessível (e-MAG/WCAG 2.1 AA) sustenta as telas.

## Clarifications

### Session 2026-06-30

- Q: As projeções dos painéis são sob demanda ou materializadas/cache? → A: **Sob demanda** — calculadas a cada requisição (sempre frescas) a partir das fontes de leitura; materialização/cache/CQRS fica como otimização futura, sem mudar o contrato.
- Q: Quais agregados o portal público expõe? → A: **Editais vigentes (contagem) + secretarias + segmentos (CNAEs)** — agregados não-identificáveis; NÃO expõe fornecedores, valores nem dados pessoais (evita reidentificação em segmentos pequenos).

## User Stories

### US1 — Dashboard administrativo / funil de pendentes (P1) 🎯 MVP
A CPL vê, num painel, o funil: fornecedores/documentos pendentes de covalidação, editais por situação,
bloqueios ativos. **Independent Test**: com dados das features anteriores, o dashboard retorna as contagens por
etapa; restrito a CPL/Administrador.

### US2 — Portal público de transparência (P2)
Qualquer cidadão vê, sem login, os editais vigentes, as secretarias e os segmentos (CNAEs) atendidos, sem
nenhum dado restrito. **Independent Test**: sem autenticação, o portal retorna agregados públicos; nenhum dado
pessoal/restrito é exposto.

### US3 — Design System compartilhado e acessível (P3)
As telas reusam o Design System (tokens/componentes) com acessibilidade e-MAG/WCAG 2.1 AA. **Independent Test**:
as telas novas passam no gate de acessibilidade (cypress-axe) sem violações sérias.

## Requirements

- **FR-001**: O dashboard administrativo MUST expor o **funil de pendentes** (documentos pendentes de
  covalidação, editais por situação, bloqueios ativos) a partir de projeções de leitura.
- **FR-002**: O dashboard MUST ser restrito a **CPL/Administrador** (RBAC).
- **FR-003**: O portal público MUST expor, **sem autenticação**, editais vigentes, secretarias e segmentos
  (CNAEs) atendidos. *(Constituição §VI)*
- **FR-004**: O portal público MUST NÃO expor **nenhum dado restrito/pessoal**. O conjunto exposto limita-se a
  **editais vigentes (contagem), secretarias e segmentos (CNAEs)** — agregados não-identificáveis; fornecedores,
  valores e dados pessoais ficam de fora (evita reidentificação em segmentos pequenos).
- **FR-005**: As telas novas MUST aderir ao **Design System** e à acessibilidade **e-MAG/WCAG 2.1 AA**.
- **FR-006**: As projeções são **somente leitura** — os painéis não criam/alteram dado de domínio.
- **FR-007**: As projeções são calculadas **sob demanda** a cada requisição (sempre frescas) a partir das
  fontes de leitura; materialização/cache é otimização futura que não altera o contrato.

## Key Entities (projeções de leitura, não persistidas)

- **FunilAdmin**: `{ documentosPendentes, editaisPorSituacao: {rascunho,publicado,encerrado}, bloqueiosAtivos }`.
- **TransparenciaPublica**: `{ editaisVigentes, secretarias: string[], segmentos: string[] }` (segmentos = CNAEs alvo dos editais publicados).

## Success Criteria

- **SC-001**: O dashboard reflete corretamente as contagens por etapa (consistência com as fontes).
- **SC-002**: O portal público não expõe nenhum dado restrito (verificável: só agregados).
- **SC-003**: As telas novas passam no gate de acessibilidade (sérias/críticas = 0).
- **SC-004**: Nenhuma rota de painel altera dado de domínio (somente leitura).

## Assumptions / Out of Scope

- "Volume investido" monetário (R$) NÃO é modelado nas features atuais (não há valor financeiro no Edital);
  o portal expõe a **demanda publicada** (editais/quantitativos/segmentos), não cifras de R$. BI avançado e
  cifras financeiras ficam para evolução.
- Projeções reusam as fontes de 002/003/004 por portas de leitura; sem novo armazenamento.
- O Design System (`frontend/design-system`) já existe — esta feature o **reusa** e o aplica nas telas novas.
