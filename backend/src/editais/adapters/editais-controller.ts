import type { FastifyInstance } from 'fastify';
import type { ListarEditaisCompativeis } from '../application/listar-editais-compativeis.js';

/** Controller da vitrine (FR-009). 403 ao acessar edital incompatível por link direto. */
export function registrarRotasEditais(app: FastifyInstance, deps: { vitrine: ListarEditaisCompativeis }): void {
  app.get('/editais', async (req, reply) => {
    const fornecedorId = String((req.headers['x-empresa-id'] ?? ''));
    const lista = await deps.vitrine.listar(fornecedorId);
    return reply.send(lista.map((e) => ({ id: e.id, objeto: e['objeto'] })));
  });

  app.get('/editais/:id', async (req, reply) => {
    const fornecedorId = String((req.headers['x-empresa-id'] ?? ''));
    const { id } = req.params as { id: string };
    try {
      const e = await deps.vitrine.detalhar(fornecedorId, id);
      return reply.send({ id: e.id, subclassesExigidas: e.subclassesExigidas });
    } catch (err) {
      return reply.code(403).send({ codigo: (err as Error).name, mensagem: (err as Error).message });
    }
  });
}
