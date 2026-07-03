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

## Estados transversais

- **Fallback manual** (Receita fora): visível e acionável.
- **Sincronização**: sucesso + timestamp; erro recuperável.
- **Bloqueio fiscal**: visível com CTA "Regularizar agora".
- **Documento**: Pendente (âmbar) / Aprovado (verde) / Reprovado (erro, com motivo + CTA reenviar).

## Acessibilidade

AA/AAA, foco visível (âmbar), navegação por teclado, alto contraste e ajuste de fonte pela barra de acessibilidade. Meta formal: e-MAG / WCAG 2.1 AA (a confirmar).

## Jornadas

**UJ-1 — Raimundo (Procurador da "Vale do Acre Uniformes") se cadastra:** abre o login → digita o CNPJ → Consultar autopreenche pela Receita → (se a API cai, clica "Preencher manualmente") → cria conta → entra no Portal → vê "Bem-vindo" e as pendências.

**UJ-2 — Raimundo regulariza um bloqueio:** no Início vê o aviso de bloqueio fiscal → clica **"Regularizar agora"** → vê motivo (fonte + data) e o caminho → regulariza → reconsulta libera na próxima porta.

**UJ-3 — Silas (CPL) covalida** *(Painel Admin — [painel-administrativo.html](../../AI-UI-Design/painel-administrativo.html)):* abre documento Pendente → visualiza PDF → aprova ou reprova com justificativa obrigatória. Exibe a **fila de pendências com tempo decorrido** por documento, sem SLA fixo (PRD RN011).

## Painel Administrativo (mockup ratificado 2026-07-02)

Fonte: [painel-administrativo.html](../../AI-UI-Design/painel-administrativo.html). Herda o design system (DESIGN.md).
Cobre a operação da CPL/SMGA: fila de covalidação (RN011), funil de cadastros pendentes (RF013),
gestão de editais (RN012) e consulta de auditoria (RF014). Acesso segrega por RBAC (PRD §15): `CPL`/`Administrador`
operam; `auditor` só lê/exporta a trilha. Refinar estados de erro por tela quando as histórias do Épico 9 entrarem.

## Decisões abertas (ratificar)

- **LAYOUT A vs B** do login.
- Cor azul **oficial** (brandbook da Prefeitura).
- **Portal Público de Transparência** ainda sem tela própria — herda o design system; derivar quando priorizado (só agregados não-identificáveis, PRD RN013). *(Painel Admin já tem mockup ratificado — ver acima.)*
