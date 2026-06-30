# Phase 0 — Research: Editais Individualizados por Secretaria

Sem `NEEDS CLARIFICATION` — tech context herdado da fundação (001/002); ambiguidades resolvidas no clarify
(Session 2026-06-30: edição de Publicado, ampliação de público-alvo, legitimidade da contestação).

## D1 — Reuso/extensão do módulo `editais`
- **Decisão:** estender o módulo `editais` (Clean Architecture) já existente em vez de criar novo; reusar
  identidade/RBAC, barramento de eventos, auditoria e a vitrine `ListarEditaisCompativeis` (002).
- **Rationale:** a vitrine e a entidade `Edital` já existem; a 003 produz os editais reais que a vitrine
  consome. Evita duplicação e mantém invariantes (AD-1/11/16/18).
- **Alternativas:** novo módulo `licitacoes` — rejeitado (editais já são um módulo).

## D2 — Reconciliação do ciclo de vida do Edital
- **Decisão:** o ciclo canônico passa a ser **`rascunho → publicado → encerrado`**. O estado existente
  `aberto` é renomeado/semanticamente mapeado para **`publicado`**; o estado `distribuido` (legado, ligado ao
  motor) sai do escopo desta feature e fica reservado ao Épico 5. Adiciona-se `encerrado`.
- **Rationale:** alinhar à terminologia da spec (FR-003) sem arrastar o motor (bloqueado) para cá.
- **Alternativas:** manter `aberto/distribuido` — rejeitado (não cobre encerramento nem casa com a spec);
  introduzir muitos sub-estados — rejeitado (over-engineering para o MVP).
- **Impacto:** a vitrine (002) filtra por situação; ajustar o predicado para `publicado` (era `aberto`).

## D3 — Edição auditada de edital Publicado (clarify Q1 = B)
- **Decisão:** qualquer campo de um edital Publicado é editável pela Secretaria/Gestor; **toda alteração
  grava antes/depois** na trilha (evento `EditalEditado`); mudança de CNAE reavalia a vitrine.
- **Rationale:** flexibilidade operacional com rastreabilidade total (Princípio II). A integridade vem da
  auditoria, não da imutabilidade.
- **Alternativas:** congelar campos sensíveis (A) ou imutável (C) — rejeitadas pelo solicitante.

## D4 — Ampliação de público-alvo e prazo (clarify Q2 = A)
- **Decisão:** alteração de CNAE que amplia o público-alvo **reavalia a vitrine imediatamente e sinaliza**
  (evento `PublicoAlvoAmpliado`), mas **mantém o prazo**; reabertura/extensão é ação manual auditada.
- **Rationale:** preserva isonomia visível sem reabertura automática nem acoplamento ao motor (bloqueado).

## D5 — Contestação de CNAE e legitimidade (clarify Q3 = A)
- **Decisão:** **qualquer fornecedor cadastrado e ativo** pode abrir contestação de CNAE (justificativa
  obrigatória); estados `pendente → acatada | recusada`; acatar corrige o CNAE (via `EditarEdital`) com
  histórico; recusar exige justificativa. Eventos: `ContestacaoCnaeAberta/Acatada/Recusada`.
- **Rationale:** não barrar a priori quem foi indevidamente filtrado; procedência julgada pela Secretaria/CPL
  (RBAC). Justificativa obrigatória espelha o padrão antifraude da 002 (RN003).

## D6 — Validação de CNAE
- **Decisão:** validar formato (subclasse 7 dígitos — padrão D2 da 001) e enquadramento via o **adaptador ACL
  da Receita** já existente; CNAE inválido é recusado antes de salvar/publicar.
- **Rationale:** AD-4/5; reusa o gateway com proveniência; agnóstico de fonte.

## D7 — Busca por instância parcial (QBE — FR-011 / Constituição v3.3.0)
- **Decisão:** a consulta de editais aceita um probe parcial de `Edital` (secretaria, situação, CNAE) como
  filtro AND; campos ausentes ignorados; paginação/ordenação fora do probe. Mesmo padrão da 002
  (`buscarPorExemplo`).
- **Rationale:** honra o Princípio IV; reusa a classe rica `Edital` (sem DTO de filtro paralelo).
