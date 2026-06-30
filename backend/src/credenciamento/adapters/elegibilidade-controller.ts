import type { FastifyInstance } from 'fastify';
import type { VerificarElegibilidade } from '../application/verificar-elegibilidade.js';

const PERFIS_CPL = ['cpl', 'smga'];

/** Controller de elegibilidade (FR-005/006/008). */
export function registrarRotasElegibilidade(app: FastifyInstance, deps: { elegibilidade: VerificarElegibilidade }): void {
  app.post('/fornecedores/:id/verificar-elegibilidade', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { porta, cnpj } = req.body as { porta: 'credenciamento' | 'distribuicao' | 'contrato'; cnpj: string };
    const r = await deps.elegibilidade.verificar(id, cnpj, porta, { userId: actor(req) });
    return reply.send(r);
  });

  app.post('/bloqueios/:id/registrar-termino', async (req, reply) => {
    if (!PERFIS_CPL.includes(String(req.headers['x-papel'] ?? ''))) {
      return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Apenas CPL/SMGA registram término.' });
    }
    const { id } = req.params as { id: string };
    const { dataTermino } = req.body as { dataTermino: string };
    try {
      await deps.elegibilidade.registrarTermino(id, dataTermino, { userId: actor(req) });
      return reply.code(204).send();
    } catch (e) {
      return reply.code(404).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}

function actor(req: { headers: Record<string, unknown> }): string { return String(req.headers['x-user-id'] ?? 'anon'); }
