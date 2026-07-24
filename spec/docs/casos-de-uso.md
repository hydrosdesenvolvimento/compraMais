# Compra Mais — Casos de Uso (UC)

**Projeto:** Compra Mais (Programa de Compras Municipalizadas — Prefeitura de Rio Branco)
**Fonte de verdade:** este diretório (`spec/docs/`), versionado no git — ver [index.md](index.md).
**Rastreável a:** [prd.md](prd.md) (RF/RN/RNF/RBAC, **PRD v2.5**) · [architecture/ARCHITECTURE-SPINE.md](architecture/ARCHITECTURE-SPINE.md) (ADs) · [epics.md](epics.md) (histórias e critérios de aceite) · [VALIDACAO-CLIENTE-01.md](VALIDACAO-CLIENTE-01.md) (feedback do cliente — Validação 01).

> **Papel deste documento.** Os casos de uso descrevem **ator → objetivo → fluxo** (principal, alternativos,
> exceções). Eles **não** são critérios de aceite: o comportamento testável (Given/When/Then) vive em
> [epics.md](epics.md), a fila canônica de histórias. UC dá a intenção e a jornada; o épico dá o teste. Quando
> houver divergência entre os dois, o PRD ([prd.md](prd.md)) arbitra.
>
> **Atores são papéis (RBAC §15), não cargos.** "Analista CPL", "Secretaria/Gestor", "Administrador",
> "Titular", "Procurador", "auditor", "dpo", "Sistema". A lista de **cargos** operacionais é parametrizável
> (RF023); os **papéis** (permissões efetivas) são o invariante (AD-35).
>
> **Antecessor.** Supersede o rascunho v1.0 em [`../source/06-CasosUso.md`](../source/06-CasosUso.md) (2026-06-22,
> pré-convergência), que permanece apenas como **insumo histórico bruto** — não é canônico.

---

## Controle de Versão

| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1.0 | 2026-06-22 | Equipe de Análise | Rascunho inicial (14 UCs) — em `source/06-CasosUso.md` |
| 2.0 | 2026-07-02 | Party Mode | Versão canônica alinhada ao **PRD v2.4**: atores por papel (RBAC §15); ciclo de vida do Edital (RN014); Termo de Aceite conclui o credenciamento no MVP e **UC007 (liveness) marcado R2 condicional a RIPD** (RN016, RF012); inativação lógica (RN015); **novos UC015–UC021** para RF015–RF023 e Procurador (RN010) |
| 2.1 | 2026-07-05 | Party Mode (Validação 01) | Incorporação do feedback do cliente (ver VALIDACAO-CLIENTE-01.md): novos UC022 (baixar PDF do edital) e UC023 (desistência covalidada); extensões em UC004 (Termo de Responsabilidade RF024/RN019), UC005 (PDF obrigatório RF025/AD-39), UC008 (imutabilidade RN017 + visão individual RN020), UC002/UC006 (RN021), UC014 (Desistências Pendentes); status "Requerente"→"Cadastrado" (AD-41). Alinhado ao PRD v2.5. |

---

## Sumário

| Bloco | Casos de Uso |
|---|---|
| **A. Cadastro & Identidade do Fornecedor** | UC001, UC018, UC019, UC015 |
| **B. Editais** | UC005, UC022 |
| **C. Credenciamento & Covalidação** | UC003, UC004, UC002, UC006, UC007 *(R2)*, UC016, UC023 |
| **D. Distribuição & Malote** | UC008, UC009, UC010 |
| **E. Transparência, Auditoria & Notificações** | UC011, UC012, UC013, UC014 |
| **F. LGPD** | UC017 |
| **G. Administração (catálogos & usuários)** | UC020, UC021 |

**Convenção de status do Fornecedor:** `Cadastrado → Pendente de Análise → Credenciado → Apto` (por edital), com
`Em Correção` no laço de covalidação. *(D4: o rótulo antes chamado "Requerente" passa a "Cadastrado"; a migração de schema/enum e de `data-cy` é história dedicada — AD-41.)* **Ciclo do Edital (RN014):** `Rascunho → Aberto → Em Análise → Em Distribuição → Homologado → Em Execução`.

---

## A. Cadastro & Identidade do Fornecedor

### UC001 — Cadastrar Fornecedor via CNPJ (Receita Federal)
**Objetivo:** permitir que empresas locais iniciem o onboarding informando apenas o CNPJ, com autopreenchimento oficial que reduz erro de digitação.
**Ator principal:** Fornecedor (Titular). **Apoio:** Sistema (integração Receita).
**Pré-condições:** CNPJ válido e ativo.
**Fluxo principal:**
1. O Titular acessa o Portal do Fornecedor e clica em "Cadastrar".
2. Informa o número do CNPJ.
3. O Sistema consulta a API da Receita e autopreenche **Razão Social, Nome Fantasia, Porte e CNAEs** (principal e secundários) — dados **somente leitura** (RN009).
4. O Titular informa contato (e-mail/senha) e o **endereço estruturado geolocalizável** para análise territorial (RF019).
5. O Sistema salva o registro com status inicial **Cadastrado** *(rótulo antes "Requerente"; migração de schema/enum/`data-cy` é história dedicada — AD-41)* e registra o `timestamp` da sincronização (RF018).
**Fluxos alternativos:**
- **A1 — API indisponível:** o Sistema permite preenchimento manual, marcando o cadastro para **covalidação rigorosa posterior** (política `fail-open + flag`, RN002/AD-12).
**Exceções:** CNPJ inválido matematicamente → cadastro bloqueado.
**Pós-condições:** Fornecedor com acesso ao Portal; ainda **precisa credenciar-se** em um edital.
**Rastreabilidade:** RF001, RF018, RF019 · RN009, RN002 · RNF001, RNF005 · Prioridade **Must** · Complexidade Média.

### UC018 — Re-sincronizar Dados do CNPJ
**Objetivo:** atualizar sob demanda os dados oficiais do fornecedor com nova consulta à Receita.
**Ator principal:** Fornecedor (Titular ou Procurador).
**Pré-condições:** cadastro existente (UC001).
**Fluxo principal:**
1. Em "Minha Conta", o ator vê a data da **última sincronização** e seu status.
2. Aciona "Re-sincronizar".
3. O Sistema reconsulta a Receita e atualiza **Razão Social, CNAE e Porte** (campos travados para edição manual — RN009), registrando novo `timestamp`.
**Fluxos alternativos:** **A1 —** API indisponível: mantém os dados atuais e sinaliza a falha, sem sobrescrever.
**Exceções:** CNPJ tornou-se inativo/baixado → sinaliza para revisão da CPL.
**Pós-condições:** dados oficiais atualizados; **Nome Fantasia, Endereço e Telefone** seguem editáveis pelo fornecedor (RN009).
**Rastreabilidade:** RF018 · RN009 · Prioridade **Must** · Complexidade Baixa.

### UC019 — Gerir Procuradores da Empresa
**Objetivo:** permitir que o Titular autorize terceiros a agir em nome da empresa, com rastro de fraude.
**Ator principal:** Titular.
**Pré-condições:** empresa cadastrada; ator autenticado como **Titular** (responsável legal).
**Fluxo principal:**
1. O Titular abre "Procuradores" e **convida** um Procurador (identificação + e-mail).
2. O Sistema cria o vínculo **Procurador↔empresa** e concede o papel `Procurador`.
3. O Procurador passa a operar com **rastro de ator + empresa representada** em toda ação (AD-30).
**Fluxos alternativos:** **A1 —** o Titular **remove** um Procurador; vínculos e rastro anteriores são preservados (RN015, append-only).
**Exceções:** tentativa de um Procurador convidar outro Procurador → bloqueado (vínculo é prerrogativa do Titular, RN010).
**Pós-condições:** Procurador habilitado a operar; **direitos do titular LGPD (RF017/UC017) permanecem exclusivos do Titular**.
**Rastreabilidade:** RN010 · AD-30, AD-35 · Prioridade **Must** · Complexidade Média.

### UC015 — Autenticar e Gerir a Própria Senha
**Objetivo:** dar acesso recorrente seguro e autonomia sobre a própria credencial a qualquer usuário (fornecedor ou servidor).
**Ator principal:** Usuário autenticável (Titular, Procurador ou servidor interno).
**Pré-condições:** conta existente e ativa.
**Fluxo principal:**
1. O usuário informa credenciais (login/SSO) e, quando exigido, **MFA**.
2. O Sistema autentica e abre a sessão conforme o **papel** (RBAC §15).
**Fluxos alternativos:**
- **A1 — Esqueci a senha:** o usuário solicita reset; o Sistema envia link/token e permite definir nova senha.
- **A2 — Troca da própria senha (autenticado):** o usuário informa **senha atual + nova senha**; o Sistema valida a senha atual antes de trocar.
**Exceções:** senha atual incorreta (A2) ou token expirado (A1) → operação recusada, sem revelar existência da conta.
**Pós-condições:** sessão ativa ou credencial atualizada; evento registrado.
**Rastreabilidade:** RF015 · RBAC §15 · RNF (segurança) · Prioridade **Must** · Complexidade Média.

---

## B. Editais

### UC005 — Criar Edital Individualizado
**Objetivo:** criar um chamamento individualizado (1 edital = 1 demanda de 1 secretaria), governando seu ciclo de vida.
**Ator principal:** Secretaria/Gestor.
**Pré-condições:** ator com papel `Secretaria/Gestor`; catálogos base disponíveis (UC020).
**Fluxo principal:**
1. Em "Editais", clica em "Novo Edital".
2. Preenche objeto, valor unitário e vigência; **vincula obrigatoriamente 1 Secretaria demandante** (selecionada do catálogo — RF020/AD-16).
3. Adiciona lotes/itens com quantidades e **CNAEs exigidos** (subclasse 7 dígitos, do catálogo — RF021/RF003).
4. **Anexa o PDF oficial do edital** (documento gerado no SEI) — upload **obrigatório** para publicar; ele **complementa** (não substitui) o preenchimento estruturado dos passos 2–3 (D2, RF025/AD-39).
5. Salva como **Rascunho**; ao publicar, o edital passa a **Aberto** e aparece na vitrine do fornecedor (RN014).
**Fluxos alternativos:**
- **A1 — Edição pós-publicação:** a Secretaria altera qualquer campo (inclusive CNAE/quantitativos) **com auditoria antes/depois** (RN012); mudança de CNAE **reavalia a vitrine imediatamente**, mantendo o prazo; reabertura/extensão é **manual e auditada**.
**Exceções:** tentativa de associar **duas** secretarias → bloqueado (RN007, individualização orçamentária); tentativa de publicar **sem o PDF oficial anexado** → transição `Rascunho → Aberto` bloqueada (RF025/AD-39).
**Pós-condições:** edital progride no ciclo `Aberto → Em Análise → Em Distribuição → Homologado → Em Execução`, com cada transição auditada (AD-37).
**Rastreabilidade:** RF008, RF025 · RN007, RN012, RN014 · AD-16, AD-37, AD-39 · Prioridade **Must** · Complexidade Média.

### UC022 — Baixar Edital Oficial em PDF
**Objetivo:** permitir que o fornecedor obtenha o **PDF oficial** do edital (anexado pela Secretaria no SEI) para leitura, arquivo e conferência das regras do chamamento.
**Ator principal:** Fornecedor.
**Pré-condições:** edital **Aberto** e compatível com o fornecedor (UC003); PDF oficial anexado na criação/edição do edital (UC005, RF025/AD-39).
**Fluxo principal:**
1. O fornecedor abre a tela de **detalhes do edital**.
2. Aciona **"Baixar Edital em PDF"**.
3. O Sistema entrega o **PDF oficial** anexado pela Secretaria, servido a partir do armazenamento seguro do documento (AD-39).
**Fluxos alternativos:** **A1 —** PDF ainda não disponível (edital sem anexo, caso de dado legado): o Sistema informa que o documento oficial não está disponível e orienta a consultar o edital estruturado na tela.
**Exceções:** edital não compatível/oculto ao fornecedor → download **bloqueado inclusive por link direto** (coerente com RN001/UC003).
**Pós-condições:** fornecedor de posse do edital oficial, sem alterar o estado do edital.
**Rastreabilidade:** RF025 · AD-39 · Prioridade **Must** · Complexidade Baixa.

---

## C. Credenciamento & Covalidação

### UC003 — Visualizar Editais Compatíveis (Filtro CNAE)
**Objetivo:** exibir ao fornecedor **apenas** editais compatíveis com seu ramo (CNAE).
**Ator principal:** Fornecedor.
**Pré-condições:** fornecedor autenticado.
**Fluxo principal:**
1. O fornecedor acessa a vitrine de editais.
2. O Sistema cruza os CNAEs válidos do CNPJ (principal ou secundários) com os **CNAEs exigidos** do edital, por **match exato de subclasse (7 dígitos)** (RF003/RN001).
3. Exibe somente editais **Abertos** e compatíveis; incompatíveis ficam **ocultos e bloqueados inclusive por link direto**.
**Fluxos alternativos:** **A1 —** nenhum compatível: exibe "Não há editais abertos para o seu segmento no momento".
**Pós-condições:** fornecedor vê apenas oportunidades elegíveis.
**Rastreabilidade:** RF003 · RN001, RN014 · Prioridade **Must** · Complexidade Baixa.

### UC004 — Solicitar Credenciamento e Enviar Documentação
**Objetivo:** submeter proposta e documentos comprobatórios ao órgão central e concluir o credenciamento no MVP por **Termo de Aceite**.
**Ator principal:** Fornecedor.
**Pré-condições:** edital **Aberto**; fornecedor aprovado no filtro CNAE (UC003).
**Fluxo principal:**
1. Seleciona o edital e clica em "Iniciar Credenciamento".
2. O Sistema exibe itens/lotes; o fornecedor informa sua **capacidade produtiva** (teto declarado — base do water-filling, RN005) e, neste passo, deve **aceitar o Termo de Responsabilidade** sobre a capacidade declarada; o botão **"Prosseguir" fica bloqueado sem o aceite** e o aceite (**versão + timestamp**) é gravado na trilha (RF024/RN019).
3. O fornecedor faz **upload dos documentos exigidos** (tipos definidos no catálogo RF022) — cifrados em repouso (RF002/RNF).
4. O fornecedor **assina o Termo de Aceite**; o Sistema registra o aceite na trilha e muda o status para **Pendente de Análise** (RN016).
**Fluxos alternativos:**
- **A1 — Documento reutilizável válido:** o Sistema importa do repositório sem exigir reenvio (RF002).
- **A2 — Cancelamento pelo fornecedor:** **antes da distribuição**, o fornecedor pode cancelar o credenciamento (RN016). Após homologação, saída só por substituição de desistente (RN004).
**Exceções:** arquivo acima do tamanho/format inválido → rejeitado; tentativa de prosseguir **sem aceitar o Termo de Responsabilidade** → bloqueada (RF024/RN019).
**Pós-condições:** documentos na fila de covalidação da CPL; aceite do Termo de Responsabilidade registrado na trilha.
**Rastreabilidade:** RF002, RF024 · RN016, RN019, RN005, RN004 · Prioridade **Must** · Complexidade Média. *(Etapa "Prova de vida"/liveness = UC007, R2.)*

### UC002 — Validar Situação de Inadimplência
**Objetivo:** checar débitos/sanções em bases oficiais e aplicar **bloqueio transitório** nas portas do processo.
**Ator principal:** Sistema (background). **Apoio:** Analista CPL (fallback manual).
**Pré-condições:** fornecedor em uma porta do processo (credenciamento → distribuição → contrato).
**Fluxo principal:**
1. Em cada porta, o Sistema consulta PGM/SICAF e bases de sanções.
2. Retorno "Nada Consta" → prossegue.
**Fluxos alternativos:**
- **A1 — Débito/penalidade/inidoneidade:** aplica bloqueio **transitório** conforme o estado (débito regularizável enquanto ativo; penalidade até a data; inidoneidade pelo termo) — **nunca permanente** (preserva o direito de regularização LC 123, RN002). Data de fim: usa a base oficial quando disponível; **CPL registra manualmente** como fallback.
- **A2 — API indisponível:** `fail-open` **com flag obrigatória para a CPL** (RN002/AD-12).
**Pós-condições:** fornecedor liberado ou bloqueado transitoriamente com motivo auditável.
**Comunicação de status (RN021):** o bloqueio por inadimplência/dívida é comunicado como **"Bloqueado"**, distinto de **"Em Análise"** (pendência documental do UC006) — os dois estados não se confundem na visão do fornecedor.
**Rastreabilidade:** RF011 · RN002, RN021 · AD-12 · Prioridade **Must** · Complexidade Alta.

### UC006 — Analisar e Covalidar Documentação (Antifraude)
**Objetivo:** verificação humana de documentos declaratórios, com parecer de habilitação/inabilitação.
**Ator principal:** Analista CPL (`CPL`).
**Pré-condições:** fornecedor **Pendente de Análise** com documentos submetidos.
**Fluxo principal:**
1. O Analista abre a fila de pendências — que exibe o **tempo decorrido por documento** (não há SLA fixo, RN011).
2. Abre o visualizador de PDF e analisa integridade (ex.: Balanço do exercício exigido, RN006).
3. Clica em **Aprovar** por documento; ao aprovar o conjunto, o status vai a **Credenciado**; a ação é logada (quem/quando).
**Fluxos alternativos:**
- **A1 — Reprovar:** o Sistema **exige justificativa** (RN003); o fornecedor entra em **Em Correção** e é notificado (laço com UC016).
**Exceções:** reprovar sem justificativa → bloqueado.
**Pós-condições:** fornecedor apto ao cálculo de distribuição ou em fila de correção.
**Comunicação de status (RN021):** a pendência documental é comunicada como **"Em Análise"**, distinta de **"Bloqueado"** (inadimplência/dívida do UC002) — o fornecedor vê estados separados para pendência de análise e bloqueio por débito.
**Rastreabilidade:** RF004 · RN003, RN006, RN011, RN021 · RNF003 · Prioridade **Must** · Complexidade Média.

### UC007 — Validar Identidade por Prova de Vida (Liveness) · **Release 2 — condicional a RIPD**
**Objetivo:** prova de vida no ato do envio para mitigar fraude por terceiros.
**Ator principal:** Fornecedor.
**Status:** **fora do MVP.** A biometria facial (RF012) foi **removida do MVP**; o credenciamento conclui por **Termo de Aceite** (UC004/RN016). Este UC só se ativa em **Release 2**, condicionado a **RIPD** e ratificação do solicitante. Documentado aqui para preservar a intenção; **não** deve gerar história no MVP.
**Rastreabilidade:** RF012 *(removida do MVP)* · RN016 · ver [VALIDACAO-MOCKUPS.md](VALIDACAO-MOCKUPS.md) (conflito "Prova de vida" × biometria) · Prioridade **Could/R2** · Complexidade Alta.

### UC016 — Contestar / Regularizar (Tela Única)
**Objetivo:** dar ao fornecedor um único ponto para correção de CNAE, recurso de reprovação e regularização fiscal.
**Ator principal:** Fornecedor. **Apoio:** Secretaria/CPL (julga a procedência).
**Pré-condições:** fornecedor autenticado com uma pendência (reprovação, débito regularizável) **ou** discordância sobre CNAE de um edital.
**Fluxo principal:**
1. O fornecedor abre "Contestação/Regularização" e escolhe o tipo.
2. **Recurso de reprovação:** reenvia documento corrigido/argumento → volta à fila da CPL (UC006).
3. **Regularização fiscal:** anexa comprovante; reavaliação na próxima porta (UC002).
4. **Contestação de CNAE do edital:** qualquer fornecedor **cadastrado e ativo** contesta o CNAE exigido; a Secretaria/CPL **acata ou recusa com justificativa** (RN012).
**Pós-condições:** pendência encaminhada com decisão auditável.
**Rastreabilidade:** RF016 · RN012, RN002, RN003 · Prioridade **Must** · Complexidade Média.

### UC023 — Formalizar Desistência de Credenciamento
**Objetivo:** permitir que o fornecedor formalize a **saída de um edital após a distribuição** por um fluxo covalidado, acionando a substituição pelo Cadastro de Reserva quando havia cota homologada.
**Ator principal:** Fornecedor. **Apoio:** Analista CPL/SMGA.
**Pré-condições:** fornecedor credenciado/homologado em um edital; a **distribuição já ocorreu** (após UC008/homologação). *(Antes da distribuição, a saída é self-service via UC004/A2 — ver Regra abaixo.)*
**Fluxo principal:**
1. O fornecedor abre o edital e aciona **"Desistir do Edital"**.
2. O Sistema exibe **confirmação** (o fornecedor confirma a intenção).
3. O status do vínculo passa a **"Pendente de Desistência"** e o Sistema **notifica o admin** (Analista CPL/SMGA).
4. O admin aciona **"Confirmar Desistência"**; o status passa a **"Desistente"** e o evento é registrado na **trilha de auditoria**.
5. Se havia **cota homologada** para o fornecedor, o Sistema aciona a **substituição pelo Cadastro de Reserva** (UC009/AD-25).
**Fluxos alternativos:**
- **A1 — Admin rejeita a desistência:** o admin recusa o pedido e o vínculo **reverte ao status anterior** (sem baixa da cota), com registro auditável.
**Exceções:** —
**Pós-condições:** vínculo encerrado como **Desistente** com substituição encaminhada, **ou** pedido revertido ao status anterior; evento auditado em qualquer caso.
**Regra (RN018/RN016):** **cancelamento ANTES da distribuição** continua **self-service** (RN016, UC004/A2); **desistência APÓS a distribuição** exige **esta covalidação** (fornecedor solicita, admin confirma).
**Rastreabilidade:** RF026 · RN018, RN004 · AD-40 · Prioridade **Must** · Complexidade Média.

---

## D. Distribuição & Malote

### UC008 — Distribuir Demanda Equitativamente (Motor)
**Objetivo:** ratear as cotas do edital entre fornecedores habilitados respeitando o teto de cada um.
**Ator principal:** Sistema (gatilho automático ou manual). **Apoio:** Analista CPL.
**Pré-condições:** edital em **Em Distribuição**; há fornecedores **Credenciados** com capacidade informada.
**Fluxo principal:**
1. A CPL aciona "Calcular Distribuição".
2. O Sistema aplica o **Motor (§8 do PRD): water-filling iterativo + maiores restos (Hamilton) + desempate determinístico**, respeitando o **teto declarado** de cada fornecedor (RN005) e redistribuindo o excedente.
3. Gera a **matriz de alocação** (itens por CNPJ), **imutável a edição manual de cotas** — as cotas resultam apenas do Motor, sem override manual (RN017).
**Visão do fornecedor (RN020):** ao consultar sua distribuição, o fornecedor vê **apenas a demanda total do item + a sua própria cota**; o **rateio dos concorrentes fica oculto** (não expõe quem mais foi alocado nem quanto).
**Fluxos alternativos:** **A1 —** oferta combinada < demanda → alerta de **déficit de abastecimento**.
**Exceções:** parâmetro de desempate não ratificado → usa o default de config (§16), sinalizando; tentativa de **editar manualmente uma cota da matriz** → bloqueada (RN017).
**Pós-condições:** alocação calculada; ao **Homologar**, a alocação **congela** (AD-10, RN014).
**Rastreabilidade:** RF005 · RN005, RN017, RN020 · §8, AD-10 · Prioridade **Must** · Complexidade Alta. *(Bloqueado até ratificação Item×Lote — ver [index.md](index.md).)*

### UC009 — Gerir Cadastro de Reserva (Segunda Demanda)
**Objetivo:** acomodar fornecedores retardatários em fila de espera sem refração retroativa na distribuição já feita.
**Ator principal:** Sistema. **Apoio:** Analista CPL (substituições).
**Pré-condições:** distribuição inicial (UC008) já ocorrida; fornecedor retardatário aprovado (UC006).
**Fluxo principal:**
1. Ao aprovar um credenciamento fora da janela inicial, o Sistema detecta que a distribuição já ocorreu.
2. Insere o fornecedor no pool **Cadastro de Reserva**; a distribuição anterior permanece **intacta** (RN004).
**Fluxos alternativos:** **A1 — Substituição:** desistência/falha de titular → a CPL aciona a promoção do primeiro da reserva (ordem `regra_reserva`, §16/AD-25).
**Pós-condições:** fila estruturada garantindo isonomia (LC 123).
**Rastreabilidade:** RF006 · RN004 · AD-25 · Prioridade **Must** · Complexidade Alta.

### UC010 — Gerar Malote Digital Estruturado (Exportação SEI)
**Objetivo:** consolidar a documentação validada em um arquivo ordenado e otimizado para upload no SEI.
**Ator principal:** Analista CPL.
**Pré-condições:** fornecedor **Apto**, com todos os documentos aprovados.
**Fluxo principal:**
1. A CPL clica em "Exportar Malote SEI".
2. Um worker em background mescla/comprime os PDFs na ordem **CNPJ → Documento do fornecedor → Anexos do edital → Certidões** (RN008).
3. O Sistema respeita o **limite em MB** parametrizado (`SEI_MALOTE_LIMITE_MB`, §16) sem tornar ilegível.
4. Disponibiliza o download.
**Fluxos alternativos:** **A1 —** excede o limite: **fragmenta** em Parte 1/Parte 2 (fragmentação parametrizável, RF007).
**Pós-condições:** dossiê estruturado pronto para o SEI.
**Rastreabilidade:** RF007 · RN008 · RNF002 · Prioridade **Must** · Complexidade Alta.

---

## E. Transparência, Auditoria & Notificações

### UC011 — Consultar Painel Público de Transparência
**Objetivo:** dar à sociedade e a gestores uma visão macro **não-identificável** do programa.
**Ator principal:** Cidadão / Gestor Municipal / Representante FIEAC.
**Pré-condições:** nenhuma (público).
**Fluxo principal:**
1. O ator acessa o portal público.
2. O Sistema exibe **apenas agregados**: editais vigentes (contagem), secretarias e segmentos (CNAEs), montantes por setor. Projeções calculadas **sob demanda** (RN013).
**Fluxos alternativos:** **A1 —** filtro básico por período.
**Exceções:** o portal **não** expõe fornecedores, valores individuais nem dados pessoais (evita reidentificação, RN013).
**Pós-condições:** transparência sem vazamento.
**Rastreabilidade:** RF010 · RN013 · RNF006 · Prioridade **Should** · Complexidade Média.

### UC012 — Consultar Trilha de Auditoria
**Objetivo:** demonstrar a órgãos de controle **quem, quando e o quê** foi alterado.
**Ator principal:** `auditor` (somente leitura). **Também:** Administrador.
**Pré-condições:** ator com papel `auditor` ou `Administrador`.
**Fluxo principal:**
1. O auditor informa um edital, fornecedor ou intervalo de datas.
2. O Sistema exibe a timeline append-only (AD-18/AD-38).
**Fluxos alternativos:** **A1 — Exportar** CSV/JSON; acima de `AUDITORIA_EXPORT_TETO` o Sistema **sinaliza e conclui via streaming/paginação (não corta)** (§16).
**Exceções:** na consulta/exportação por perfil de controle **não há mascaramento de PII** — a salvaguarda é o RBAC (`auditor` read-only), não a redação (RNF007).
**Pós-condições:** evidência íntegra para o Tribunal de Contas.
**Rastreabilidade:** RF014 · RNF003, RNF007 · AD-18, AD-38 · Prioridade **Must** · Complexidade Média.

### UC013 — Enviar Notificações de Vencimento
**Objetivo:** evitar inativação por lapso de validade de documentos temporários.
**Ator principal:** Sistema (job agendado).
**Pré-condições:** fornecedores habilitados com documentos que têm data de validade (tipos com regra de validade, RF022).
**Fluxo principal:**
1. O job varre diariamente e identifica certidões que expiram em X dias.
2. Dispara alertas por **e-mail/SMS**; o fornecedor é orientado a renovar.
**Pós-condições:** fornecedor ciente da pendência.
**Rastreabilidade:** RF009 · RF022 · Prioridade **Could** · Complexidade Baixa. *(Gateway de envio — LAC-07.)*

### UC014 — Consultar Painel Administrativo Interno
**Objetivo:** visão consolidada de pendências para priorização operacional.
**Ator principal:** Secretaria/Gestor e Analista CPL.
**Pré-condições:** ator autenticado com papel interno.
**Fluxo principal:**
1. Acessa "Painel Administrativo".
2. O Sistema exibe métricas: cadastros pendentes, documentos em análise, editais por estado do ciclo (RN014), vencimentos próximos e o card **"Desistências Pendentes"** (vínculos em **"Pendente de Desistência"** aguardando confirmação da CPL/SMGA — RN018/UC023).
3. Filtra por secretaria, status documental e prazo.
**Pós-condições:** visibilidade operacional imediata.
**Rastreabilidade:** RF013 · RN014, RN018 · Prioridade **Should** · Complexidade Média.

---

## F. LGPD

### UC017 — Exercer Direitos do Titular (LGPD)
**Objetivo:** atender pedidos de **acesso, correção e exclusão** de dados pessoais.
**Ator principal:** Titular (o próprio; **não** delegável a Procurador). **Atendente:** `dpo` (Encarregado, Art. 41); `Administrador` como fallback.
**Pré-condições:** requisitante autenticado como **Titular**.
**Fluxo principal:**
1. O Titular abre "Meus dados / Privacidade" e solicita acesso, correção ou exclusão.
2. O `dpo` recebe a solicitação, avalia a base legal por categoria de dado (§16) e **atende ou recusa** com justificativa.
3. Exclusão respeita a **retenção legal por categoria** (cadastral/fiscal/contratual) — o que não pode ser apagado é **inativado** preservando histórico (RN015).
**Exceções:** a **CPL não atende** direitos do titular (RNF007); pedido roteado ao `dpo`.
**Pós-condições:** solicitação resolvida e registrada na trilha.
**Rastreabilidade:** RF017 · RN015 · RNF007 · AD (LGPD) · Prioridade **Must** · Complexidade Média.

---

## G. Administração (catálogos & usuários)

### UC020 — Manter Catálogos Base *(CRUD agrupado)*
**Objetivo:** manter as entidades paramétricas que alimentam editais, upload e covalidação.
**Ator principal:** Administrador.
**Escopo (uma jornada, três catálogos):**
- **RF020 — Secretarias:** Nome, Sigla, Responsável; selecionável na criação de editais (1 Edital → 1 Secretaria, AD-16).
- **RF021 — CNAE / Setores:** código + descrição; base do "CNAE exigido" do edital e do match do fornecedor (RF003).
- **RF022 — Tipos de Documento:** Nome, formato aceito, regra de validade/"sem validade", categoria, exigência de exercício (p/ Balanço); parametriza o upload (RF002) e a covalidação (RF004).
**Pré-condições:** ator com papel `Administrador`.
**Fluxo principal:**
1. Em "Catálogos", escolhe a entidade e **Criar/Editar** um item.
2. O Sistema valida unicidade (ex.: sigla/código) e persiste.
**Fluxos alternativos:** **A1 — Inativar:** a **exclusão é lógica** — o item vira **Inativo**, preservando histórico e referências existentes; some das listas de seleção mas os vínculos passados permanecem íntegros (RN015).
**Exceções:** duplicidade de chave → bloqueado.
**Pós-condições:** catálogos consistentes disponíveis aos demais fluxos.
**Rastreabilidade:** RF020, RF021, RF022 · RN015 · AD-16, AD-38 · Prioridade **Must** · Complexidade Média.

### UC021 — Gerir Usuários Internos (Servidores)
**Objetivo:** administrar as contas dos servidores da Prefeitura e seus papéis.
**Ator principal:** Administrador.
**Pré-condições:** ator com papel `Administrador`.
**Fluxo principal:**
1. Em "Usuários", **cria/edita** um servidor e atribui um **cargo** que **mapeia num papel RBAC** (§15) — ex.: Analista CPL → `CPL`, Secretário(a) → `Secretaria/Gestor`, Auditor → `auditor`, DPO → `dpo`.
2. Pode **resetar a senha** do usuário (o usuário troca a própria senha em UC015).
**Fluxos alternativos:** **A1 — Inativar:** exclusão lógica preservando o rastro de ações do usuário (RN015).
**Exceções:** este fluxo é **distinto do autocadastro do fornecedor** (UC001/UC015) — não cria fornecedores.
**Pós-condições:** quadro de servidores e permissões efetivas atualizado.
**Rastreabilidade:** RF023 · RBAC §15, RN015 · AD-35 · Prioridade **Must** · Complexidade Média.

---

## Matriz de Casos de Uso

| UC | Nome | Bloco | Ator principal | RF | Prioridade | Compl. |
|---|---|---|---|---|---|---|
| UC001 | Cadastrar Fornecedor via CNPJ | A | Titular | RF001, RF018, RF019 | Must | Média |
| UC018 | Re-sincronizar Dados do CNPJ | A | Fornecedor | RF018 | Must | Baixa |
| UC019 | Gerir Procuradores da Empresa | A | Titular | RN010 | Must | Média |
| UC015 | Autenticar e Gerir a Própria Senha | A | Usuário | RF015 | Must | Média |
| UC005 | Criar Edital Individualizado | B | Secretaria/Gestor | RF008, RF025 | Must | Média |
| UC022 | Baixar Edital Oficial em PDF | B | Fornecedor | RF025 | Must | Baixa |
| UC003 | Visualizar Editais Compatíveis (CNAE) | C | Fornecedor | RF003 | Must | Baixa |
| UC004 | Solicitar Credenciamento + Termo de Aceite | C | Fornecedor | RF002, RF024 | Must | Média |
| UC002 | Validar Situação de Inadimplência | C | Sistema | RF011 | Must | Alta |
| UC006 | Analisar e Covalidar Documentação | C | Analista CPL | RF004 | Must | Média |
| UC007 | Prova de Vida (Liveness) | C | Fornecedor | RF012 | **R2** | Alta |
| UC016 | Contestar / Regularizar | C | Fornecedor | RF016 | Must | Média |
| UC023 | Formalizar Desistência de Credenciamento | C | Fornecedor | RF026 | Must | Média |
| UC008 | Distribuir Demanda (Motor) | D | Sistema | RF005 | Must | Alta |
| UC009 | Gerir Cadastro de Reserva | D | Sistema | RF006 | Must | Alta |
| UC010 | Gerar Malote SEI | D | Analista CPL | RF007 | Must | Alta |
| UC011 | Painel Público de Transparência | E | Cidadão/Gestor | RF010 | Should | Média |
| UC012 | Consultar Trilha de Auditoria | E | auditor | RF014 | Must | Média |
| UC013 | Notificações de Vencimento | E | Sistema | RF009 | Could | Baixa |
| UC014 | Painel Administrativo Interno | E | Secretaria/CPL | RF013 | Should | Média |
| UC017 | Exercer Direitos do Titular (LGPD) | F | Titular / dpo | RF017 | Must | Média |
| UC020 | Manter Catálogos Base (CRUD) | G | Administrador | RF020, RF021, RF022 | Must | Média |
| UC021 | Gerir Usuários Internos | G | Administrador | RF023 | Must | Média |

**Cobertura de RF:** RF001–RF011, RF013–RF026 mapeados (inclui **RF024** em UC004, **RF025** em UC005/UC022 e **RF026** em UC023); **RF012** presente apenas como **UC007 (R2)**. Os critérios de aceite testáveis de cada UC vivem em [epics.md](epics.md).

---

## Diagrama de contexto (atores × casos de uso)

```mermaid
graph LR
  Titular((Titular)) --- UC001 & UC019 & UC017 & UC004 & UC016
  Procurador((Procurador)) --- UC018 & UC004
  Usuario((Usuário)) --- UC015
  Fornecedor((Fornecedor)) --- UC022 & UC023
  CPL((Analista CPL)) --- UC006 & UC010 & UC008 & UC023
  Gestor((Secretaria/Gestor)) --- UC005 & UC014
  Admin((Administrador)) --- UC020 & UC021
  Auditor((auditor)) --- UC012
  DPO((dpo)) --- UC017
  Cidadao((Cidadão/Gestor)) --- UC011
  Sistema((Sistema)) --- UC002 & UC008 & UC009 & UC013 & UC023
```

---
*Documento canônico — `spec/docs/casos-de-uso.md`. Alinhado ao PRD v2.5. Supersede `source/06-CasosUso.md` v1.0 (insumo histórico).*
