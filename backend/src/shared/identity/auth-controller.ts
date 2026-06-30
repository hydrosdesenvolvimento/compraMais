import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { RegistrarUsuario, AutenticarLocal, VincularGoogle } from './autenticacao.js';
import type { TokenService } from './token-service.js';
import type { Identidade } from './identity-provider.js';

/**
 * Controller de autenticação (Adaptadores). Registro/login local com JWT, vínculo Google e /auth/me.
 * O fluxo OAuth do Google (redirect + callback) fica em shared/http/google-oauth.ts.
 */
export function registrarRotasAuth(app: FastifyInstance, deps: {
  registrar: RegistrarUsuario;
  login: AutenticarLocal;
  vincularGoogle: VincularGoogle;
  tokens: TokenService;
}): void {
  app.post('/auth/registro', async (req, reply) => {
    try {
      const { email, senha, nome, papel, fornecedorId } = req.body as { email: string; senha: string; nome: string; papel?: Identidade['papel']; fornecedorId?: string };
      const out = await deps.registrar.executar({ email, senha, nome, papel, fornecedorId });
      return reply.code(201).send(out);
    } catch (e) {
      return reply.code(status(e)).send(erro(e));
    }
  });

  app.post('/auth/login', async (req, reply) => {
    try {
      const { email, senha } = req.body as { email: string; senha: string };
      return reply.send(await deps.login.executar({ email, senha }));
    } catch (e) {
      return reply.code(401).send(erro(e));
    }
  });

  app.get('/auth/me', async (req, reply) => {
    const id = identidadeDoToken(req, deps.tokens);
    if (!id) return reply.code(401).send({ codigo: 'NAO_AUTENTICADO', mensagem: 'Token ausente ou inválido.' });
    return reply.send(id);
  });

  app.post('/auth/google/vincular', async (req, reply) => {
    const id = identidadeDoToken(req, deps.tokens);
    if (!id) return reply.code(401).send({ codigo: 'NAO_AUTENTICADO', mensagem: 'Token ausente ou inválido.' });
    const { googleId } = req.body as { googleId: string };
    try {
      await deps.vincularGoogle.executar({ usuarioId: id.userId, googleId });
      return reply.code(204).send();
    } catch (e) {
      return reply.code(status(e)).send(erro(e));
    }
  });
}

/** Extrai e valida a identidade do header Authorization: Bearer <jwt>. */
export function identidadeDoToken(req: FastifyRequest, tokens: TokenService): Identidade | null {
  const auth = String(req.headers['authorization'] ?? '');
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m?.[1]) return null;
  return tokens.verificar(m[1]);
}

function status(e: unknown): number {
  const n = (e as Error)?.name;
  if (n === 'EmailJaCadastrado') return 409;
  if (n === 'EmailInvalido' || n === 'SenhaFraca') return 422;
  if (n === 'UsuarioNaoEncontrado') return 404;
  return 400;
}
function erro(e: unknown): { codigo: string; mensagem: string } {
  return { codigo: (e as Error)?.name ?? 'Erro', mensagem: (e as Error)?.message ?? 'Erro' };
}
