import type { FastifyInstance } from 'fastify';
import type { VerificarElegibilidade } from '../application/verificar-elegibilidade.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/** Registrar término de bloqueio é ato de controle: só CPL/SMGA. Demais → 403; anônimo → 401. */
const PERFIS_CPL: readonly Papel[] = ['cpl', 'smga'];

/** Controller de elegibilidade (FR-005/006/008). RBAC por JWT (AD-20). */
export function registrarRotasElegibilidade(app: FastifyInstance, deps: { elegibilidade: VerificarElegibilidade }): void {
  app.post('/fornecedores/:id/verificar-elegibilidade', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { porta, cnpj } = req.body as { porta: 'credenciamento' | 'distribuicao' | 'contrato'; cnpj: string };
    const r = await deps.elegibilidade.verificar(id, cnpj, porta, { userId: ator(req) });
    return reply.send(r);
  });

  app.post('/bloqueios/:id/registrar-termino', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_CPL);
    if (!identidade) return reply;
    const { id } = req.params as { id: string };
    const { dataTermino } = req.body as { dataTermino: string };
    try {
      await deps.elegibilidade.registrarTermino(id, dataTermino, { userId: identidade.userId });
      return reply.code(204).send();
    } catch (e) {
      return reply.code(404).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}

/** Ator do rastro (AD-30). Rota sem guard: chamador anônimo é registrado como `anon`, nunca forjado por header. */
function ator(req: { identidade: { userId: string } | null }): string {
  return req.identidade?.userId ?? 'anon';
}
