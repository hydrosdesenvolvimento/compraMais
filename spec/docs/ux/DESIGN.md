---
name: 'Compra Mais — Design System'
type: ux-design-contract
part: DESIGN
scope: 'Identidade visual e tokens de design da Prefeitura de Rio Branco aplicados ao Compra Mais'
status: ratified
created: '2026-06-29'
updated: '2026-06-29'
source: 'source/AI-UI-Design/ (Design System Prefeitura + Portal do Fornecedor; ratificado por Sales 2026-06-29)'
companions: ['EXPERIENCE.md']
---

# Compra Mais — Design (Identidade Visual)

> Destilado dos designs em `source/AI-UI-Design/`. Ratificado sob responsabilidade do solicitante. **Aberto:** confirmar a cor azul oficial com o brandbook da Prefeitura e decidir LAYOUT A vs B do login (ver EXPERIENCE.md).

## Princípios

1. **Acessível por padrão** — contraste AA/AAA, foco visível, navegação por teclado desde o início.
2. **Clareza institucional** — hierarquia sustentada pelo azul da Prefeitura; linguagem direta.
3. **Consistência** — mesmos tokens e componentes nos dois SPAs (Público e Admin).

## Tokens de Cor

**Azul institucional (primária / ação):**
| Token | Hex |
|---|---|
| azul-900 | #003A68 |
| azul-800 | #00497F |
| azul-700 (ação principal) | #0061AE |
| azul-600 | #1A73B8 |
| azul-500 | #3385C4 |
| azul-300 | #9FCBEC |
| azul-100 | #CCE0F0 |
| azul-50 | #E9F2FA |

**Neutros (texto/superfícies):** tinta #2E2F30 · cinza-700 #4B4B4B · cinza-400 #8A8C8E · cinza-200 #E2E7EE · branco #FFFFFF
**Acento âmbar** (somente chamadas de ação/destaque): #FFB300
**Semânticas:** erro #C0362C · info #0061AE · sucesso (verde do componente de status)

## Tipografia

- Família: **Poppins** (fallback system-ui, sans-serif).
- Escala observada: 11px (labels/uppercase), 12–14px (corpo/auxiliar), títulos maiores em peso 600/700.

## Espaçamento & Raio

- Escala de espaçamento: **8 / 12 / 14 / 16 / 20 px**.
- Raio: **8px** (cards, botões, inputs); **999px** (pills, tags, toggles).
- Borda padrão: 1px (cinza-200).

## Componentes

| Componente | Especificação |
|---|---|
| **Botões** | Primário (azul-700, texto branco), Secundário (#4B4B4B), Terciário/ghost, Desabilitado. Raio 8px. |
| **Cards** | Superfície branca, borda cinza-200, raio 8px (ex.: card de edital, "Minha conta"). |
| **Labels & Tags** | Pills raio 999px; status com cor semântica (Ativa/Sucesso = verde, Pendente = âmbar, Bloqueado = erro). |
| **AuthPanel** | Painel dividido: lado institucional (azul-900, logo, slogan, value props, rodapé legal) + lado de autenticação (toggle Entrar/Criar conta, CNPJ + Consultar, link de fallback manual). |
| **Sidebar** | Navegação vertical com ícones (ver IA em EXPERIENCE.md), item ativo em azul-50. |
| **Top bar** | Busca ("Buscar editais, documentos…"), sino de notificações, menu de usuário (empresa + papel). |
| **Barra de acessibilidade** | Alto contraste, ajuste de fonte, foco que segue o cursor (baixa visão). |

## Acessibilidade (RNF006)

- Contraste **AA/AAA**; **foco visível** = `outline 3px #FFB300, offset 3px` na navegação por teclado.
- Navegação por teclado completa; alto contraste e ajuste de tamanho de fonte via barra de acessibilidade.
- Alvo formal: **e-MAG / WCAG 2.1 AA** (a confirmar — fecha o UX-DR9).

## Marca

- Logo "**Compra Mais**" + selo "**Prefeitura de Rio Branco**".
- Rodapé legal institucional: *"Lei nº 14.133/2021 · Lei Municipal 2.027 · SMGA / CPL"*.
