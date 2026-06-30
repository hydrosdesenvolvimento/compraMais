# Data model — 008 Autenticação

## Usuario (agregado de autenticação)

Entidade rica (estende `EntidadeBase` — AD-33). É a identidade que autentica e emite o JWT. Distinta de
`ContaAcesso` (vínculo fornecedor ↔ titular/procurador): um `Usuario` com papel `titular`/`procurador`
referencia `fornecedorId`; usuários administrativos (`cpl`/`smga`/`leitura`) têm `fornecedorId` nulo.

- `id` (uuid, PK)
- `email` (text, único — normalizado trim+lowercase)
- `senhaHash` (text \| nulo) — scrypt(senha, salt); nulo = só login social
- `salt` (text \| nulo)
- `googleId` (text, único \| nulo) — `sub` do Google (OIDC)
- `nome` (text)
- `papel` (`titular | procurador | cpl | smga | leitura`)
- `fornecedorId` (uuid \| nulo) — empresa representada
- `registerDate`, `updateDate`, `lastUserUpdate` (auditoria de linha — AD-33)

**Invariantes / regras**
- E-mail válido (regex) e único; senha ≥ 8 caracteres.
- `verificarSenha` em tempo constante (`timingSafeEqual`); lança se não houver credencial local.
- `vincularGoogle` idempotente para o mesmo `googleId`; outro `googleId` lança `GoogleJaVinculado`.
- A senha **nunca** sai do agregado em texto (só `senhaHash`+`salt` no `estado()`).

**Estados de credencial**
- *Local apenas*: `senhaHash != null`, `googleId == null`.
- *Local + Google*: ambos preenchidos (vinculado).
- *Google apenas*: `senhaHash == null`, `googleId != null` (auto-provisionado).

## Persistência — tabela `usuarios`

Migração [`backend/migrations/0002_init_auth.sql`](../../backend/migrations/0002_init_auth.sql)
(forward-only — AD-28). Colunas snake_case; `email` e `google_id` com UNIQUE; índices
`idx_usuarios_email` e `idx_usuarios_google_id`. O backend aplica o schema idempotente no startup
(`src/shared/db/schema-auth.ts`).

## Eventos de domínio (AD-23)

| Evento | Payload | Quando |
|---|---|---|
| `UsuarioRegistrado` | `{ email, papel, metodo: local\|google }` | criação de usuário |
| `UsuarioAutenticado` | `{ metodo: local\|google }` | login bem-sucedido |
| `GoogleVinculado` | `{ googleId }` | vínculo de conta Google |

## Token (JWT)

Não é persistido (stateless). Claims: `sub=userId`, `papel`, `empresaId?`, `iss=compramais`, `exp`.
Assinatura HS256 com segredo de ambiente/secret.
