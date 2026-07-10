import type { FastifyInstance } from 'fastify';
import type { ValidarProvaDeVida, Actor } from '../application/validar-prova-de-vida.js';

/** Papéis do próprio fornecedor autorizados a operar a prova de vida (dono do vínculo, AD-30). */
const PERFIS_FORNECEDOR = ['titular', 'procurador'];

/**
 * Controller da prova de vida / liveness (UC007 / RF012). Só é montado quando a feature flag está ligada
 * (`ligado`), condicional a RIPD; desligado, as rotas respondem 409 (ProvaDeVidaDesligada), preservando o
 * fluxo MVP por Termo de Aceite. O fornecedor é resolvido por `x-empresa-id`; `x-user-id` é o ator (AD-30).
 */
export function registrarRotasProvaDeVida(app: FastifyInstance, deps: { validar: ValidarProvaDeVida; ligado: boolean }): void {
  app.post('/credenciamentos/:id/prova-de-vida', async (req, reply) => {
    if (!deps.ligado) return reply.code(409).send({ codigo: 'ProvaDeVidaDesligada', mensagem: 'Liveness is disabled (UC007 feature flag off).' });
    if (!fornecedor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only the supplier (titular/procurador) can submit liveness.' });
    const empresaId = String(req.headers['x-empresa-id'] ?? '');
    const { id } = req.params as { id: string };
    const { desafio } = (req.body ?? {}) as { desafio?: string };
    try {
      const out = await deps.validar.validar(id, empresaId, { fornecedorId: empresaId, desafio: desafio ?? 'aprovar' }, actor(req));
      return reply.send(out);
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.get('/credenciamentos/:id/prova-de-vida', async (req, reply) => {
    if (!deps.ligado) return reply.code(409).send({ codigo: 'ProvaDeVidaDesligada', mensagem: 'Liveness is disabled (UC007 feature flag off).' });
    if (!fornecedor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only the supplier can read liveness status.' });
    const { id } = req.params as { id: string };
    const out = await deps.validar.consultar(id);
    if (!out) return reply.code(404).send({ codigo: 'ProvaDeVidaNaoEncontrada', mensagem: 'No liveness check for this credenciamento.' });
    return reply.send(out);
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
  if (n === 'LimiarInvalido') return 422;
  return 400;
}
