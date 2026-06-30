import type { FastifyInstance } from 'fastify';
import type { Covalidar } from '../application/covalidar.js';

const PERFIS_CPL = ['cpl', 'smga'];

/** Controller de covalidação (FR-001/013). RBAC: só CPL/SMGA. */
export function registrarRotasCovalidacao(app: FastifyInstance, deps: { covalidar: Covalidar }): void {
  app.get('/fornecedores/:id/documentos/pendentes', async (req, reply) => {
    const { id } = req.params as { id: string };
    // Busca por instância parcial (QBE — FR-015): status/tipo são o probe; page/size ficam fora dele.
    const { status, tipo, page, size } = req.query as {
      status?: 'pendente' | 'aprovado' | 'reprovado'; tipo?: string; page?: string; size?: string;
    };
    const paginacao = (page || size) ? { page: page ? Number(page) : undefined, size: size ? Number(size) : undefined } : undefined;
    return reply.send(await deps.covalidar.buscarFila(id, { status, tipo }, paginacao));
  });

  app.post('/documentos/:docId/covalidar', async (req, reply) => {
    if (!cpl(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Apenas CPL/SMGA covalidam.' });
    const { docId } = req.params as { docId: string };
    const { resultado, justificativa, empresaId } = req.body as { resultado: 'aprovado' | 'reprovado'; justificativa?: string; empresaId: string };
    try {
      if (resultado === 'aprovado') await deps.covalidar.aprovar(docId, actor(req), empresaId);
      else await deps.covalidar.reprovar(docId, actor(req), empresaId, justificativa ?? '');
      return reply.code(200).send({ ok: true });
    } catch (e) {
      const code = (e as Error).name?.includes('Justificativa') ? 422 : (e as Error).name === 'DocumentoNaoEncontrado' ? 404 : 400;
      return reply.code(code).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}

function actor(req: { headers: Record<string, unknown> }): string { return String(req.headers['x-user-id'] ?? 'anon'); }
function cpl(req: { headers: Record<string, unknown> }): boolean { return PERFIS_CPL.includes(String(req.headers['x-papel'] ?? '')); }
