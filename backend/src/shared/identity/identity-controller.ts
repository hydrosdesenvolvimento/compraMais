import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { GerirProcuradores } from './gerir-procuradores.js';

/**
 * Controller de identidade (Adaptadores): procuradores (UC019 / RN010, AD-30).
 * Autenticação (registro/login/JWT/Google) fica em auth-controller.ts + google-oauth.ts.
 * O ator é a identidade do JWT (`req.identidade`), resolvida como a ContaAcesso do titular (mesmo id).
 *
 * Estas rotas não têm guard de papel: quem autoriza é o domínio (`ApenasTitularGere` → 403,
 * `TitularNaoEncontrado` → 404), pois a regra RN010 depende do vínculo com a EMPRESA da URL, não do
 * papel isolado. O que muda na Fase 2 (AD-20) é a origem do ator: era o header `x-user-id`, texto
 * escolhido pelo cliente — bastava saber (ou adivinhar) o id do titular para gerir os procuradores
 * dele. Agora vem do token assinado, e um anônimo cai em `anon`, que não é titular de empresa alguma.
 */
export function registrarRotasIdentidade(app: FastifyInstance, deps: {
  procuradores: GerirProcuradores;
}): void {
  // UC019 passo 1: o titular abre "Procuradores" e vê os vínculos da empresa.
  app.get('/fornecedores/:id/procuradores', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      return reply.send(await deps.procuradores.listar(id, actor(req)));
    } catch (e) {
      return reply.code(mapStatus(e)).send(erro(e));
    }
  });

  // UC019 passo 1–2: o titular convida um procurador (identificação/e-mail) → vínculo + papel `procurador`.
  app.post('/fornecedores/:id/procuradores', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { identificador } = req.body as { identificador: string };
    try {
      const out = await deps.procuradores.convidar(id, actor(req), identificador);
      return reply.code(201).send(out);
    } catch (e) {
      return reply.code(mapStatus(e)).send(erro(e));
    }
  });

  // UC019 A1: o titular remove um procurador (remoção lógica; rastro preservado — RN015).
  app.delete('/fornecedores/:id/procuradores/:contaId', async (req, reply) => {
    const { id, contaId } = req.params as { id: string; contaId: string };
    try {
      await deps.procuradores.remover(id, actor(req), contaId);
      return reply.code(204).send();
    } catch (e) {
      return reply.code(mapStatus(e)).send(erro(e));
    }
  });
}

/** 403 = ator não é o titular (procurador não gere procuradores, RN010); 404 = conta/vínculo inexistente. */
function mapStatus(e: unknown): number {
  const n = (e as Error)?.name;
  if (n === 'ApenasTitularGere' || n === 'ApenasTitularConvida') return 403;
  if (n === 'TitularNaoEncontrado' || n === 'ProcuradorNaoEncontrado') return 404;
  return 400;
}
function erro(e: unknown): { codigo: string; mensagem: string } {
  return { codigo: (e as Error)?.name ?? 'Erro', mensagem: (e as Error)?.message ?? 'Erro' };
}
/** Ator da requisição: o `userId` do token. Anônimo → `anon`, que o domínio rejeita (404). */
function actor(req: FastifyRequest): string {
  return req.identidade?.userId ?? 'anon';
}
