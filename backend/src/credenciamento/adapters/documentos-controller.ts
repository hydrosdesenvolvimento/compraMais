import type { FastifyInstance } from 'fastify';
import type { GerirDocumentos } from '../application/gerir-documentos.js';

/** Controller de documentos (FR-007/008). */
export function registrarRotasDocumentos(app: FastifyInstance, deps: { docs: GerirDocumentos }): void {
  app.post('/fornecedores/:id/documentos', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { tipo: string; formato: string; conteudo: string; dataValidade?: string };
    try {
      const out = await deps.docs.enviar({ fornecedorId: id, ...body });
      return reply.code(201).send({ ...out, situacao: 'vigente' });
    } catch (e) {
      return reply.code(422).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.get('/fornecedores/:id/documentos', async (req, reply) => {
    const { id } = req.params as { id: string };
    return reply.send(await deps.docs.listar(id));
  });
}
