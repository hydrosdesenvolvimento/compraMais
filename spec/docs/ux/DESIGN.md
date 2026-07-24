---
name: 'Compra Mais — Design System'
type: ux-design-contract
part: DESIGN
scope: 'Identidade visual e tokens de design da Prefeitura de Rio Branco aplicados ao Compra Mais'
status: ratified
created: '2026-06-29'
updated: '2026-07-16'
source: '../../Brandbook/ (Design System Prefeitura de Rio Branco; ratificado por Sales 2026-06-29). Endereço atualizado 2026-07-16 (AD-39) — vinha de spec/AI-UI-Design/'
companions: ['EXPERIENCE.md', '../../Prototipo/portal-fornecedor.html', '../../Prototipo/painel-administrativo.html', '../../Prototipo/index.html']
---

# Compra Mais — Design (Identidade Visual)

> Destilado do brandbook em [`../../Brandbook/`](../../Brandbook/). Ratificado sob responsabilidade do solicitante.
> **Aberto:** a cor azul oficial — **arbitragem 0.7** (o brandbook diz `#0061AE`; bundles e código dizem navy `#14467F`); e LAYOUT A vs B do login (ver EXPERIENCE.md).

## Princípios

1. **Acessível por padrão** — contraste AA/AAA, foco visível, navegação por teclado desde o início.
2. **Clareza institucional** — hierarquia sustentada pelo azul da Prefeitura; linguagem direta.
3. **Consistência** — mesmos tokens e componentes nos dois SPAs (Público e Admin).

## Tokens de Cor

> ## ⚠️ PALETA EM ARBITRAGEM (item 0.7) — 2026-07-16
>
> Este documento **não está desatualizado**: ele destilou corretamente o **brandbook oficial da Prefeitura de
> Rio Branco** ([`../../Brandbook/`](../../Brandbook/)), onde `#0061AE` aparece 52× e `#003A68` 32×.
>
> **A divergência (D1) é real e é do cliente, não da engenharia:**
>
> | Fonte | Paleta |
> |---|---|
> | **Brandbook oficial da Prefeitura** | `#003A68` · `#00497F` · **`#0061AE`** (ação) |
> | **Bundles ratificados** (`../../Prototipo/`, desde 2026-06-29) | `#0A2A52` · `#0E3A6E` · **`#14467F`** (navy) |
> | **Implementação** (`frontend/src/index.css`, PRJ-DEC-10) | `#0A2A52` · `#0E3A6E` · **`#14467F`** (navy) |
>
> Bundles e código **batem entre si** e **divergem do brandbook**. O protótipo navy foi o que o cliente viu e
> validou (Validação 01); o brandbook é a identidade institucional formal.
>
> **A Prefeitura decide.** A régua geral "código implementado permanece" (2026-07-16) **não se aplica aqui** —
> paleta é marca do cliente, não escolha de engenharia. Enquanto 0.7 não for respondida, a escala abaixo
> registra o **brandbook**, e o produto roda em navy.

**Azul institucional — brandbook oficial (primária / ação):**
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
| **Labels & Tags** | Pills raio 999px; status com cor semântica (Ativa/Sucesso = verde, Pendente = âmbar, **Em Análise** = âmbar/info, Bloqueado = erro). Ver regra de uso "Em Análise" vs "Bloqueado" abaixo. |
| **Checkbox de aceite** | Caixa de seleção obrigatória (ex.: **Termo de Responsabilidade**, RF024); estados: desmarcado, marcado, foco visível. Enquanto desmarcado, o CTA de avanço associado ("Prosseguir") permanece **Desabilitado**. |
| **AuthPanel** | Painel dividido: lado institucional (azul-900, logo, slogan, value props, rodapé legal) + lado de autenticação (toggle Entrar/Criar conta, CNPJ + Consultar, link de fallback manual). |
| **Sidebar** | Navegação vertical com ícones (ver IA em EXPERIENCE.md), item ativo em azul-50. |
| **Top bar** | Busca ("Buscar editais, documentos…"), sino de notificações, menu de usuário (empresa + papel). |
| **Barra de acessibilidade** | Alto contraste, ajuste de fonte, foco que segue o cursor (baixa visão). |

### Semântica de status: "Em Análise" vs "Bloqueado" (RN021)

- **Em Análise** (âmbar/info): pendência meramente **documental** — documento em validação, credenciamento em conferência. É um estado transitório e não punitivo.
- **Bloqueado** (erro): reservado exclusivamente à **inadimplência / dívida ativa** (bloqueio fiscal). Não usar "Bloqueado" para pendência documental.
- **Pendente** (âmbar): ação pendente do fornecedor (ex.: reenvio de documento). **Ativa** (verde): empresa regular.

## Acessibilidade (RNF006)

- Contraste **AA/AAA**; **foco visível** = `outline 3px #FFB300, offset 3px` na navegação por teclado.
- Navegação por teclado completa; alto contraste e ajuste de tamanho de fonte via barra de acessibilidade.
- Alvo formal: **e-MAG / WCAG 2.1 AA** (a confirmar — fecha o UX-DR9).

## Marca

- Logo "**Compra Mais**" + selo "**Prefeitura de Rio Branco**".
- Rodapé legal institucional: *"Lei nº 14.133/2021 · Lei Municipal 2.027 · SMGA / CPL"*.

### Landing pública "Compra Mais Rio Branco" (RF010, RN013 — transparência)

- **Título principal:** "**Compra Mais Rio Branco**".
- Usar as **logomarcas oficiais da Prefeitura de Rio Branco** (marca institucional, não placeholders).
- Paleta **azul institucional** (tokens de cor acima).
- **E-mail de contato oficial da comissão:** `comissoes.smga22@gmail.com` (substitui qualquer e-mail genérico anterior).

---

> **Validação 01 (2026-07-05)** — incorpora ajustes de identidade e status validados com o cliente (título "Compra Mais Rio Branco", logomarcas oficiais, e-mail da comissão, status "Em Análise" vs "Bloqueado", checkbox do Termo de Responsabilidade). Ver [../VALIDACAO-CLIENTE-01.md](../VALIDACAO-CLIENTE-01.md).
