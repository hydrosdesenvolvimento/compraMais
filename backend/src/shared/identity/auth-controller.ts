import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { RegistrarUsuario, AutenticarLocal, VincularGoogle } from './autenticacao.js';
import type { TrocarSenha, SolicitarResetSenha, RedefinirSenha } from './gerir-senha.js';
import type { TokenService } from './token-service.js';
import type { Identidade } from './identity-provider.js';

// --- Schemas (OpenAPI / @fastify/swagger). `format: email` é documentação (ajv-formats não registrado);
//     a validação forte (senha, e-mail) fica no domínio, preservando os códigos 422 específicos. ---
const ERRO = { type: 'object', properties: { codigo: { type: 'string' }, mensagem: { type: 'string' } } } as const;
const IDENTIDADE = { type: 'object', properties: { userId: { type: 'string' }, papel: { type: 'string' }, empresaId: { type: 'string' } } } as const;
const PAPEIS = ['titular', 'procurador', 'cpl', 'smga', 'leitura'] as const;

/**
 * Controller de autenticação (Adaptadores). Registro/login local com JWT, vínculo Google e /auth/me.
 * O fluxo OAuth do Google (redirect + callback) fica em shared/http/google-oauth.ts.
 */
export function registrarRotasAuth(app: FastifyInstance, deps: {
  registrar: RegistrarUsuario;
  login: AutenticarLocal;
  vincularGoogle: VincularGoogle;
  trocarSenha: TrocarSenha;
  solicitarReset: SolicitarResetSenha;
  redefinirSenha: RedefinirSenha;
  tokens: TokenService;
}): void {
  app.post('/auth/registro', {
    schema: {
      tags: ['autenticacao'],
      summary: 'Registra um usuário local (e-mail + senha)',
      body: {
        type: 'object',
        required: ['email', 'senha', 'nome'],
        properties: {
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', description: 'mínimo 8 caracteres' },
          nome: { type: 'string' },
          papel: { type: 'string', enum: PAPEIS as unknown as string[] },
          fornecedorId: { type: 'string' },
        },
      },
      response: {
        201: { type: 'object', properties: { usuarioId: { type: 'string' } } },
        400: ERRO,
        409: ERRO,
        422: ERRO,
      },
    },
  }, async (req, reply) => {
    try {
      const { email, senha, nome, papel, fornecedorId } = req.body as { email: string; senha: string; nome: string; papel?: Identidade['papel']; fornecedorId?: string };
      const out = await deps.registrar.executar({ email, senha, nome, papel, fornecedorId });
      return reply.code(201).send(out);
    } catch (e) {
      return reply.code(status(e) as 400 | 409 | 422).send(erro(e));
    }
  });

  app.post('/auth/login', {
    schema: {
      tags: ['autenticacao'],
      summary: 'Login local — retorna o JWT',
      body: {
        type: 'object',
        required: ['email', 'senha'],
        properties: { email: { type: 'string', format: 'email' }, senha: { type: 'string' } },
      },
      response: {
        200: { type: 'object', properties: { token: { type: 'string' }, expiraEm: { type: 'number' }, usuario: IDENTIDADE } },
        401: ERRO,
      },
    },
  }, async (req, reply) => {
    try {
      const { email, senha } = req.body as { email: string; senha: string };
      return reply.send(await deps.login.executar({ email, senha }));
    } catch (e) {
      return reply.code(401).send(erro(e));
    }
  });

  app.get('/auth/me', {
    schema: {
      tags: ['autenticacao'],
      summary: 'Identidade do token (rota protegida)',
      security: [{ bearerAuth: [] }],
      response: { 200: IDENTIDADE, 401: ERRO },
    },
  }, async (req, reply) => {
    const id = identidadeDoToken(req, deps.tokens);
    if (!id) return reply.code(401).send({ codigo: 'NAO_AUTENTICADO', mensagem: 'Missing or invalid token.' });
    return reply.send(id);
  });

  app.post('/auth/google/vincular', {
    schema: {
      tags: ['autenticacao'],
      summary: 'Vincula uma conta Google ao usuário autenticado',
      security: [{ bearerAuth: [] }],
      body: { type: 'object', required: ['googleId'], properties: { googleId: { type: 'string' } } },
      response: { 204: { type: 'null' }, 400: ERRO, 401: ERRO, 404: ERRO },
    },
  }, async (req, reply) => {
    const id = identidadeDoToken(req, deps.tokens);
    if (!id) return reply.code(401).send({ codigo: 'NAO_AUTENTICADO', mensagem: 'Missing or invalid token.' });
    const { googleId } = req.body as { googleId: string };
    try {
      await deps.vincularGoogle.executar({ usuarioId: id.userId, googleId });
      return reply.code(204).send();
    } catch (e) {
      return reply.code(status(e) as 400 | 404).send(erro(e));
    }
  });

  // UC015 · A2 — troca da própria senha (autenticado): valida a senha ATUAL antes de definir a nova.
  app.post('/auth/senha', {
    schema: {
      tags: ['autenticacao'],
      summary: 'Troca a própria senha (senha atual + nova senha)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['senhaAtual', 'novaSenha'],
        properties: { senhaAtual: { type: 'string' }, novaSenha: { type: 'string', description: 'mínimo 8 caracteres' } },
      },
      response: { 204: { type: 'null' }, 400: ERRO, 401: ERRO, 422: ERRO },
    },
  }, async (req, reply) => {
    const id = identidadeDoToken(req, deps.tokens);
    if (!id) return reply.code(401).send({ codigo: 'NAO_AUTENTICADO', mensagem: 'Missing or invalid token.' });
    const { senhaAtual, novaSenha } = req.body as { senhaAtual: string; novaSenha: string };
    try {
      await deps.trocarSenha.executar({ usuarioId: id.userId, senhaAtual, novaSenha });
      return reply.code(204).send();
    } catch (e) {
      return reply.code(status(e) as 400 | 422).send(erro(e));
    }
  });

  // UC015 · A1 — "Esqueci a senha": SEMPRE 204 (não revela existência da conta). Emite link se houver conta local.
  app.post('/auth/senha/esqueci', {
    schema: {
      tags: ['autenticacao'],
      summary: 'Solicita redefinição de senha (envia link se houver conta)',
      body: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
      response: { 204: { type: 'null' } },
    },
  }, async (req, reply) => {
    const { email } = req.body as { email: string };
    // Silencioso por design: mesmo em falha interna não vazamos existência de conta pela resposta.
    try { await deps.solicitarReset.executar({ email }); } catch (e) { req.log.error(e); }
    return reply.code(204).send();
  });

  // UC015 · A1 — redefine com o token recebido. Token inválido/expirado → 400 (sem revelar conta).
  app.post('/auth/senha/redefinir', {
    schema: {
      tags: ['autenticacao'],
      summary: 'Redefine a senha usando o token de recuperação',
      body: {
        type: 'object',
        required: ['token', 'novaSenha'],
        properties: { token: { type: 'string' }, novaSenha: { type: 'string', description: 'mínimo 8 caracteres' } },
      },
      response: { 204: { type: 'null' }, 400: ERRO, 422: ERRO },
    },
  }, async (req, reply) => {
    const { token, novaSenha } = req.body as { token: string; novaSenha: string };
    try {
      await deps.redefinirSenha.executar({ token, novaSenha });
      return reply.code(204).send();
    } catch (e) {
      return reply.code(status(e) as 400 | 422).send(erro(e));
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
