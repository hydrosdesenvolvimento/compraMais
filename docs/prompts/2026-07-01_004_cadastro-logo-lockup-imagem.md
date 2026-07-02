# Prompt Log — Logotipo real no painel de /cadastro

- **Data:** 2026-07-01
- **Agente de entrada:** UX Expert
- **Skill acionada:** prompt-logger (registro obrigatório do pacote)

## Prompt do solicitante (verbatim)

> @ux-expert o layou de /cadastro ainda diverge de spec/AI-UI-Design/Compra Mais - Portal do Fornecedor .html, o logo tipo no template esta em frontend/src/design-system/image/logoCompraMais.png

## Interpretação

O painel institucional (esquerdo) da tela `/cadastro` ainda diverge do mockup: a implementação
monta um **lockup sintético** (`IconePredio` + textos "Compra Mais"/"RIO BRANCO"/subtítulo/tagline),
enquanto o mockup usa a **imagem real do logotipo** (`logoCompraMais.png`) — uma única imagem
centralizada (largura ~560px) sobre fundo branco limpo, sem arte desenhada no painel esquerdo.

## Ground-truth do mockup (decodificado de linha 190 do HTML)

- Split: **esquerda branca** (`#fff`, `flex:1`, centralizado) com `<img>` do lockup (`max-width:560px;width:100%;height:auto`) e SVG apenas com `<defs>` (sem shapes visíveis); **direita navy** (`linear-gradient(157deg,#0A2A52→#0E3A6E→#14467F)`) com o cartão branco de acesso.
- Alt do logo: "Compra Mais — Rio Branco · Sistema Digital de Compras Públicas · Transparência, Confiança, Eficiência, Parceria".

## Plano de ação

1. `AuthLayout.tsx`: importar `image/logoCompraMais.png` e substituir o lockup textual pela imagem
   centralizada; remover a arte SVG do painel esquerdo (fiel ao mockup, que o mantém limpo).
2. `index.css`: adicionar `.auth-logo`; remover regras mortas `.auth-lockup-*`.
3. Validar `tsc`/`eslint`/`vitest`/`vite build`; preservar `data-cy` e a lógica do `AuthPanel`.

## Sanitização

Nenhum segredo, credencial, token ou PII presente no prompt ou nos artefatos. Sem necessidade de
mascaramento.
