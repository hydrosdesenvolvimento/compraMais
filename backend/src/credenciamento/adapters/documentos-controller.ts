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

  // FR-007/008 — Visualizar/Baixar: recupera o arquivo decifrado (o front recebe `conteudo` em
  // base64 e monta o data URL para preview/download). 404 se o documento ou o blob não existem.
  app.get('/documentos/:docId/conteudo', async (req, reply) => {
    const { docId } = req.params as { docId: string };
    const out = await deps.docs.baixar(docId);
    if (!out) return reply.code(404).send({ codigo: 'DocumentoNaoEncontrado', mensagem: 'Document not found' });
    return reply.send(out);
  });
}
