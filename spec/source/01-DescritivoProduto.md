# Compra Mais - Plataforma de Compras Municipalizadas

## Descritivo do Produto

---

**Projeto:** Compra Mais  
**Cliente:** Prefeitura Municipal de Rio Branco  
**Versão:** 1.0  
**Data:** 2026-06-22  
**Autor:** Equipe SMGA/CPL  

---

## Controle de Versão

| Versão | Data | Autor | Alteração |
|---------|---------|---------|---------|
| 1.0 | 2026-06-22 | Equipe SMGA/CPL | Versão inicial - Padronização estrutural |

---

## Sumário

- [Compra Mais - Plataforma de Compras Municipalizadas](#compra-mais---plataforma-de-compras-municipalizadas)
  - [Descritivo do Produto](#descritivo-do-produto)
  - [Controle de Versão](#controle-de-versão)
  - [Sumário](#sumário)
  - [Identificação do Produto](#identificação-do-produto)
  - [Visão Geral](#visão-geral)
  - [Contexto do Projeto](#contexto-do-projeto)
  - [Problema que o Produto Resolve](#problema-que-o-produto-resolve)
  - [Objetivos do Produto](#objetivos-do-produto)
  - [Público-Alvo e Usuários](#público-alvo-e-usuários)
  - [Benefícios Esperados](#benefícios-esperados)
  - [Escopo Macro (Principais Módulos)](#escopo-macro-principais-módulos)
  - [Resultados Esperados](#resultados-esperados)
  - [Pontos Pendentes de Validação](#pontos-pendentes-de-validação)
  - [Documentos Relacionados](#documentos-relacionados)

---

## Identificação do Produto
- **Nome do Produto:** Compra Mais (Programa de Compras Municipalizadas)
- **Cliente/Patrocinador:** Prefeitura Municipal de Rio Branco (SMGA / Gabinete do Prefeito)
- **Base Tecnológica:** Core adaptado do sistema CompraAC (Governo do Estado do Acre), com customizações para a legislação e regras negociais do município
- **Período de Levantamento:** Junho de 2026
.
## Visão Geral
O Compra Mais é uma plataforma B2G (Business-to-Government) de gestão de compras públicas e credenciamento digital. Ele atua como um "marketplace reverso" auditável que conecta as demandas de secretarias municipais (ex: compras de fardamentos, mobiliário, merenda) diretamente aos fornecedores locais
. A plataforma substitui o trâmite físico de papéis por um portal de autoatendimento contínuo, distribuindo o volume de compras de forma justa e matematicamente atrelada à capacidade produtiva de cada empresa
.
## Contexto do Projeto
A Prefeitura de Rio Branco possui um orçamento estimado de R$ 53 milhões destinado a compras municipalizadas para o ano em curso
. Historicamente, o processo de credenciamento exigia que os empresários locais levassem calhamaços de papel à prefeitura repetidas vezes
. Com a sanção da Nova Lei de Licitações (Lei 14.133, art. 79) e da Lei Municipal 2.027
, a prefeitura decidiu digitalizar o processo herdando a tecnologia validada no Estado, mas ajustando-a para a sua realidade (ex: editais individualizados por secretaria em vez de editais globais)
. Há um forte apelo político e institucional para apresentar a primeira versão da plataforma (MVP) na FIEAC no dia 30 de junho de 2026
.
## Problema que o Produto Resolve
O Compra Mais ataca dores crônicas de três frentes:
Burocracia e Retrabalho (Prefeitura): A Comissão de Licitação (CPL) sofre conferindo as mesmas certidões a cada novo edital, precisando digitalizar, comprimir arquivos manualmente para caber no sistema SEI, e consultar débitos em múltiplos sites governamentais (SICAF, PGM)
.
Barreira de Acesso e "Caça a Editais" (Fornecedores): O empresário local precisa ler o Diário Oficial diariamente para achar demandas. Quando acha, lida com um processo analógico que exige idas à prefeitura
.
Fraudes Documentais e Subjetividade (Controle): Há histórico de PDFs forjados (ex: sobreposição de QR Codes em certidões vencidas ou balanços maquiados)
. Além disso, a distribuição manual de cotas gera suspeitas de favorecimento e pressões sobre os servidores
.
## Objetivos do Produto
Fomentar a Economia Local: Garantir que o recurso municipal fique no município, permitindo que pequenos e médios fornecedores coexistam no mesmo edital através do respeito à sua capacidade produtiva
.
Automatizar a Triagem Legal: Bloquear sistematicamente fornecedores inadimplentes ou com dívidas na PGM, erradicando a cultura do "jeitinho" (promessa de entregar o documento depois)
.
Reduzir Tempo de Ciclo: Interligar o cadastro diretamente à Receita Federal e gerar malotes digitais organizados para exportação direta ao sistema SEI
.
Garantir Continuidade do Abastecimento: Resolver o problema de empresas que ingressam fora do prazo criando a regra de "Segunda Demanda/Cadastro de Reserva", sem paralisar os contratos vigentes
.
## Público-Alvo e Usuários
A plataforma possui perfis bem delimitados:
Fornecedor Local (MEI, ME, Médias e Grandes): Usuário final que acessa o portal B2G para se cadastrar (Requerente), validar documentos (Credenciado) e oferecer produtos (Fornecedor)
.
Administrador / Gestor do Sistema (SMGA / CPL): Servidores (como Silas e Marcos) que criam os editais, covalidam documentos criticamente, registram laudos de visitas técnicas e realizam a distribuição de demandas
.
Demandantes (Secretarias Municipais): Clientes internos (ex: Educação, Infraestrutura) que geram a demanda de compras e acompanham a execução
.
Espectadores Estratégicos (Prefeito, FIEAC, População): Usuários de um Dashboard Público / Landing Page focado em transparência, volume investido e desenvolvimento econômico
.
## Benefícios Esperados
Eficiência Operacional: O que levava semanas será automatizado. O sistema avisará os fornecedores sobre o vencimento de certidões (via SMS/e-mail) e filtrará editais apenas para os CNAEs compatíveis
.
Auditoria Impecável: Geração de logs imutáveis (JSON) e exigência de justificativa em texto para reprovação documental, protegendo o ordenador de despesas de apontamentos do Tribunal de Contas
.
Democratização do Acesso: Distribuição equitativa "matemática" das compras. Uma malharia pequena e uma grande podem participar juntas, cada uma fornecendo seu limite técnico declarado
.
## Escopo Macro (Principais Módulos)
Módulo de Onboarding B2G: Cadastro via CNPJ integrado com a Receita Federal; alerta de editais por compatibilidade de CNAE
.
Módulo de Editais Individualizados: Criação de chamamentos na proporção "1 Edital = 1 Demanda", mantendo rubricas orçamentárias de secretarias separadas (diferente do modelo Estadual)
.
Motor de Covalidação Antifraude: Interface para aprovação manual com exigência de preenchimento de justificativa em caso de recusa (foco no Balanço Patrimonial e Atestado de Capacidade Técnica)
.
Integração / Exportação SEI: Geração de um malote digital único com tamanho comprimido e ordem predefinida (1. Cartão CNPJ, 2. Doc Pessoal, 3. Anexos, 4. Certidões) para formalização do contrato no sistema oficial da Prefeitura
.
Motor de Distribuição Inteligente: Lógica para alocação de "item a item" e gestão automática da fila de "Segunda Demanda/Cadastro de Reserva"
.
Painel de Transparência (BI): Landing page pública na cor azul (identidade visual da Prefeitura), com gráficos simplificados para prestação de contas
.
## Resultados Esperados
Espera-se que o Compra Mais acelere drasticamente o tempo entre o registro de uma necessidade de compra e a sua execução. Além de injetar o orçamento no comércio da cidade, o sistema blindará a administração contra fraudes documentais
, gerando confiança no empresariado e entregando ferramentas tangíveis de prestação de contas para o Gabinete do Prefeito
.
## Pontos Pendentes de Validação
Como passo preparatório para a engenharia de software, mapeei itens que ainda carecem de validação técnica/negocial junto à Prefeitura:
Integração com Dívida Ativa Municipal (PGM): Confirmar a viabilidade técnica (existência de API) para consultar automaticamente débitos de IPTU/ISS no sistema da Procuradoria
.
Limites de Upload do SEI: Definir o tamanho exato (em MB) que o SEI da prefeitura suporta para que a compressão dos malotes do Compra Mais seja configurada sem causar erros de timeout
.
Validação Geométrica/Facial: A prefeitura levantou a possibilidade de biometria facial para garantir que o procurador legal está submetendo o documento, evitando que terceiros mal-intencionados façam upload falso
. Precisamos validar se isso entrará no escopo deste MVP.
Ordem do Algoritmo para a Segunda Demanda: Embora a regra de jogar retardatários para o "Cadastro de Reserva" esteja fechada
, precisamos documentar as prioridades de invocação caso um fornecedor principal falhe.

ETAPA 1 – VISÃO ESTRATÉGICA
Qual problema o Compra Mais resolve? O sistema resolve a descentralização, a lentidão burocrática e a opacidade dos processos de credenciamento físico para compras governamentais na Prefeitura de Rio Branco
. Ele substitui um fluxo analógico e fragmentado por uma plataforma B2G (Business-to-Government) auditável, que automatiza a triagem e garante a distribuição justa de contratos
.
Qual a dor atual da Prefeitura? A prefeitura sofre com o retrabalho. A cada novo edital, os servidores precisam receber, escanear e reavaliar calhamaços de documentos físicos (muitos já validados em editais anteriores)
. Além disso, sofrem pressão política quando processos atrasam devido a fornecedores que demoram a entregar a documentação
.
Qual a dor atual dos fornecedores? A burocracia repetitiva e a falta de visibilidade. Hoje, um fornecedor local (como uma padaria ou malharia) precisa ler o Diário Oficial diariamente para caçar oportunidades
. Quando encontra, precisa imprimir toda sua documentação e levar fisicamente à prefeitura
. Se houver erro, a comunicação é truncada, gerando atritos e a sensação de que o servidor está agindo de má-fé
.
Quais gargalos operacionais foram mencionados?
Compressão de arquivos para o SEI: Servidores precisam escanear os documentos físicos e comprimi-los manualmente em softwares de terceiros para não estourar o limite de megabytes do sistema SEI
.
Pesquisa de débitos manual: Hoje, o servidor (como o Silas) precisa abrir 3 a 4 sites diferentes (SICAF, sistemas federais e municipais) para checar a idoneidade de cada fornecedor
.
Quais problemas de controle e auditoria foram mencionados? Existe um alto risco de fraude documental. Foi relatado um caso real onde um fornecedor fraudou uma certidão de débitos colando um QR Code falso em um documento físico escaneado
. Além disso, a distribuição manual de quantitativos levanta questionamentos sobre favorecimento
, e o Tribunal de Contas (TCE) tem exigido cada vez mais compras por "item" em vez de "lote"
.
Quais problemas de transparência foram mencionados? Os órgãos representativos (como a FIEAC), a população e até mesmo o Gabinete do Prefeito não possuem uma visão em tempo real de quanto a prefeitura está comprando do comércio local
. Hoje, para comprovar que o dinheiro está ficando no município, o prefeito depende de relatórios gerados manualmente
.
Quais problemas de credenciamento foram mencionados? A lei de credenciamento exige que ele fique aberto continuamente
. O problema é: como gerir fornecedores "retardatários" (que chegam após a distribuição da demanda inicial) sem atrasar a execução do contrato vigente pelas Secretarias? A solução não estava clara até a decisão de criar um "Cadastro de Reserva" ou "Segunda Demanda" para esses casos
.
ETAPA 2 – VISÃO DO PRODUTO
O que é o Compra Mais?
O Compra Mais é o motor digital de fomento à economia da Prefeitura de Rio Branco. Ele é uma plataforma de autoatendimento e distribuição inteligente de demandas governamentais.
O propósito do produto: Digitalizar de ponta a ponta o processo de credenciamento de fornecedores locais, substituindo o papel por dados, a subjetividade por algoritmos, e a burocracia pela transparência.
O valor entregue: Aos fornecedores, entrega facilidade de acesso a editais direcionados ao seu ramo de atuação (CNAE). À Prefeitura, entrega conformidade legal, redução drástica de tempo de operação e trilhas de auditoria impecáveis.
O impacto esperado: Garantir que o orçamento de compras municipalizadas (estimado em R$ 53 milhões) seja injetado de forma equitativa nos micro e pequenos negócios locais, gerando empregos e desenvolvimento no município
.
Como será utilizado: Funcionará como um marketplace reverso. A prefeitura publica a demanda (ex: 1.000 fardamentos), o sistema notifica automaticamente as malharias cadastradas, elas sobem seus atestados e a plataforma divide a cota de produção matematicamente entre as empresas aptas.
Quem utilizará: Microempreendedores e empresas locais (MEI, ME, etc.), a Secretaria Municipal de Gestão Administrativa (SMGA) via Comissão de Licitação, as Secretarias demandantes (Saúde, Educação, Obras) e a população em geral como espectadora
.
Qual transformação ele promove: Transforma a prefeitura de um "agente passivo que recebe papel" para um "parceiro ativo de negócios", elevando a confiança do empresariado local nas contratações públicas e blindando os servidores contra acusações de fraudes ou favorecimentos.
ETAPA 3 – OBJETIVOS DE NEGÓCIO
Estratégicos:
(Prefeitura / Gestão Municipal): Fomentar e blindar a economia local, garantindo que o recurso municipal gere riqueza no próprio município
. Utilizar a ferramenta como vitrine de transparência (Dashboard) para ganhar capital político e confiança da população
.
(Órgãos de Controle - TCE/PGM): Assegurar o cumprimento estrito da Nova Lei de Licitações (Lei 14.133/21, art. 79) e garantir um histórico de auditoria rastreável
.
Táticos:
(SMGA - Sec. de Gestão Administrativa): Padronizar a gestão das demandas enviadas pelas secretarias, criando editais segmentados e rastreáveis
.
(Fornecedores): Ampliar sua fatia de participação nas compras da prefeitura de maneira justa e previsível
.
Operacionais:
(CPL - Comissão de Licitação): Eliminar o manuseio de papel, automatizar a triagem de fornecedores inaptos (com dívidas) e automatizar o cálculo matemático da distribuição de itens

---

## Documentos Relacionados

- [02 - Declaração de Escopo](02-DeclaracaoEscopo.md)
- [03 - HDR (Requisitos)](03-HDR.md)
- [04 - Arquitetura](04-Arquitetura.md)
- [05 - Histórias de Usuário](05-HistoriasUsuario.md)
- [06 - Casos de Uso](06-CasosUso.md)
- [07 - Backlog](07-Backlog.md)
- [08 - BPMN](08-BPMN.md)

---

**Documento gerado automaticamente com padronização Hydros v1**  
*Última atualização: 2026-06-22*
