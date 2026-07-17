import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Identidade, Papel } from '../identity/identity-provider.js';
import type { TokenService } from '../identity/token-service.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Identidade do chamador, resolvida do Bearer token (AD-20). `null` = anônimo. */
    identidade: Identidade | null;
  }
}

/**
 * Autenticação HTTP transversal (AD-20). Resolve a identidade do chamador a partir do
 * `Authorization: Bearer <jwt>` e a publica em `req.identidade` — a ÚNICA origem de identidade e
 * papel do backend.
 *
 * Antes desta camada cada controller lia `x-papel`/`x-user-id`, headers de texto escolhidos pelo
 * cliente: qualquer chamador se declarava administrador. Os headers agora são ignorados; quem
 * autoriza é o token assinado.
 *
 * O hook não rejeita por conta própria: rota pública com token inválido segue anônima (o login não
 * pode quebrar porque o navegador guardou um token expirado). Quem exige credencial é o guard da
 * rota (`exigirAutenticado`/`exigirPapel`), e para ele token inválido e token ausente são a mesma
 * coisa — ambos resultam em `identidade = null` → 401. Um token inválido nunca "cai" para o header.
 */
export function registrarAutenticacao(app: FastifyInstance, tokens: TokenService): void {
  app.decorateRequest('identidade', null);
  app.addHook('onRequest', async (req) => {
    req.identidade = identidadeDoBearer(req, tokens);
  });
}

/** Extrai e valida a identidade do header `Authorization: Bearer <jwt>`. */
export function identidadeDoBearer(req: FastifyRequest, tokens: TokenService): Identidade | null {
  const auth = String(req.headers['authorization'] ?? '');
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m?.[1]) return null;
  return tokens.verificar(m[1]);
}

/**
 * Guard de autenticação: exige identidade verificada. Responde 401 e devolve `null` quando o
 * chamador é anônimo — o handler deve retornar imediatamente.
 */
export function exigirAutenticado(req: FastifyRequest, reply: FastifyReply): Identidade | null {
  const id = req.identidade;
  if (!id) {
    void reply.code(401).send({ codigo: 'NaoAutenticado', mensagem: 'Authentication required.' });
    return null;
  }
  return id;
}

/**
 * Guard de RBAC (AD-35): exige identidade verificada E papel na lista. 401 quando anônimo (a
 * identidade é desconhecida), 403 quando conhecida e sem permissão — a distinção importa: 403 a um
 * anônimo revelaria que a rota existe e que basta trocar de papel.
 */
export function exigirPapel(
  req: FastifyRequest,
  reply: FastifyReply,
  papeis: readonly Papel[],
): Identidade | null {
  const id = exigirAutenticado(req, reply);
  if (!id) return null;
  if (!papeis.includes(id.papel)) {
    void reply.code(403).send({ codigo: 'RBAC', mensagem: 'Role not allowed for this operation.' });
    return null;
  }
  return id;
}
