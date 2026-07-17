# Compra Mais - Plataforma de Compras Municipalizadas

## HDR (Histórico de Requisitos) - v2

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
| 1.0 | 2026-06-22 | Equipe SMGA/CPL | Versão inicial - Padronização estrutural |
| 2.0 | 2026-07-03 | Equipe de Análise | Incorporação do feedback da Validação 01 (Visitas 5 e 6). |

---

## Sumário

- [Compra Mais - Plataforma de Compras Municipalizadas](#compra-mais---plataforma-de-compras-municipalizadas)
  - [HDR (Histórico de Requisitos) - v2](#hdr-histórico-de-requisitos---v2)
  - [Controle de Versão](#controle-de-versão)
  - [Sumário](#sumário)
  - [Visão Geral](#visão-geral)
  - [Stakeholders](#stakeholders)
  - [Requisitos Funcionais](#requisitos-funcionais)
  - [Requisitos Não Funcionais](#requisitos-não-funcionais)
  - [Regras de Negócio](#regras-de-negócio)
  - [Premissas](#premissas)
  - [Restrições](#restrições)
  - [Dependências Externas](#dependências-externas)
  - [Critérios de Aceite](#critérios-de-aceite)
  - [Matriz de Rastreabilidade](#matriz-de-rastreabilidade)
  - [Lacunas e Pontos de Validação](#lacunas-e-pontos-de-validação)
  - [Alterações da V2 (Baseado na Validação 01)](#alterações-da-v2-baseado-na-validação-01)
    - [Requisitos Funcionais Adicionados](#requisitos-funcionais-adicionados)
    - [Requisitos Funcionais Alterados](#requisitos-funcionais-alterados)
    - [Regras de Negócio Adicionadas](#regras-de-negócio-adicionadas)
  - [Documentos Relacionados](#documentos-relacionados)

---

## Visão Geral
O Compra Mais é o sistema digital de fomento à economia da Prefeitura de Rio Branco, idealizado para gerir compras públicas municipalizadas na modalidade de credenciamento. O sistema visa digitalizar e unificar o credenciamento de fornecedores locais, eliminando gargalos processuais e o trânsito físico de papel. Atuando como um "marketplace reverso", o Compra Mais garantirá a conformidade com a Nova Lei de Licitações (Lei 14.133/21, art. 79) e com a Lei Municipal 2.027. O foco do produto é a automatização da triagem documental, o bloqueio sistêmico de inadimplentes e a distribuição matemática justa das compras (respeitando a capacidade produtiva das micro e pequenas empresas locais), garantindo trilhas de auditoria e transparência para a administração pública e a sociedade.
## Stakeholders
Com base nas melhores práticas do BABOK para mapeamento de partes interessadas, identificamos:
Prefeito de Rio Branco (Patrocinador): Patrocina a iniciativa visando fomentar a economia local. Requer acesso a dados de transparência (Dashboards) para prestação de contas.

SMGA - Secretaria Municipal de Gestão Administrativa (Gestor do Sistema): Responsável pela administração da ferramenta (Marcos/Nete). Necessita de eficiência processual e visão macro das demandas.

CPL - Comissão de Licitação (Usuário Chave/Admin): Operacionalizada por servidores (ex: Silas), é responsável por criar editais, covalidar documentação sensível (antifraude) e gerenciar distribuições e integrações com o SEI.

Fornecedores Locais (Usuários Finais): MEIs, MEs e empresas locais. Precisam de um portal B2G de autoatendimento simples, alertas de renovação de certidões e garantia de equidade na distribuição das cotas de compras.

FIEAC (Parceiro Institucional / Espectador): Representa o empresariado industrial. Seu interesse recai sobre a transparência do volume financeiro injetado nos segmentos locais.

Secretarias Demandantes (Clientes Internos): Secretarias (ex: RBTrans, SEINFRA, Saúde) que geram a demanda de compras e são as destinatárias finais dos itens adquiridos.
## Requisitos Funcionais
Aplicando diretrizes da Engenharia de Requisitos (declarações atômicas e testáveis com identificadores únicos)
:
RF001 - Autenticação e Cadastro B2G: O sistema deve permitir o cadastro de fornecedores inserindo o CNPJ, consumindo dados (Razão Social, Porte, CNAE principal e secundário) de forma automática via API da Receita Federal. (Prioridade: Alta | Origem: Visita 2, Ata).

RF002 - Upload Documental e Reuso: O sistema deve permitir que fornecedores façam upload de documentos (PDF, JPG, PNG) para um repositório unificado, mantendo-os disponíveis para múltiplos editais até a expiração da validade. (Prioridade: Alta | Origem: Visita 2).

RF003 - Filtro de Compatibilidade (CNAE): O sistema deve filtrar e exibir aos fornecedores exclusivamente os editais que correspondam aos seus CNAEs registrados. (Prioridade: Alta | Origem: Visita 2).

RF004 - Covalidação Humana e Justificativa: O sistema deve fornecer uma interface para a CPL aprovar ou reprovar documentos submetidos; em caso de reprovação, deve ser exigido o preenchimento de um campo de justificativa textual. (Prioridade: Alta | Origem: Visita 2).

RF005 - Motor de Distribuição Equitativa: O sistema deve calcular matematicamente a distribuição de quantitativos de itens de forma igualitária entre os credenciados ativos, não excedendo a capacidade técnica declarada por cada um. A visão do fornecedor deve exibir apenas a sua cota individual, omitindo a distribuição dos demais participantes para evitar conflitos. (Prioridade: Alta | Origem: Visita 1 e 3, Validação 01).

RF006 - Gestão de Fila de Espera (Segunda Demanda): O sistema deve alocar fornecedores credenciados após a distribuição inicial em um "Cadastro de Reserva / Segunda Demanda", sem a necessidade de republicação do edital vigente. (Prioridade: Alta | Origem: Visita 2).

RF007 - Geração de Malote SEI Ordenado: O sistema deve gerar e exportar um arquivo PDF comprimido e unificado de todos os documentos aprovados de um fornecedor, seguindo estritamente a ordem: 1º Cartão CNPJ, 2º Identificação, 3º Anexos, 4º Certidões. (Prioridade: Alta | Origem: Visita 2).

RF008 - Criação de Editais Individualizados: O sistema deve permitir a criação orgânica de 1 (um) edital isolado para cada demanda oriunda das secretarias. (Prioridade: Média | Origem: Visita 3).

RF009 - Notificações de Vencimento: O sistema deve enviar alertas por e-mail e SMS aos fornecedores sobre o vencimento próximo de suas certidões. (Prioridade: Média | Origem: Visita 1).

RF010 - Portal de Transparência: O sistema deve compilar dados de volume financeiro, editais abertos e segmentos atendidos em um painel público (Landing Page intitulada **"Compra Mais Rio Branco"**, utilizando as logomarcas oficiais da prefeitura) para acompanhamento da FIEAC e sociedade. (Prioridade: Média | Origem: Visita 3, Validação 01).

RF011 - Verificação de Inadimplência e Bloqueio de Credenciamento: O sistema deve consultar automaticamente as bases de débito PGM, SICAF e demais bases federais/estaduais ao tentar credenciar um fornecedor e impedir o avanço para o status de "Credenciado" caso exista inadimplência ativa. O status de bloqueio por inadimplência deve ser claramente diferenciado de pendências documentais, que devem ser rotuladas como **"Em Análise"**. (Prioridade: Alta | Origem: Visita 2, Validação 01).

RF012 - Autenticação Biométrica Facial: O sistema deve oferecer um fluxo opcional de captura facial (liveness) no envio de documentos críticos, para comprovar correspondência entre o rosto do usuário e o documento de identidade cadastrado. (Prioridade: Could Have | Origem: Visita de validação técnica).

RF013 - Dashboard Administrativo e Funil de Cadastros Pendentes: O sistema deve oferecer uma visão interna para administradores com indicadores de cadastros pendentes, análise documental e status de editais, permitindo acompanhamento operacional do fluxo de credenciamento. (Prioridade: Should Have | Origem: Declaração de Escopo).

RF014 - Trilha de Auditoria e Exportação: O sistema deve permitir consultas filtradas das trilhas de auditoria (por usuário, data, ação, edital) e a exportação segura desses logs em formatos CSV/JSON para atendimento a órgãos de controle. (Prioridade: Alta | Origem: Reunião com TCE/SMGA).

RF015 - Termo de Responsabilidade Legal: O sistema deve exigir que o fornecedor, ao informar sua capacidade produtiva, aceite um termo de responsabilidade com validade jurídica, atestando a veracidade da informação. (Prioridade: Alta | Origem: Validação 01).

RF016 - Anexação e Download do Edital em PDF: O sistema deve permitir que o administrador (SMGA) anexe o arquivo PDF original do edital durante sua criação e que os fornecedores possam realizar o download deste documento. (Prioridade: Alta | Origem: Validação 01).

RF017 - Covalidação de Desistência: O sistema deve garantir que a solicitação de desistência de um edital por parte de um fornecedor gere uma pendência para aprovação por um administrador (SMGA), não sendo efetivada automaticamente. (Prioridade: Alta | Origem: Validação 01).
## Requisitos Não Funcionais
RNF001 - Integrações (APIs): O sistema deve se integrar bidirecionalmente via API Restful com a Receita Federal, SICAF, LICON, e com os sistemas de Dívida Ativa da Procuradoria Geral do Município (PGM).

RNF002 - Performance (Compressão SEI): O algoritmo de geração do Malote SEI (RF007) deve garantir a compressão inteligente dos PDFs para que o limite em Megabytes estabelecido pela infraestrutura de rede municipal não seja excedido durante a exportação.

RNF003 - Auditoria e Rastreabilidade: O sistema deve manter trilhas de auditoria (logs no formato JSON imutável) para todas as ações executadas pelos perfis administradores, contemplando identificação do usuário, evento, data e IP.

RNF004 - Conformidade Legal: A plataforma deve atender de maneira estrita as normativas Lei 14.133/21 (art. 79), Lei 2.027 Municipal e os ditames do Tribunal de Contas (TCE) referentes à padronização de licitações preferencialmente "por item" e não "por lote".

RNF005 - Disponibilidade: Por ser a base da modalidade de credenciamento contínuo, a plataforma deve garantir disponibilidade para entrada e submissão de novos fornecedores a qualquer momento, mantendo os editais abertos.

RNF006 - Usabilidade e Acessibilidade Visual: A interface e os relatórios institucionais externos devem, mandatoriamente, seguir a identidade visual (paleta de cores Azul) padronizada da Prefeitura Municipal de Rio Branco.
## Regras de Negócio
Redigidas sob o padrão EARS (Easy Approach to Requirements Syntax) para minimizar ambiguidades
:
RN001 - Filtro Restritivo por CNAE (Event-driven): QUANDO um fornecedor tentar visualizar editais abertos, o sistema DEVE validar seu Cadastro e limitar a exibição exclusivamente àqueles compatíveis com seus CNAEs válidos e ativos.

RN002 - Tolerância Zero à Inadimplência (Unwanted Behavior): SE a verificação via integração com SICAF e PGM acusar dívidas, débitos fiscais ou penalidades ativas, ENTÃO o sistema DEVE impedir permanentemente o avanço do cadastro de "Requerente" para as fases de "Credenciado" e "Fornecedor" no edital.

RN003 - Análise Crítica Antifraude (State-driven): ENQUANTO documentos declaratórios (Balanço Patrimonial e Atestado de Capacidade Técnica) permanecerem com status "Submetido", o sistema DEVE obrigar a validação explícita (Aprovação ou Reprovação Manual com Justificativa) por um analista administrativo (CPL) para combater fraudes (ex: QRCodes corrompidos).

RN004 - Ingressantes Retardatários (Complex): ENQUANTO um edital estiver em fase de execução contratual com seus quantitativos alocados e distribuídos, QUANDO um novo credenciado habilitar-se de forma tardia, o sistema DEVE indexá-lo imediatamente em status de "Cadastro de Reserva/Segunda Demanda", preservando sem qualquer alteração os lotes dos fornecedores pioneiros em execução.

RN005 - Teto de Distribuição Baseado na Capacidade (Ubiquitous): O sistema DEVE garantir sistematicamente que nenhuma fração designada a uma empresa, durante o rateio igualitário de quantitativos governamentais, exceda o limite de capacidade produtiva explicitamente manifestado por ela no plano de fornecimento.

RN006 - Rigor do Balanço Patrimonial (Event-driven): QUANDO for validado o Balanço Patrimonial da empresa fornecedora, o sistema DEVE aceitá-lo exclusivamente se o documento comprovar idoneidade e for atrelado, no mínimo, ao ano de exercício fiscal imediatamente anterior ao edital.

RN007 - Rubricas Isoladas / Individualização (Ubiquitous): O sistema DEVE alocar cada processo gerado pelas diversas secretarias (RBTrans, SEINFRA, etc.) em Editais rigorosamente exclusivos e inacumuláveis, proibindo arranjos tipo "Guarda-chuva" entre órgãos com fundos e finalidades distintas.

RN008 - Ordenação e Fragmentação de Malote SEI (Event-driven): O sistema DEVE gerar o malote digital seguindo a ordem definida (1º CNPJ, 2º Documento Pessoal, 3º Anexos do edital, 4º Certidões) e DEVE suportar fragmentação em partes distintas caso o tamanho ultrapasse o limite autorizado pelo SEI municipal.

RN009 - Imutabilidade da Distribuição Matemática (Event-driven): QUANDO o cálculo de distribuição de cotas for executado, o sistema DEVE impedir qualquer edição manual do resultado por parte dos administradores, garantindo a soberania do algoritmo e a isonomia do processo.

RN010 - Formalização da Desistência (State-driven): QUANDO um fornecedor com status 'Credenciado' ou 'Fornecedor' solicitar a desistência de um edital, o sistema DEVE alterar seu status para 'Pendente de Desistência' e obrigar a covalidação por um administrador (SMGA) para formalizar o ato com segurança jurídica.
## Premissas
A Prefeitura proverá os acessos institucionais para orquestração da integração do Compra Mais aos sistemas de Receita Federal, SICAF e o fornecimento da API interna da PGM.

O SEI permanecerá como a plataforma canônica e final de tramitação, elaboração de empenho e pagamentos, devendo o Compra Mais apenas orquestrar o processo B2G da etapa de submissão documental até a homologação matemática e geração do dossiê final.
## Restrições
Técnicas: O tamanho do malote final digital em formato PDF está limitado pelas restrições sistêmicas (Megabytes) estipuladas pelo SEI, requerendo um rigoroso motor de compressão.

Operacionais (Cronograma): A exigência do lançamento do projeto estipula a entrega de protótipos funcionais auditáveis e testados para validação institucional (Prefeito, SEICT, FIEAC) até o dia 30/06/2026.

Licenciamento Tecnológico: A utilização de soluções de Business Intelligence nativas (ex: Microsoft PowerBI) para Dashboards esbarra em limitações de licença, sendo necessária a utilização das visões gerenciais proprietárias do próprio sistema de relatórios do fornecedor tecnológico.
## Dependências Externas
Integração bem-sucedida e assinatura dos acordos de interoperabilidade com bancos de dados PGM e SICAF.

Capacidade de conexão com serviços de Single Sign-On (SSO) do mercado.

Carga inicial de dados (Carga Inicial/Histórico Mínimo de Preços e Padrões de Itens) das áreas de panificação, malharia, funerárias e mobiliário para alimentar os ambientes de testes e o catálogo.
## Critérios de Aceite
De acordo com os preceitos de qualidade de requisitos, todos devem ser passíveis de verificação e validação.

Bloqueio Garantido: Ao cadastrar no sistema o CNPJ de uma empresa fictícia sabidamente "em débito", a plataforma bloqueia o aceite no edital, emitindo alerta restritivo sem intervenção humana.

Reprovação com Rastreabilidade: Uma recusa de Anexo pelo perfil "CPL" é bloqueada na interface se o campo "Motivo da Reprovação" (textual) estiver em branco.

Fila Dinâmica de Segunda Demanda: Um CNPJ submetido no 10º dia de um edital distribuído no 5º dia é classificado no sistema com o rótulo ("flag") de "Cadastro de Reserva/Segunda Demanda", sem refracionar o contrato em andamento.

Conformidade de Malote: O botão de "Exportar Malote" gera um arquivo ZIP/PDF respeitando rigorosamente a ordenação legal definida: CNPJ > Doc Sócios > Anexos Edital > Certidões.
Critérios de Aceite por Requisito:
- RF001: cadastro via CNPJ deve preencher automaticamente os dados principais e permitir entrada manual se a API estiver indisponível.
- RF011: o sistema deve bloquear o avanço para credenciamento de fornecedores com débitos ativos e apresentar mensagem clara de impedimento.
- RF003: apenas editais compatíveis com o CNAE informado devem ser exibidos ao fornecedor.
- RF007: o malote deve ser gerado na ordem correta e não exceder o limite de tamanho configurado pelo SEI.
- RF010: o painel público deve apresentar indicadores atualizados e utilizar a paleta azul da Prefeitura.
- RF013: o dashboard interno deve apresentar status de cadastros pendentes e indicadores de análise documental.
- **RF015:** Ao se credenciar, o fornecedor deve marcar um checkbox de aceite de um termo de responsabilidade para prosseguir.
- **RF016:** Na criação do edital, o administrador deve conseguir fazer upload de um PDF. O fornecedor deve ver um botão de download para esse PDF na tela do edital.
- **RF017:** A ação "Desistir" pelo fornecedor deve gerar uma notificação no painel do administrador, que por sua vez deve ter um botão para "Confirmar Desistência".
- **RN009:** Após a distribuição ser calculada, a interface do administrador não deve apresentar campos ou botões que permitam alterar as cotas atribuídas.
## Matriz de Rastreabilidade
Esta matriz assegura visibilidade ao impacto das mudanças (Change Impact Analysis) do levantamento original à implementação
.
ID Req.
Tipo
Origem
Stakeholder Afetado
Módulo Impactado
RF001
Funcional
Reunião 2 / Apresentação
Fornecedor
Catálogo/Cadastros base
RF003
Funcional
Reunião 2 (Regra de Negócio)
CPL / Fornecedor
Credenciamento e Covalidação
RN002
R. Negócio
Reunião 2 / Apresentação
PGM / CPL
Catálogo/Cadastros base
RF005
Funcional
Reunião 1 e 3, Validação 01
FIEAC / Fornecedor
Distribuição Inteligente
RF007
Funcional
Reunião 2 (CPL)
CPL (Silas)
Integração Processual (Malote)
RF010
Funcional
Reunião 3, Validação 01
Prefeito / FIEAC
Dashboard (BI Público)
RF011
Funcional
Reunião 2, Validação 01
CPL / SMGA
Catálogo/Cadastros base
RF012
Funcional
Visita de Validação Técnica
CPL / Fornecedor
Credenciamento e Covalidação
RF013
Funcional
Declaração de Escopo
SMGA / CPL
Administração do Sistema
RF014
Funcional
Reunião com TCE/SMGA
Órgãos de Controle / SMGA
Auditoria e Logs
RF015
Funcional
Validação 01
Fornecedor / CPL
Credenciamento e Covalidação
RF016
Funcional
Validação 01
Admin SMGA / Fornecedor
Gestão de Editais
RF017
Funcional
Validação 01
Fornecedor / Admin SMGA
Credenciamento e Covalidação
RNF004
Não Funcional
Reunião 3 / Apresentação
TCE / SMGA
Auditoria e Logs
RNF005
Não Funcional
Visita 2 / Reunião Técnica
CPL / Fornecedor
Disponibilidade do Serviço
RN004
R. Negócio
Reunião 2 (Retardatários)
Secretarias
Distribuição Inteligente
RN009
R. Negócio
Validação 01
Admin SMGA / Fornecedor
Distribuição Inteligente
RN010
R. Negócio
Validação 01
Fornecedor / Admin SMGA
Credenciamento e Covalidação
## Lacunas e Pontos de Validação
Dúvida - Integração com Sistemas GPI e Leilão: Foi mencionado que os processos de desfazimento/leilão abrem novas esteiras no SEI. É necessário validar qual sistema cuidará dessas rotinas.

Hipótese e Risco de Escopo - Biometria Facial (Liveness): A equipe municipal levantou a necessidade de incluir validação de biometria facial. A validação do protótipo (Visitas 5 e 6) **confirmou o adiamento** desta funcionalidade para uma versão futura (não fará parte do MVP) devido ao alto impacto técnico e de escopo.

Dúvida Resolvida - Capacidade Produtiva Superestimada: A dúvida sobre fornecedores informando capacidade irreal foi mitigada pela criação do requisito `RF015 - Termo de Responsabilidade Legal`, que adiciona uma camada de responsabilização jurídica sobre a declaração.

Ponto de Validação - Limite Físico SEI: Obter formalmente junto à TI da Prefeitura o tamanho limitador (em MB) do motor do SEI para parametrização exata do compressão de "Malote Digital".
Resumo Executivo
Esta análise fundamentada do sistema Compra Mais mapeou exaustivamente as intenções operacionais e os parâmetros jurídicos expostos nas sessões de elicitação com a P.M. de Rio Branco.
Total de Requisitos Funcionais Identificados: 17
Total de Requisitos Não Funcionais Identificados: 6
Total de Regras de Negócio Core Sistematizadas: 10
Principais Riscos: Subestimar o esforço de integração nativa do protocolo com o sistema legado "PGM" municipal. Outro risco é o aumento súbito de escopo caso a "Biometria Facial" seja exigida como premissa crítica já no MVP.
Principais Pendências: As chaves/API's definitivas para interligação do SICAF/PGM e o alinhamento da identidade visual da Landing Page Pública.
Próximos Passos Recomendados: Assinatura formal da Declaração de Escopo, documentação via ferramenta de Requirements Management, e o desenho tático dos Wireframes e fluxos de tela a serem levados como "Pré-Lançamento" ao comitê da FIEAC e ao Gabinete do Prefeito no dia 30 de Junho.

---

## Alterações da V2 (Baseado na Validação 01)

Esta seção resume as principais mudanças incorporadas nesta versão do documento, originadas do feedback das sessões de validação do protótipo (visitas 5 e 6).

### Requisitos Funcionais Adicionados
*   **RF015 - Termo de Responsabilidade Legal:** Adiciona uma camada de segurança jurídica, exigindo que o fornecedor se responsabilize criminalmente pela capacidade produtiva informada.
*   **RF016 - Anexação e Download do Edital em PDF:** Permite que o PDF original do edital seja anexado pela SMGA e baixado pelos fornecedores, aumentando a transparência.
*   **RF017 - Covalidação de Desistência:** Cria um fluxo de aprovação para a desistência de um fornecedor, evitando saídas automáticas e garantindo formalização do ato.

### Requisitos Funcionais Alterados
*   **RF005 - Motor de Distribuição Equitativa:** A especificação foi refinada para ocultar o rateio global na visão do fornecedor, mostrando apenas a cota individual para evitar conflitos.
*   **RF010 - Portal de Transparência:** O requisito foi atualizado para incluir o nome oficial da página ("Compra Mais Rio Branco") e a obrigatoriedade do uso das logomarcas da prefeitura.
*   **RF011 - Verificação de Inadimplência:** A nomenclatura foi ajustada para diferenciar o bloqueio por dívida do status "Em Análise" por pendência documental, melhorando a comunicação com o usuário.

### Regras de Negócio Adicionadas
*   **RN009 - Imutabilidade da Distribuição Matemática:** Veda explicitamente a edição manual das cotas distribuídas pelo sistema, tornando o cálculo do algoritmo soberano e irrevogável.
*   **RN010 - Formalização da Desistência:** Estabelece o fluxo de estado para a desistência, que passa a exigir uma aprovação (covalidação) de um administrador.

---

## Documentos Relacionados

- 01 - Descritivo do Produto
- 02 - Declaração de Escopo
- 04 - Arquitetura
- 05 - Histórias de Usuário
- 06 - Casos de Uso
- 07 - Backlog
- 08 - BPMN

---

**Documento gerado automaticamente com padronização Hydros v1**  
*Última atualização: 2026-07-03*
