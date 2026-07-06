# Compra Mais - Plataforma de Compras Municipalizadas

## Histórias de Usuário

---

**Projeto:** Compra Mais  
**Cliente:** Prefeitura Municipal de Rio Branco  
**Versão:** 1.0  
**Data:** 2026-06-22  
**Autor:** Equipe de Análise de Requisitos  

---

## Controle de Versão

| Versão | Data | Autor | Alteração |
|---------|---------|---------|---------|
| 1.0 | 2026-06-22 | Equipe de Análise | Versão inicial - Padronização estrutural |

---

## Sumário

1. [Histórias de Usuário - Catálogo/Cadastros Base](#histórias-de-usuário---catálogocadastros-base)
2. [Histórias de Usuário - Credenciamento e Covalidação](#histórias-de-usuário---credenciamento-e-covalidação)
3. [Histórias de Usuário - Gestão de Editais](#histórias-de-usuário---gestão-de-editais)
4. [Histórias de Usuário - Distribuição Inteligente](#histórias-de-usuário---distribuição-inteligente)
5. [Histórias de Usuário - Integração Processual](#histórias-de-usuário---integração-processual)
6. [Histórias de Usuário - Auditoria e Logs](#histórias-de-usuário---auditoria-e-logs)
7. [Histórias de Usuário - Dashboard BI Público](#histórias-de-usuário---dashboard-bi-público)
8. [Histórias de Usuário - Administração do Sistema](#histórias-de-usuário---administração-do-sistema)

---

## Histórias de Usuário - Catálogo/Cadastros base
HU001 - Onboarding Integrado à Receita Federal
Como Fornecedor, quero inserir apenas o meu CNPJ no momento do cadastro inicial, para que o sistema preencha automaticamente meus dados básicos e evite erros de digitação.
Critérios de Aceite
Dado que o fornecedor acessa a tela de cadastro e insere um CNPJ válido,
Quando ele clica em "Avançar" ou sai do campo,
Então o sistema deve consultar a API da Receita Federal e preencher automaticamente os campos de Razão Social, Nome Fantasia, CNAE Principal, CNAEs Secundários e Porte da Empresa.
Requisitos Relacionados
RF001, RNF001, RNF005
Regras de Negócio Relacionadas
RN-N/A
Prioridade
Must Have
Módulo
Catálogo/Cadastros base
HU002 - Bloqueio por Inadimplência ou Dívida Ativa
Como Administrador SMGA/CPL, quero que o sistema consulte automaticamente as bases de débito (PGM, Federais e Estaduais) com base no CNPJ do fornecedor, para bloqueá-lo sistemicamente de habilitar-se em editais caso possua pendências.
Critérios de Aceite
Dado que o fornecedor tenta avançar para o status de "Credenciado",
Quando o sistema verifica as APIs integradas (PGM, SICAF, etc.) e obtém retorno de débito ou penalidade ativa,
Então o sistema deve exibir uma mensagem clara de impedimento ("Acesso bloqueado devido a pendências fiscais/municipais") e travar a ação.
Requisitos Relacionados
RF011, RNF001
Regras de Negócio Relacionadas
RN002
Prioridade
Must Have
Módulo
Catálogo/Cadastros base
## Histórias de Usuário - Credenciamento e Covalidação
HU003 - Filtro de Editais por Compatibilidade de CNAE
Como Fornecedor, quero visualizar no meu painel apenas os editais que são compatíveis com o meu ramo de atuação (CNAE), para não perder tempo tentando me credenciar em demandas que não posso fornecer legalmente.
Critérios de Aceite
Dado que o fornecedor possui os CNAEs X e Y registrados no seu perfil,
Quando ele acessa a vitrine de editais abertos,
Então o sistema deve exibir somente os editais cuja configuração exija os CNAEs X ou Y, ocultando os demais (ex: ocultar edital de engenharia para fornecedor de panificação).
Requisitos Relacionados
RF003
Regras de Negócio Relacionadas
RN001
Prioridade
Must Have
Módulo
Credenciamento e Covalidação
HU004 - Alocação em Cadastro de Reserva (Segunda Demanda)
Como Administrador SMGA/CPL, quero que fornecedores aprovados após a primeira distribuição sejam colocados em uma fila de espera associada ao edital, para não paralisar os contratos vigentes e cumprir a lei que exige credenciamento aberto contínuo.
Critérios de Aceite
Dado que um edital já teve seus quantitativos distribuídos aos primeiros credenciados,
Quando um novo fornecedor preenche todos os requisitos e é aprovado (retardatário),
Então o sistema deve classificá-lo com a flag de "Cadastro de Reserva/Segunda Demanda" sem recalcular os lotes dos fornecedores que já estão em execução.
Requisitos Relacionados
RF006
Regras de Negócio Relacionadas
RN004
Prioridade
Must Have
Módulo
Credenciamento e Covalidação
## Histórias de Usuário - Gestão de Editais
HU005 - Criação de Edital Individualizado
Como Administrador SMGA/CPL, quero poder criar um edital de compras exclusivo para uma única secretaria (1 demanda = 1 edital), para garantir a separação correta de orçamentos e especificações técnicas.
Critérios de Aceite
Dado que um Administrador acessa a criação de novo edital,
Quando ele preenche os dados gerais (Objeto, Valor Unitário, Secretaria Demandante),
Então o sistema não deve permitir vincular múltiplas secretarias demandantes no mesmo edital, mantendo o controle isolado de quantitativos e lotes.
Requisitos Relacionados
RF008, RNF004
Regras de Negócio Relacionadas
RN007
Prioridade
Must Have
Módulo
Gestão de Editais
## Histórias de Usuário - Credenciamento e Covalidação
HU006 - Reuso de Documentos no Repositório
Como Fornecedor, quero que os documentos habilitatórios que enviei (que ainda estão na validade) sejam armazenados no sistema, para não ter que reenviá-los toda vez que eu manifestar interesse em um novo edital.
Critérios de Aceite
Dado que o fornecedor anexou um Contrato Social e certidões válidas anteriormente,
Quando ele clica em "Credenciar" em um novo edital,
Então o sistema deve importar automaticamente os documentos válidos do repositório, solicitando upload apenas dos anexos específicos do edital atual ou de certidões expiradas.
Requisitos Relacionados
RF002
Regras de Negócio Relacionadas
RN-N/A
Prioridade
Should Have
Módulo
Credenciamento e Covalidação
HU007 - Covalidação Humana e Justificativa de Reprovação
Como Fiscal/Validador (CPL), quero analisar manualmente os PDFs críticos (Balanço Patrimonial e Atestados) e reprová-los com justificativa obrigatória, para evitar fraudes documentais (ex: sobreposição de imagem) que as validações automáticas não pegam.
Critérios de Aceite
Dado que o Fiscal visualiza um documento submetido,
Quando ele clica no botão "Reprovar",
Então o sistema deve abrir um campo de texto obrigatório para a justificativa.
E o sistema só deve gravar a reprovação e notificar o fornecedor se o campo de texto estiver preenchido.
Requisitos Relacionados
RF004
Regras de Negócio Relacionadas
RN003, RN006 (Validade do Balanço)
Prioridade
Must Have
Módulo
Credenciamento e Covalidação
HU008 - Verificação por Biometria Facial [Ponto de Validação]
Como Administrador SMGA/CPL, quero exigir autenticação facial no momento em que o procurador/fornecedor subir arquivos no portal, para garantir a responsabilidade irrefutável sobre documentos anexados e evitar atuação de golpistas.
Critérios de Aceite
Dado que o usuário finaliza o upload de documentos críticos,
Quando clica em "Assinar/Enviar",
Então o sistema aciona a câmera do dispositivo solicitando uma prova de vida (liveness) e cruza com a identidade validada. (Nota: Este item depende de validação orçamentária e técnica para entrar no MVP ou Fase 2).
Requisitos Relacionados
RF012
Regras de Negócio Relacionadas
RN003
Prioridade
Could Have (Necessita Validação)
Módulo
Credenciamento e Covalidação
## Histórias de Usuário - Distribuição Inteligente
HU009 - Distribuição Equitativa por Capacidade Produtiva
Como Administrador SMGA/CPL, quero que o sistema calcule matematicamente a divisão do objeto do edital de forma igualitária, respeitando o limite máximo preenchido pelo fornecedor, para garantir que micros e pequenas empresas consigam atender o contrato sem falir por excesso de volume.
Critérios de Aceite
Dado que há 10 fornecedores aptos e a demanda é de 1.000 itens (100 para cada na divisão linear),
Quando o motor de distribuição é executado,
Então se o fornecedor A preencheu sua capacidade máxima como 50 itens, o sistema deve alocar 50 itens para ele e redistribuir os 50 restantes de forma igualitária entre os demais fornecedores que tenham capacidade para absorvê-los.
Requisitos Relacionados
RF005
Regras de Negócio Relacionadas
RN005
Prioridade
Must Have
Módulo
Distribuição Inteligente
## Histórias de Usuário - Integração Processual (Malote)
HU010 - Geração Estruturada do Malote SEI
Como Administrador SMGA/CPL, quero poder baixar em lote todos os documentos aprovados do fornecedor agrupados e comprimidos em um único PDF ordenado, para eliminar o retrabalho de compressão manual e facilitar a montagem do processo de empenho no sistema SEI da Prefeitura.
Critérios de Aceite
Dado que o fornecedor teve seus documentos homologados,
Quando o Administrador clica em "Exportar Malote Processual",
Então o sistema deve gerar um PDF condensado respeitando o limite de megabytes tolerado pelo SEI, na ordem: 1º Cartão CNPJ, 2º Doc. Pessoal, 3º Anexos do Edital, 4º Certidões.
Requisitos Relacionados
RF007, RNF002
Regras de Negócio Relacionadas
RN008
Prioridade
Must Have
Módulo
Integração Processual (Malote)
## Histórias de Usuário - Auditoria e Logs
HU011 - Trilha de Auditoria Imutável
Como Órgão de Controle (Controladoria/TCE), quero ter acesso a um log de eventos de todas as covalidações, reprovações e distribuições, para garantir a transparência, segurança jurídica do certame e responsabilidade de cada servidor envolvido.
Critérios de Aceite
Dado que um usuário realiza uma ação de alteração de status (Aprovar, Reprovar, Distribuir Lotes),
Quando a ação é salva no banco,
Então o sistema deve gravar um log imutável contendo: ID do Usuário, Timestamp, Endereço IP e o JSON com a versão anterior e a versão nova do dado alterado.
Requisitos Relacionados
RF014, RNF003
Regras de Negócio Relacionadas
RN-N/A
Prioridade
Must Have
Módulo
Auditoria e Logs
## Histórias de Usuário - Dashboard BI Público
HU012 - Portal Público de Acompanhamento (BI)
Como Gestor Municipal / Cidadão (FIEAC), quero acessar uma página web institucional (Landing Page Azul), para visualizar os números globais de fomento à economia local do programa Compra Mais sem precisar de login e senha.
Critérios de Aceite
Dado que um cidadão acessa a URL pública do Compra Mais,
Quando a página é renderizada,
Então ele visualiza gráficos resumidos e atualizados mostrando: Total Investido no ano, Número de Empresas Credenciadas, e Segmentos mais Aquecidos (ex: panificação, moveleiros).
E a interface deve respeitar estritamente a identidade visual padrão da Prefeitura (Azul).
Requisitos Relacionados
RF010, RNF006, RNF005
Regras de Negócio Relacionadas
RN-N/A
Prioridade
Should Have
Módulo
Dashboard (BI Público)
## Histórias de Usuário - Administração do Sistema
HU013 - Notificações de Vencimento de Certidões
Como Fornecedor, quero receber alertas automáticos via e-mail e SMS quando minhas certidões estiverem próximas de expirar, para que eu possa atualizar os documentos no portal e não ser inativado sistemicamente nos próximos editais.
Critérios de Aceite
Dado que o sistema possui uma rotina de verificação diária,
Quando identifica que uma certidão de um fornecedor credenciado vai vencer em 5 dias,
Então ele dispara um e-mail e um SMS padronizado contendo o aviso e o link para a atualização no portal.
Requisitos Relacionados
RF009
Regras de Negócio Relacionadas
RN-N/A
Prioridade
Could Have
Módulo
Administração do Sistema

HU014 - Painel Interno de Gestão de Cadastros
Como Administrador SMGA/CPL, quero acessar um painel interno com indicadores de cadastros pendentes, análises documentais e status de editais, para priorizar os trabalhos e fornecer visibilidade operacional diária.
Critérios de Aceite
Dado que o administrador acessa o módulo administrativo,
Quando a página é carregada,
Então ele visualiza valores de: cadastros pendentes, documentos em análise, editais abertos e notificações de vencimento.
Requisitos Relacionados
RF013
Regras de Negócio Relacionadas
RN-N/A
Prioridade
Should Have
Módulo
Administração do Sistema

---

## Documentos Relacionados

- [01 - Descritivo do Produto](01-DescritivoProduto.md)
- [02 - Declaração de Escopo](02-DeclaracaoEscopo.md)
- [03 - HDR (Requisitos)](03-HDR.md)
- [04 - Arquitetura](04-Arquitetura.md)
- [06 - Casos de Uso](06-CasosUso.md)
- [07 - Backlog](07-Backlog.md)
- [08 - BPMN](08-BPMN.md)

---

**Documento gerado automaticamente com padronização Hydros v1**  
*Última atualização: 2026-06-22*