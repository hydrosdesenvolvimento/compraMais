import type { FastifyInstance } from 'fastify';
import type { SolicitarCredenciamento, Actor } from '../application/solicitar-credenciamento.js';

/** Papéis do próprio fornecedor autorizados a operar o credenciamento (dono do vínculo). */
const PERFIS_FORNECEDOR = ['titular', 'procurador'];

/**
 * Controller do credenciamento (UC004). O fornecedor é resolvido por `x-empresa-id`; `x-user-id` é o
 * ator (rastro AD-30). Conclusão por Termo de Aceite (RN016) e cancelamento antes da distribuição (A2).
 */
export function registrarRotasCredenciamento(app: FastifyInstance, deps: { solicitar: SolicitarCredenciamento }): void {
  app.post('/editais/:id/credenciamentos', async (req, reply) => {
    if (!fornecedor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only the supplier (titular/procurador) can start a credenciamento.' });
    const empresaId = String(req.headers['x-empresa-id'] ?? '');
    const { id: editalId } = req.params as { id: string };
    const { capacidade } = req.body as { capacidade: number };
    try {
      const out = await deps.solicitar.iniciar(empresaId, editalId, capacidade, actor(req));
      return reply.code(201).send({ ...out, estado: 'iniciado' });
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.post('/credenciamentos/:id/termo', async (req, reply) => {
    if (!fornecedor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only the supplier can accept the term.' });
    const { id } = req.params as { id: string };
    const { versaoTermo, finalidade } = req.body as { versaoTermo: string; finalidade: string };
    try {
      const out = await deps.solicitar.aceitarTermo(id, { versaoTermo, finalidade }, actor(req));
      return reply.send(out);
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.post('/credenciamentos/:id/cancelar', async (req, reply) => {
    if (!fornecedor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only the supplier can cancel.' });
    const { id } = req.params as { id: string };
    try {
      const out = await deps.solicitar.cancelar(id, actor(req));
      return reply.send(out);
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}

function actor(req: { headers: Record<string, unknown> }): Actor {
  return { userId: String(req.headers['x-user-id'] ?? 'anon'), empresaId: String(req.headers['x-empresa-id'] ?? '') };
}
function fornecedor(req: { headers: Record<string, unknown> }): boolean {
  return PERFIS_FORNECEDOR.includes(String(req.headers['x-papel'] ?? ''));
}
function erro(e: unknown): number {
  const n = (e as Error).name;
  if (n === 'EditalIncompativel' || n === 'EditalNaoAberto') return 403;
  if (n === 'CredenciamentoNaoEncontrado' || n === 'FornecedorNaoEncontrado') return 404;
  if (n === 'TransicaoCredenciamentoInvalida' || n === 'TransicaoStatusInvalida' || n === 'CredenciamentoJaDistribuido' || n === 'CredenciamentoDuplicado' || n === 'ProvaDeVidaPendente') return 409;
  return 422; // CapacidadeInvalida, TermoIncompleto, etc.
}
