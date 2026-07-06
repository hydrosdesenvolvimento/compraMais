---
name: 'Compra Mais — Experience'
type: ux-design-contract
part: EXPERIENCE
scope: 'Arquitetura de informação, comportamento, estados, interações, acessibilidade e jornadas do Portal do Fornecedor'
status: ratified
created: '2026-06-29'
updated: '2026-07-02'
source: 'spec/AI-UI-Design/ (Portal do Fornecedor + Painel Administrativo + AuthPanel + screenshots)'
companions: ['DESIGN.md']
---

# Compra Mais — Experience (IA, Comportamento, Jornadas)

> Destilado das telas reais em [`../../AI-UI-Design/`](../../AI-UI-Design/). **Cobre o Portal do Fornecedor**
> ([portal-fornecedor.html](../../AI-UI-Design/portal-fornecedor.html)) e agora o **Painel Administrativo**
> ([painel-administrativo.html](../../AI-UI-Design/painel-administrativo.html), mockup ratificado —
> convergência 2026-07-02). O **Portal Público de Transparência** ainda herda o design system sem tela própria
> (derivar quando priorizado). **UX-DR10: metade Admin fechada; Público pendente.**

## Arquitetura de Informação — Portal do Fornecedor

**Sidebar (navegação principal):**
1. **Início** — visão geral, boas-vindas, ações pendentes
2. **Editais** — vitrine filtrada por CNAE
3. **Meus credenciamentos** — adesões e fases
4. **Documentos** — repositório reutilizável
5. **Demandas distribuídas** — resultado da distribuição

**Top bar:** busca global ("Buscar editais, documentos…") · sino de notificações · menu de usuário (empresa + **papel**, ex. "Vale do Acre Uniformes — Procurador").

**Rodapé:** "Versão 2.0 · MVP FIEAC".

## Telas-chave e Estados

### Jornada de entrada (IA de acesso)

O acesso **não** é mais um link seco de login. O fluxo canônico de entrada é:

**Site da Prefeitura de Rio Branco → Landing pública "Compra Mais Rio Branco" → botão "Acessar Sistema / Cadastrar" → AuthPanel.**

- A **Landing pública** ("Compra Mais Rio Branco", identidade e e-mail da comissão em DESIGN.md) é a porta institucional de transparência (RF010, RN013) e hospeda o CTA de entrada.
- O botão **"Acessar Sistema / Cadastrar"** conduz ao AuthPanel (login/cadastro). *(Relaciona-se ao UX-DR2 AuthPanel.)*

### Login / Cadastro (AuthPanel)
- Painel dividido: institucional (slogan + value props + rodapé legal) | autenticação.
- Toggle **Entrar / Criar conta**.
- Cadastro: campo **CNPJ** + botão **Consultar** → autopreenchimento via Receita.
- **Estado de fallback:** link visível *"Receita Federal indisponível? Preencher manualmente"* — nunca erro genérico.
- **Decisão aberta:** toggle **LAYOUT A / B** — duas propostas; escolher uma.
- Value props (copy ratificada): "Cadastro automático via Receita Federal · Triagem antifraude em Dívida Ativa e SICAF · Reuso de documentos entre editais".
- Slogan: **"O comércio local conectado às compras da cidade."**

### Minha conta
- "Dados oficiais da empresa obtidos pela Receita Federal (API do CNPJ)." → **somente leitura**, exceto **Nome Fantasia, Endereço e Telefone** (editáveis). *(Regra de negócio — ver PRD RN009.)*
- Card **"Sincronizar dados do CNPJ"** com timestamp da última sincronização + botão **"Sincronizar agora"** (âmbar) + estado de status (Sucesso). *(Capacidade — ver PRD RF018.)*
- Status da empresa: pill **Ativa**.

### Início (dashboard)
- Saudação ("Bem-vindo, {empresa}").
- Ações pendentes com CTA: **"Regularizar agora"** (bloqueio fiscal → fluxo de regularização, RF016/Épico 4), **"Atualizar documento"** (reprovação → reenvio, Épico 2), **"Ver todas as notificações"**.

### Credenciamento (wizard, Portal do Fornecedor)

Fluxo multi-etapa a partir de um edital `Aberto` (RN014): seleção → upload/seleção de documentos (Cartão CNPJ, Contrato Social, Balanço…) → **capacidade produtiva** (com Termo de Responsabilidade) → **Termo de Aceite** → Conclusão ("Concluir Credenciamento"). Cada avanço ("Avançar") valida a etapa; o registro nasce em **"Meus Credenciamentos"** e pode ser **cancelado antes da distribuição** (RN016).

**Etapa de capacidade produtiva — Termo de Responsabilidade (RF024):** a etapa exibe um **checkbox de aceite do Termo de Responsabilidade**. O botão **"Prosseguir"** permanece **desabilitado** enquanto o aceite não for marcado; só habilita após o fornecedor marcar o checkbox. *(Componente "Checkbox de aceite" em DESIGN.md.)*

> ⚠️ **"Prova de vida" (mockup) = Release 2, fora do MVP** (ratificado pelo cliente na Validação 01). O mockup exibe uma etapa "Prova de vida" (liveness). No MVP a conclusão é por **Termo de Aceite** — biometria é **Release 2 condicional a RIPD** (PRD RF012/§12, [VALIDACAO-MOCKUPS.md](../VALIDACAO-MOCKUPS.md) §G5). A etapa só entra se ratificada.

### Detalhes do edital (visão fornecedor)

- Botão **"Baixar Edital em PDF"** (RF025): baixa a íntegra do edital para consulta offline/arquivo.
- Botão **"Desistir do Edital"** (RF026): abre **diálogo de confirmação** ("Confirmar desistência?") antes de efetivar; a ação não é imediata no clique. A desistência do fornecedor entra na fila de **Desistências Pendentes** do Painel Admin (RN018).

### Demandas distribuídas (resultado da distribuição — visão fornecedor)

Tela de resultado da distribuição do próprio fornecedor. **Visão individual da cota (RN020):** exibir apenas a **demanda total do edital** e a **cota própria** do fornecedor. **Não** exibir o comparativo com concorrentes nem o rateio global — o rateio entre demais fornecedores fica **oculto** nesta visão.

## Estados transversais

- **Fallback manual** (Receita fora): visível e acionável.
- **Sincronização**: sucesso + timestamp; erro recuperável.
- **Bloqueio fiscal**: visível com CTA "Regularizar agora".
- **Documento**: Pendente (âmbar) / Aprovado (verde) / Reprovado (erro, com motivo + CTA reenviar).

## Acessibilidade

AA/AAA, foco visível (âmbar), navegação por teclado, alto contraste e ajuste de fonte pela barra de acessibilidade. Meta formal: e-MAG / WCAG 2.1 AA (a confirmar).

## Jornadas

**UJ-1 — Raimundo (Procurador da "Vale do Acre Uniformes") se cadastra:** parte do site da Prefeitura → abre a **Landing pública "Compra Mais Rio Branco"** → clica **"Acessar Sistema / Cadastrar"** → chega ao AuthPanel → digita o CNPJ → Consultar autopreenche pela Receita → (se a API cai, clica "Preencher manualmente") → cria conta → entra no Portal → vê "Bem-vindo" e as pendências.

**UJ-2 — Raimundo regulariza um bloqueio:** no Início vê o aviso de bloqueio fiscal → clica **"Regularizar agora"** → vê motivo (fonte + data) e o caminho → regulariza → reconsulta libera na próxima porta.

**UJ-3 — Silas (CPL) covalida** *(Painel Admin — [painel-administrativo.html](../../AI-UI-Design/painel-administrativo.html)):* abre documento Pendente → visualiza PDF → aprova ou reprova com justificativa obrigatória. Exibe a **fila de pendências com tempo decorrido** por documento, sem SLA fixo (PRD RN011).

**UJ-4 — Raimundo desiste de um edital e Silas confirma (RF026/RN018):** no detalhe do edital, Raimundo clica **"Desistir do Edital"** → confirma no diálogo → a desistência entra na fila. No Painel Admin, Silas vê o card **"Desistências Pendentes"** no dashboard → clica → abre a lista → aciona **"Confirmar Desistência"** com **observação opcional** → efetiva.

## Painel Administrativo (mockup ratificado 2026-07-02)

Fonte: [painel-administrativo.html](../../AI-UI-Design/painel-administrativo.html). Herda o design system (DESIGN.md).
Acesso segrega por RBAC (PRD §15): `CPL`/`Administrador` operam; `auditor` só lê/exporta a trilha.

**Telas do Painel Admin** (validadas no mockup — ver [VALIDACAO-MOCKUPS.md](../VALIDACAO-MOCKUPS.md)):

| Tela | Ação-chave | Cobertura |
|---|---|---|
| **Editais** | Novo edital · estados Rascunho/Aberto/Em Análise/Em Distribuição/Homologado/Em Execução | RF008, RN014 |
| **Fornecedores** | Novo fornecedor · Porte (MEI/ME/EPP) · estados Requerente/Credenciado/Fornecedor/Reserva/Ativa/Bloqueado | RF001, RF011 |
| **Secretarias** | **Nova secretaria** (Nome, Sigla, Responsável) | RF020 |
| **Setores industriais / CNAE** | **Novo setor industrial** (Código CNAE, Descrição) | RF021 |
| **Tipos de documento** | **Novo tipo de arquivo** (Nome, Formato, Validade/Sem validade, Categoria, Exercício) | RF022 |
| **Usuários** | **Novo usuário** (Nome, E-mail, Cargo, reset de senha) | RF023, §15 |
| **Distribuição** | Homologar distribuição | RF005 |
| **Desistências** | **Confirmar Desistência** (com campo de **observação opcional**) a partir da fila de desistências pendentes | RF026, RN018 |
| **Malote** | Gerar malote SEI | RF007 |
| **Auditoria** | Consultar + exportar logs | RF014 |

**Dashboard do Painel Admin — card "Desistências Pendentes" (RN018):** card no dashboard exibindo a contagem de desistências de fornecedores aguardando tratamento; **clicável**, leva à **lista de desistências pendentes**. Na lista, o operador aciona **"Confirmar Desistência"**, que abre a confirmação com **campo de observação opcional** antes de efetivar (RF026/RN018).

**Padrão transversal:** exclusão é **inativação preservando histórico** ("Registro convertido para Inativo") — RN015/AD-38, nunca DELETE físico. Refinar estados de erro por tela quando as histórias do Épico 9 entrarem.

## Decisões abertas (ratificar)

- **LAYOUT A vs B** do login.
- Cor azul **oficial** (brandbook da Prefeitura).
- **Portal Público de Transparência** ainda sem tela própria — herda o design system; derivar quando priorizado (só agregados não-identificáveis, PRD RN013). *(Painel Admin já tem mockup ratificado — ver acima.)*

---

> **Validação 01 (2026-07-05)** — incorpora ajustes de jornada e telas validados com o cliente (jornada de entrada via Landing pública, Termo de Responsabilidade no wizard, cota individual na distribuição, "Baixar Edital em PDF" e "Desistir do Edital", "Confirmar Desistência" e card "Desistências Pendentes" no Painel Admin, "Prova de vida" ratificada como Release 2). Ver [../VALIDACAO-CLIENTE-01.md](../VALIDACAO-CLIENTE-01.md).
