# Compra Mais - Plataforma de Compras Municipalizadas

## Histórias de Usuário - v2

---

**Projeto:** Compra Mais  
**Cliente:** Prefeitura Municipal de Rio Branco  
**Versão:** 2.0  
**Data:** 2026-07-03  
**Autor:** Equipe de Análise de Requisitos  

---

## Controle de Versão

| Versão | Data | Autor | Alteração |
|---------|---------|---------|---------|
| 1.0 | 2026-06-22 | Equipe de Análise | Versão inicial - Padronização estrutural |
| 2.0 | 2026-07-03 | Equipe de Análise | Incorporação do feedback da Validação 01 (visitas 5 e 6). |

---

## Sumário

1.  [Histórias de Usuário - Catálogo/Cadastros Base](#histórias-de-usuário---catálogocadastros-base)
2.  [Histórias de Usuário - Gestão de Editais](#histórias-de-usuário---gestão-de-editais)
3.  [Histórias de Usuário - Credenciamento e Covalidação](#histórias-de-usuário---credenciamento-e-covalidação)
4.  [Histórias de Usuário - Distribuição Inteligente](#histórias-de-usuário---distribuição-inteligente)
5.  [Histórias de Usuário - Integração Processual](#histórias-de-usuário---integração-processual)
6.  [Histórias de Usuário - Auditoria e Logs](#histórias-de-usuário---auditoria-e-logs)
7.  [Histórias de Usuário - Dashboard BI Público](#histórias-de-usuário---dashboard-bi-público)
8.  [Histórias de Usuário - Administração do Sistema](#histórias-de-usuário---administração-do-sistema)
9.  [Resumo das Alterações da V2](#resumo-das-alterações-da-v2)

---

## Histórias de Usuário - Catálogo/Cadastros base

### HU-001 – Onboarding Integrado à Receita Federal

**Perfil**
Fornecedor

**História**
Como **Fornecedor**,
Quero **inserir apenas o meu CNPJ no momento do cadastro inicial**,
Para que **o sistema preencha automaticamente meus dados básicos e evite erros de digitação**.

**Critérios de Aceite**
- Dado que o fornecedor acessa a tela de cadastro e insere um CNPJ válido, quando ele clica em "Avançar", o sistema deve consultar a API da Receita Federal.
- O sistema deve preencher automaticamente os campos de Razão Social, Nome Fantasia, CNAE Principal, CNAEs Secundários e Porte da Empresa.
- Se a API da Receita estiver indisponível, o sistema deve permitir o preenchimento manual dos dados.

**Prioridade**
Must Have

**Origem**
- Original

**Relacionamentos**
- **HDR:** RF001, RNF001
- **Caso de Uso:** UC001
- **Tela do Protótipo:** Tela de Cadastro

### HU-002 – Bloqueio por Inadimplência e Status de Análise (Atualizada na V2)

**Perfil**
Administrador SMGA/CPL

**História**
Como **Administrador SMGA/CPL**,
Quero que **o sistema consulte automaticamente as bases de débito (PGM, Federais) ao tentar credenciar um fornecedor**,
Para **bloqueá-lo sistemicamente caso possua pendências fiscais e diferenciar claramente este status de uma pendência documental**.

**Critérios de Aceite**
- Dado que o fornecedor tenta avançar para o status de "Credenciado", o sistema deve verificar as APIs integradas (PGM, SICAF).
- Se for encontrado um débito ou penalidade ativa, o sistema deve exibir a mensagem "Acesso bloqueado devido a pendências fiscais/municipais" e impedir o avanço.
- Se a pendência for apenas documental (aguardando análise humana), o status do fornecedor deve ser exibido como "Em Análise", e não "Bloqueado".

**Prioridade**
Must Have

**Origem**
- Original, ajustada na Validação 01.

**Relacionamentos**
- **HDR:** RF011, RNF001, RN002
- **Caso de Uso:** UC002
- **Tela do Protótipo:** Painel do Administrador, Detalhes do Fornecedor

## Histórias de Usuário - Gestão de Editais

### HU-003 – Filtro de Editais por Compatibilidade de CNAE

**Perfil**
Fornecedor

**História**
Como **Fornecedor**,
Quero **visualizar no meu painel apenas os editais que são compatíveis com o meu ramo de atuação (CNAE)**,
Para **não perder tempo tentando me credenciar em demandas que não posso fornecer legalmente**.

**Critérios de Aceite**
- Dado que o fornecedor possui os CNAEs X e Y registrados, quando ele acessa a vitrine de editais, o sistema deve exibir somente os editais que exijam os CNAEs X ou Y.
- Editais para outros CNAEs devem ser ocultados.

**Prioridade**
Must Have

**Origem**
- Original

**Relacionamentos**
- **HDR:** RF003, RN001
- **Caso de Uso:** UC003
- **Tela do Protótipo:** Painel do Fornecedor - Vitrine de Editais

### HU-004 – Criação de Edital Individualizado

**Perfil**
Administrador SMGA/CPL

**História**
Como **Administrador SMGA/CPL**,
Quero **poder criar um edital de compras exclusivo para uma única secretaria (1 demanda = 1 edital)**,
Para **garantir a separação correta de orçamentos e especificações técnicas**.

**Critérios de Aceite**
- Ao criar um novo edital, o sistema deve exigir o preenchimento de metadados como Objeto, Valor e Secretaria Demandante.
- O sistema não deve permitir vincular múltiplas secretarias demandantes no mesmo edital.

**Prioridade**
Must Have

**Origem**
- Original

**Relacionamentos**
- **HDR:** RF008, RNF004, RN007
- **Caso de Uso:** UC005
- **Tela do Protótipo:** Formulário de Criação de Edital

### HU-005 – Anexação do PDF do Edital (Nova na V2)

**Perfil**
Administrador SMGA/CPL

**História**
Como **Administrador SMGA/CPL**,
Quero **anexar o documento PDF original do edital ao criá-lo no sistema**,
Para **aumentar a transparência e disponibilizar a fonte primária de informação para os fornecedores**.

**Critérios de Aceite**
- No formulário de criação de edital, deve haver um campo para upload de arquivo PDF.
- O upload do PDF do edital deve ser um passo obrigatório para a publicação.

**Prioridade**
Must Have

**Origem**
- Inclusa na Validação 01

**Relacionamentos**
- **HDR:** RF016
- **Caso de Uso:** UC005 (atualizado)
- **Tela do Protótipo:** Formulário de Criação de Edital

### HU-006 – Consulta e Download do Edital Original (Nova na V2)

**Perfil**
Fornecedor

**História**
Como **Fornecedor**,
Quero **poder visualizar e baixar o PDF original do edital**,
Para **consultar todos os detalhes e regras do chamamento público em sua fonte primária**.

**Critérios de Aceite**
- Na tela de detalhes de um edital, deve haver um botão ou link claramente identificado para "Baixar Edital em PDF".
- Ao clicar, o download do arquivo PDF anexado pelo administrador deve ser iniciado.

**Prioridade**
Must Have

**Origem**
- Inclusa na Validação 01

**Relacionamentos**
- **HDR:** RF016
- **Caso de Uso:** UC005 (pós-condição)
- **Tela do Protótipo:** Painel do Fornecedor - Detalhes do Edital

## Histórias de Usuário - Credenciamento e Covalidação

### HU-007 – Reuso de Documentos no Repositório

**Perfil**
Fornecedor

**História**
Como **Fornecedor**,
Quero que **os documentos habilitatórios que enviei (e que ainda estão na validade) sejam armazenados**,
Para **não ter que reenviá-los toda vez que eu manifestar interesse em um novo edital**.

**Critérios de Aceite**
- Ao se credenciar em um novo edital, o sistema deve importar automaticamente os documentos válidos do repositório.
- O sistema deve solicitar upload apenas dos anexos específicos do novo edital ou de certidões expiradas.

**Prioridade**
Should Have

**Origem**
- Original

**Relacionamentos**
- **HDR:** RF002
- **Caso de Uso:** UC004
- **Tela do Protótipo:** Fluxo de Credenciamento

### HU-008 – Covalidação Humana e Justificativa de Reprovação

**Perfil**
Fiscal/Validador (CPL)

**História**
Como **Fiscal/Validador (CPL)**,
Quero **analisar manualmente os PDFs críticos e reprová-los com justificativa obrigatória**,
Para **evitar fraudes documentais que as validações automáticas não detectam**.

**Critérios de Aceite**
- Ao visualizar um documento submetido e clicar em "Reprovar", o sistema deve abrir um campo de texto obrigatório para a justificativa.
- O sistema só deve gravar a reprovação e notificar o fornecedor se o campo de justificativa estiver preenchido.

**Prioridade**
Must Have

**Origem**
- Original

**Relacionamentos**
- **HDR:** RF004, RN003, RN006
- **Caso de Uso:** UC006
- **Tela do Protótipo:** Painel do Administrador - Análise Documental

### HU-009 – Aceite do Termo de Responsabilidade (Nova na V2)

**Perfil**
Fornecedor

**História**
Como **Fornecedor**,
Quero **assinalar um termo de responsabilidade ao informar minha capacidade produtiva**,
Para **dar validade legal à minha declaração e estar ciente das implicações jurídicas**.

**Critérios de Aceite**
- Durante o fluxo de credenciamento, antes de submeter a proposta, o sistema deve exibir um checkbox com o texto do termo de responsabilidade.
- O fornecedor não poderá prosseguir sem marcar o aceite do termo.
- A ação de aceite deve ser registrada na trilha de auditoria.

**Prioridade**
Must Have

**Origem**
- Inclusa na Validação 01

**Relacionamentos**
- **HDR:** RF015
- **Caso de Uso:** UC004 (atualizado)
- **Tela do Protótipo:** Fluxo de Credenciamento

### HU-010 – Solicitação de Desistência de Edital (Nova na V2)

**Perfil**
Fornecedor

**História**
Como **Fornecedor**,
Quero **poder solicitar a desistência de um edital no qual estou credenciado**,
Para **formalizar minha saída do processo caso não tenha mais interesse ou capacidade de participar**.

**Critérios de Aceite**
- Na tela de um edital em que estou participando, deve haver um botão "Desistir do Edital".
- Ao clicar, o sistema deve pedir uma confirmação.
- Após a confirmação, meu status no edital deve mudar para "Pendente de Desistência" e uma notificação deve ser enviada ao administrador.

**Prioridade**
Must Have

**Origem**
- Inclusa na Validação 01

**Relacionamentos**
- **HDR:** RF017, RN010
- **Caso de Uso:** UC-NOVO (Formalizar Desistência)
- **Tela do Protótipo:** Painel do Fornecedor - Detalhes do Edital

### HU-011 – Aprovação de Desistência de Fornecedor (Nova na V2)

**Perfil**
Administrador SMGA

**História**
Como **Administrador da SMGA**,
Quero **receber e aprovar as solicitações de desistência dos fornecedores**,
Para **formalizar o ato com segurança jurídica e liberar a vaga para o cadastro de reserva, se aplicável**.

**Critérios de Aceite**
- O painel do administrador deve exibir uma notificação ou uma lista de "Desistências Pendentes".
- Ao acessar uma solicitação, o administrador deve ter a opção de "Confirmar Desistência".
- A confirmação deve alterar o status do fornecedor para "Desistente" e registrar o ato na trilha de auditoria.

**Prioridade**
Must Have

**Origem**
- Inclusa na Validação 01

**Relacionamentos**
- **HDR:** RF017, RN010
- **Caso de Uso:** UC-NOVO (Formalizar Desistência)
- **Tela do Protótipo:** Painel do Administrador - Pendências

### HU-012 – Verificação por Biometria Facial (Adiada na V2)

**Perfil**
Administrador SMGA/CPL

**História**
Como **Administrador SMGA/CPL**,
Quero **exigir autenticação facial no momento em que o fornecedor subir arquivos no portal**,
Para **garantir a responsabilidade irrefutável sobre documentos anexados**.

**Critérios de Aceite**
- (A definir)

**Prioridade**
Could Have

**Origem**
- Original. Funcionalidade adiada para versão futura após Validação 01 devido ao alto impacto técnico.

**Relacionamentos**
- **HDR:** RF012
- **Caso de Uso:** UC007
- **Tela do Protótipo:** N/A (Fluxo adiado)

## Histórias de Usuário - Distribuição Inteligente

### HU-013 – Distribuição Equitativa por Capacidade Produtiva

**Perfil**
Administrador SMGA/CPL

**História**
Como **Administrador SMGA/CPL**,
Quero que **o sistema calcule matematicamente a divisão do objeto do edital de forma igualitária**,
Para **garantir que as empresas consigam atender o contrato, respeitando o limite de capacidade informado por elas**.

**Critérios de Aceite**
- Dado que há 10 fornecedores aptos e a demanda é de 1.000 itens, se o fornecedor A declarou capacidade máxima de 50 itens, o sistema deve alocar 50 para ele.
- O saldo restante (50 itens) deve ser redistribuído de forma igualitária entre os demais 9 fornecedores que tenham capacidade para absorvê-los.

**Prioridade**
Must Have

**Origem**
- Original

**Relacionamentos**
- **HDR:** RF005, RN005
- **Caso de Uso:** UC008
- **Tela do Protótipo:** Painel do Administrador - Distribuição de Edital

### HU-014 – Imutabilidade da Distribuição de Cotas (Nova na V2)

**Perfil**
Administrador SMGA/CPL

**História**
Como **Administrador**,
Quero que **o sistema me impeça de editar manualmente as cotas após o cálculo de distribuição**,
Para **garantir a isonomia, a transparência e a soberania do algoritmo**.

**Critérios de Aceite**
- Após a execução do cálculo de distribuição, a interface do administrador não deve apresentar campos ou botões que permitam alterar as cotas atribuídas.
- Qualquer tentativa de alteração via sistema deve ser bloqueada e registrada como uma tentativa de violação.

**Prioridade**
Must Have

**Origem**
- Inclusa na Validação 01

**Relacionamentos**
- **HDR:** RN009
- **Caso de Uso:** UC008 (atualizado)
- **Tela do Protótipo:** Painel do Administrador - Resultado da Distribuição

### HU-015 – Visualização Individual da Cota Distribuída (Nova na V2)

**Perfil**
Fornecedor

**História**
Como **Fornecedor**,
Quero **ver de forma clara e objetiva qual foi a cota de fornecimento atribuída à minha empresa**,
Para **focar no meu contrato e evitar conflitos com concorrentes**.

**Critérios de Aceite**
- Após a distribuição das cotas, a tela de resultado do edital deve exibir para o fornecedor logado apenas a sua cota individual.
- A tela não deve mostrar a distribuição de cotas dos outros fornecedores participantes.

**Prioridade**
Must Have

**Origem**
- Inclusa na Validação 01

**Relacionamentos**
- **HDR:** RF005
- **Caso de Uso:** UC008 (pós-condição)
- **Tela do Protótipo:** Painel do Fornecedor - Resultado da Distribuição

### HU-016 – Alocação em Cadastro de Reserva

**Perfil**
Administrador SMGA/CPL

**História**
Como **Administrador SMGA/CPL**,
Quero que **fornecedores aprovados após a primeira distribuição sejam colocados em uma fila de espera**,
Para **não paralisar os contratos vigentes e cumprir a lei que exige credenciamento aberto contínuo**.

**Critérios de Aceite**
- Quando um novo fornecedor é aprovado em um edital já distribuído, o sistema deve classificá-lo com a flag de "Cadastro de Reserva".
- O sistema não deve recalcular os lotes dos fornecedores que já estão em execução.

**Prioridade**
Must Have

**Origem**
- Original

**Relacionamentos**
- **HDR:** RF006, RN004
- **Caso de Uso:** UC009
- **Tela do Protótipo:** Painel do Administrador - Gestão de Edital

## Histórias de Usuário - Integração Processual

### HU-017 – Geração Estruturada do Malote SEI

**Perfil**
Administrador SMGA/CPL

**História**
Como **Administrador SMGA/CPL**,
Quero **poder baixar em lote todos os documentos aprovados do fornecedor agrupados e ordenados**,
Para **eliminar o retrabalho de compressão manual e facilitar a montagem do processo no SEI**.

**Critérios de Aceite**
- Ao clicar em "Exportar Malote Processual", o sistema deve gerar um PDF/ZIP condensado.
- O arquivo deve respeitar a ordem: 1º Cartão CNPJ, 2º Doc. Pessoal, 3º Anexos do Edital, 4º Certidões.
- O arquivo deve ser otimizado para não exceder o limite de tamanho do SEI.

**Prioridade**
Must Have

**Origem**
- Original

**Relacionamentos**
- **HDR:** RF007, RNF002, RN008
- **Caso de Uso:** UC010
- **Tela do Protótipo:** Painel do Administrador - Detalhes do Fornecedor

## Histórias de Usuário - Auditoria e Logs

### HU-018 – Trilha de Auditoria Imutável

**Perfil**
Órgão de Controle (Controladoria/TCE)

**História**
Como **Órgão de Controle**,
Quero **ter acesso a um log de eventos de todas as covalidações, reprovações e distribuições**,
Para **garantir a transparência, segurança jurídica e responsabilidade de cada servidor**.

**Critérios de Aceite**
- Toda ação de alteração de status (Aprovar, Reprovar, Distribuir, Desistir) deve ser gravada em um log imutável.
- O log deve conter: ID do Usuário, Timestamp, Endereço IP e os dados da alteração.

**Prioridade**
Must Have

**Origem**
- Original

**Relacionamentos**
- **HDR:** RF014, RNF003
- **Caso de Uso:** UC012
- **Tela do Protótipo:** Módulo de Auditoria

## Histórias de Usuário - Dashboard BI Público

### HU-019 – Portal Público de Acompanhamento (Atualizada na V2)

**Perfil**
Gestor Municipal / Cidadão / FIEAC

**História**
Como **Gestor Municipal / Cidadão**,
Quero **acessar uma página web institucional para visualizar os números globais do programa Compra Mais**,
Para **acompanhar o fomento à economia local sem precisar de login**.

**Critérios de Aceite**
- A URL pública do Compra Mais deve renderizar uma página com gráficos resumidos: Total Investido, Número de Empresas Credenciadas, Segmentos mais Aquecidos.
- A interface deve exibir o título "Compra Mais Rio Branco".
- A página deve respeitar estritamente a identidade visual padrão da Prefeitura (paleta de cores Azul, logomarcas oficiais).

**Prioridade**
Should Have

**Origem**
- Original, ajustada na Validação 01.

**Relacionamentos**
- **HDR:** RF010, RNF006
- **Caso de Uso:** UC011
- **Tela do Protótipo:** Landing Page Pública

## Histórias de Usuário - Administração do Sistema

### HU-020 – Notificações de Vencimento de Certidões

**Perfil**
Fornecedor

**História**
Como **Fornecedor**,
Quero **receber alertas automáticos quando minhas certidões estiverem próximas de expirar**,
Para **que eu possa atualizar os documentos e não ser inativado sistemicamente**.

**Critérios de Aceite**
- Uma rotina diária deve verificar certidões a vencer nos próximos X dias.
- O sistema deve disparar um e-mail e/ou SMS padronizado com o aviso e o link para atualização.

**Prioridade**
Could Have

**Origem**
- Original

**Relacionamentos**
- **HDR:** RF009
- **Caso de Uso:** UC013
- **Tela do Protótipo:** N/A (Serviço de background)

### HU-021 – Painel Interno de Gestão de Cadastros (Atualizada na V2)

**Perfil**
Administrador SMGA/CPL

**História**
Como **Administrador SMGA/CPL**,
Quero **acessar um painel interno com indicadores de pendências**,
Para **priorizar os trabalhos e fornecer visibilidade operacional diária**.

**Critérios de Aceite**
- O painel administrativo deve exibir indicadores de: cadastros pendentes, documentos "Em Análise", e "Desistências Pendentes".
- O administrador deve poder clicar nos indicadores para ser direcionado à lista de itens pendentes.

**Prioridade**
Should Have

**Origem**
- Original, ajustada na Validação 01.

**Relacionamentos**
- **HDR:** RF013
- **Caso de Uso:** UC014
- **Tela do Protótipo:** Painel do Administrador

---

## Resumo das Alterações da V2

Esta seção detalha as mudanças realizadas nesta versão do documento, com base no feedback da Validação 01.

### Histórias Mantidas

- **HU-001:** Onboarding Integrado à Receita Federal
- **HU-003:** Filtro de Editais por Compatibilidade de CNAE
- **HU-004:** Criação de Edital Individualizado
- **HU-007:** Reuso de Documentos no Repositório
- **HU-008:** Covalidação Humana e Justificativa de Reprovação
- **HU-013:** Distribuição Equitativa por Capacidade Produtiva
- **HU-016:** Alocação em Cadastro de Reserva
- **HU-017:** Geração Estruturada do Malote SEI
- **HU-018:** Trilha de Auditoria Imutável
- **HU-020:** Notificações de Vencimento de Certidões

### Histórias Atualizadas

- **HU-002:** Atualizada para incluir a diferenciação de nomenclatura entre "Bloqueado" (por dívida) e "Em Análise" (pendência documental).
- **HU-019:** Atualizada para incluir o nome oficial da página ("Compra Mais Rio Branco") e a obrigatoriedade do uso das logomarcas da prefeitura.
- **HU-021:** Atualizada para incluir o novo indicador de "Desistências Pendentes" no painel do administrador.

### Histórias Novas

- **HU-005:** Anexação do PDF do Edital
- **HU-006:** Consulta e Download do Edital Original
- **HU-009:** Aceite do Termo de Responsabilidade
- **HU-010:** Solicitação de Desistência de Edital
- **HU-011:** Aprovação de Desistência de Fornecedor
- **HU-014:** Imutabilidade da Distribuição de Cotas
- **HU-015:** Visualização Individual da Cota Distribuída

### Histórias Removidas/Substituídas

- **HU-012 (antiga HU008):** A história sobre verificação por biometria facial foi marcada como **"Adiada na V2"**, pois sua implementação foi postergada para uma fase futura do projeto.

### Impacto da Validação 01

| História | Tipo de Alteração | Motivo | Origem da Validação |
| :--- | :--- | :--- | :--- |
| **HU-002** | Atualização | Melhorar a clareza da comunicação com o fornecedor sobre seu status. | `FeedbackValidacao01.md` |
| **HU-005** | Nova | Aumentar a transparência, permitindo anexar o edital original. | `FeedbackValidacao01.md` |
| **HU-006** | Nova | Complementar a HU-005, garantindo o acesso do fornecedor ao edital. | `FeedbackValidacao01.md` |
| **HU-009** | Nova | Aumentar a segurança jurídica, responsabilizando o fornecedor pela informação declarada. | `FeedbackValidacao01.md` |
| **HU-010** | Nova | Criar um fluxo formal e seguro para a desistência de um fornecedor. | `FeedbackValidacao01.md` |
| **HU-011** | Nova | Complementar a HU-010, definindo a contraparte administrativa do fluxo de desistência. | `FeedbackValidacao01.md` |
| **HU-012** | Substituição | Adiar funcionalidade de alto impacto técnico para não comprometer o MVP. | `AnaliseImpactoValidacao01.md` |
| **HU-014** | Nova | Garantir a isonomia do processo, vedando intervenção manual no resultado do algoritmo. | `FeedbackValidacao01.md` |
| **HU-015** | Nova | Evitar conflitos entre fornecedores, mostrando apenas a informação relevante para cada um. | `FeedbackValidacao01.md` |
| **HU-019** | Atualização | Ajustar a identidade visual da página pública conforme solicitação do cliente. | `FeedbackValidacao01.md` |
| **HU-021** | Atualização | Dar visibilidade ao administrador sobre o novo fluxo de pendências de desistência. | `AnaliseImpactoValidacao01.md` |
