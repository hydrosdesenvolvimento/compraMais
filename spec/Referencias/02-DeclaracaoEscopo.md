# Compra Mais - Plataforma de Compras Municipalizadas

## Declaração de Escopo

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
  - [Declaração de Escopo](#declaração-de-escopo)
  - [Controle de Versão](#controle-de-versão)
  - [Sumário](#sumário)
  - [Objetivo do Projeto](#objetivo-do-projeto)
  - [Escopo Incluído](#escopo-incluído)
  - [Escopo Não Incluído](#escopo-não-incluído)
  - [MVP – Produto Mínimo Viável](#mvp--produto-mínimo-viável)
  - [Entegáveis do Projeto](#entegáveis-do-projeto)
  - [Integrações](#integrações)
  - [Documentos Relacionados](#documentos-relacionados)

---

## Objetivo do Projeto
O objetivo principal do Compra Mais (Programa de Compras Municipalizadas) é digitalizar e centralizar o credenciamento de fornecedores e o processo de licitação na modalidade de credenciamento (Lei 14.133, art. 79 e Lei Municipal 2.027) para a Prefeitura de Rio Branco
. A plataforma transformará um fluxo analógico, burocrático e manual em um portal de autoatendimento, fomentando a economia do município ao facilitar o acesso das MEs e MEIs locais
.
A Prefeitura espera como resultados práticos: o bloqueio automático de inadimplentes
, o fim do retrabalho para a Comissão de Licitação (CPL) que precisava reavaliar documentações repetidas fisicamente
, a criação de uma distribuição de compras matematicamente justa com base na capacidade produtiva dos fornecedores
, e a transparência em tempo real para o Gabinete do Prefeito e para a sociedade (FIEAC)
.
## Escopo Incluído
O projeto adaptará a tecnologia core do sistema estadual CompraAC, sendo parametrizado exclusivamente para o cenário da Prefeitura
. Abaixo, os módulos que compõem a primeira versão (MVP):
Módulo de Cadastro B2G e Onboarding
Objetivo: Facilitar a entrada do fornecedor de forma autônoma.
Funcionalidades principais: Cadastro via CNPJ com preenchimento automático via base da Receita Federal (trazendo CNAE, Razão Social e Porte)
. Filtro bloqueador que impede o fornecedor de visualizar ou aceitar editais fora de seu CNAE principal ou secundário válido
. Upload de certidões e contratos sociais digitalizados (PDF/Imagem)
.
Usuários: Fornecedores Locais.
Módulo de Gestão de Editais Individualizados
Objetivo: Refletir a premissa "1 Edital = 1 Demanda" originária das secretarias municipais
.
Funcionalidades principais: Criação e publicação de editais individuais com requisitos documentais obrigatórios parametrizáveis (ex: exigência de balanço patrimonial apenas do último exercício)
. Configuração de lotes e itens da demanda.
Usuários: Administradores (SMGA/CPL).
Módulo de Análise e Covalidação Documental
Objetivo: Barreira de auditoria humana (antifraude) sobre os envios das empresas.
Funcionalidades principais: Visualização dos documentos em PDF na plataforma. Botões de "Aprovar" ou "Reprovar". Campo de texto obrigatório para incluir a justificativa ao reprovar (ex: "Imagem ilegível") e notificar o fornecedor via sistema
.
Usuários: Administradores (SMGA/CPL).
Módulo Motor de Distribuição Inteligente
Objetivo: Rateio transparente e alocação de "retardatários".
Funcionalidades principais: Distribuição matemática justa (ex: 100 itens para 10 empresas = 10 para cada), limitada pelo teto da capacidade produtiva preenchida pelo fornecedor
. Regra de "Segunda Demanda / Cadastro de Reserva" que insere fornecedores habilitados fora do prazo no final da fila para não atrasar a execução contratual atual
.
Usuários: Sistema (Regras de Backend).
Módulo Malote Processual SEI
Objetivo: Integrar a realidade sistêmica da prefeitura.
Funcionalidades principais: Gerar, a partir dos documentos já aprovados, um download único em PDF (ou ZIP), comprimido e ordenado de forma lógica (1º CNPJ, 2º Identidade, 3º Anexos, 4º Certidões) para o servidor da CPL anexar rapidamente no Sistema Eletrônico de Informações (SEI)
.
Usuários: Administradores (SMGA/CPL).
Módulo de Transparência, Dashboards e Relatórios
Objetivo: Gestão executiva e prestação de contas.
Funcionalidades principais: Dashboard interno de uso e funil de cadastros pendentes
. Portal público simplificado estilo "Landing Page" (utilizando a cor azul da Prefeitura) detalhando editais em vigor, totais investidos no município e segmentos mais aquecidos (panificação, confecção, etc.)
.
Usuários: Gabinete do Prefeito, FIEAC, Administradores e Cidadãos.
## Escopo Não Incluído
Fora do escopo:
Pregão e Disputa de Lances: O Compra Mais é parametrizado exclusivamente para o rito de Credenciamento, com preços tabelados por edital. Não há menor preço ou leilão de lances
.
Agrupamento Multi-Secretaria (Edital Guarda-Chuva): O modelo estadual que agrupa várias entidades em um edital gigantesco foi descartado. Será 1 demanda = 1 edital
.
Gestão de Inservíveis/Leilão Patrimonial: Esse é um projeto secundário (Reuse/Patrimônio Circular) abordado paralelamente, e não faz parte do motor de compras B2G
.
Futuras evoluções:
Integração Bidirecional SEI: A geração automatizada da demanda partindo do SEI para o sistema via API total. (No momento o trâmite exporta do sistema para o SEI ou vice-versa via upload manual)
.
Necessita validação:
Biometria Facial (Liveness): Foi cogitada como trava de segurança na submissão de documentos. Porém, o custo e complexidade podem inviabilizar o lançamento rápido
.
## MVP – Produto Mínimo Viável
Must Have (Obrigatório)
Autenticação e cadastro com captura de dados via Receita Federal pelo CNPJ (vital para mitigar erros manuais)
.
Filtro automatizado por CNAE (vital para evitar empresas fornecendo fora do seu escopo legal)
.
Covalidação humana para aprovar/reprovar atestados e balanços com inserção de justificativas
.
Gestor automático da "Segunda Demanda/Fila de Reserva" (vital para resolver a exigência da Lei 14.133 sem travar secretarias)
.
Geração do "Malote Comprimido Ordenado" para o SEI
.
Motor de rateio equitativo baseado na capacidade declarada
.
Should Have (Altamente Recomendado)
Integração API com a Procuradoria Geral do Município (PGM) e SICAF para bloqueio automático de devedores
.
Landing Page pública na paleta de cores institucional (Azul) para fins políticos e de transparência
.
Could Have (Desejável)
Módulo de agendamento documentado de visitas técnicas (podem ocorrer via telefone no início)
.
Notificações SMS para vencimento de certidão de fornecedor
.
Won't Have (Não Terá na V1)
Sistema de biometria facial para identificação na entrada do portal
.
Aplicativo mobile nativo para iOS/Android (a plataforma será Web Responsiva, permitindo acesso via navegador no celular)
.
## Entegáveis do Projeto
Plataforma Web B2G: O "Portal do Fornecedor" (para autoatendimento e upload)
.
Painel Administrativo da SMGA: Retaguarda para gerenciar editais, aprovar documentos e homologar distribuição
.
Landing Page Pública de Transparência: Portal com gráficos simplificados para o Prefeito, FIEAC e sociedade
.
Exportador de Malote: Módulo que condensa, em ordem pré-definida, arquivos em PDF otimizados para o sistema SEI
.
Capacitação: Treinamentos para a SMGA (servidores) e para o rol de empresários/fornecedores
.
Apresentação/Protótipos Iniciais: Telas de pré-lançamento para alinhamento e divulgação na reunião de 30/06 na FIEAC
.
## Integrações
Receita Federal
Finalidade: Puxar os dados do fornecedor (CNAE, Razão Social, Porte) ao inserir o CNPJ
.
Tipo / Status: REST API. Obrigatória e viável (já operacional na base core do fornecedor).
SICAF (Federal)
Finalidade: Checagem de inidoneidade/penalidades da União
.
Tipo / Status: API. Obrigatória (requer ofício de permissão).
PGM - Sistema de Dívida Ativa Municipal
Finalidade: Bloquear o credenciamento de empresas devendo IPTU, ISS, etc.
.
Tipo / Status: API. Obrigatória (Módulo carece de chaves a serem fornecidas pela TI municipal).
Sistema SEI (Prefeitura)
Finalidade: Interoperabilidade passiva. O sistema exportará arquivos compatíveis e estruturados para formalização no SEI
.
Tipo / Status: Geração de Arquivos Comprimidos. Obrigatória e definida.
7. Premissas
O município segue a Lei Federal 14.133 (Nova Lei de Licitações - art. 79) e a Lei Municipal 2.027
.
O SEI e o GPI continuam sendo as plataformas oficiais para registro do empenho e pagamentos. O Compra Mais atuará até a fase de homologação e indicação da distribuição
.
O Fornecedor precisará possuir e-mail e internet básica para manter suas certidões em dia
.
A prefeitura redigirá e assinará os ofícios técnicos necessários para liberação das APIs federais (SICAF e Receita)
.
8. Restrições
Orçamentárias e Legais: A divisão das demandas não pode criar cotas unitárias exclusivas de forma arbitrária; deve ser equitativa e respeitar a capacidade declarada para não ferir a isonomia perante o TCE
.
Técnicas (SEI): O limite de megabytes tolerado pelo sistema de processos (SEI) da prefeitura impõe restrições ao tamanho e à densidade do PDF gerado pelo sistema Compra Mais
.
Temporal: Protótipos/Telas validadas precisam estar prontos para o evento/pré-lançamento do dia 30 de junho na FIEAC com a presença do Prefeito
.
9. Dependências
Liberação da API PGM: Disponibilização dos conectores de Dívida Ativa pela equipe de TI/Finanças do município
.
Estruturação Fiel de Catálogo: Recebimento, pela equipe técnica, do histórico inicial de compras (malharia, mobiliário, panificação, setor funerário) para imputar as demandas testes
.
Validação da Ordem do Malote: CPL deverá homologar se o arranjo lógico "1. CNPJ, 2. Doc Sócio, 3. Anexos, 4. Certidões" englobará eventuais procurações em cenários excepcionais
.
10. Critérios de Aceite do Projeto
Fornecedores reprovados por CNAE divergente ou débitos fiscais não podem avançar na adesão aos editais (Bloqueio sistêmico funcional)
.
Um edital que receba um fornecedor fora do prazo deverá alocá-lo sistematicamente numa lista/status chamado "Segunda Demanda/Fila", mantendo inalterados os quantitativos contratuais já homologados e entregues
.
O perfil de Administrador conseguirá reprovar um arquivo em PDF e a plataforma obrigará o preenchimento de uma justificativa em texto
.
Geração com sucesso de um arquivo consolidado único contendo os anexos e certidões válidas dos fornecedores aptos.
11. Riscos de Escopo
Processos Indefinidos: Se secretarias tentarem solicitar o acesso da "Segunda Demanda" por motivos não alinhados à quebra do primeiro contrato, haverá risco de insegurança jurídica.
Resistência Tecnológica: Fornecedores locais muito pequenos e desestruturados podem apresentar dificuldades no manuseio de PDFs e cobrar atendimento físico ao invés de digital
.
Conflito de Arquitetura SEI: Limitações ou restrições rígidas da TI da prefeitura quanto à compressão de malotes grandes
.
12. Itens que Necessitam de Validação
Item
Situação Atual
Impacto
Responsável pela Validação
Integração PGM (Dívida Municipal)
Citada como essencial, mas não temos o nome técnico do sistema interno nem as chaves API.
Alto
TI da Prefeitura / Marcos
Limite em Megabytes do sistema SEI
Desconhecido. Indispensável para ajustar a rotina de compactação em PDF do Malote.
Alto
Silas / CPL
Autenticação Facial (Liveness)
Levantada pelo gestor devido a fraudes recentes por contadores em anexos falsos.
Médio-Alto
SMGA (Marcos) / Time Engenharia
Dashboard para o Prefeito
Entendimento conceitual acordado; pendente a aprovação visual final das métricas essenciais.
Médio
Gabinete do Prefeito
Identidade Visual Final
Sabemos que é azul, mas precisamos receber o Brandbook municipal exato para a interface do sistema.
Baixo-Médio
SMGA
Conclusão Executiva
O projeto Compra Mais consubstancia uma inovação digital e burocrática massiva para a Prefeitura de Rio Branco. O núcleo do seu valor não é apenas "inserir formulários em tela", mas blindar a máquina pública com algoritmos equitativos e travas antifraude documentais
, enquanto atrai ativamente os comerciantes locais para o escopo público
.
Ao adaptar a lógica do modelo estadual para o contexto do município ("1 Edict = 1 Demand" e controle autônomo do "Cadastro de Reserva"
), o escopo cobre assertivamente os gargalos atuais expostos pela gestão. O foco agora, no pré-desenvolvimento, repousa exclusivamente no recebimento dos protocolos de integração (APIs federais/municipais e restrições do SEI) e na finalização dos protótipos de apresentação agendados para o fim de junho (evento com a FIEAC).

---

## Documentos Relacionados

- [01 - Descritivo do Produto](01-DescritivoProduto.md)
- [03 - HDR (Requisitos)](03-HDR.md)
- [04 - Arquitetura](04-Arquitetura.md)
- [05 - Histórias de Usuário](05-HistoriasUsuario.md)
- [06 - Casos de Uso](06-CasosUso.md)
- [07 - Backlog](07-Backlog.md)
- [08 - BPMN](08-BPMN.md)

---

**Documento gerado automaticamente com padronização Hydros v1**  
*Última atualização: 2026-06-22*