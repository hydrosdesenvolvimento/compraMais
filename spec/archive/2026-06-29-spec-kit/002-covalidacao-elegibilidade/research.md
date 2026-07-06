# Phase 0 — Research: Covalidação Antifraude e Elegibilidade Fiscal

Sem `NEEDS CLARIFICATION` — tech context herdado da fundação (001) e ambiguidades resolvidas no clarify.

## D1 — Reuso da fundação (001)
- **Decisão:** estender o módulo `credenciamento` (Clean Architecture) e reusar identidade/RBAC, barramento de eventos e auditoria já implementados; adicionar o adaptador ACL de dívida no padrão do adaptador da Receita.
- **Rationale:** evita reescrita; mantém invariantes (AD-1/4/18/30); o `Documento` da 001 é o alvo da covalidação.
- **Alternativas:** novo módulo isolado — rejeitado (covalidação pertence a credenciamento).

## D2 — Bloqueio transitório (RN002 / AD-12)
- **Decisão:** o bloqueio é **estado reavaliado em cada porta**, nunca permanente; três tipos (débito/penalidade/inidoneidade); ação-na-indisponibilidade = parâmetro com default **fail-open + flag**.
- **Rationale:** Constituição Princípio III; preserva direito de regularização da ME/EPP.

## D3 — Data de término (clarify)
- **Decisão:** **híbrido** — data da base oficial de sanções quando disponível; CPL registra como fallback. Débito regularizável não tem data fixa (vigora enquanto ativo).
- **Rationale:** auditabilidade (TCE) + resiliência quando a fonte não traz o prazo.

## D4 — Covalidação humana de declaratórios (RN006)
- **Decisão:** Balanço/Atestado exigem decisão humana da CPL (integridade/legibilidade/exercício ≥ anterior); o sistema não calcula índices contábeis.
- **Rationale:** "idoneidade" automática é indefinível; análise humana é a barreira antifraude.

## D5 — SLA da CPL (clarify)
- **Decisão:** **sem SLA obrigatório**; registrar fila pendente + tempo decorrido por documento (acompanhamento gerencial). Escalonamento por prazo fora de escopo.
- **Rationale:** decisão do solicitante; mantém o aceite testável (fila/tempo visíveis) sem prometer prazo.

## D6 — Adaptador de dívida (ACL)
- **Decisão:** `shared/acl/divida` com gateway por base (PGM/federais/estaduais), circuit breaker (Opossum), resultado com proveniência `{valor, fonte, timestamp, frescor}`, contrato Pact + mock.
- **Rationale:** AD-4/5; dev desbloqueado sem chaves reais; agnóstico de fonte (plugável).

## D7 — Busca por instância parcial (QBE — Constituição v3.3.0 / FR-015; clarify 2026-06-30)
- **Decisão:** o QBE aplica-se **apenas à listagem de coleção de uma entidade**. O único endpoint elegível na 002 é `GET .../documentos/pendentes`, que passa a aceitar um probe parcial de `Documento` (mínimo `status`, `tipo`) como filtro AND; campos ausentes são ignorados; paginação/ordenação ficam fora do probe. A agregação `/pendencias` e as leituras de recurso único por `fornecedorId` ficam **isentas**.
- **Rationale:** honra o MUST do Princípio IV onde há ganho real (CPL filtra a fila) sem sobre-engenheirar leituras aninhadas/agregadas. O probe reusa a classe rica `Documento` (não um DTO de filtro paralelo); o caso de uso traduz o probe em critério de repositório, preservando a regra de dependência (Domínio não conhece o transporte).
- **Alternativas:** (B) QBE em todo GET, inclusive `/pendencias` — rejeitado (agregação heterogênea não mapeia a um probe único); (C) QBE não-aplicável à 002 — rejeitado (a fila de documentos é genuinamente uma coleção de uma entidade).
