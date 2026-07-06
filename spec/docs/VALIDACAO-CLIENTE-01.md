# Compra Mais — Incorporação da Validação 01 (Cliente)

**Projeto:** Compra Mais (Programa de Compras Municipalizadas — Prefeitura de Rio Branco)
**Snapshot:** 2026-07-05
**Fonte de verdade:** este diretório (`spec/docs/`), versionado no git — ver [index.md](index.md).
**Insumo de origem:** [`../source/Validacoes/`](../source/Validacoes/) — feedback das visitas técnicas 5 e 6
(`FeedbackValidacao01.md`, `documento_validacao_cliente.md`, `RelatorioCruzamentoValidacao01-Prototipo.md`,
`AuditoriaBaseline02.md`) + documentos-fonte v2 (`Requisitos/03-HDR V2.md`, `HistoriasUsuario/…v2`,
`Backlog/…v2`, `CasosUso/…v2`, `BPMN/…v2`).

> **Papel deste documento.** Registra a **reconciliação** do feedback de validação do cliente (Validação 01)
> contra a documentação canônica **PRD v2.4 → v2.5**. É o **livro-razão de IDs**: mapeia cada item validado
> ao **ID global** correto e às decisões do solicitante, evitando a colisão de numeração com a linhagem
> local da fonte. Análogo a [VALIDACAO-MOCKUPS.md](VALIDACAO-MOCKUPS.md).

---

## 1. Contexto e regra de numeração

O lote de origem (`source/…/*v2.md`) traz uma numeração **local** que **colide** com o canônico:
a fonte usa `RF015/016/017` e `RN009/010` para *Termo de Responsabilidade / PDF do Edital / Desistência* e
*Imutabilidade / Formalização de desistência* — mas no canônico esses IDs **já significam outra coisa**
(RF015=Autenticação, RF016=Contestação, RF017=LGPD; RN009=Receita read-only, RN010=Procurador).

**Regra aplicada (convenção do [CONVERGENCIA.md](CONVERGENCIA.md) §3):** a numeração canônica é **global,
contígua e append-only por linhagem**. Os requisitos validados **não** herdam o ID da fonte; entram no
**fim da faixa**. A fonte permanece como **insumo bruto** (não canônico).

## 2. Decisões do solicitante (2026-07-05)

| # | Questão | Decisão |
|---|---|---|
| D1 | Escopo da atualização | **Executar o PRD v2.5 completo** — incorporar no canônico (prd, casos de uso, épicos, espinha, UX) com IDs globais novos. |
| D2 | Criação de edital: PDF do SEI substitui ou complementa o formulário? *(os dois docs-fonte se contradiziam)* | **Complementa.** Mantém o preenchimento estruturado (metadados, itens, CNAE — essencial ao filtro/distribuição/transparência) **e** adiciona o upload obrigatório do PDF oficial. Resolve a tensão a favor do `RelatorioCruzamento`. |
| D3 | Biometria / "Prova de vida" | **Ratificado o adiamento** — o cliente confirmou que a API não foi homologada. Fecha o conflito **G5** de [VALIDACAO-MOCKUPS.md](VALIDACAO-MOCKUPS.md): RF012/UC007 = pós-MVP definitivo (Release 2 condicional a RIPD). |
| D4 | Semântica de status `Requerente → Cadastrado` | **Renomear na doc E abrir história de migração de código** (schema/enum/`data-cy`/máquina de estado AD-14). Semântica oficial: **Cadastrado → Credenciado → Fornecedor**. |

## 3. Livro-razão de IDs — mapa Validação 01 → ID global

### 3.1 Novos Requisitos Funcionais

| ID global | Requisito | Substitui o ID local da fonte | Onda |
|---|---|---|---|
| **RF024** | **Termo de Responsabilidade** sobre a capacidade produtiva declarada (aceite legal obrigatório; bloqueia o prosseguimento sem aceite; registrado na trilha com versão + timestamp) | fonte "RF015" | 2 |
| **RF025** | **Anexação e download do PDF oficial do Edital** — admin anexa o PDF do SEI na criação (obrigatório para publicar); fornecedor baixa "Baixar Edital em PDF". **Complementa** RF008 (não substitui o formulário — D2) | fonte "RF016" | 2 |
| **RF026** | **Solicitação e covalidação de desistência** de credenciamento — a saída deixa de ser automática; exige confirmação de admin SMGA | fonte "RF017" | 2 |

### 3.2 Novas Regras de Negócio

| ID global | Regra | Substitui o ID local da fonte |
|---|---|---|
| **RN017** | **Distribuição matematicamente soberana:** vedada a edição manual das cotas por administradores após o cálculo (reforça a alocação append-only AD-10). Realocação só por eventos legítimos (desistência/substituição — RN018/RN004). | fonte "RN009" |
| **RN018** | **Formalização da desistência por covalidação:** a solicitação muda o status para **Pendente de Desistência**; a CPL/SMGA confirma → **Desistente** (aciona o Cadastro de Reserva, RN004/UC009) ou rejeita → reverte ao status anterior. Complementa RN016 (o cancelamento **antes** da distribuição permanece self-service; a desistência **após** distribuição exige covalidação). | fonte "RN010" |
| **RN019** | **Aceite obrigatório do Termo de Responsabilidade** (RF024) para declarar/confirmar a capacidade produtiva (RN005); sem aceite o credenciamento não prossegue. | — |
| **RN020** | **Confidencialidade do rateio:** na visão do fornecedor exibe-se apenas a demanda total do edital e a **cota própria**; o comparativo entre fornecedores não é exposto (o agregado segue disponível à CPL/auditoria). | — |
| **RN021** | **Semântica de status na comunicação:** pendência meramente documental exibe **"Em Análise"**; **"Bloqueado"** é reservado à inadimplência/dívida ativa (RN002). | — |

### 3.3 Novas Decisões de Arquitetura (Espinha)

| ID global | Decisão | Binds |
|---|---|---|
| **AD-39** | **PDF oficial do Edital como artefato anexado:** upload obrigatório para a transição `Rascunho → Aberto` (RN014); armazenado no object storage; disponibilizado para download ao fornecedor. | RF025, RN014, AD-16 |
| **AD-40** | **Desistência como transição covalidada e append-only** na máquina do Credenciamento (AD-14): estados `Pendente de Desistência → Desistente`; a confirmação emite evento e, quando havia cota homologada, aciona `SubstituicaoCota` (AD-10/AD-25). | RF026, RN018 |
| **AD-41** | **Nomenclatura da fase inicial do fornecedor = "Cadastrado"** (substitui "Requerente") na máquina de estado (AD-14). Adoção documental com **migração de schema/enum/`data-cy`/UI tratada como história dedicada**. Semântica oficial: `Cadastrado → Credenciado → Fornecedor`. | AD-14 |

### 3.4 Casos de Uso

| ID global | UC | Origem |
|---|---|---|
| **UC022** | **Baixar Edital Oficial em PDF** (Fornecedor) | RF025 |
| **UC023** | **Formalizar Desistência de Credenciamento** (Fornecedor solicita + CPL/SMGA covalida) | RF026, RN018, RN004 |
| *ext.* UC004 | + Aceite do **Termo de Responsabilidade** na declaração de capacidade | RF024, RN019 |
| *ext.* UC005 | + **Upload obrigatório do PDF** oficial para publicar | RF025, AD-39 |
| *ext.* UC008 | + **Imutabilidade** da matriz a edição manual + **visão individual** da cota | RN017, RN020 |
| *ext.* UC002/UC006 | + comunicação **"Em Análise"** vs "Bloqueado" | RN021 |
| *ext.* UC014 | + indicador **"Desistências Pendentes"** | RN018 |

### 3.5 Histórias (epics.md)

| História | Épico | Cobre |
|---|---|---|
| **1.8** Migração de nomenclatura `Requerente → Cadastrado` | 1 | AD-41 |
| **2.4** Termo de Responsabilidade na declaração de capacidade | 2 | RF024, RN019 |
| **3.5** Anexação e download do PDF oficial do Edital | 3 | RF025, AD-39 |
| **5.6** Visão individual da cota + vedação de edição manual | 5 ⚠️ | RN020, RN017 |
| **5.7** Desistência covalidada + acionamento da Reserva | 5 ⚠️ | RF026, RN018, AD-40 |
| **9.8** Card "Desistências Pendentes" no Painel Admin | 9 | RN018, RF013 |
| **9.9** Landing "Compra Mais Rio Branco" (identidade, e-mail, jornada de entrada) | 9 | RF010, UX |

## 4. Ajustes de UI/UX e nomenclatura (contrato de UX)

- **Ocultar rateio global** na visão do fornecedor — só demanda total + cota própria (RN020).
- **Landing pública "Compra Mais Rio Branco"** — logomarcas oficiais da Prefeitura, e-mail da comissão
  **`comissoes.smga22@gmail.com`**, paleta azul institucional.
- **Jornada de entrada** — site da Prefeitura → Landing pública → botão "Acessar Sistema/Cadastrar"
  (não é mais um link seco de login).
- **"Em Análise" vs "Bloqueado"** — card/label de pendência documental usa "Em Análise" (RN021).
- **Termo de Responsabilidade** — checkbox com "Prosseguir" desabilitado até o aceite (RF024).
- **Botões novos** — "Baixar Edital em PDF" (fornecedor), "Desistir do Edital" (fornecedor),
  "Confirmar Desistência" (admin, com observação opcional).
- **Card "Desistências Pendentes"** no dashboard admin.

## 5. Conflitos fechados e ratificações

- ✅ **G5 (biometria / "Prova de vida")** — **fechado**. O cliente ratificou o adiamento (API não homologada).
  RF012/UC007 seguem como **Release 2 condicional a RIPD**. A etapa "Prova de vida" do mockup não é MVP.
- ✅ **Criação de edital (PDF × formulário)** — resolvido a favor de **complementar** (D2). O formulário
  estruturado permanece; o PDF é anexo obrigatório.
- ✅ **Colisão de numeração** — resolvida por IDs globais (§1/§3); a linhagem local da fonte não é importada.

## 6. Lacunas abertas herdadas do cliente (não bloqueiam o canônico, bloqueiam desenvolvimento)

Catalogadas em [matriz-lacunas.md](matriz-lacunas.md):

| LAC | Item | Dono |
|---|---|---|
| **LAC-22** | Texto jurídico do **Termo de Responsabilidade** (validação do jurídico da Prefeitura) | SMGA/Jurídico |
| **LAC-23** | Critérios exatos de **convocação do Cadastro de Reserva** ("apenas falha do titular?") | SMGA/CPL |
| **LAC-24** | PDF do SEI: **extração automática (OCR/parse) vs. só armazenamento** | TI/SMGA |
| LAC-05 *(já aberta)* | Limite em MB do SEI (`SEI_MALOTE_LIMITE_MB`) | TI/SEI |
| LAC-08/LAC-17 *(já abertas)* | API da PGM (dívida ativa) — sem chaves; contingência: **upload manual de certidão** no MVP | Procuradoria/TI |

## 7. Nota de higiene (auditoria de baseline)

`AuditoriaBaseline02.md` sinalizou: artefatos do Compra Mais em pasta "Patrimonio Circular", nomes fora de
padrão (`…v2.md`, `03-HDR V2.md`) e o arquivo **`AuditoriaBPMN-V2.md` vazio (0 bytes)**. São questões de
**organização do repositório de origem**, não do canônico. Recomendação: normalizar nomes/localização em
`spec/source/` e gerar/remover o deliverable de auditoria BPMN vazio. Registrado como pendência operacional.

---

*Documento canônico — `spec/docs/VALIDACAO-CLIENTE-01.md`. Reconciliação PRD v2.4 → v2.5 (Validação 01).*
