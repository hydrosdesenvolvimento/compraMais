# Backend — Convenção de Camadas (Clean Architecture)

Monólito modular (um deployable), Node.js 24 + Fastify, **sem NestJS**. Cada módulo de domínio
(`catalogo`, `credenciamento`, `editais`, `distribuicao`, `malote`, `auditoria`, `transparencia`)
segue **Clean Architecture** (Constituição v3.1.0, Princípio IV / AD-32):

```
<modulo>/
  domain/        # Entidades = CLASSES TypeScript ricas (invariantes + comportamento). SEM I/O.
  application/   # Casos de uso. Orquestram o domínio. SEM framework/banco.
  adapters/      # Controllers (Fastify), repositórios, gateways (ACL). Traduzem para fora.
  infra/         # Detalhe: Fastify, pg, S3, env. Plugável.
```

**Regra de dependência (absoluta):** as setas apontam para dentro.
`infra → adapters → application → domain`. O `domain` e o `application` **não importam** nada de
`adapters`/`infra` nem de framework. O framework HTTP (Fastify) é detalhe de `infra` — por isso a
troca de NestJS por Fastify não toca o núcleo.

**Cruzamento entre módulos:** apenas por evento de domínio (`shared/events`), nunca escrita direta
na tabela de outro módulo (AD-2/AD-17).

**Auditoria:** escritor único; outros módulos só emitem eventos (AD-18).
