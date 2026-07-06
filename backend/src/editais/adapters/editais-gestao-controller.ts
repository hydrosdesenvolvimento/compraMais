import type { FastifyInstance } from 'fastify';
import type { GerirEditais } from '../application/gerir-editais.js';
import type { BuscarEditais } from '../application/buscar-editais.js';
import type { SituacaoEdital } from '../domain/edital.js';

const PERFIS_GESTAO = ['secretaria', 'gestor', 'cpl', 'smga'];

/**
 * Gestão de editais (Secretaria/Gestor — FR-001/003/004/005/010/013). RBAC obrigatório.
 * Convive com a vitrine (`GET /editais`, fornecedor): aqui a busca QBE fica em `GET /gestao/editais`
 * para não colidir com a rota da vitrine (reconciliação do achado I1 do analyze).
 */
export function registrarRotasGestaoEditais(app: FastifyInstance, deps: { gerir: GerirEditais; buscar: BuscarEditais }): void {
  app.post('/editais', async (req, reply) => {
    if (!gestor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only Department/Manager can create editais.' });
    const body = req.body as { secretariaId: string; objeto: string; cnaesAlvo: string[]; quantitativos: number; prazoVigencia: string };
    try {
      const out = await deps.gerir.criar(body, actor(req));
      return reply.code(201).send({ ...out, situacao: 'rascunho' });
    } catch (e) {
      return reply.code(422).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.post('/editais/:id/publicar', async (req, reply) => {
    if (!gestor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only Department/Manager can publish.' });
    const { id } = req.params as { id: string };
    try { await deps.gerir.publicar(id, actor(req)); return reply.send({ situacao: 'publicado' }); }
    catch (e) { return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  app.patch('/editais/:id', async (req, reply) => {
    if (!gestor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only Department/Manager can edit.' });
    const { id } = req.params as { id: string };
    try { await deps.gerir.editar(id, req.body as Record<string, unknown>, actor(req)); return reply.send({ ok: true }); }
    catch (e) { return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  app.post('/editais/:id/encerrar', async (req, reply) => {
    if (!gestor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only Department/Manager can close.' });
    const { id } = req.params as { id: string };
    try { await deps.gerir.encerrar(id, actor(req)); return reply.send({ situacao: 'encerrado' }); }
    catch (e) {
      const code = (e as Error).name === 'ContestacoesPendentes' ? 409 : erro(e);
      return reply.code(code).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  // Busca por instância parcial (QBE — FR-011): probe `secretariaId`/`situacao`/`cnae`; page/size fora do probe.
  app.get('/gestao/editais', async (req, reply) => {
    if (!gestor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only Department/Manager/CPL can access management.' });
    const { secretariaId, situacao, cnae, page, size } = req.query as {
      secretariaId?: string; situacao?: SituacaoEdital; cnae?: string; page?: string; size?: string;
    };
    const paginacao = (page || size) ? { page: page ? Number(page) : undefined, size: size ? Number(size) : undefined } : undefined;
    return reply.send(await deps.buscar.buscar({ secretariaId, situacao, cnae }, paginacao));
  });
}

function actor(req: { headers: Record<string, unknown> }): { userId: string } { return { userId: String(req.headers['x-user-id'] ?? 'anon') }; }
function gestor(req: { headers: Record<string, unknown> }): boolean { return PERFIS_GESTAO.includes(String(req.headers['x-papel'] ?? '')); }
function erro(e: unknown): number {
  const n = (e as Error).name;
  if (n === 'EditalNaoEncontrado') return 404;
  if (n === 'TransicaoInvalida') return 409;
  return 422; // EditalIncompleto, CnaeInvalido, etc.
}
