# Compra Mais - Plataforma de Compras Municipalizadas

## PRD — Documento de Requisitos de Produto (Revisado)

---

**Projeto:** Compra Mais (Programa de Compras Municipalizadas)
**Cliente/Patrocinador:** Prefeitura Municipal de Rio Branco (SMGA / Gabinete do Prefeito)
**Versão:** 2.4 (validação de mockups)
**Data:** 2026-07-02
**Autores:** John (PM), Mary (BA), Winston (Arquiteto), Sally (UX), Amelia (Dev), Murat (Test Architect), Paige (Tech Writer) — sessão BMad Party Mode
**Base:** `source/` (Descritivo, Escopo, HDR, Arquitetura, Histórias, Casos de Uso, Backlog, BPMN) + artefatos da sessão ([matriz-lacunas.md](matriz-lacunas.md), [plano-releases.md](plano-releases.md))

---

## Controle de Versão

| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1.0 | 2026-06-22 | Equipe SMGA/CPL | Material-fonte (HDR e correlatos) |
| 2.0 | 2026-06-29 | Party Mode | PRD consolidado e revisado: motor reescrito, bloqueio transitório, biometria removida do MVP, bloco LGPD incorporado, requisitos novos (auth, contestação, consentimento), releases sequenciados |
| 2.1 | 2026-06-29 | bmad-architecture (Update) | Alinhamento com a espinha de arquitetura: política de indisponibilidade de API corrigida de `fail-closed` para **`fail-open + flag`** (RN002, §11) — decisão da sessão de arquitetura (AD-12) |
| 2.2 | 2026-06-29 | Party Mode (Update por designs) | Incorporação dos designs ratificados em `source/AI-UI-Design/`: slogan/value props (§1), papel **Procurador** (§4), **RF018** (re-sincronização Receita), **RN009** (dados da Receita read-only), referência ao contrato de UX (DESIGN/EXPERIENCE) em RNF006 |
| 2.3 | 2026-07-02 | Party Mode (Convergência) | Convergência de linhagens de doc (ver [CONVERGENCIA.md](CONVERGENCIA.md)): resgate de 13 decisões do Spec-Kit — **RF019** (georreferenciamento/endereço estruturado), refino de RF003/RN001 (CNAE match exato 7 dígitos), **RN010–RN013** novas, **§15 Papéis/RBAC** e **§16 Catálogo de parâmetros**; correção do path do contrato de UX em RNF006; AD-34/35/36 na espinha |
| 2.4 | 2026-07-02 | Party Mode (Validação de mockups) | Validação dos mockups `AI-UI-Design/` vs doc (ver [VALIDACAO-MOCKUPS.md](VALIDACAO-MOCKUPS.md)): gaps do Painel Admin preenchidos — **RF020** (CRUD Secretarias), **RF021** (catálogo CNAE/setores), **RF022** (catálogo de tipos de documento), **RF023** (gestão de usuários internos); **RN014** (ciclo de vida do Edital), **RN015** (inativação preservando histórico), **RN016** (Termo de Aceite + cancelamento de credenciamento); §15 cargos operacionais; AD-37/AD-38 na espinha; conflito **"Prova de vida" × biometria removida** registrado para ratificação |

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
| RF003 | Filtro de editais por compatibilidade de CNAE — **match exato por subclasse (7 dígitos)**: o edital lista subclasses exigidas e o fornecedor é compatível se qualquer CNAE válido (principal ou secundário) bater exatamente; incompatíveis ocultos e bloqueados inclusive por link direto | 1 | Refinado (conv. 2026-07-02, `spec/001`) |
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
| **RF015** | **Autenticação recorrente** (login/SSO/MFA, reset de senha por esquecimento **e troca da própria senha pelo usuário autenticado** — exige senha atual) | 2 | **Novo** (LAC-03); troca autenticada da própria senha add. na validação de mockups |
| **RF016** | **Tela única de contestação/regularização** (correção de CNAE, recurso de reprovação, regularização fiscal) | 2 | **Novo** (LAC-11, convergência) |
| **RF017** | **Gestão de consentimento e direitos do titular LGPD** (acesso, correção, exclusão) | 2 | **Novo** (LAC-09) |
| **RF018** | **Re-sincronização dos dados do CNPJ** sob demanda (re-consulta à Receita, com timestamp da última sincronização e status) | 2 | **Novo** (design Minha conta) |
| **RF019** | **Endereço estruturado do fornecedor para análise territorial** (captura geolocalizável do endereço para fomento local na camada de Transparência) | 2 | **Novo** (resgate `spec/001` FR-012 — convergência 2026-07-02) |
| **RF020** | **Gestão (CRUD) de Secretarias** — cadastro de secretaria demandante (Nome, Sigla, Responsável) como entidade selecionável na criação de editais (1 Edital → 1 Secretaria, AD-16) | 2 | **Novo** (validação mockup Admin) |
| **RF021** | **Gestão (CRUD) do catálogo de CNAE / Setores industriais** — cadastro de código CNAE + descrição da atividade, base selecionável para "CNAE exigido" do edital e para o match do fornecedor (RF003) | 2 | **Novo** (validação mockup Admin) |
| **RF022** | **Gestão (CRUD) do catálogo de Tipos de Documento** — define os documentos aceitos (Nome, Formato aceito, regra de Validade/"Sem validade", Categoria, exigência de Exercício p/ Balanço); parametriza o upload (RF002) e a covalidação (RF004) | 2 | **Novo** (validação mockup Admin) |
| **RF023** | **Gestão de Usuários internos (servidores)** — CRUD de usuários da Prefeitura com atribuição de **cargo/perfil** (RBAC §15) e reset de senha; distinto do autocadastro do fornecedor (RF001/RF015) | 2 | **Novo** (validação mockup Admin) |

## 7. Requisitos Não Funcionais (revisados)

| ID | Requisito |
|---|---|
| RNF001 | Integrações (Receita, SICAF, LICON, PGM) via **adaptadores + circuit breaker + degradação graciosa**; dev contra mocks/contratos (Pact) |
| RNF002 | Compressão + **fragmentação** do malote; limite do SEI como **parâmetro de configuração global** (`SEI_MALOTE_LIMITE_MB`, §16); cadeia comprimir → split por página → fragmentar. Peça **única indivisível** acima do limite vira **fragmento isolado sinalizado** para tratamento manual da CPL (sem split binário, sem corromper). Geração em **fila durável + retry** (estado pendente→gerado sobrevive a restart; perda silenciosa é inaceitável — entregável legal/TCE). *(resgate `spec/005`)* |
| RNF003 | Trilha de auditoria em JSON imutável (usuário, evento, data, IP) |
| RNF004 | Conformidade Lei 14.133/21 (art. 79), Lei 2.027, TCE (preferência "por item") |
| RNF005 | Disponibilidade com **SLA numérico** (meta a ratificar — ex. 99,5%) e janela de manutenção definida |
| RNF006 | Identidade visual e acessibilidade conforme o **contrato de UX** ([DESIGN.md](ux/DESIGN.md) / [EXPERIENCE.md](ux/EXPERIENCE.md); mockups em [`../AI-UI-Design/`](../AI-UI-Design/)): paleta azul institucional (azul-700 #0061AE), Poppins, acessibilidade e-MAG/WCAG 2.1 AA (foco visível âmbar, alto contraste, navegação por teclado) |
| **RNF007** | **LGPD:** base legal por categoria; cifra em repouso e trânsito; **retenção e descarte por categoria de dado** (cadastral/fiscal/contratual, cada um com prazo configurável — §16); segregação de acesso por RBAC (§15); **RIPD**; **DPO/Encarregado designado** (Art. 41) — papel `dpo` **atende os direitos do titular** (RF017), com `Administrador` como fallback; a CPL **não** atende direitos do titular; acordos de compartilhamento (Art. 26). Na consulta/exportação de auditoria por perfil de controle **não há mascaramento de PII** — a salvaguarda é o RBAC (papel `auditor` somente-leitura), não a redação de campos *(resgate `spec/004/006`)* |
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
| RN002 | **Inadimplência → bloqueio TRANSITÓRIO**, reavaliado em cada porta (credenciamento → distribuição → contrato). Três estados: **débito regularizável** (bloqueia enquanto ativo), **penalidade com prazo** (até a data), **inidoneidade** (pelo termo). **Preserva o direito de regularização da ME/EPP (LC 123)** — nunca permanente. Política **fail-open + flag obrigatória para a CPL** na indisponibilidade de API (default ratificável pela Procuradoria; ver arquitetura AD-12). **Data de fim de penalidade/inidoneidade é híbrida:** usa a data retornada pela base oficial de sanções quando disponível; a **CPL registra manualmente** como fallback quando a fonte não traz o prazo (resgate `spec/002`) |
| RN003 | Covalidação antifraude obrigatória (Aprovar/Reprovar com justificativa) para documentos declaratórios |
| RN004 | Ingressantes retardatários → Cadastro de Reserva, sem refração retroativa |
| RN005 | Teto por capacidade declarada (base do water-filling) |
| RN006 | Balanço Patrimonial: idoneidade verificada por **covalidação humana** (não automática); mínimo o exercício anterior |
| RN007 | Editais rigorosamente individualizados (proibido "guarda-chuva") |
| RN008 | Ordenação e fragmentação do malote conforme RF007/RNF002 |
| RN009 | **Dados oficiais da Receita são somente leitura.** Após o autopreenchimento por CNPJ, apenas **Nome Fantasia, Endereço e Telefone** são editáveis pelo fornecedor; Razão Social, CNAE e Porte só mudam por re-sincronização (RF018). |
| **RN010** | **Vínculo Procurador↔empresa é estabelecido pelo titular:** o responsável legal cadastra-se primeiro e **convida/adiciona (e pode remover)** os procuradores que agem em nome da empresa (resgate `spec/001`; ver AD-30/AD-35). |
| **RN011** | **Covalidação sem SLA obrigatório:** não há prazo fixo de resposta da CPL; o sistema **exibe a fila pendente e o tempo decorrido por documento** para acompanhamento gerencial (resgate `spec/002`). |
| **RN012** | **Edital Publicado é totalmente editável com auditoria:** a Secretaria/Gestor pode alterar qualquer campo (inclusive CNAE e quantitativos), desde que cada alteração gere registro antes/depois na trilha. Mudança de CNAE **reavalia a vitrine imediatamente**, mantendo o prazo original; reabertura/extensão de prazo é **decisão manual e auditada** (sem reabertura automática). **Qualquer fornecedor cadastrado e ativo** pode contestar o CNAE de um edital; a procedência é julgada pela Secretaria/CPL (acatar/recusar com justificativa) (resgate `spec/003`). |
| **RN013** | **Transparência expõe só agregados não-identificáveis:** o portal público mostra editais vigentes (contagem), secretarias e segmentos (CNAEs); **não** expõe fornecedores, valores nem dados pessoais (evita reidentificação em segmentos pequenos). Projeções calculadas **sob demanda** (materialização/cache é otimização futura sem mudar o contrato) (resgate `spec/007`). |
| **RN014** | **Ciclo de vida do Edital:** `Rascunho → Aberto → Em Análise → Em Distribuição → Homologado → Em Execução`. Transições são auditadas (RN012, AD-16/AD-37); só edital **Aberto** aparece na vitrine do fornecedor; a distribuição (RF005) só ocorre a partir de **Em Distribuição**; **Homologado** congela a alocação (AD-10). (validação mockup) |
| **RN015** | **Exclusão é lógica, preservando histórico:** entidades de cadastro administrativo (Secretaria, Setor/CNAE, Tipo de Documento, Usuário, Fornecedor, Edital) **não são apagadas** — passam a **Inativo**, mantendo o histórico e as referências existentes; registros já vinculados a processos permanecem íntegros (complementa a trilha append-only AD-18/AD-38). (validação mockup) |
| **RN016** | **Conclusão de credenciamento por Termo de Aceite; cancelamento pelo fornecedor:** no MVP o credenciamento conclui com o **Termo de Aceite** (aceite formal registrado na trilha; a etapa "Prova de vida"/biometria é **Release 2 condicional a RIPD** — ver §12 e [VALIDACAO-MOCKUPS.md](VALIDACAO-MOCKUPS.md)). O fornecedor pode **cancelar** um credenciamento **antes da distribuição**; após homologação, saída se dá por substituição de desistente (RN004, AD-10). (validação mockup) |

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

## 15. Papéis e Controle de Acesso (RBAC)

Papéis canônicos com separação de funções (formalizados em AD-35). Resgatados de `spec/001/004/006` na convergência.

| Papel | Faz | Não faz |
|---|---|---|
| **Titular** | Cadastra a empresa; **convida/remove Procuradores** (RN010); exerce direitos do titular LGPD | — |
| **Procurador** | Age em nome da empresa com **rastro de ator + empresa representada** (RN010, AD-30) | Direitos do titular que exijam o próprio titular (RF017) |
| **CPL / Administrador** | Covalidação, editais, malote, distribuição, operação | **Não** atende direitos do titular (é do `dpo`) |
| **Secretaria / Gestor** | Cria e edita editais (com auditoria — RN012, AD-16) | — |
| **`auditor`** | **Somente leitura**: consulta e exporta a trilha (RF014) | Escrever, aprovar, operar |
| **`dpo`** (Encarregado, LGPD Art. 41) | **Atende/recusa** direitos do titular (RF017); `Administrador` é fallback | Operação de negócio |

**Cargos operacionais internos** (mockup Admin, geridos via RF023) mapeiam nos papéis acima:

| Cargo (rótulo de UI) | Papel RBAC | Nota |
|---|---|---|
| **Administrador** | `Administrador` | Superusuário; gere usuários (RF023) e catálogos (RF020–RF022) |
| **Gestor** (SMGA) | `Secretaria/Gestor` / `Administrador` | Visão macro, dashboards (RF013) |
| **Analista CPL** / **Coordenador(a)** | `CPL` | Covalidação (RF004), editais, distribuição, malote |
| **Secretário(a)** | `Secretaria/Gestor` | Cria/edita editais da sua secretaria (RN012, RN014) |
| **Auditor** / **Controladoria** | `auditor` | Somente leitura + export da trilha (RF014) |
| **DPO / Encarregado** | `dpo` | Direitos do titular (RF017) |

> A lista de cargos é **parametrizável** (RF023); os papéis RBAC (permissões efetivas) são o invariante (AD-35).

## 16. Catálogo de Parâmetros de Configuração

Decisões de negócio que parametrizam invariantes vivem como **config versionada/logada**, nunca hard-coded (AD-36).

| Parâmetro | Descrição | Default / Estado | Origem |
|---|---|---|---|
| `SEI_MALOTE_LIMITE_MB` | Limite do malote — **global** (característica do SEI municipal, não do edital/secretaria) | A ratificar (TI/SEI) | RNF002, `spec/005` |
| `AUDITORIA_EXPORT_TETO` | Teto de registros por export; acima dele **sinaliza e conclui** via streaming/paginação (não corta) | ex.: 50.000 | RF014, `spec/004` |
| `RETENCAO_POR_CATEGORIA` | Prazo de descarte **por categoria de dado** (cadastral/fiscal/contratual…) | A ratificar (LGPD) | RNF007, `spec/006` |
| `regra_vN` | Regra de resto/desempate do motor | Hamilton + ordem de credenciamento, backstop menor CNPJ (a ratificar SMGA/TCE) | RNF008, AD-8 |
| `regra_reserva_vN` | Ordem de promoção do Cadastro de Reserva | FIFO por credenciamento, backstop menor CNPJ | RN004, AD-25 |
| `POLITICA_INDISPONIBILIDADE` | Ação quando a API de verificação está indisponível | `fail-open + flag` (a ratificar Procuradoria) | RN002, AD-12 |

---

## Documentos Relacionados

- [Matriz de Lacunas](matriz-lacunas.md) · [Plano de Releases](plano-releases.md) · [Convergência](CONVERGENCIA.md)
- `source/`: [Descritivo](../source/01-DescritivoProduto.md) · [Escopo](../source/02-DeclaracaoEscopo.md) · [HDR](../source/03-HDR.md) · [Arquitetura](../source/04-Arquitetura.md) · [Histórias](../source/05-HistoriasUsuario.md) · [Casos de Uso](../source/06-CasosUso.md) · [Backlog](../source/07-Backlog.md) · [BPMN](../source/08-BPMN.md)

---

*PRD produzido em sessão BMad Party Mode (roster software-development) — 2026-06-29. Recomenda-se validação formal via `bmad-prd` (intent: validate).*
