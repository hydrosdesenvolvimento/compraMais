# Phase 0 — Research: Auditoria — Consulta e Exportação da Trilha

Sem `NEEDS CLARIFICATION` — tech context herdado da fundação; ambiguidades resolvidas no clarify
(Session 2026-06-30: PII sem mascaramento, papel `auditor`, exportação por streaming).

## D1 — Somente leitura sobre a trilha existente
- **Decisão:** estender o módulo `auditoria` apenas com **consulta e exportação**; o escritor único
  (`AuditConsumer`) e a entidade `AuditRecord` permanecem inalterados (AD-18).
- **Rationale:** o Princípio II exige imutabilidade; a feature não pode introduzir caminho de escrita.
- **Alternativas:** materializar uma "view de leitura" separada — desnecessário no MVP (a trilha já é a fonte).

## D2 — Consulta por instância parcial (QBE — FR-001 / v3.3.0)
- **Decisão:** `ConsultarTrilha` recebe um probe parcial do registro (`usuario`, `evento`, `de`, `ate`,
  `editalId`); filtro AND; campos ausentes ignorados. `AuditQuery` é estendido com `editalId` (hoje ignorado
  no adaptador em memória), paginação (`page`/`size`) e ordenação determinística.
- **Rationale:** mesmo padrão das features 002/003; reusa a porta `AuditRepository.query`.
- **Nota:** o `editalId` de um registro é derivado do `payload` (eventos de edital trazem `editalId`/
  `aggregateId`); o filtro casa contra esse campo.

## D3 — Validação de intervalo de datas (FR-010)
- **Decisão:** `de > ate` é recusado com erro de filtro explícito antes de consultar.
- **Rationale:** evita "vazio silencioso" que mascara erro do operador.

## D4 — Determinismo/ordenação (FR-004)
- **Decisão:** ordenação cronológica estável (timestamp asc/desc + desempate por `id`), para que a mesma
  consulta produza a mesma saída e ordem (reauditável byte a byte).
- **Rationale:** Princípio II (reauditabilidade pelo TCE).

## D5 — PII sem mascaramento (clarify Q1)
- **Decisão:** o conteúdo do registro é entregue integralmente aos perfis de controle autorizados; **não há
  mascaramento** nesta feature. A salvaguarda é o RBAC (FR-008); a autorização pressupõe base legal LGPD.
- **Rationale:** decisão do solicitante; simplifica e mantém a fidelidade da prestação de contas.

## D6 — RBAC: papel `auditor` somente-leitura (clarify Q2)
- **Decisão:** consulta/exportação liberadas a **CPL/Administrador** e a um papel dedicado **`auditor`**
  (somente-leitura, sem escrita/aprovação). Demais perfis negados (403).
- **Rationale:** menor privilégio e separação de funções para órgãos de controle.

## D7 — Exportação CSV/JSON por streaming (clarify Q3 / FR-005/006/007/011)
- **Decisão:** `ExportarTrilha` serializa o conjunto filtrado em CSV (cabeçalho + linhas) e JSON (coleção),
  processando em fluxo/paginação; acima de um **teto configurável** (default 50k) sinaliza/registra o volume
  e sugere refinar o filtro, mas conclui a exportação. Saída fiel ao filtro (FR-007).
- **Rationale:** evita estourar memória sem sacrificar completude nem fidelidade.
- **Alternativas:** limite rígido (recusa) ou tudo-de-uma-vez — rejeitados pelo solicitante.
