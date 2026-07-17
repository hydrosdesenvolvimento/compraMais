# Prefeitura de Rio Branco — Design System

The visual language of the municipal portal of **Prefeitura de Rio Branco** (Rio Branco City Hall), capital of the State of Acre, Brazil. Built for **clarity of institutional communication** and **universal access** to every citizen.

> **Conformidade:** WCAG 2.1 nível AA, buscando AAA em texto institucional.

---

## Sources

This design system was reconstructed from materials provided by the user:

- **Source DC**: `Sistema de Design - Prefeitura de Rio Branco.dc.html` — a complete design-system documentation page (colors, type, spacing, components, a working accessibility toolbar). This was the primary source of truth for all tokens and components.
- **Content/architecture brief** (Portuguese): functional requirements for the portal — accessibility toggles, navigation architecture, and the component library (quick-access service cards, news listing, video gallery, secretariat directory).

No official brand guideline (exact hex codes, logo files, or trademarked marks) was provided. Colors, type, and spacing below are **derived from the source DC** and are internally consistent; the **RB monogram logo is a placeholder** pending official assets. See **Caveats** at the bottom.

---

## Brand at a glance

- **Who**: Municipal government portal for citizens of Rio Branco, AC.
- **Address**: R. Rui Barbosa, 285 — Centro, Rio Branco — AC · CEP 69900-120.
- **Pillars (global nav)**: A Prefeitura · Publicações · Portais · Sistemas Administrativos.
- **Core jobs**: emit IPTU, access Portal da Transparência, read the Diário Oficial, issue Nota Fiscal Eletrônica, find a secretariat, read news, use the Ouvidoria.
- **Defining trait**: accessibility is the *base*, not an add-on. Every component must survive high-contrast, grayscale, hide-images, pause-animations, text-resize, highlight-links, focus-ring, and reading-mask modes without breaking layout.

---

## CONTENT FUNDAMENTALS

**Language**: Brazilian Portuguese (pt-BR). All UI copy, labels, and content are in Portuguese.

**Voice**: Institutional, direct, and service-first. The portal speaks *as the city to the citizen* — never chatty, never marketing-y. It addresses the citizen with the implied formal "você" but mostly uses **imperative service verbs** rather than pronouns: "Emita a 2ª via", "Consulte parcelas", "Acesse o serviço", "Baixe o PDF". The focus is the task, not the institution talking about itself.

**Tone**: Clear, calm, official, helpful. Plain language ("linguagem direta, sem ruído") so the service comes first. No jargon where a plain word exists.

**Casing**:
- Headings & titles: **sentence case** with proper nouns capitalized — "Serviços ao cidadão", "Secretarias Municipais", "Transparência e gestão".
- Eyebrows / kickers / labels: **UPPERCASE** with wide tracking (0.14em) — "FUNDAMENTOS", "COMPONENTES", "TRANSPARÊNCIA", "ACESSIBILIDADE".
- Acronyms/siglas always uppercase and often emphasized — SEME, SEFIN, SDTI, IPTU, NFS-e.

**Dates & time** (pt-BR conventions):
- Date long form: "Publicado em 12 de junho de 2026".
- Time uses "às": "às 12:04".
- Credits format: "Autor/Veículo" — e.g. "Luana Lima/Secom".

**Numbers**: Brazilian formatting — decimal comma, period thousands. Ratios written "4,5:1". Decree numbers "Decreto nº 1.234/2026".

**Emoji**: **Never.** This is a government portal — no emoji anywhere. Status and meaning are carried by text + icon + color together, never color alone.

**Examples of real copy** (from source):
- Hero: "A linguagem visual única do portal municipal: cores, tipografia e componentes pensados para clareza institucional e acesso universal ao cidadão."
- Service card: "Emita a 2ª via, consulte parcelas e acompanhe o pagamento do seu imóvel."
- Meta: "Atualizado em 12 de junho de 2026."
- Footer rights: "© 2025 Prefeitura de Rio Branco. Todos os direitos reservados."

---

## VISUAL FOUNDATIONS

**Color vibe**: Sober, civic, trustworthy. **Institutional blue is the entire identity** — it dominates headers, footer, hero, primary actions, and headings. The palette runs from near-navy `#0A2A52` down to a pale tint `#EEF4FC`. **Amber `#F2B705`** is the single accent — high-visibility CTAs, the focus ring, the logo monogram, link highlighting — and is used *sparingly*. **Green is functional only** (success status), never brand. The page sits on a cool off-white `#F6F8FB`.

**Typography**: Two families, clear roles. **Libre Franklin** (700/800) for all titles — firm, civic, slightly condensed feel with tight negative tracking on large sizes (-0.022em on display). **IBM Plex Sans** (400/500/600/700) for body and interface — high legibility, neutral, governmental. Body line-height is generous (1.6). Eyebrow labels are 12px, 700, uppercase, 0.14em tracking.

**Spacing**: Base-4 scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). Generous section gaps (~80px between doc sections), 40px page gutters. Comfortable container 1320px; compact 1080px.

**Backgrounds**: Solid colors, no busy textures. The one allowed gradient is the **hero / header / footer institutional blue gradient** (`linear-gradient(160deg,#0A2A52,#14467F,#1E5AA0)`). Otherwise surfaces are flat: white cards on the cool-grey page, or pale blue tint (`#EEF4FC`) for icon chips and quiet surfaces. No photographic full-bleed by default; news/video components reserve explicit image slots.

**Cards**: White surface, 1px `#E2E7EE` border, radius 14px (between `--radius-lg` 12 and `--radius-xl` 16), with a soft blue-tinted shadow (`0 2px 8px rgba(10,42,82,0.06)`). Quiet cards use radius 12 and the lighter `--shadow-xs`. Icon chips inside cards are 46px rounded squares (radius 11) filled with `#EEF4FC` and a blue glyph.

**Borders & dividers**: Hairline 1px. `#E2E7EE` for card borders, `#F1F4F8` for internal dividers. Secondary buttons use a 1.5px blue border.

**Corner radii**: Buttons 7–10px (size-dependent), cards 12–16px, chips/badges fully pill (999px), icon chips ~11px.

**Shadows**: Always low, soft, and blue-tinted (`rgba(10,42,82,…)`) — never neutral-grey or heavy. Four steps: xs/sm/md/lg. No inner shadows. No glow except the amber link-highlight box-shadow in accessibility mode.

**Hover states**: Primary button darkens (`#14467F` → `#0E3A6E`). Secondary/tertiary fill with the pale tint `#EEF4FC`. Amber accent darkens to `#D99425`. Links may underline. No scale-up on hover.

**Press / active**: Brand color deepens one more step toward `--azul-900`. No bounce.

**Focus**: Highly visible by design — 3px **amber** outline, 3px offset. This is a deliberate accessibility signature (amber on blue/white is high-contrast and unmistakable).

**Transparency & blur**: Used only on the dark institutional-blue surfaces — white at 6–20% opacity for toolbar buttons, dividers (`rgba(255,255,255,0.10)`), and badges. The reading-mask overlay is `rgba(8,18,40,0.55)`. No frosted-glass/backdrop-blur in the base system.

**Animation**: Restrained. Smooth scroll, simple hover color transitions, gentle fades. **No bounces, no parallax, no infinite loops.** Everything must be suppressible via "Pausar animações" — so motion is never load-bearing.

**Layout rules**: Sticky institutional-blue header at top. Sticky left rail for in-page nav on docs. Content max-width capped (1320/1080). Fixed reading-mask and toolbar live above content (z-index 50–80).

---

## ICONOGRAPHY

- **System**: **Lucide** (https://lucide.dev) — clean 24×24 line icons, ~1.7–1.8px stroke, round caps and joins, `fill="none"`, `stroke="currentColor"`. The source DC hand-embeds Lucide-style outline SVGs (e.g. the building/home glyph on the IPTU card, the download arrow on the decree row), so Lucide is the canonical match. Lucide is MIT-licensed and CDN-available.
- **Usage**: Icons inherit text color via `currentColor`. Inside cards they sit in a 46px pale-blue (`#EEF4FC`) rounded-square chip with a blue (`#14467F`) glyph. Inline action icons (download, arrow) are 16px and match the button label color.
- **Stroke weight**: 1.7px for decorative/feature glyphs, 1.8px for small inline action icons. Round line caps + joins throughout.
- **No emoji, no icon font, no filled/duotone icons** in the base system — outline only.
- **Unicode**: the right-arrow "→" is used inline in link CTAs ("Acessar serviço →"). The minus glyph "−" (U+2212) is used in the A− toolbar control.
- See `assets/icons/` for the copied SVG set and `guidelines/` cards.

---

## Index / manifest

**Root**
- `styles.css` — global entry; `@import`s every token + font file. Consumers link this.
- `readme.md` — this file.
- `SKILL.md` — Agent-Skill wrapper for use in Claude Code.

**Tokens** (`tokens/`)
- `fonts.css` — webfont imports (Libre Franklin, IBM Plex Sans).
- `colors.css` — palette + semantic aliases.
- `typography.css` — families, weights, type scale.
- `spacing.css` — base-4 scale + layout widths.
- `effects.css` — radii + blue-tinted shadows + focus ring.
- `accessibility.css` — the data-attribute hooks powering the accessibility toolbar.

**Components** (`components/`)
- `core/` — Button, IconButton, Badge, Tag, StatusPill.
- `cards/` — ServiceCard, SecretariaCard, NewsCard, VideoCard, PublicationRow.
- `navigation/` — Header (global nav + dropdowns + a11y bar), Footer, AccessibilityBar.

**UI kits** (`ui_kits/`)
- `portal/` — the citizen-facing municipal portal: homepage, news listing, secretariat directory.

**Guidelines** (`guidelines/`)
- Foundation specimen cards for the Design System tab (Type, Colors, Spacing, Brand, Iconography).

**Assets** (`assets/`)
- `logos/` — RB monogram (placeholder), wordmark lockup.
- `icons/` — Lucide SVG set (36 icons) used across the system.

**Guidelines** (`guidelines/`) — 12 Design System tab cards
- Colors: `colors-azul`, `colors-ambar`, `colors-neutros`, `colors-status`.
- Type: `type-display`, `type-body`.
- Spacing: `spacing-scale`, `spacing-radius`, `spacing-shadows`.
- Brand: `brand-logo`, `brand-iconography`, `brand-voice`.

> The bundle (`_ds_bundle.js`) and manifest are generated automatically by the compiler — component/portal cards render once it's built.

---

## Caveats

- **No official brand assets were provided.** The RB monogram logo is a **placeholder** built from the brand colors. Replace with the official Prefeitura de Rio Branco brasão/logo when available.
- **Fonts are an interpretation.** No official typeface was specified; Libre Franklin + IBM Plex Sans come from the source DC. Both are genuine Google Fonts (no substitution needed) but may not match the real portal.
- **Exact hex codes are derived**, not officially confirmed.
