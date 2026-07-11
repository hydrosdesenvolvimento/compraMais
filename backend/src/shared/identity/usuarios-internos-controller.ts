import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { GerirUsuariosInternos } from './gerir-usuarios-internos.js';
import { catalogoDeCargos } from './cargos-internos.js';

/** Apenas o Administrador gere usuários internos (UC021 / RF023). RBAC por header `x-papel`. */
const PERFIL_ADMIN = 'administrador';

/**
 * Controller de gestão de usuários internos (UC021 / RF023, §15/AD-35). Rotas `/admin/usuarios`
 * (CRUD + reset de senha + inativação lógica) e `/admin/cargos` (catálogo cargo→papel para o form).
 * Todas exigem o papel Administrador; a listagem de servidores é dado administrativo (não é referência
 * aberta como os catálogos de UC020).
 */
export function registrarRotasUsuariosInternos(app: FastifyInstance, deps: { gerir: GerirUsuariosInternos }): void {
  // Catálogo de cargos disponíveis (rótulo + papel efetivo) — alimenta o seletor do Painel Admin.
  app.get('/admin/cargos', async (req, reply) => {
    if (!admin(req)) return proibido(reply);
    return reply.send(catalogoDeCargos());
  });

  app.get('/admin/usuarios', async (req, reply) => {
    if (!admin(req)) return proibido(reply);
    const { incluirInativos } = req.query as { incluirInativos?: string };
    return reply.send(await deps.gerir.listar({ incluirInativos: incluirInativos === 'true' }));
  });

  app.post('/admin/usuarios', async (req, reply) => {
    if (!admin(req)) return proibido(reply);
    const { nome, email, cargo, senha } = req.body as { nome: string; email: string; cargo: string; senha: string };
    try { return reply.code(201).send(await deps.gerir.criar({ nome, email, cargo, senha }, actor(req))); }
    catch (e) { return falha(reply, e); }
  });

  app.patch('/admin/usuarios/:id', async (req, reply) => {
    if (!admin(req)) return proibido(reply);
    const { id } = req.params as { id: string };
    const { nome, cargo } = req.body as { nome?: string; cargo?: string };
    try { await deps.gerir.editar(id, { nome, cargo }, actor(req)); return reply.send({ ok: true }); }
    catch (e) { return falha(reply, e); }
  });

  app.post('/admin/usuarios/:id/resetar-senha', async (req, reply) => {
    if (!admin(req)) return proibido(reply);
    const { id } = req.params as { id: string };
    const { novaSenha } = req.body as { novaSenha: string };
    try { await deps.gerir.resetarSenha(id, novaSenha, actor(req)); return reply.send({ ok: true }); }
    catch (e) { return falha(reply, e); }
  });

  app.post('/admin/usuarios/:id/inativar', async (req, reply) => {
    if (!admin(req)) return proibido(reply);
    const { id } = req.params as { id: string };
    try { await deps.gerir.inativar(id, actor(req)); return reply.send({ situacao: 'inativo' }); }
    catch (e) { return falha(reply, e); }
  });

  app.post('/admin/usuarios/:id/reativar', async (req, reply) => {
    if (!admin(req)) return proibido(reply);
    const { id } = req.params as { id: string };
    try { await deps.gerir.reativar(id, actor(req)); return reply.send({ situacao: 'ativo' }); }
    catch (e) { return falha(reply, e); }
  });
}

function actor(req: FastifyRequest): { userId: string } { return { userId: String(req.headers['x-user-id'] ?? 'anon') }; }
function admin(req: FastifyRequest): boolean { return String(req.headers['x-papel'] ?? '') === PERFIL_ADMIN; }
function proibido(reply: FastifyReply): FastifyReply {
  return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only Administrator can manage internal users.' });
}

/** Mapeia os erros do caso de uso/domínio para HTTP. */
function falha(reply: FastifyReply, e: unknown): FastifyReply {
  const n = (e as Error).name;
  if (n === 'EmailJaCadastrado') return reply.code(409).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'NaoPodeInativarPropriaConta') return reply.code(409).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'UsuarioNaoEncontrado' || n === 'NaoEUsuarioInterno') return reply.code(404).send({ codigo: n, mensagem: (e as Error).message });
  // CargoInvalido, EmailInvalido, SenhaFraca → 422
  return reply.code(422).send({ codigo: n, mensagem: (e as Error).message });
}
