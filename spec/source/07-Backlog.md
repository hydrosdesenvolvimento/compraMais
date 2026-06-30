07 - Backlog
=============

Resumo
------
Backlog gerado a partir dos Requisitos e Artefatos em [03-HDR.md](03-HDR.md), [04-Arquitetura.md](04-Arquitetura.md), [05-HistoriasUsuario.md](05-HistoriasUsuario.md) e [06-CasosUso.md](06-CasosUso.md). Itens organizados por Release sugerida (MVP / Release 2 / Infra & Não-Funcionais).

MVP (Release 1) — mínimo viável para operação de credenciamento
- BI-001: Cadastro via CNPJ e integração Receita Federal
  - Descrição: Cadastro de fornecedor por CNPJ que preenche automaticamente dados cadastrais e CNAEs.
  - Requisitos: RF001
  - Histórias relacionadas: HU001
  - Casos de Uso: UC001
  - Módulo: Catálogo/Cadastros base
  - Prioridade: Must Have
  - Critério de aceite: integração automática com Receita ou entrada manual com flag de covalidação.

- BI-002: Upload documental e repositório reutilizável
  - Requisitos: RF002
  - Histórias: HU006
  - Casos de Uso: UC004
  - Módulo: Credenciamento e Covalidação
  - Prioridade: Must Have

- BI-003: Filtro por CNAE e visibilidade de editais compatíveis
  - Requisitos: RF003
  - Histórias: HU003
  - Casos de Uso: UC003
  - Módulo: Credenciamento e Covalidação
  - Prioridade: Must Have

- BI-004: Motor de Distribuição Inteligente (rateio)
  - Requisitos: RF005, RN005
  - Histórias: HU009
  - Casos de Uso: UC009
  - Módulo: Distribuição Inteligente
  - Prioridade: Must Have

- BI-005: Geração de Malote SEI otimizado
  - Requisitos: RF007, RNF002, RNF004
  - Histórias: HU010
  - Casos de Uso: UC010
  - Módulo: Integração Processual (Malote)
  - Prioridade: Must Have

- BI-006: Verificação de inadimplência (PGM/SICAF)
  - Requisitos: RF011, RNF001
  - Histórias: HU002
  - Casos de Uso: UC002
  - Módulo: Catálogo/Cadastros base
  - Prioridade: Must Have

Release 2 — melhorias operacionais e painéis
- BI-007: Covalidação humana com justificativa e workflow de análise
  - Requisitos: RF004, RN003
  - Histórias: HU007
  - Casos de Uso: UC007
  - Módulo: Credenciamento e Covalidação
  - Prioridade: Must Have

- BI-008: Dashboard interno de gestão (Painel Administrativo)
  - Requisitos: RF013
  - Histórias: HU014
  - Casos de Uso: UC011? (painel interno)
  - Módulo: Administração do Sistema
  - Prioridade: Should Have

- BI-009: Portal público de transparência (BI)
  - Requisitos: RF010, RNF006
  - Histórias: HU012
  - Casos de Uso: UC011
  - Módulo: Dashboard (BI Público)
  - Prioridade: Should Have

Infra / Não-Funcionais / Conformidade
- INF-001: Auditoria imutável e exportação de logs
  - Requisitos: RF014, RNF003, RNF004
  - Histórias: HU011
  - Casos de Uso: UC012
  - Módulo: Auditoria e Logs
  - Prioridade: Must Have (conformidade)

- INF-002: Disponibilidade e escalabilidade (alta disponibilidade)
  - Requisitos: RNF005
  - Módulo: Administração do Sistema / Infra
  - Prioridade: Must Have

- INF-003: Usabilidade e identidade visual (Acessibilidade)
  - Requisitos: RNF006
  - Módulo: Dashboard (BI Público) / Frontend
  - Prioridade: Should Have

Backlog técnico e tarefas de suporte
- CH-001: Integrações com PGM, SICAF e endpoints fallback
- CH-002: Worker de compressão e processamento assíncrono do Malote
- CH-003: Storage seguro (Object Storage) e housekeeping de documentos expirados

Rastreabilidade rápida
- Todos os itens acima referenciam RF/RN/RNF listados em [03-HDR.md](03-HDR.md). Correspondência HU/UC verificada em [05-HistoriasUsuario.md](05-HistoriasUsuario.md) e [06-CasosUso.md](06-CasosUso.md).

Observações e próximos passos sugeridos
- Sugerir estimativas (story points) e dividir BI-004 (Motor de Distribuição) em subtarefas: algoritmo, simulações, UI de configuração, testes de aceitação.
- Validar com o comitê técnico as integrações PGM (autorização) e o limite MB do SEI antes de finalizar RNF002.

---
Gerado automaticamente com base nos artefatos 01–06. Quer que eu crie issues/epics no repositório ou atribua estimativas? 
