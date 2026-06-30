import type { FastifyInstance } from 'fastify';
import type { IdentityProvider } from './identity-provider.js';
import type { GerirProcuradores } from './gerir-procuradores.js';

/** Controller de identidade (Adaptadores): login/reset (FR-006) e procuradores (FR-014). */
export function registrarRotasIdentidade(app: FastifyInstance, deps: {
  idp: IdentityProvider;
  procuradores: GerirProcuradores;
}): void {
  app.post('/auth/login', async (req, reply) => {
    const { identificador, segredo } = req.body as { identificador: string; segredo: string };
    const id = await deps.idp.autenticar(identificador, segredo);
    if (!id) return reply.code(401).send({ codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'Credenciais inválidas' });
    // Sessão real (cookie/JWT) é detalhe de infra; aqui devolvemos a identidade.
    return reply.send({ userId: id.userId, papel: id.papel, empresaId: id.empresaId });
  });

  app.post('/auth/reset', async (req, reply) => {
    const { identificador } = req.body as { identificador: string };
    await deps.idp.solicitarResetSenha(identificador);
    return reply.code(202).send({ mensagem: 'Se a conta existir, enviaremos instruções de reset.' });
  });

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
