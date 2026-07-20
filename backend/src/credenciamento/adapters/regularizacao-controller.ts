import type { FastifyInstance } from 'fastify';
import type { DocumentoRepository } from '../application/gerir-documentos.js';
import type { BloqueioRepository, VerificarElegibilidade } from '../application/verificar-elegibilidade.js';

/** Contestação/regularização do fornecedor (US3 / FR-010/011/012). Ponto único de pendências. */
export function registrarRotasRegularizacao(app: FastifyInstance, deps: {
  docs: DocumentoRepository;
  bloqueios: BloqueioRepository;
  elegibilidade: VerificarElegibilidade;
}): void {
  // FR-012 — pendências num só lugar (documentos reprovados + bloqueios ativos)
  app.get('/fornecedores/:id/pendencias', async (req, reply) => {
    const { id } = req.params as { id: string };
    const docs = (await deps.docs.listar(id)).filter((d) => d.status === 'reprovado')
      .map((d) => ({ tipo: 'documento', documentoId: d.id, motivo: d.motivoReprovacao, proximoPasso: 'Reenviar documento' }));
    const blocs = (await deps.bloqueios.ativosDe(id))
      .map((b) => ({ tipo: 'bloqueio', bloqueioId: b.id, motivo: b.motivo, proximoPasso: 'Regularizar e reconsultar' }));
    return reply.send([...docs, ...blocs]);
  });

  // FR-010 — reenviar documento reprovado → volta a pendente
  app.post('/documentos/:docId/reenviar', async (req, reply) => {
    const { docId } = req.params as { docId: string };
    const doc = await deps.docs.porId(docId);
    if (!doc) return reply.code(404).send({ codigo: 'DocumentoNaoEncontrado', mensagem: 'Document not found' });
    try {
      doc.reenviar(ator(req));
      await deps.docs.salvar(doc);
      return reply.code(201).send({ status: 'pendente' });
    } catch (e) {
      return reply.code(409).send({ codigo: 'Estado', mensagem: (e as Error).message });
    }
  });

  // FR-011 — reconsultar elegibilidade após regularizar
  app.post('/fornecedores/:id/reconsultar', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { cnpj } = req.body as { cnpj: string };
    const r = await deps.elegibilidade.verificar(id, cnpj, 'credenciamento', { userId: ator(req) });
    return reply.send(r);
  });
}

/** Ator do rastro (AD-30). Rotas sem guard: chamador anônimo é registrado como `anon`, nunca forjado por header. */
function ator(req: { identidade: { userId: string } | null }): string {
  return req.identidade?.userId ?? 'anon';
}
