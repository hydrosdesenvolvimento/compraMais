# Arquivo — Linhagem Spec-Kit (congelada em 2026-06-29)

> **Não é fonte de verdade.** Estas oito features estilo Spec-Kit (`spec.md` / `plan.md` / `tasks.md` /
> `data-model.md` / `research.md` / `quickstart.md`) foram a **segunda linhagem** de documentação do
> Compra Mais. Na **convergência de 2026-07-02** o projeto elegeu a linhagem **BMad** (`spec/docs/`) como
> fonte de verdade única e **arquivou esta aqui** após resgatar suas decisões finas.

## Por que foi arquivada

- **Numeração colidente:** usava `FR-001…` **locais por feature** que colidiam com a numeração global `RF001…`
  (ex.: `FR-014` local = Procurador; `RF014` global = Auditoria). A convergência **aboliu a numeração local**
  (ver [regra em CONVERGENCIA.md](../../docs/CONVERGENCIA.md#regra-de-numeração)).
- **Âncoras defasadas:** citava "31 ADs" e "Constituição v2.0.0/v3.3.0" — versões anteriores à espinha atual
  (36 ADs).
- **Metamodelo duplicado:** manter BMad + Spec-Kit sincronizados à mão era imposto por commit.

## O que foi preservado (resgatado para o BMad)

As **13 decisões finas** aqui resolvidas (Clarifications, requisitos e regras que não existiam no BMad) foram
migradas para os artefatos canônicos — PRD (RF019, RN010–RN013, §15 RBAC, §16 parâmetros), espinha
(AD-34/35/36) e épicos (seção "Refinamentos de Aceite"). Rastreabilidade item-a-item em
[CONVERGENCIA.md](../../docs/CONVERGENCIA.md).

## Valor residual

Os `tasks.md`, `data-model.md` e `research.md` seguem úteis como **referência histórica de implementação**
(decomposição granular, modelagem, pesquisa). Consulte-os como apoio, **não** como requisito vigente — o
requisito vigente é o `spec/docs/`.

| Feature arquivada | Tema | Decisões resgatadas |
|---|---|---|
| `001-onboarding-fornecedor-cnae` | Onboarding + CNAE | CNAE 7-dígitos; Procurador convidado pelo titular; endereço estruturado (RF019) |
| `002-covalidacao-elegibilidade` | Covalidação + elegibilidade | data de penalidade híbrida; covalidação sem SLA; QBE |
| `003-editais-individualizados` | Editais | edital publicado editável com auditoria; contestação por qualquer fornecedor ativo |
| `004-auditoria-consulta-exportacao` | Auditoria | sem mascaramento (RBAC); papel `auditor`; export streaming/50k |
| `005-malote-sei` | Malote SEI | fila durável+retry; peça única isolada; `SEI_MALOTE_LIMITE_MB` global |
| `006-contestacao-direitos-lgpd` | Direitos LGPD | retenção por categoria; papel `dpo` atende (CPL não) |
| `007-paineis-transparencia` | Transparência | projeções sob demanda; só agregados não-identificáveis |
| `008-autenticacao` | Autenticação | detalhe técnico de auth (referenciado por AD-20) |
