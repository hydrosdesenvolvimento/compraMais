# Phase 1 — Data Model: Auditoria — Consulta e Exportação

> Leitura sobre o módulo `auditoria`. A entidade `AuditRecord` é **imutável** e já existe (AD-18); esta
> feature não a altera. Datas ISO-8601 UTC. Clean Architecture (AD-32).

## AuditRecord (referência — imutável, já existente)
- `id: UUID`, `usuario: string|null` (ator), `evento: string` (nome da ação), `timestamp: ISO`,
  `ip: string|null`, `payload: Readonly<Record>` (inclui `aggregateId`, `eventVersion`, `empresa` e, quando
  aplicável, `editalId` e demais dados da mudança).
- Criado por `AuditRecord.fromEvent` no escritor único `AuditConsumer`. **Nenhuma mutação** nesta feature.

## AuditQuery (probe QBE — estendido nesta feature)
- Campos: `usuario?`, `evento?`, `de?` (ISO), `ate?` (ISO), `editalId?`. Filtro AND; ausentes ignorados.
- **Novos**: `editalId` passa a ser efetivamente filtrado (hoje ignorado no adaptador memory — casa contra
  `payload.editalId`/`aggregateId`); paginação `page`/`size`; ordenação determinística (timestamp + `id`).
- Validação: `de > ate` → erro de filtro (FR-010).

## ConsultarTrilha (caso de uso — leitura)
- `consultar(probe: AuditQuery, page?): Promise<AuditRecord[]>` — aplica QBE, ordena de forma determinística
  (FR-004), pagina. Não escreve nada (FR-003).

## ExportarTrilha (caso de uso — leitura → artefato)
- `exportar(probe, formato: 'csv'|'json'): Promise<{ conteudo: string|stream; mime; nome }>` — serializa o
  conjunto filtrado fielmente (FR-007); streaming/paginado; teto configurável sinaliza volume (FR-011).
- CSV: cabeçalho `id,usuario,evento,timestamp,ip,payload` (payload serializado); JSON: array de registros.

## Porta de repositório (estendida)
- `AuditRepository.query(filtro: AuditQuery): Promise<AuditRecord[]>` — completar `editalId` + paginação +
  ordenação no adaptador memory (e refletir no adaptador pg, somente SELECT).

## RBAC (referência/extensão)
- Perfis autorizados: `cpl`, `administrador`, **`auditor`** (somente-leitura). Demais → 403 (FR-008).
- Sem mascaramento de PII (clarify Q1): o RBAC é a salvaguarda; autorização ⇒ base legal LGPD.

## Eventos
- **Nenhum evento novo** e nenhuma escrita na trilha (AD-18 inalterado). Esta feature só LÊ e EXPORTA.
