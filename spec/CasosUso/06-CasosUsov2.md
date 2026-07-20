# Compra Mais - Plataforma de Compras Municipalizadas

## Casos de Uso - v2

---

**Projeto:** Compra Mais
**Cliente:** Prefeitura Municipal de Rio Branco
**Versão:** 2.0
**Data:** 2026-07-03
**Autor:** Equipe de Análise de Requisitos

---

## Controle de Versão

| Versão | Data       | Autor             | Alteração                                                              |
|--------|------------|-------------------|------------------------------------------------------------------------|
| 1.0    | 2026-06-22 | Equipe de Análise | Versão inicial - Padronização estrutural.                              |
| 2.0    | 2026-07-03 | Equipe de Análise | Incorporação do feedback da Validação 01 (visitas 5 e 6). Nova estrutura. |

---

## Sumário

1.  [Casos de Uso - Catálogo/Cadastros Base](#casos-de-uso---catálogocadastros-base)
2.  [Casos de Uso - Gestão de Editais](#casos-de-uso---gestão-de-editais)
3.  [Casos de Uso - Credenciamento e Covalidação](#casos-de-uso---credenciamento-e-covalidação)
4.  [Casos de Uso - Distribuição Inteligente](#casos-de-uso---distribuição-inteligente)
5.  [Casos de Uso - Integração Processual](#casos-de-uso---integração-processual)
6.  [Casos de Uso - Auditoria e Logs](#casos-de-uso---auditoria-e-logs)
7.  [Casos de Uso - Dashboard BI Público](#casos-de-uso---dashboard-bi-público)
8.  [Casos de Uso - Administração do Sistema](#casos-de-uso---administração-do-sistema)
9.  [Resumo das Alterações da V2](#resumo-das-alterações-da-v2)
10. [Matriz de Rastreabilidade](#matriz-de-rastreabilidade)

---

## Casos de Uso - Catálogo/Cadastros base

### UC001 – Cadastrar Fornecedor via Integração (Receita Federal)

#### Objetivo
Permitir que empresas locais iniciem seu onboarding na plataforma fornecendo apenas o CNPJ, mitigando erros de digitação e garantindo dados oficiais.

#### Atores
Fornecedor.

#### Pré-Condições
O usuário deve possuir um CNPJ válido e ativo.

#### Fluxo Principal
1.  O Fornecedor acessa o Portal B2G e clica em "Cadastrar".
2.  Informa o seu número de CNPJ.
3.  O Sistema consome a API da Receita Federal.
4.  O Sistema preenche automaticamente Razão Social, Nome Fantasia, Porte e CNAEs (Principal e Secundários).
5.  O Fornecedor preenche dados de contato (e-mail/senha) e confirma o cadastro.
6.  O Sistema salva o registro e define o status inicial como "Cadastrado".

#### Fluxos Alternativos
*   **Indisponibilidade da API:** O Sistema permite o preenchimento manual dos dados da empresa, sinalizando a necessidade de covalidação rigorosa posterior.

#### Fluxos de Exceção
*   O CNPJ informado é inválido matematicamente.

#### Pós-Condições
Fornecedor ganha acesso ao Portal, mas ainda necessita credenciar-se em editais.

#### Regras de Negócio Relacionadas
*   N/A

#### Histórias de Usuário Relacionadas
*   **HU-001:** Onboarding Integrado à Receita Federal

#### Telas do Protótipo Relacionadas
*   Tela de Cadastro

#### Origem
*   Original

---

### UC002 – Validar Situação de Inadimplência

#### Objetivo
Realizar a checagem automática em bases de dados governamentais para impedir o avanço de fornecedores com débitos.

#### Atores
Sistema (Ação sistêmica de background).

#### Pré-Condições
Fornecedor tenta ingressar na fase de "Credenciamento" de um edital.

#### Fluxo Principal
1.  O Fornecedor aciona a intenção de participar do edital.
2.  O Sistema dispara requisições via API para as bases de Dívida Ativa da PGM e bases federais/estaduais (SICAF).
3.  As APIs retornam o status "Nada Consta" (Sem débitos).
4.  O Sistema permite que o Fornecedor prossiga com o envio da documentação.

#### Fluxos Alternativos
*   N/A

#### Fluxos de Exceção
*   **Retorno Positivo para Débitos:** O Sistema exibe um alerta de impedimento ("Bloqueado por Inadimplência") e trava o botão de prosseguir. O status de bloqueio por inadimplência é claramente diferenciado de pendências documentais, que são rotuladas como "Em Análise".

#### Pós-Condições
Fornecedor é filtrado pela malha fina jurídica do município.

#### Regras de Negócio Relacionadas
*   **RN002:** Tolerância Zero à Inadimplência

#### Histórias de Usuário Relacionadas
*   **HU-002:** Bloqueio por Inadimplência e Status de Análise

#### Telas do Protótipo Relacionadas
*   Painel do Administrador, Detalhes do Fornecedor

#### Origem
*   Alterado na Validação 01

---

## Casos de Uso - Gestão de Editais

### UC003 – Visualizar Editais Compatíveis (Filtro CNAE)

#### Objetivo
Limitar a exibição do catálogo de editais públicos àqueles cuja natureza seja estritamente compatível com o ramo de atuação (CNAE) da empresa.

#### Atores
Fornecedor.

#### Pré-Condições
O Fornecedor deve estar logado no portal.

#### Fluxo Principal
1.  O Fornecedor acessa a página "Meus Editais".
2.  O Sistema verifica os CNAEs atrelados ao CNPJ do usuário logado.
3.  O Sistema cruza os CNAEs do usuário com os CNAEs exigidos na configuração dos editais abertos.
4.  O Sistema exibe em tela apenas as oportunidades compatíveis.

#### Fluxos Alternativos
*   **Nenhum edital compatível:** O Sistema exibe a mensagem "Não há editais abertos para o seu segmento no momento".

#### Fluxos de Exceção
*   N/A

#### Pós-Condições
N/A

#### Regras de Negócio Relacionadas
*   **RN001:** Filtro Restritivo por CNAE

#### Histórias de Usuário Relacionadas
*   **HU-003:** Filtro de Editais por Compatibilidade de CNAE

#### Telas do Protótipo Relacionadas
*   Painel do Fornecedor - Vitrine de Editais

#### Origem
*   Original

---

### UC004 – Solicitar Credenciamento e Enviar Documentação

#### Objetivo
Submeter a proposta de fornecimento e os documentos comprobatórios digitais ao Órgão Central (SMGA/CPL).

#### Atores
Fornecedor.

#### Pré-Condições
O edital deve estar com status "Aberto" e o fornecedor deve ter passado no filtro do CNAE.

#### Fluxo Principal
1.  O Fornecedor seleciona o edital desejado e clica em "Iniciar Credenciamento".
2.  O Sistema exibe os itens/lotes disponíveis.
3.  O Fornecedor preenche sua capacidade produtiva (proposta de quantitativos).
4.  O Sistema exibe um Termo de Responsabilidade sobre a veracidade da capacidade produtiva informada. O Fornecedor deve marcar o aceite para prosseguir.
5.  O Fornecedor realiza o upload de documentos obrigatórios (ex: Contrato Social, Balanço, Atestado de Capacidade Técnica).
6.  O Fornecedor confirma o envio.
7.  O Sistema altera o status do fornecedor para "Pendente de Análise".

#### Fluxos Alternativos
*   **Documento já existente:** Se o documento já foi enviado em um credenciamento passado e ainda está válido, o Sistema não exige reenvio, apenas o importa do repositório.

#### Fluxos de Exceção
*   Arquivo excede o tamanho máximo configurado ou formato inválido.
*   Fornecedor tenta prosseguir sem aceitar o Termo de Responsabilidade.

#### Pós-Condições
Documentos inseridos na fila de análise da CPL.

#### Regras de Negócio Relacionadas
*   N/A

#### Histórias de Usuário Relacionadas
*   **HU-007:** Reuso de Documentos no Repositório
*   **HU-009:** Aceite do Termo de Responsabilidade

#### Telas do Protótipo Relacionadas
*   Fluxo de Credenciamento

#### Origem
*   Alterado na Validação 01

---

### UC005 – Criar Edital Individualizado

#### Objetivo
Permitir que o gestor crie um chamamento público individualizado para a demanda de uma única secretaria municipal, com o documento oficial anexado.

#### Atores
Administrador SMGA/CPL.

#### Pré-Condições
O administrador deve possuir as permissões adequadas.

#### Fluxo Principal
1.  O Administrador acessa a aba "Editais" e clica em "Novo Edital".
2.  Preenche os metadados base: Objeto, Valor Unitário, Vigência.
3.  Vincula a demanda obrigatoriamente a apenas 1 (uma) Secretaria Demandante.
4.  Adiciona a lista de Lotes/Itens com suas devidas quantidades e CNAEs permitidos.
5.  O Administrador realiza o upload do arquivo PDF original do edital, gerado no SEI.
6.  Salva o edital como "Rascunho" ou o publica.

#### Fluxos Alternativos
*   N/A

#### Fluxos de Exceção
*   Tentativa de associar duas secretarias ao mesmo edital (Sistema bloqueia a ação).
*   Tentativa de publicar o edital sem anexar o PDF obrigatório.

#### Pós-Condições
Edital pronto para publicação ou já publicado, com o PDF original disponível para consulta.

#### Regras de Negócio Relacionadas
*   **RN007:** Rubricas Isoladas / Individualização

#### Histórias de Usuário Relacionadas
*   **HU-004:** Criação de Edital Individualizado
*   **HU-005:** Anexação do PDF do Edital

#### Telas do Protótipo Relacionadas
*   Formulário de Criação de Edital

#### Origem
*   Alterado na Validação 01

---

## Casos de Uso - Credenciamento e Covalidação

### UC006 – Analisar e Covalidar Documentação

#### Objetivo
Realizar a verificação humana (antifraude) de atestados e balanços, e emitir o parecer final de habilitação ou inabilitação documental.

#### Atores
Administrador SMGA/CPL (Fiscal/Validador).

#### Pré-Condições
Fornecedor possuir status "Pendente de Análise" com documentos submetidos.

#### Fluxo Principal
1.  O Administrador acessa o dashboard de análises pendentes.
2.  Seleciona um fornecedor e abre o visualizador de documentos integrado.
3.  Analisa visualmente a integridade dos arquivos.
4.  Clica em "Aprovar" em cada documento conforme conformidade.
5.  Após aprovar todos os documentos, o Sistema atualiza o status geral do fornecedor para "Credenciado" e loga a ação.

#### Fluxos Alternativos
*   **Reprovação de Documento:** O Administrador clica em "Reprovar". O Sistema obriga o preenchimento da justificativa (ex: "Imagem ilegível"). A notificação é enviada ao fornecedor solicitando correção.

#### Fluxos de Exceção
*   Administrador tenta reprovar sem inserir o texto de justificativa (Sistema impede).

#### Pós-Condições
O fornecedor torna-se apto para o cálculo de distribuição ("Credenciado") ou entra em fila de correção.

#### Regras de Negócio Relacionadas
*   **RN003:** Análise Crítica Antifraude
*   **RN006:** Rigor do Balanço Patrimonial

#### Histórias de Usuário Relacionadas
*   **HU-008:** Covalidação Humana e Justificativa de Reprovação

#### Telas do Protótipo Relacionadas
*   Painel do Administrador - Análise Documental

#### Origem
*   Original

---

### UC007 – Validar Identidade via Biometria Facial

#### Objetivo
Acionar prova de vida (Liveness) da pessoa física no ato do envio dos documentos para mitigar fraude em assinaturas e envios de terceiros.

#### Atores
Fornecedor.

#### Pré-Condições
Edital configurado para exigir biometria no ato do envio.

#### Fluxo Principal
1.  Ao finalizar o upload de arquivos de um edital e clicar em "Enviar", o Sistema exibe pop-up solicitando captura facial.
2.  O usuário concede acesso à câmera do dispositivo.
3.  O Sistema realiza a captura, avalia a "prova de vida" e compara o rosto com o documento de identidade cadastrado.
4.  O Sistema conclui a assinatura digital e o envio.

#### Fluxos Alternativos
*   N/A

#### Fluxos de Exceção
*   Rosto incompatível ou indício de foto estática (spoofing). Envio é bloqueado.

#### Pós-Condições
Transação autenticada biograficamente.

#### Regras de Negócio Relacionadas
*   **RN003:** Análise Crítica Antifraude

#### Histórias de Usuário Relacionadas
*   **HU-012:** Verificação por Biometria Facial (Adiada na V2)

#### Telas do Protótipo Relacionadas
*   N/A (Fluxo adiado)

#### Origem
*   Adiado na Validação 01. Funcionalidade de alta complexidade, adiada para versão futura para não comprometer o MVP.

---

## Casos de Uso - Distribuição Inteligente

### UC008 – Distribuir Demanda Equitativamente

#### Objetivo
O motor de rateio deve calcular matematicamente as cotas do contrato, considerando os fornecedores habilitados e sua respectiva capacidade técnica, de forma imutável.

#### Atores
Sistema (Gatilho automático ou manual via Admin).

#### Pré-Condições
O prazo da fase inicial do edital encerrou e há fornecedores com status "Credenciado" e capacidade informada.

#### Fluxo Principal
1.  O Administrador aciona "Calcular Distribuição" na tela do edital.
2.  O Sistema levanta o quantitativo total solicitado pela secretaria.
3.  O Sistema conta o número de fornecedores aptos.
4.  O Sistema aplica a divisão matemática igualitária.
5.  Caso a cota individual exceda a capacidade produtiva declarada pelo fornecedor, o Sistema trava o fornecimento daquele usuário no seu limite máximo e redistribui o saldo excedente para os demais.
6.  O Sistema gera o relatório final com as frações homologadas para cada empresa. O resultado do cálculo é gravado e não pode ser alterado manualmente por nenhum perfil de usuário.

#### Fluxos Alternativos
*   N/A

#### Fluxos de Exceção
*   O total ofertado pelas empresas combinadas é inferior à demanda solicitada (Sistema emite alerta de déficit de abastecimento).
*   Um administrador tenta editar o resultado da distribuição (Sistema bloqueia a ação).

#### Pós-Condições
O sistema gera a matriz de alocação. Para o fornecedor, o sistema exibe apenas a sua cota individual, omitindo os dados dos concorrentes.

#### Especificação do Algoritmo de Distribuição (Rateio Inteligente)
Para resolver a lacuna funcional apontada na auditoria e garantir a implementação correta, o algoritmo de distribuição seguirá os seguintes princípios e fluxo:

##### 1. Princípios
*   **Justo e Igualitário:** A regra matriz do sistema determina que o quantitativo de itens será dividido de forma equitativa (igual) entre todos os fornecedores aptos.
*   **Trava da Capacidade Produtiva:** Uma variável fundamental implementada para ajustar o princípio de igualdade é a capacidade de produção de cada empresa. O fornecedor não pode receber uma demanda maior do que declarou que consegue entregar.
*   **Imutabilidade:** O resultado do cálculo é irrevogável e não pode ser editado manualmente por administradores, garantindo a soberania do algoritmo e a transparência do processo.

##### 2. Fluxo do Algoritmo (Processo Iterativo)
1.  **Inicialização:** O sistema identifica a `DemandaTotal` do edital e a lista de `FornecedoresAptos` que ainda possuem capacidade de fornecimento. A `DemandaRestante` é inicializada com a `DemandaTotal`.
2.  **Cálculo da Cota por Rodada:** Em um loop, o sistema calcula a `CotaIgualitaria` dividindo a `DemandaRestante` pelo número de fornecedores ainda ativos no cálculo.
3.  **Identificação de Gargalos e Alocação:** O sistema compara a `CotaIgualitaria` com a `CapacidadeDeclarada` de cada fornecedor ativo:
    *   **Caso A (Fornecedor com capacidade):** Se a `CotaIgualitaria` for menor ou igual à sua capacidade, o fornecedor é considerado apto a receber a cota nesta rodada.
    *   **Caso B (Fornecedor sem capacidade):** Se a `CotaIgualitaria` for maior que sua capacidade, o sistema aloca para este fornecedor apenas o valor de sua `CapacidadeDeclarada`. Este fornecedor é então removido do pool de cálculo das próximas rodadas.
4.  **Redistribuição de Excedentes:** A diferença entre a `CotaIgualitaria` e a `CapacidadeDeclarada` dos fornecedores do "Caso B" é somada, gerando um `TotalExcedente`. Este valor é então somado à `DemandaRestante` para ser redistribuído entre os fornecedores que permanecem ativos no cálculo.
5.  **Conclusão do Loop:** O processo retorna ao passo 2, recalculando uma nova `CotaIgualitaria` para um grupo menor de fornecedores. O ciclo se repete até que toda a demanda seja alocada.

##### 3. Tratamento de Frações e Arredondamento
*   Para garantir a exatidão e evitar perdas, todos os cálculos intermediários devem ser realizados com precisão decimal.
*   Ao final do processo iterativo, se houver uma diferença residual de unidades (devido a dízimas periódicas na divisão), estas unidades restantes serão distribuídas uma a uma aos fornecedores que ainda possuem capacidade ociosa. Para garantir a isonomia em caso de empate, a ordem de distribuição deste resíduo seguirá um critério determinístico, como a ordem cronológica de credenciamento ou o ID do fornecedor.

#### Regras de Negócio Relacionadas
*   **RN005:** Teto de Distribuição Baseado na Capacidade
*   **RN009:** Imutabilidade da Distribuição Matemática

#### Histórias de Usuário Relacionadas
*   **HU-013:** Distribuição Equitativa por Capacidade Produtiva
*   **HU-014:** Imutabilidade da Distribuição de Cotas
*   **HU-015:** Visualização Individual da Cota Distribuída

#### Telas do Protótipo Relacionadas
*   Painel do Administrador - Distribuição de Edital
*   Painel do Fornecedor - Resultado da Distribuição

#### Origem
*   Alterado na Validação 01

---

### UC009 – Gerenciar Cadastro de Reserva (Segunda Demanda)

#### Objetivo
Alocar fornecedores que se credenciaram tardiamente em uma lista de espera, mantendo a conformidade com a exigência de edital continuamente aberto.

#### Atores
Sistema.

#### Pré-Condições
A primeira distribuição (UC008) do edital já ocorreu. Um fornecedor retardatário teve sua documentação aprovada (UC006).

#### Fluxo Principal
1.  O Administrador conclui a aprovação de um documento submetido fora da janela inicial de distribuição.
2.  O Sistema identifica que a flag de distribuição inicial já foi acionada para aquele edital.
3.  O Sistema insere este fornecedor no pool rotulado como "Cadastro de Reserva".
4.  A distribuição já realizada aos primeiros fornecedores permanece intacta.

#### Fluxos Alternativos
*   Se um fornecedor titular falhar na entrega ou desistir do contrato (UC016), o Administrador aciona a substituição e o Sistema invoca o primeiro colocado do Cadastro de Reserva para assumir o quantitativo faltante.

#### Fluxos de Exceção
*   N/A

#### Pós-Condições
Fornecedor entra em fila estruturada, garantindo isonomia legal.

#### Regras de Negócio Relacionadas
*   **RN004:** Ingressantes Retardatários

#### Histórias de Usuário Relacionadas
*   **HU-016:** Alocação em Cadastro de Reserva

#### Telas do Protótipo Relacionadas
*   Painel do Administrador - Gestão de Edital

#### Origem
*   Original

---

## Casos de Uso - Integração Processual

### UC010 – Gerar Malote Digital Estruturado (Exportação SEI)

#### Objetivo
Consolidar toda a documentação de um fornecedor num único arquivo ordenado e otimizado, formatado para upload no sistema SEI.

#### Atores
Administrador SMGA/CPL.

#### Pré-Condições
O fornecedor deve possuir o status "Fornecedor", com todos os documentos validados.

#### Fluxo Principal
1.  O Administrador acessa os detalhes do fornecedor habilitado e clica em "Exportar Malote SEI".
2.  O Sistema inicia um worker em background para mesclar e comprimir os PDFs.
3.  O Sistema ordena o arquivo gerado: 1º Cartão CNPJ; 2º Identificação do Sócio; 3º Anexos do Edital; 4º Certidões.
4.  O Sistema otimiza a qualidade do PDF para respeitar o limite de MB configurado.
5.  O Sistema disponibiliza o link para download.

#### Fluxos Alternativos
*   N/A

#### Fluxos de Exceção
*   Processamento excede o limite de tamanho exigido pelo SEI. O sistema pode fragmentar o malote em "Parte 1" e "Parte 2".

#### Pós-Condições
Dossiê documental estruturado baixado para a máquina do servidor.

#### Regras de Negócio Relacionadas
*   **RN008:** Ordenação e Fragmentação de Malote SEI

#### Histórias de Usuário Relacionadas
*   **HU-017:** Geração Estruturada do Malote SEI

#### Telas do Protótipo Relacionadas
*   Painel do Administrador - Detalhes do Fornecedor

#### Origem
*   Original

---

## Casos de Uso - Auditoria e Logs

### UC011 – Consultar Painel Público de Transparência

#### Objetivo
Oferecer à sociedade civil e gestores uma visão gerencial sobre os recursos movimentados pelo programa.

#### Atores
Cidadão / Gestor Municipal / Representante FIEAC.

#### Pré-Condições
Nenhuma (Página aberta e pública).

#### Fluxo Principal
1.  O ator acessa a Landing Page do "Compra Mais".
2.  O sistema carrega indicadores visuais: "Valor Total Investido", "Quantidade de Empresas Credenciadas", etc.
3.  A interface é intitulada **"Compra Mais Rio Branco"** e segue a paleta de cores e logomarcas oficiais da prefeitura.

#### Fluxos Alternativos
*   O usuário pode aplicar filtros básicos de tempo (ex: "Valores deste ano").

#### Fluxos de Exceção
*   N/A

#### Pós-Condições
Transparência de dados realizada.

#### Regras de Negócio Relacionadas
*   N/A

#### Histórias de Usuário Relacionadas
*   **HU-019:** Portal Público de Acompanhamento

#### Telas do Protótipo Relacionadas
*   Landing Page Pública

#### Origem
*   Alterado na Validação 01

---

### UC012 – Consultar Histórico de Alterações (Trilha de Auditoria)

#### Objetivo
Fornecer suporte aos órgãos fiscalizadores demonstrando quem, quando e o que foi alterado nos registros da plataforma.

#### Atores
Órgão de Controle / Administrador Master.

#### Pré-Condições
Estar logado com perfil Master ou Auditor.

#### Fluxo Principal
1.  O Auditor acessa o módulo de "Auditoria".
2.  Informa um identificador (Edital, Fornecedor) ou um intervalo de datas.
3.  O Sistema exibe a linha do tempo das ações (ex: "10/06 - Fornecedor X registrou Cadastro"; "12/06 - Servidor Y aprovou Balanço Patrimonial").

#### Fluxos Alternativos
*   Extração em arquivo CSV/JSON para análise externa.

#### Fluxos de Exceção
*   N/A

#### Pós-Condições
Segurança jurídica assegurada.

#### Regras de Negócio Relacionadas
*   N/A

#### Histórias de Usuário Relacionadas
*   **HU-018:** Trilha de Auditoria Imutável

#### Telas do Protótipo Relacionadas
*   Módulo de Auditoria

#### Origem
*   Original

---

## Casos de Uso - Administração do Sistema

### UC013 – Enviar Notificações de Vencimento de Certidões

#### Objetivo
Evitar inativação indevida de fornecedores por lapso de validade de documentos.

#### Atores
Sistema (Job agendado).

#### Pré-Condições
Existência de fornecedores habilitados com documentos possuindo data de vigência.

#### Fluxo Principal
1.  O serviço interno (Cron Job) varre o banco de dados diariamente.
2.  Identifica certidões que expirarão em X dias.
3.  O Sistema dispara alertas via SMS e e-mail, orientando o fornecedor a renovar o documento.

#### Fluxos Alternativos
*   N/A

#### Fluxos de Exceção
*   N/A

#### Pós-Condições
Fornecedor ciente da pendência administrativa.

#### Regras de Negócio Relacionadas
*   N/A

#### Histórias de Usuário Relacionadas
*   **HU-020:** Notificações de Vencimento de Certidões

#### Telas do Protótipo Relacionadas
*   N/A (Serviço de background)

#### Origem
*   Original

---

### UC014 – Consultar Painel Administrativo Interno

#### Objetivo
Fornecer aos administradores uma visão consolidada das pendências operacionais para priorização de trabalho.

#### Atores
Administrador SMGA/CPL.

#### Pré-Condições
O usuário deve estar autenticado como administrador.

#### Fluxo Principal
1.  O administrador acessa o menu "Painel Administrativo".
2.  O sistema apresenta um dashboard com métricas de: cadastros pendentes, documentos "Em Análise", editais abertos, e **solicitações de desistência pendentes**.
3.  O administrador pode clicar nos indicadores para ser direcionado à lista de itens correspondentes.

#### Fluxos Alternativos
*   N/A

#### Fluxos de Exceção
*   N/A

#### Pós-Condições
O administrador recebe visibilidade operacional para tomada de decisão.

#### Regras de Negócio Relacionadas
*   N/A

#### Histórias de Usuário Relacionadas
*   **HU-021:** Painel Interno de Gestão de Cadastros

#### Telas do Protótipo Relacionadas
*   Painel do Administrador

#### Origem
*   Alterado na Validação 01

---

### UC015 – Consultar e Baixar Edital Original

#### Objetivo
Permitir que o fornecedor acesse o documento oficial do edital para consulta detalhada de todas as regras do chamamento público.

#### Atores
Fornecedor.

#### Pré-Condições
O Fornecedor deve estar logado. O edital deve ter um PDF anexado (conforme UC005).

#### Fluxo Principal
1.  O Fornecedor acessa a página de detalhes de um edital.
2.  O Sistema exibe um botão/link "Baixar Edital em PDF".
3.  O Fornecedor clica no botão.
4.  O Sistema inicia o download do arquivo PDF original.

#### Fluxos Alternativos
*   N/A

#### Fluxos de Exceção
*   N/A

#### Pós-Condições
Fornecedor possui o arquivo oficial do edital para consulta.

#### Regras de Negócio Relacionadas
*   N/A

#### Histórias de Usuário Relacionadas
*   **HU-006:** Consulta e Download do Edital Original

#### Telas do Protótipo Relacionadas
*   Painel do Fornecedor - Detalhes do Edital

#### Origem
*   Criado na Validação 01

---

### UC016 – Formalizar Desistência de Fornecedor

#### Objetivo
Permitir que um fornecedor solicite sua saída de um edital e que um administrador aprove essa solicitação, garantindo segurança jurídica e liberando a vaga para o cadastro de reserva.

#### Atores
Fornecedor, Administrador SMGA/CPL.

#### Pré-Condições
Fornecedor está com status "Credenciado" ou "Fornecedor" em um edital.

#### Fluxo Principal
1.  O **Fornecedor** acessa a tela do edital do qual participa e clica em "Desistir".
2.  O **Sistema** exibe uma janela de confirmação.
3.  O **Fornecedor** confirma a intenção de desistir.
4.  O **Sistema** altera o status do credenciamento do fornecedor para "Pendente de Desistência" e gera uma notificação para o painel do administrador (UC014).
5.  O **Administrador** acessa o painel de pendências e seleciona a solicitação de desistência.
6.  O **Administrador** clica em "Confirmar Desistência", podendo adicionar uma observação.
7.  O **Sistema** altera o status do fornecedor para "Desistente", registra a ação na trilha de auditoria (UC012) e o remove do pool de distribuição ativa.

#### Fluxos Alternativos
*   **Acionamento do Cadastro de Reserva:** Se o fornecedor desistente já possuía uma cota alocada, o Sistema pode adicionar a fila do Cadastro de Reserva (UC009) para assumir o quantitativo.

#### Fluxos de Exceção
*   N/A

#### Pós-Condições
Fornecedor formalmente removido do edital. Vaga potencialmente preenchida pelo cadastro de reserva.

#### Regras de Negócio Relacionadas
*   **RN010:** Formalização da Desistência

#### Histórias de Usuário Relacionadas
*   **HU-010:** Solicitação de Desistência de Edital
*   **HU-011:** Aprovação de Desistência de Fornecedor

#### Telas do Protótipo Relacionadas
*   Painel do Fornecedor - Detalhes do Edital
*   Painel do Administrador - Pendências

#### Origem
*   Criado na Validação 01

---

## Resumo das Alterações da V2

Esta seção detalha as mudanças realizadas nesta versão do documento, com base no feedback da Validação 01.

### Casos Mantidos
Os seguintes casos de uso foram mantidos da versão original, sofrendo apenas reformatação e atualização de rastreabilidade:
*   UC001 – Cadastrar Fornecedor via Integração (Receita Federal)
*   UC003 – Visualizar Editais Compatíveis (Filtro CNAE)
*   UC006 – Analisar e Covalidar Documentação
*   UC009 – Gerenciar Cadastro de Reserva (Segunda Demanda)
*   UC010 – Gerar Malote Digital Estruturado (Exportação SEI)
*   UC012 – Consultar Histórico de Alterações (Trilha de Auditoria)
*   UC013 – Enviar Notificações de Vencimento de Certidões

### Casos Atualizados
Os seguintes casos de uso foram atualizados para refletir novas regras de negócio e requisitos:
*   UC002 – Validar Situação de Inadimplência
*   UC004 – Solicitar Credenciamento e Enviar Documentação
*   UC005 – Criar Edital Individualizado
*   UC008 – Distribuir Demanda Equitativamente
*   UC011 – Consultar Painel Público de Transparência
*   UC014 – Consultar Painel Administrativo Interno

### Casos Novos
Os seguintes casos de uso foram criados para documentar novos fluxos identificados na validação:
*   UC015 – Consultar e Baixar Edital Original
*   UC016 – Formalizar Desistência de Fornecedor

### Casos Adiados
*   UC007 – Validar Identidade via Biometria Facial: Esta funcionalidade foi adiada para uma versão futura do projeto devido à sua alta complexidade técnica e de custo, para não comprometer a entrega do MVP.

### Impactos da Validação 01

| Caso de Uso | Tipo de Alteração | Motivo                                                                               | Origem da Validação                |
| :---------- | :---------------- | :----------------------------------------------------------------------------------- | :--------------------------------- |
| **UC002**   | Atualizado        | Melhorar a clareza da comunicação sobre status (Bloqueado vs. Em Análise).           | `FeedbackValidacao01.md`           |
| **UC004**   | Atualizado        | Adicionar segurança jurídica à declaração de capacidade produtiva.                   | `FeedbackValidacao01.md`           |
| **UC005**   | Atualizado        | Aumentar a transparência, disponibilizando o documento original do edital.           | `FeedbackValidacao01.md`           |
| **UC007**   | Adiado            | Alto impacto técnico e de custo, adiado para não comprometer o MVP.                  | `RelatorioCruzamentoValidacao01.md` |
| **UC008**   | Atualizado        | Garantir isonomia (sem edição manual) e evitar conflitos (ocultar dados de concorrentes). | `FeedbackValidacao01.md`           |
| **UC011**   | Atualizado        | Ajustar a identidade visual da página pública conforme solicitação do cliente.       | `FeedbackValidacao01.md`           |
| **UC014**   | Atualizado        | Dar visibilidade ao administrador sobre o novo fluxo de pendências de desistência.   | `RelatorioCruzamentoValidacao01.md` |
| **UC015**   | Novo              | Complementar o UC005, garantindo o acesso do fornecedor ao edital anexado.           | `FeedbackValidacao01.md`           |
| **UC016**   | Novo              | Criar um fluxo formal e seguro para a desistência de um fornecedor, com covalidação. | `FeedbackValidacao01.md`           |

---

## Matriz de Rastreabilidade

| Caso de Uso | História de Usuário (HU)                                                                                             | Requisito HDR (RF)                                                              | Regra de Negócio (RN)                                                               | Tela do Protótipo                                                              |
| :---------- | :------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **UC001**   | HU-001                                                                                                               | RF001                                                                           | N/A                                                                                 | Tela de Cadastro                                                               |
| **UC002**   | HU-002                                                                                                               | RF011                                                                           | RN002                                                                               | Painel do Administrador, Detalhes do Fornecedor                                |
| **UC003**   | HU-003                                                                                                               | RF003                                                                           | RN001                                                                               | Painel do Fornecedor - Vitrine de Editais                                      |
| **UC004**   | HU-007, HU-009                                                                                                       | RF002, RF015                                                                    | N/A                                                                                 | Fluxo de Credenciamento                                                        |
| **UC005**   | HU-004, HU-005                                                                                                       | RF008, RF016                                                                    | RN007                                                                               | Formulário de Criação de Edital                                                |
| **UC006**   | HU-008                                                                                                               | RF004                                                                           | RN003, RN006                                                                        | Painel do Administrador - Análise Documental                                   |
| **UC007**   | HU-012                                                                                                               | RF012                                                                           | RN003                                                                               | N/A (Fluxo adiado)                                                             |
| **UC008**   | HU-013, HU-014, HU-015                                                                                               | RF005                                                                           | RN005, RN009                                                                        | Painel do Administrador - Distribuição, Painel do Fornecedor - Resultado       |
| **UC009**   | HU-016                                                                                                               | RF006                                                                           | RN004                                                                               | Painel do Administrador - Gestão de Edital                                     |
| **UC010**   | HU-017                                                                                                               | RF007                                                                           | RN008                                                                               | Painel do Administrador - Detalhes do Fornecedor                               |
| **UC011**   | HU-019                                                                                                               | RF010                                                                           | N/A                                                                                 | Landing Page Pública                                                           |
| **UC012**   | HU-018                                                                                                               | RF014                                                                           | N/A                                                                                 | Módulo de Auditoria                                                            |
| **UC013**   | HU-020                                                                                                               | RF009                                                                           | N/A                                                                                 | N/A (Serviço de background)                                                    |
| **UC014**   | HU-021                                                                                                               | RF013                                                                           | N/A                                                                                 | Painel do Administrador                                                        |
| **UC015**   | HU-006                                                                                                               | RF016                                                                           | N/A                                                                                 | Painel do Fornecedor - Detalhes do Edital                                      |
| **UC016**   | HU-010, HU-011                                                                                                       | RF017                                                                           | RN010                                                                               | Painel do Fornecedor - Detalhes do Edital, Painel do Administrador - Pendências |
