---
name: 'Compra Mais — Experience'
type: ux-design-contract
part: EXPERIENCE
scope: 'Arquitetura de informação, comportamento, estados, interações, acessibilidade e jornadas do Portal do Fornecedor'
status: ratified
created: '2026-06-29'
updated: '2026-06-29'
source: 'source/AI-UI-Design/Dashboard do Fornecedor/ (Portal + AuthPanel + screenshots)'
companions: ['DESIGN.md']
---

# Compra Mais — Experience (IA, Comportamento, Jornadas)

> Destilado das telas reais do Portal do Fornecedor. **Cobre o Portal do Fornecedor**; Painel Admin e Portal Público herdam o design system mas ainda não têm telas (derivar quando houver).

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

**UJ-3 — Silas (CPL) covalida** *(Painel Admin — telas a derivar):* abre documento Pendente → visualiza PDF → aprova ou reprova com justificativa obrigatória.

## Decisões abertas (ratificar)

- **LAYOUT A vs B** do login.
- Cor azul **oficial** (brandbook da Prefeitura).
- Telas do **Painel Admin** e **Portal Público** ainda não desenhadas — herdam o design system; derivar quando priorizadas.
