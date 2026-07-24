# Compra Mais - Plataforma de Compras Municipalizadas

## Casos de Uso

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

1. [Casos de Uso - Catálogo/Cadastros Base](#casos-de-uso---catálogocadastros-base)
2. [Casos de Uso - Credenciamento e Covalidação](#casos-de-uso---credenciamento-e-covalidação)
3. [Casos de Uso - Gestão de Editais](#casos-de-uso---gestão-de-editais)
4. [Casos de Uso - Distribuição Inteligente](#casos-de-uso---distribuição-inteligente)
5. [Casos de Uso - Integração Processual](#casos-de-uso---integração-processual)
6. [Casos de Uso - Auditoria e Logs](#casos-de-uso---auditoria-e-logs)
7. [Casos de Uso - Dashboard BI Público](#casos-de-uso---dashboard-bi-público)
8. [Casos de Uso - Administração do Sistema](#casos-de-uso---administração-do-sistema)

---

## Casos de Uso - Catálogo/Cadastros base
UC001 - Cadastrar Fornecedor via Integração (Receita Federal)
Objetivo: Permitir que empresas locais iniciem seu onboarding na plataforma fornecendo apenas o CNPJ, mitigando erros de digitação e garantindo dados oficiais
.
Atores: Fornecedor.
Pré-condições: O usuário deve possuir um CNPJ válido e ativo.
Fluxo Principal:
O Fornecedor acessa o Portal B2G e clica em "Cadastrar".
Informa o seu número de CNPJ
.
O Sistema consome a API da Receita Federal
.
O Sistema preenche automaticamente Razão Social, Nome Fantasia, Porte e CNAEs (Principal e Secundários)
.
O Fornecedor preenche dados de contato (e-mail/senha) e confirma o cadastro.
O Sistema salva o registro e define o status inicial como "Requerente"
.
Fluxos Alternativos:
Indisponibilidade da API: O Sistema permite o preenchimento manual, sinalizando a necessidade de covalidação rigorosa posterior.
Exceções:
CNPJ informado for inválido matematicamente.
Pós-condições: Fornecedor ganha acesso ao Portal, mas ainda necessita credenciar-se em editais
.
Requisitos Relacionados: RF001, RNF001.
Requisitos Não Funcionais Relacionados: RNF005.
Regras de Negócio Relacionadas: RN-N/A.
Complexidade: Média | Prioridade: Must Have | Módulo: Catálogo/Cadastros base
UC002 - Validar Situação de Inadimplência
Objetivo: Realizar a checagem automática em bases de dados governamentais para impedir o avanço de fornecedores com débitos
.
Atores: Sistema (Ação sistêmica de background).
Pré-condições: Fornecedor tenta ingressar na fase de "Credenciamento" de um edital
.
Fluxo Principal:
O Fornecedor aciona a intenção de participar do edital.
O Sistema dispara requisições via API para as bases de Dívida Ativa da PGM e bases federais/estaduais
.
As APIs retornam o status "Nada Consta" (Sem débitos).
O Sistema permite que o Fornecedor prossiga com o envio da documentação
.
Fluxos Alternativos: N/A.
Exceções:
Retorno Positivo para Débitos: O Sistema exibe um alerta de impedimento ("Bloqueado por Inadimplência") e trava o botão de prosseguir
.
Pós-condições: Fornecedor filtrado pela malha fina jurídica do município.
Requisitos Relacionados: RF011, RNF001.
Regras de Negócio Relacionadas: RN002.
Complexidade: Alta | Prioridade: Must Have | Módulo: Catálogo/Cadastros base

## Casos de Uso - Credenciamento e Covalidação

UC003 - Visualizar Editais Compatíveis (Filtro CNAE)
Objetivo: Limitar a exibição do catálogo de editais públicos àqueles cuja natureza seja estritamente compatível com o ramo de atuação (CNAE) da empresa
.
Atores: Fornecedor.
Pré-condições: O Fornecedor deve estar logado no portal.
Fluxo Principal:
O Fornecedor acessa a página "Meus Editais"
.
O Sistema verifica os CNAEs atrelados ao CNPJ do usuário logado
.
O Sistema cruza os CNAEs do usuário com os CNAEs exigidos na configuração dos editais abertos
.
O Sistema exibe em tela apenas as oportunidades compatíveis
.
Fluxos Alternativos:
Nenhum edital compatível: O Sistema exibe a mensagem "Não há editais abertos para o seu segmento no momento".
Exceções: N/A.
Pós-condições: N/A.
Requisitos Relacionados: RF003.
Regras de Negócio Relacionadas: RN001.
Complexidade: Baixa | Prioridade: Must Have | Módulo: Credenciamento e Covalidação
UC004 - Solicitar Credenciamento e Enviar Documentação
Objetivo: Submeter a proposta de fornecimento e os documentos comprobatórios digitais ao Órgão Central (SMGA/CPL)
.
Atores: Fornecedor.
Pré-condições: O edital deve estar com status "Aberto" e o fornecedor deve ter passado no filtro do CNAE
.
Fluxo Principal:
O Fornecedor seleciona o edital desejado e clica em "Iniciar Credenciamento"
.
O Sistema exibe os itens/lotes disponíveis
.
O Fornecedor preenche sua capacidade produtiva (proposta de quantitativos)
.
O Fornecedor realiza o upload de documentos obrigatórios (ex: Contrato Social, Balanço, Atestado de Capacidade Técnica)
.
O Fornecedor confirma o envio.
O Sistema altera o status do fornecedor para "Pendente de Análise"
.
Fluxos Alternativos:
Documento já existente: Se o documento já foi enviado em um credenciamento passado e ainda está válido, o Sistema não exige reenvio, apenas importa do repositório
.
Exceções: Arquivo excede o tamanho máximo configurado ou formato inválido.
Pós-condições: Documentos inseridos na fila de análise da CPL.
Requisitos Relacionados: RF002.
Regras de Negócio Relacionadas: RN-N/A.
Complexidade: Média | Prioridade: Must Have | Módulo: Credenciamento e Covalidação

## Casos de Uso - Gestão de Editais

UC005 - Criar Edital Individualizado
Objetivo: Permitir que o gestor crie um chamamento público individualizado para a demanda de uma única secretaria municipal
.
Atores: Administrador SMGA/CPL.
Pré-condições: O administrador deve possuir as permissões adequadas.
Fluxo Principal:
O Administrador acessa a aba "Editais" e clica em "Novo Edital"
.
Preenche os metadados base: Objeto, Valor Unitário, Vigência
.
Vincula a demanda obrigatoriamente a apenas 1 (uma) Secretaria Demandante (Ex: RBTrans ou SEINFRA)
.
Adiciona a lista de Lotes/Itens com suas devidas quantidades e CNAEs permitidos
.
Salva o edital como "Rascunho".
Fluxos Alternativos: N/A.
Exceções:
Tentativa de associar duas secretarias ao mesmo edital (Sistema bloqueia a ação, respeitando a regra de individualização orçamentária)
.
Pós-condições: Edital pronto para publicação.
Requisitos Relacionados: RF008.
Requisitos Não Funcionais Relacionados: RNF004.
Regras de Negócio Relacionadas: RN007.
Complexidade: Média | Prioridade: Must Have | Módulo: Gestão de Editais

## Casos de Uso - Credenciamento e Covalidação

UC006 - Analisar e Covalidar Documentação
Objetivo: Realizar a verificação humana (antifraude) de atestados e balanços, e emitir o parecer final de habilitação ou inabilitação documental
.
Atores: Administrador SMGA/CPL (Fiscal/Validador).
Pré-condições: Fornecedor possuir status "Pendente de Análise" com documentos submetidos
.
Fluxo Principal:
O Administrador acessa o dashboard de análises pendentes
.
Seleciona um fornecedor e abre o visualizador de PDFs integrado.
Analisa visualmente a integridade dos arquivos (Balanço do último ano, nitidez, etc.)
.
Clica em "Aprovar" em cada documento conforme conformidade
.
O Sistema atualiza o status geral do fornecedor para "Credenciado" e loga a ação (quem aprovou e quando)
.
Fluxos Alternativos:
Reprovação de Documento: O Administrador clica em "Reprovar". O Sistema obriga o preenchimento da justificativa (ex: "Imagem ilegível"). A notificação é enviada ao fornecedor solicitando correção
.
Exceções: Administrador tenta reprovar sem inserir o texto de justificativa (Sistema impede)
.
Pós-condições: O fornecedor torna-se apto para o cálculo de distribuição ou entra em fila de correção.
Requisitos Relacionados: RF004, RNF003.
Regras de Negócio Relacionadas: RN003, RN006.
Complexidade: Média | Prioridade: Must Have | Módulo: Credenciamento e Covalidação
UC007 - Validar Identidade via Biometria Facial [Ponto de Validação]
Objetivo: Acionar prova de vida (Liveness) da pessoa física no ato do envio dos documentos para mitigar fraude em assinaturas e envios de terceiros (contadores/procuradores mal-intencionados)
.
Atores: Fornecedor.
Pré-condições: Edital configurado para exigir biometria no ato do envio.
Fluxo Principal:
Ao finalizar o upload de arquivos de um edital e clicar em "Enviar", o Sistema exibe pop-up solicitando captura facial
.
O usuário concede acesso à câmera do dispositivo.
O Sistema realiza a captura, avalia a "prova de vida" e compara o rosto com o documento de identidade cadastrado no onboarding.
O Sistema conclui a assinatura digital e o envio.
Exceções: Rosto incompatível ou indício de foto estática (spoofing). Envio é bloqueado.
Pós-condições: Transação autenticada biograficamente.
Requisitos Relacionados: RF012.
Regras de Negócio Relacionadas: RN003.
Nota: Este caso de uso possui Alta Complexidade, dependendo de contratação de API terceirizada (IA) e definição orçamentária. Risco para o MVP
.
Complexidade: Alta | Prioridade: Could Have | Módulo: Credenciamento e Covalidação

## Casos de Uso - Distribuição Inteligente

UC008 - Distribuir Demanda Equitativamente
Objetivo: O motor de rateio deve calcular matematicamente as cotas do contrato, considerando os fornecedores habilitados e sua respectiva capacidade técnica
.
Atores: Sistema (Gatilho automático ou manual via Admin).
Pré-condições: O prazo da fase inicial do edital encerrou e há fornecedores com status "Credenciado" e capacidade informada
.
Fluxo Principal:
O Administrador aciona "Calcular Distribuição" na tela do edital.
O Sistema levanta o quantitativo total solicitado pela secretaria (ex: 1.000 itens)
.
O Sistema conta o número de fornecedores aptos.
O Sistema aplica a divisão matemática igualitária
.
Caso a cota individual exceda o "Plano de Fornecimento" (teto produtivo declarado pelo fornecedor), o Sistema trava o fornecimento daquele usuário no seu limite máximo e redistribui o saldo excedente para os demais
.
O Sistema gera o relatório final com as frações homologadas para cada empresa
.
Fluxos Alternativos: N/A.
Exceções: O total ofertado pelas empresas combinadas é inferior à demanda solicitada (Sistema emite alerta de déficit de abastecimento).
Pós-condições: O sistema gera a matriz de alocação indicando quantos itens cada CNPJ vai prover
.
Requisitos Relacionados: RF005.
Regras de Negócio Relacionadas: RN005.
Complexidade: Alta | Prioridade: Must Have | Módulo: Distribuição Inteligente
UC009 - Gerenciar Cadastro de Reserva (Segunda Demanda)
Objetivo: Alocar fornecedores que se credenciaram tardiamente em uma lista de espera, mantendo a conformidade com a exigência de edital continuamente aberto, sem paralisar contratos em andamento
.
Atores: Sistema.
Pré-condições: A primeira distribuição (UC008) do edital já ocorreu e seus contratos já foram gerados. Um fornecedor retardatário teve sua documentação aprovada (UC006)
.
Fluxo Principal:
O Administrador conclui a aprovação de um documento submetido fora da janela inicial de distribuição
.
O Sistema identifica que a flag de distribuição inicial já foi acionada para aquele edital
.
O Sistema insere este fornecedor no pool rotulado como "Segunda Demanda / Cadastro de Reserva"
.
A distribuição já realizada aos primeiros fornecedores permanece rigorosamente intacta (sem fracionamentos retroativos)
.
Fluxos Alternativos: Se um fornecedor titular falhar na entrega ou desistir do contrato, o Administrador aciona a substituição e o Sistema invoca o primeiro colocado do Cadastro de Reserva para assumir o quantitativo faltante
.
Exceções: N/A.
Pós-condições: Fornecedor entra em fila estruturada, garantindo isonomia legal.
Requisitos Relacionados: RF006.
Regras de Negócio Relacionadas: RN004.
Complexidade: Alta | Prioridade: Must Have | Módulo: Distribuição Inteligente

## Casos de Uso - Integração Processual (Malote)

UC010 - Gerar Malote Digital Estruturado (Exportação SEI)
Objetivo: Consolidar toda a documentação comprobatória validada de um fornecedor num único arquivo ordenado e otimizado em tamanho, formatado estritamente para upload imediato no sistema SEI da Prefeitura
.
Atores: Administrador SMGA/CPL.
Pré-condições: O fornecedor deve possuir o status final de "Apto/Fornecedor", com todos os documentos validados e aprovados
.
Fluxo Principal:
O Administrador acessa os detalhes do fornecedor habilitado no edital e clica na opção "Exportar Malote SEI"
.
O Sistema inicia um worker em background para mesclar e comprimir os PDFs
.
O Sistema obriga a seguinte ordenação lógica no arquivo gerado: 1º Cartão CNPJ; 2º Identificação do Fornecedor (Documento Pessoal/Sócio); 3º Anexos Específicos do Edital; 4º Certidões Diversas
.
O Sistema otimiza a qualidade do PDF, garantindo que o limite predeterminado de Megabytes (MB) seja respeitado sem tornar os documentos ilegíveis
.
O Sistema disponibiliza o link para download
.
Fluxos Alternativos: N/A.
Exceções: Processamento excede o limite de tamanho exigido pelo SEI devido ao tamanho atípico das certidões originais. (Ponto de Validação: Permitir que o sistema fragmente o malote em Parte 1 e Parte 2
).
Pós-condições: Dossiê documental perfeitamente estruturado baixado para a máquina do servidor da CPL
.
Requisitos Relacionados: RF007, RNF002.
Requisitos Não Funcionais Relacionados: RNF004.
Regras de Negócio Relacionadas: RN008.
Complexidade: Alta | Prioridade: Must Have | Módulo: Integração Processual (Malote)

## Casos de Uso - Dashboard BI Público
UC011 - Consultar Painel Público de Transparência
Objetivo: Oferecer aos atores políticos e à sociedade civil uma visão gerencial de alto nível sobre os recursos movimentados pelo programa de compras local
.
Atores: Cidadão / Gestor Municipal (Prefeito) / Representante FIEAC.
Pré-condições: Nenhuma (Página aberta e pública)
.
Fluxo Principal:
O ator acessa a Landing Page do "Compra Mais"
.
O sistema (através de queries otimizadas em background) carrega indicadores macro visuais, como: "Valor Total Investido", "Quantidade de Empresas Credenciadas" e "Montante Distribuído por Setor Industrial (Malharias, Panificação, Moveleiros, etc.)"
.
A interface segue a paleta de cores oficial Azul (padrão prefeitura)
.
Fluxos Alternativos: O gestor pode aplicar filtros básicos de tempo (ex: "Valores deste ano")
.
Exceções: N/A.
Pós-condições: Transparência de dados realizada sem vazamento de documentos sigilosos de empresas.
Requisitos Relacionados: RF010, RNF006.
Requisitos Não Funcionais Relacionados: RNF005.
Regras de Negócio Relacionadas: RN-N/A.
Complexidade: Média | Prioridade: Should Have | Módulo: Dashboard (BI Público)
Módulo: Auditoria e Logs
UC012 - Consultar Histórico de Alterações (Trilha de Auditoria)
Objetivo: Fornecer suporte aos órgãos fiscalizadores demonstrando irrefutavelmente quem, quando e o que alterou nos registros da plataforma
.
Atores: Órgão de Controle / Administrador Master.
Pré-condições: Estar logado com perfil Master ou Auditor.
Fluxo Principal:
O Auditor acessa o módulo de "Auditoria".
Informa o identificador de um Edital, de um Fornecedor ou um intervalo de datas.
O Sistema exibe a linha do tempo (timeline) das ações
. Ex: "10/06 - Fornecedor X registrou Cadastro"; "12/06 - Servidor Y da SMGA aprovou Balanço Patrimonial"; "14/06 - Motor distribuiu 100 cotas".
Fluxos Alternativos: Extração em arquivo CSV/JSON para análise do Tribunal de Contas.
Pós-condições: Segurança jurídica assegurada.
Requisitos Relacionados: RF014, RNF003.
Complexidade: Média | Prioridade: Must Have | Módulo: Auditoria e Logs
Módulo: Administração do Sistema
UC013 - Enviar Notificações de Vencimento de Certidões
Objetivo: Evitar inativação indevida de fornecedores por simples lapso de validade dos documentos temporários
.
Atores: Sistema (Job agendado).
Pré-condições: Existência de fornecedores habilitados com documentos possuindo data de vigência preenchida.
Fluxo Principal:
O serviço interno (Cron Job) varre o banco de dados diariamente.
Identifica certidões (federais, municipais, trabalhistas) que expirarão em X dias.
O Sistema dispara alertas via SMS e e-mail
.
O Fornecedor é orientado a efetuar login e anexar o documento renovado
.
Pós-condições: Fornecedor ciente da pendência administrativa.
Requisitos Relacionados: RF009.
Requisitos Não Funcionais Relacionados: RNF005.
Complexidade: Baixa | Prioridade: Could Have | Módulo: Administração do Sistema

Módulo: Administração do Sistema
UC014 - Consultar Painel Administrativo Interno
Objetivo: Fornecer aos administradores da SMGA/CPL uma visão consolidada dos cadastros pendentes, documentos em análise e status de editais para priorização operacional.
.
Atores: Administrador SMGA/CPL.
Pré-condições: O usuário deve estar autenticado como administrador e ter acesso ao módulo interno.
Fluxo Principal:
O administrador acessa o menu "Painel Administrativo".
O sistema apresenta um dashboard com métricas de: cadastros pendentes, documentos em análise, editais abertos e notificações de vencimento.
O administrador pode filtrar por secretaria, status documental e prazo de vencimento.
Pós-condições: O administrador recebe visibilidade operacional imediata para tomada de decisão.
Requisitos Relacionados: RF013.
Regras de Negócio Relacionadas: RN-N/A.
Complexidade: Média | Prioridade: Should Have | Módulo: Administração do Sistema
Matriz de Casos de Uso
Caso de Uso
Módulo
Ator Principal
Prioridade
Complexidade
UC001 - Cadastrar Fornecedor via Integração
Catálogo/Cadastros base
Fornecedor
Must Have
Média
UC002 - Validar Situação de Inadimplência
Catálogo/Cadastros base
Sistema
Must Have
Alta
UC003 - Visualizar Editais Compatíveis (CNAE)
Credenciamento
Fornecedor
Must Have
Baixa
UC004 - Solicitar Credenciamento e Enviar Doc
Credenciamento
Fornecedor
Must Have
Média
UC005 - Criar Edital Individualizado
Gestão de Editais
Admin SMGA/CPL
Must Have
Média
UC006 - Analisar e Covalidar Documentação
Credenciamento e Covalidação
Admin SMGA/CPL
Must Have
Média
UC007 - Validar Ident. via Biometria Facial
Credenciamento e Covalidação
Fornecedor
Could Have
Alta
UC008 - Distribuir Demanda Equitativamente
Distribuição Inteligente
Sistema
Must Have
Alta
UC009 - Gerenciar Cadastro de Reserva
Distribuição Inteligente
Sistema
Must Have
Alta
UC010 - Gerar Malote Digital Estruturado
Integração Processual (Malote)
Admin SMGA/CPL
Must Have
Alta
UC011 - Consultar Painel Público de Transparência
Dashboard (BI Público)
Cidadão / FIEAC
Should Have
Média
UC012 - Consultar Histórico de Alterações
Auditoria e Logs
Órgão Controle
Must Have
Média
UC013 - Enviar Notificações de Vencimento
Administração do Sistema
Sistema
Could Have
Baixa
UC014 - Consultar Painel Administrativo Interno
Administração do Sistema
Administrador SMGA/CPL
Should Have
Média
Resumo Executivo
1. Visão Global Este levantamento consolida os fluxos essenciais para a digitalização assertiva e legal das compras públicas do município de Rio Branco. Identificamos um total de 14 Casos de Uso, abrangendo a jornada de ponta a ponta: do onboarding inteligente do pequeno fornecedor local
 à geração compactada dos malotes burocráticos para os servidores
.
2. Criticidade e MVP
Casos de Uso Críticos para o MVP (Must Have): 9 casos. O coração da primeira entrega consiste no UC001 e UC002 (para blindar a prefeitura contra entrada errônea ou inadimplentes), no UC004 e UC006 (interface B2G e aprovação antifraude com justificativa), e fundamentalmente nos UC008 e UC009 (o motor de distribuição equitativa e a gestão automática da complexidade de retardatários gerando o "Cadastro de Reserva"). O UC010 (Malote SEI) é inegociável, pois retira o atual gargalo operacional físico da CPL.
Casos de Uso Recomendados para Fases Futuras: UC007 (Biometria Facial para autenticação) representa alto ganho em segurança contra contadores mal-intencionados, mas impacta tempo de desenvolvimento, custos de API de Liveness IA e deve integrar o Roadmap da Fase 2 para que a demonstração de Junho ocorra conforme o escopo
.
3. Dependências e Pontos de Validação Registrados
Dependência Técnica (UC002): Para bloquear as inscrições de forma autônoma, precisamos que a TI Municipal estabeleça o fornecimento de credenciais (API Keys) para as consultas automatizadas na base da Dívida Ativa da PGM e no SICAF
.
Ponto de Validação Limite do Malote (UC010): Resta definir formalmente qual o tamanho limite em MBs configurado pelos administradores de rede no tráfego de uploads do SEI do município, para que o robô de compactação de PDFs funcione sem estouros de memória.
Dependência de Regra Negocial (UC008): O detalhamento lógico das distribuições atípicas (ex. o tratamento do "resto/fração" em divisões onde a conta matemática não for exata) precisa de crivo final do setor jurídico da SMGA.