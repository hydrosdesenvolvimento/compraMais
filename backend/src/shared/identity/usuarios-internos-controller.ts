import type { FastifyInstance, FastifyReply } from 'fastify';
import type { GerirUsuariosInternos } from './gerir-usuarios-internos.js';
import type { Papel } from './identity-provider.js';
import { exigirPapel } from '../http/autenticacao.js';
import { catalogoDeCargos } from './cargos-internos.js';

/**
 * Apenas o Administrador gere usuários internos (UC021 / RF023). RBAC pelo papel do JWT (AD-20):
 * anônimo → 401, papel errado → 403. Até a Fase 2 bastava enviar `x-papel: administrador`.
 */
const PERFIS_ADMIN: readonly Papel[] = ['administrador'];

/**
 * Controller de gestão de usuários internos (UC021 / RF023, §15/AD-35). Rotas `/admin/usuarios`
 * (CRUD + reset de senha + inativação lógica) e `/admin/cargos` (catálogo cargo→papel para o form).
 * Todas exigem o papel Administrador; a listagem de servidores é dado administrativo (não é referência
 * aberta como os catálogos de UC020).
 */
export function registrarRotasUsuariosInternos(app: FastifyInstance, deps: { gerir: GerirUsuariosInternos }): void {
  // Catálogo de cargos disponíveis (rótulo + papel efetivo) — alimenta o seletor do Painel Admin.
  app.get('/admin/cargos', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_ADMIN)) return reply;
    return reply.send(catalogoDeCargos());
  });

  app.get('/admin/usuarios', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_ADMIN)) return reply;
    const { incluirInativos } = req.query as { incluirInativos?: string };
    return reply.send(await deps.gerir.listar({ incluirInativos: incluirInativos === 'true' }));
  });

  app.post('/admin/usuarios', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_ADMIN);
    if (!ator) return reply;
    const { nome, email, cargo, senha, login, secretaria } = req.body as { nome: string; email: string; cargo: string; senha: string; login?: string | null; secretaria?: string | null };
    try { return reply.code(201).send(await deps.gerir.criar({ nome, email, cargo, senha, login, secretaria }, { userId: ator.userId })); }
    catch (e) { return falha(reply, e); }
  });

  app.patch('/admin/usuarios/:id', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_ADMIN);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    const { nome, cargo, login, secretaria } = req.body as { nome?: string; cargo?: string; login?: string | null; secretaria?: string | null };
    try { await deps.gerir.editar(id, { nome, cargo, login, secretaria }, { userId: ator.userId }); return reply.send({ ok: true }); }
    catch (e) { return falha(reply, e); }
  });

  app.post('/admin/usuarios/:id/resetar-senha', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_ADMIN);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    const { novaSenha } = req.body as { novaSenha: string };
    try { await deps.gerir.resetarSenha(id, novaSenha, { userId: ator.userId }); return reply.send({ ok: true }); }
    catch (e) { return falha(reply, e); }
  });

  app.post('/admin/usuarios/:id/inativar', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_ADMIN);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.inativar(id, { userId: ator.userId }); return reply.send({ situacao: 'inativo' }); }
    catch (e) { return falha(reply, e); }
  });

  app.post('/admin/usuarios/:id/reativar', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_ADMIN);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.reativar(id, { userId: ator.userId }); return reply.send({ situacao: 'ativo' }); }
    catch (e) { return falha(reply, e); }
  });
}

/** Mapeia os erros do caso de uso/domínio para HTTP. */
function falha(reply: FastifyReply, e: unknown): FastifyReply {
  const n = (e as Error).name;
  if (n === 'EmailJaCadastrado' || n === 'LoginJaCadastrado') return reply.code(409).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'NaoPodeInativarPropriaConta') return reply.code(409).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'UsuarioNaoEncontrado' || n === 'NaoEUsuarioInterno') return reply.code(404).send({ codigo: n, mensagem: (e as Error).message });
  // CargoInvalido, EmailInvalido, SenhaFraca, LoginInvalido → 422
  return reply.code(422).send({ codigo: n, mensagem: (e as Error).message });
}
