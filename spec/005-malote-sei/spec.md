# Especificação de Feature: Malote SEI

**Feature Branch**: `005-malote-sei` | **Created**: 2026-06-30 | **Status**: Draft (cadência comprimida)

**Input**: Épico 6 — geração assíncrona do malote ordenado, compressão/fragmentação por limite configurável
do SEI, e exportação idempotente para upload manual.

## Visão Geral

Gera o **malote** (pacote documental) de um fornecedor habilitado para protocolo no SEI municipal. A geração é
**assíncrona** (fora da thread de requisição — Constituição §IV/AD-21), respeita a **ordem legal** das peças
(1º CNPJ, 2º Documento Pessoal, 3º Anexos, 4º Certidões), **comprime e fragmenta** quando excede o limite em
MB configurável do SEI, e a **exportação é idempotente** (reexportar não duplica). Consome o conjunto de
documentos/fornecedor; o vínculo com a saída da distribuição (Épico 5) é por **entrada fornecida** (simulada
enquanto o motor está bloqueado).

## Clarifications

### Session 2026-06-30

- Q: A geração assíncrona deve ser durável? → A: **Fila durável + retry** — a solicitação é persistida e o worker processa fora da thread, reprocessando em falha; estado rastreável (pendente→gerado) que sobrevive a restart. Perda silenciosa de malote é inaceitável (entregável legal/TCE).
- Q: Como tratar peça única que excede o limite mesmo comprimida? → A: **Fragmento próprio + sinalização** — a peça indivisível vira um fragmento isolado; o sistema marca "peça acima do limite" para tratamento manual da CPL, mas conclui o malote sem corromper o documento (sem split binário).
- Q: O limite em MB do SEI é global ou por edital/secretaria? → A: **Global** — um único parâmetro do SEI municipal (`SEI_MALOTE_LIMITE_MB`), aplicado a todos os malotes. O limite é característica do sistema SEI, não do edital/secretaria.

## User Stories

### US1 — Geração assíncrona do malote ordenado (P1) 🎯 MVP
A CPL aciona a geração do malote de um fornecedor; o sistema monta as peças na ordem legal, fora da thread de
requisição, e marca o malote como `gerado`. **Independent Test**: acionar geração → status `gerado`, peças na
ordem 1-CNPJ→2-Pessoal→3-Anexos→4-Certidões; auditado.

### US2 — Compressão e fragmentação por limite (P2)
Quando o malote excede o limite em MB do SEI (parâmetro), o sistema comprime e, se necessário, fragmenta em
partes que respeitam o limite, preservando a ordem. **Independent Test**: malote acima do limite → N fragmentos
todos ≤ limite, ordem preservada.

### US3 — Exportação idempotente (P2)
A CPL exporta o malote para upload manual no SEI; reexportar o mesmo malote **não duplica** nem corrompe.
**Independent Test**: exportar duas vezes → mesmo identificador/resultado; auditado uma vez por exportação efetiva.

## Requirements

- **FR-001**: Gerar o malote de um fornecedor montando as peças na **ordem legal** (CNPJ, Documento Pessoal,
  Anexos, Certidões). *(AD-21)*
- **FR-002**: A geração MUST ocorrer de forma **assíncrona** e **durável**, fora da thread de requisição: a
  solicitação é persistida e processada por um worker que **reprocessa em falha** (retry), com estado
  rastreável (pendente→gerado) que sobrevive a reinício — sem perda silenciosa.
- **FR-003**: O malote MUST respeitar o **limite em MB do SEI** — um **parâmetro global** do sistema SEI
  municipal (`SEI_MALOTE_LIMITE_MB`), não por edital/secretaria; acima dele, **comprimir** e, se preciso,
  **fragmentar** em partes ≤ limite, preservando a ordem.
- **FR-004**: A **exportação** MUST ser **idempotente** — reexportar o mesmo malote não duplica nem corrompe.
- **FR-005**: Geração, fragmentação e exportação geram registro de **auditoria** (AD-18).
- **FR-006**: Ações restritas a **CPL/Administrador** (RBAC).
- **FR-007**: A consulta de malotes MUST aceitar **busca por instância parcial** (QBE — §IV) por fornecedor/edital/status.
- **FR-008**: O malote/fragmento **nunca** trafega pela thread de requisição (gerado em background; entregue por referência).
- **FR-009**: Quando uma **peça indivisível** exceder o limite mesmo após compressão, o sistema MUST gerá-la
  como **fragmento próprio** e **sinalizar** "peça acima do limite" para tratamento manual da CPL, concluindo
  o malote sem **split binário** (que invalidaria o documento legal).

## Key Entities

- **Malote** (extends EntidadeBase): `fornecedorId`, `editalId`, `pecas: Peca[]`, `status` (pendente|gerado|exportado),
  `fragmentos: Fragmento[]`, `limiteBytes`. Métodos: `montar` (ordena), `fragmentar(limite)`, `marcarExportado`.
- **Peca**: `tipo` (cnpj|pessoal|anexo|certidao), `ordem` (1..4), `ref`, `tamanhoBytes`.
- **Fragmento**: `indice`, `pecasRefs`, `tamanhoBytes` (≤ limite).

## Success Criteria

- **SC-001**: 100% dos malotes gerados respeitam a ordem legal das peças.
- **SC-002**: Nenhum fragmento excede o limite configurável.
- **SC-003**: Reexportação não cria malote/fragmento duplicado (idempotência verificável).
- **SC-004**: Geração nunca bloqueia a thread de requisição (executa em background).

## Assumptions / Out of Scope

- Entrada (fornecedor + documentos) é fornecida; o vínculo real com a distribuição (Épico 5) está bloqueado
  pelo gate Item×Lote — aqui a entrada é parametrizável/simulada.
- Compressão/fragmentação reais (zlib/zip) são detalhe de infra; o MVP modela o cálculo de tamanho/ordem e o
  contrato. Upload efetivo ao SEI e o canal de protocolo são externos (fora do escopo).
