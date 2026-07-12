import type { FastifyInstance } from 'fastify';
import type { ListarEditaisCompativeis } from '../application/listar-editais-compativeis.js';

/** Controller da vitrine (FR-009). 403 ao acessar edital incompatível por link direto. */
export function registrarRotasEditais(app: FastifyInstance, deps: { vitrine: ListarEditaisCompativeis }): void {
  app.get('/editais', async (req, reply) => {
    const fornecedorId = String((req.headers['x-empresa-id'] ?? ''));
    const lista = await deps.vitrine.listar(fornecedorId);
    // Projeção da vitrine (FR-009): além de id/objeto, expõe a secretaria demandante e o prazo de
    // vigência para o portal do fornecedor (home) montar o painel de editais com prazo e origem, sem
    // um segundo round-trip. `secretariaId` é resolvido para sigla no front (catálogo de secretarias).
    return reply.send(lista.map((e) => ({
      id: e.id, objeto: e.objeto, secretariaId: e.secretariaId,
      prazoVigencia: e.prazoVigencia, quantitativos: e.quantitativos,
    })));
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
