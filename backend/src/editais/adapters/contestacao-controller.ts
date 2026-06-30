import type { FastifyInstance } from 'fastify';
import type { ContestarCnae, ResolverContestacao, ContestacaoRepository } from '../application/contestar-cnae.js';

const PERFIS_RESOLVE = ['secretaria', 'gestor', 'cpl', 'smga'];

/** Contestação de CNAE (US2). Abertura = fornecedor; resolução = Secretaria/CPL (FR-007/008/009). */
export function registrarRotasContestacao(app: FastifyInstance, deps: {
  contestar: ContestarCnae; resolver: ResolverContestacao; contestacoes: ContestacaoRepository;
}): void {
  app.post('/editais/:id/contestacoes-cnae', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { cnaeContestado, justificativa } = req.body as { cnaeContestado: string; justificativa: string };
    const fornecedorId = String(req.headers['x-empresa-id'] ?? req.headers['x-user-id'] ?? '');
    try {
      const out = await deps.contestar.abrir(id, fornecedorId, cnaeContestado, justificativa);
      return reply.code(201).send({ ...out, situacao: 'pendente' });
    } catch (e) {
      const n = (e as Error).name;
      const code = n === 'FornecedorNaoLegitimo' ? 403 : n === 'EditalNaoEncontrado' ? 404 : 422;
      return reply.code(code).send({ codigo: n, mensagem: (e as Error).message });
    }
  });

  app.get('/editais/:id/contestacoes-cnae', async (req, reply) => {
    const { id } = req.params as { id: string };
    const lista = await deps.contestacoes.doEdital(id);
    return reply.send(lista.map((c) => ({ id: c.id, cnae: c.cnaeContestado, justificativa: c.justificativa, situacao: c.situacao, motivoResolucao: c.motivoResolucao })));
  });

  app.post('/contestacoes-cnae/:id/acatar', async (req, reply) => {
    if (!resolve(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Apenas Secretaria/CPL resolve contestações.' });
    const { id } = req.params as { id: string };
    const { novoCnaes } = req.body as { novoCnaes: string[] };
    try { await deps.resolver.acatar(id, novoCnaes, { userId: actor(req) }); return reply.send({ situacao: 'acatada' }); }
    catch (e) { return reply.code(codigoResolucao(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  app.post('/contestacoes-cnae/:id/recusar', async (req, reply) => {
    if (!resolve(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Apenas Secretaria/CPL resolve contestações.' });
    const { id } = req.params as { id: string };
    const { motivo } = req.body as { motivo: string };
    try { await deps.resolver.recusar(id, motivo ?? '', { userId: actor(req) }); return reply.send({ situacao: 'recusada' }); }
    catch (e) { return reply.code(codigoResolucao(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });
}

function actor(req: { headers: Record<string, unknown> }): string { return String(req.headers['x-user-id'] ?? 'anon'); }
function resolve(req: { headers: Record<string, unknown> }): boolean { return PERFIS_RESOLVE.includes(String(req.headers['x-papel'] ?? '')); }
function codigoResolucao(e: unknown): number {
  const n = (e as Error).name;
  if (n === 'ContestacaoNaoEncontrada') return 404;
  if (n === 'MotivoRecusaObrigatorio') return 422;
  return 409; // já resolvida etc.
}
