# Compra Mais - Plataforma de Compras Municipalizadas

## PRD — Documento de Requisitos de Produto (Revisado)

---

**Projeto:** Compra Mais (Programa de Compras Municipalizadas)
**Cliente/Patrocinador:** Prefeitura Municipal de Rio Branco (SMGA / Gabinete do Prefeito)
**Versão:** 2.2 (revisada)
**Data:** 2026-06-29
**Autores:** John (PM), Mary (BA), Winston (Arquiteto), Sally (UX), Amelia (Dev), Murat (Test Architect), Paige (Tech Writer) — sessão BMad Party Mode
**Base:** `source/` (Descritivo, Escopo, HDR, Arquitetura, Histórias, Casos de Uso, Backlog, BPMN) + artefatos da sessão ([matriz-lacunas.md](matriz-lacunas.md), [plano-releases.md](plano-releases.md), [roteiro-demo-fieac.md](roteiro-demo-fieac.md))

---

## Controle de Versão

| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1.0 | 2026-06-22 | Equipe SMGA/CPL | Material-fonte (HDR e correlatos) |
| 2.0 | 2026-06-29 | Party Mode | PRD consolidado e revisado: motor reescrito, bloqueio transitório, biometria removida do MVP, bloco LGPD incorporado, requisitos novos (auth, contestação, consentimento), releases sequenciados |
| 2.1 | 2026-06-29 | bmad-architecture (Update) | Alinhamento com a espinha de arquitetura: política de indisponibilidade de API corrigida de `fail-closed` para **`fail-open + flag`** (RN002, §11) — decisão da sessão de arquitetura (AD-12) |
| 2.2 | 2026-06-29 | Party Mode (Update por designs) | Incorporação dos designs ratificados em `source/AI-UI-Design/`: slogan/value props (§1), papel **Procurador** (§4), **RF018** (re-sincronização Receita), **RN009** (dados da Receita read-only), referência ao contrato de UX (DESIGN/EXPERIENCE) em RNF006 |

---

## 1. Visão Geral

O **Compra Mais** é uma plataforma B2G (Business-to-Government) de gestão de compras públicas municipalizadas na modalidade de **credenciamento** (Lei 14.133/21, art. 79; Lei Municipal 2.027). Funciona como um "marketplace reverso" auditável que conecta demandas de secretarias municipais a fornecedores locais, substituindo o trâmite físico de papéis por um portal de autoatendimento contínuo, com **distribuição matematicamente justa** atrelada à capacidade produtiva de cada empresa.

> **Posicionamento (dos designs ratificados):** *"O comércio local conectado às compras da cidade."* — credenciamento 100% digital, editais filtrados pelo ramo e distribuição justa, sem fila e sem papel.

**Base tecnológica:** core adaptado do sistema estadual CompraAC, parametrizado para a Prefeitura de Rio Branco.

## 2. Problema

| Frente | Dor |
|---|---|
| Prefeitura (CPL) | Retrabalho conferindo as mesmas certidões a cada edital; digitalização e compressão manual para o SEI; consulta de débitos em múltiplos sites |
| Fornecedores | "Caça a editais" no Diário Oficial; processo analógico com idas à prefeitura |
| Controle | Fraudes documentais (QR Codes forjados, balanços maquiados); distribuição manual de cotas sob suspeita de favorecimento |

## 3. Objetivos e Métricas de Sucesso

| Objetivo | Métrica |
|---|---|
| Fomentar a economia local | % do orçamento de compras (~R$ 53 mi) executado com fornecedores locais |
| Eliminar retrabalho da CPL | Redução do tempo médio de habilitação documental |
| Distribuição justa e auditável | 100% das distribuições reproduzíveis e logadas |
| Bloqueio automático de inadimplentes | % de credenciamentos com verificação fiscal automática |
| Transparência | Portal público com indicadores atualizados |

## 4. Stakeholders

- **Prefeito (Patrocinador)** — transparência e prestação de contas.
- **SMGA (Gestor do Sistema)** — eficiência processual, visão macro.
- **CPL (Admin/Usuário-chave)** — cria editais, covalida documentação, gere distribuições e SEI.
- **Fornecedores locais (MEIs/MEs)** — autoatendimento, alertas, equidade. Acessam por um **papel** (ex.: titular ou **Procurador** que age em nome da empresa — ver RBAC e nota antifraude em RN009/§12).
- **FIEAC (Parceiro institucional)** — transparência do volume injetado.
- **Secretarias demandantes** — geram a demanda.
- **Órgãos de controle (TCE) / ANPD / DPO** — conformidade legal e de dados.

## 5. Escopo

### 5.1 Incluído (por onda — ver [plano-releases.md](plano-releases.md))
- **Onda 1 (Demo FIEAC, dados sintéticos):** cadastro CNPJ, filtro CNAE, motor de distribuição, geração de malote.
- **Onda 2 (MVP de produção):** integrações reais, bloqueio transitório de inadimplência, controles LGPD, tela de contestação, upload manual ao SEI.
- **Onda 3 (Release 2):** SEI automático, portal público de transparência, dashboard interno, notificações, covalidação madura, biometria condicional.

### 5.2 Não incluído (MVP)
- Transferência automática para o SEI (Release 2).
- Biometria facial / liveness (condicional, Release 2, somente com RIPD aprovado).
- Notificações SMS/e-mail (Release 2, requer gateway).
- GPI / Leilão / desfazimento.
- Empenho e pagamento (permanecem no SEI).

## 6. Requisitos Funcionais (revisados)

| ID | Requisito | Onda | Origem/Nota |
|---|---|---|---|
| RF001 | Cadastro B2G via CNPJ com autopreenchimento (Receita); **fallback manual covalidado** se a API estiver indisponível | 1/2 | Revisado (LAC-12) |
| RF002 | Upload documental (PDF/JPG/PNG) em repositório reutilizável até a expiração; **cifrado em repouso** | 2 | Revisado (LGPD) |
| RF003 | Filtro de editais por compatibilidade de CNAE | 1 | — |
| RF004 | Covalidação humana (aprovar/reprovar) com **justificativa obrigatória** na reprovação | 2 | — |
| RF005 | **Motor de Distribuição** (ver §8): water-filling iterativo + maiores restos (Hamilton) + desempate determinístico | 1/2 | Reescrito (LAC-04) |
| RF006 | Cadastro de Reserva / Segunda Demanda, com **ciclo de vida** definido (gatilho, promoção, substituição) | 2 | Revisado (LAC-14) |
| RF007 | Geração de malote ordenado (CNPJ→Doc→Anexos→Certidões) com **fragmentação parametrizável** | 1/2 | Revisado (LAC-05) |
| RF008 | Criação de editais individualizados (1 edital = 1 demanda) | 2 | — |
| RF009 | Notificações de vencimento (e-mail/SMS) | 3 | Gateway (LAC-07) |
| RF010 | Portal público de transparência | 3 | Stack BI (LAC-20) |
| RF011 | Verificação de inadimplência (PGM/SICAF) com **bloqueio transitório** (ver RN002) | 2 | Revisado (LAC-08) |
| RF012 | ~~Biometria facial (liveness)~~ — **removida do MVP**; condicional Release 2 com RIPD | 3 | Removida (LAC-09/10) |
| RF013 | Dashboard administrativo (funil de cadastros pendentes) | 2/3 | — |
| RF014 | Trilha de auditoria com consulta filtrada e exportação CSV/JSON | 2 | — |
| **RF015** | **Autenticação recorrente** (login/SSO/MFA, reset de senha) | 2 | **Novo** (LAC-03) |
| **RF016** | **Tela única de contestação/regularização** (correção de CNAE, recurso de reprovação, regularização fiscal) | 2 | **Novo** (LAC-11, convergência) |
| **RF017** | **Gestão de consentimento e direitos do titular LGPD** (acesso, correção, exclusão) | 2 | **Novo** (LAC-09) |
| **RF018** | **Re-sincronização dos dados do CNPJ** sob demanda (re-consulta à Receita, com timestamp da última sincronização e status) | 2 | **Novo** (design Minha conta) |

## 7. Requisitos Não Funcionais (revisados)

| ID | Requisito |
|---|---|
| RNF001 | Integrações (Receita, SICAF, LICON, PGM) via **adaptadores + circuit breaker + degradação graciosa**; dev contra mocks/contratos (Pact) |
| RNF002 | Compressão + **fragmentação** do malote; limite do SEI como **parâmetro de configuração** (caso de PDF único acima do limite: comprimir → split por página → rejeitar com aviso) |
| RNF003 | Trilha de auditoria em JSON imutável (usuário, evento, data, IP) |
| RNF004 | Conformidade Lei 14.133/21 (art. 79), Lei 2.027, TCE (preferência "por item") |
| RNF005 | Disponibilidade com **SLA numérico** (meta a ratificar — ex. 99,5%) e janela de manutenção definida |
| RNF006 | Identidade visual e acessibilidade conforme o **contrato de UX** ([DESIGN.md](ux-designs/ux-compra-mais-2026-06-29/DESIGN.md) / [EXPERIENCE.md](ux-designs/ux-compra-mais-2026-06-29/EXPERIENCE.md)): paleta azul institucional (azul-700 #0061AE), Poppins, acessibilidade e-MAG/WCAG 2.1 AA (foco visível âmbar, alto contraste, navegação por teclado) |
| **RNF007** | **LGPD:** base legal por categoria; cifra em repouso e trânsito; política de retenção e descarte; segregação de acesso; **RIPD**; **DPO designado** (Art. 41); acordos de compartilhamento (Art. 26) |
| **RNF008** | **Determinismo/reprodutibilidade** do motor de distribuição (mesma entrada → mesma saída, com sementes de desempate logadas) |

## 8. Especificação do Motor de Distribuição (RF005)

**Modelo:** distribuição igualitária limitada à capacidade declarada (*water-filling*), com tratamento determinístico do resto.

```
1. cota_ideal = water-filling ITERATIVO:
     divide a demanda igualmente entre os aptos;
     quem excede o teto declarado trava no teto;
     redistribui o saldo aos não-travados;
     REPETE até ninguém exceder (corrige a "passada única" do UC008).
2. Cada fornecedor recebe PISO(cota_ideal).
3. resto R = demanda − soma(pisos).
4. Distribui os R itens (um a um) a quem tem MAIOR parte fracionária E folga de teto (método de Hamilton).
5. Desempate: ordem de credenciamento; persistindo, menor CNPJ.
6. Exceção: capacidade_total < demanda → alerta de déficit de abastecimento.
7. Registrar a matriz de alocação + sementes de desempate na trilha imutável (RNF003).
```

**Decisões pendentes de ratificação:** método de resto e critério de desempate (crivo jurídico SMGA/TCE — LAC-04c/d); validação da capacidade autodeclarada via covalidação humana (LAC-04e).

## 9. Regras de Negócio (revisadas)

| ID | Regra |
|---|---|
| RN001 | Filtro restritivo por CNAE válido e ativo |
| RN002 | **Inadimplência → bloqueio TRANSITÓRIO**, reavaliado em cada porta (credenciamento → distribuição → contrato). Três estados: **débito regularizável** (bloqueia enquanto ativo), **penalidade com prazo** (até a data), **inidoneidade** (pelo termo). **Preserva o direito de regularização da ME/EPP (LC 123)** — nunca permanente. Política **fail-open + flag obrigatória para a CPL** na indisponibilidade de API (default ratificável pela Procuradoria; ver arquitetura AD-12) |
| RN003 | Covalidação antifraude obrigatória (Aprovar/Reprovar com justificativa) para documentos declaratórios |
| RN004 | Ingressantes retardatários → Cadastro de Reserva, sem refração retroativa |
| RN005 | Teto por capacidade declarada (base do water-filling) |
| RN006 | Balanço Patrimonial: idoneidade verificada por **covalidação humana** (não automática); mínimo o exercício anterior |
| RN007 | Editais rigorosamente individualizados (proibido "guarda-chuva") |
| RN008 | Ordenação e fragmentação do malote conforme RF007/RNF002 |
| RN009 | **Dados oficiais da Receita são somente leitura.** Após o autopreenchimento por CNPJ, apenas **Nome Fantasia, Endereço e Telefone** são editáveis pelo fornecedor; Razão Social, CNAE e Porte só mudam por re-sincronização (RF018). |

## 10. Roadmap de Releases

Ver [plano-releases.md](plano-releases.md). Síntese: **Onda 1** (demo FIEAC, sintética) → **Onda 2** (MVP produção, pós-gates) → **Onda 3** (Release 2).

## 11. Dependências e Gates Institucionais

| Gate | Bloqueia | Status |
|---|---|---|
| 🔴 Parecer LGPD + DPO + RIPD (LAC-09) | Onda 2 | Pendente |
| 🔴 Chaves/contratos de interoperabilidade (LAC-17) | Onda 2 | Pendente |
| 🔴 Limite em MB do SEI (LAC-05) | Onda 2 (ajuste fino) | Pendente |
| ⚖️ Decisão da Procuradoria sobre RN002 (LAC-08) | Onda 2 | Pendente |

> A **reunião única de interoperabilidade** cobre LAC-17 + acordos Art. 26 (LGPD) + ratificação do default da política de indisponibilidade (fail-open + flag, LAC-08/AD-12).

## 12. Riscos Principais

- Subestimar o esforço de integração com o legado PGM.
- Aumento de escopo por biometria entrar no MVP (mitigado: removida).
- Cronograma da FIEAC tratado como produção (mitigado: demo sintética + status "protótipo auditável").
- Capacidade autodeclarada como vetor de fraude (mitigado: covalidação humana).

## 13. Rastreabilidade

Mantida a espinha original HU ↔ RF ↔ RN ↔ UC ↔ Backlog (`source/`), estendida pelos requisitos novos (RF015–RF017, RNF007–RNF008) e pelas lacunas catalogadas em [matriz-lacunas.md](matriz-lacunas.md).

## 14. Lacunas Remanescentes (pós-revisão)

- 🔴 LAC-09 (parecer LGPD) — única bloqueadora puramente institucional.
- 🟡 LAC-04c/d (resto e desempate do motor) — recomendação pronta, aguarda ratificação.
- 🟠 LAC-04e (validação de capacidade), LAC-06 (SLA), LAC-07 (gateway), LAC-16 (item × lote).
- Demais 🟡/⚪ conforme matriz.

---

## Documentos Relacionados

- [Matriz de Lacunas](matriz-lacunas.md) · [Plano de Releases](plano-releases.md) · [Roteiro Demo FIEAC](roteiro-demo-fieac.md)
- `source/`: [Descritivo](../../source/01-DescritivoProduto.md) · [Escopo](../../source/02-DeclaracaoEscopo.md) · [HDR](../../source/03-HDR.md) · [Arquitetura](../../source/04-Arquitetura.md) · [Histórias](../../source/05-HistoriasUsuario.md) · [Casos de Uso](../../source/06-CasosUso.md) · [Backlog](../../source/07-Backlog.md) · [BPMN](../../source/08-BPMN.md)

---

*PRD produzido em sessão BMad Party Mode (roster software-development) — 2026-06-29. Recomenda-se validação formal via `bmad-prd` (intent: validate).*
