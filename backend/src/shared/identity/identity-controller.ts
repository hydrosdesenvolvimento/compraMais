import type { FastifyInstance } from 'fastify';
import type { GerirProcuradores } from './gerir-procuradores.js';

/**
 * Controller de identidade (Adaptadores): procuradores (FR-014 / AD-30).
 * Autenticação (registro/login/JWT/Google) fica em auth-controller.ts + google-oauth.ts.
 */
export function registrarRotasIdentidade(app: FastifyInstance, deps: {
  procuradores: GerirProcuradores;
}): void {
  app.post('/fornecedores/:id/procuradores', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { identificador } = req.body as { identificador: string };
    try {
      const out = await deps.procuradores.convidar(id, actor(req), identificador);
      return reply.code(201).send(out);
    } catch (e) {
      return reply.code(403).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.delete('/fornecedores/:id/procuradores/:contaId', async (req, reply) => {
    const { id, contaId } = req.params as { id: string; contaId: string };
    try {
      await deps.procuradores.remover(id, actor(req), contaId);
      return reply.code(204).send();
    } catch (e) {
      return reply.code(403).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}

function actor(req: { headers: Record<string, unknown> }): string {
  return String(req.headers['x-user-id'] ?? 'anon');
}
