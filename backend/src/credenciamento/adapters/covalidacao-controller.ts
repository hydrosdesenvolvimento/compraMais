import type { FastifyInstance } from 'fastify';
import type { Covalidar } from '../application/covalidar.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/** Veredito de covalidação é ato de controle: só CPL/SMGA. Demais → 403; anônimo → 401. */
const PERFIS_CPL: readonly Papel[] = ['cpl', 'smga'];

/** Controller de covalidação (FR-001/013). RBAC do veredito por JWT (AD-20). */
export function registrarRotasCovalidacao(app: FastifyInstance, deps: { covalidar: Covalidar }): void {
  app.get('/fornecedores/:id/documentos/pendentes', async (req, reply) => {
    const { id } = req.params as { id: string };
    // Busca por instância parcial (QBE — FR-015): status/tipo são o probe; page/size ficam fora dele.
    const { status, tipo, page, size } = req.query as {
      status?: 'pendente' | 'aprovado' | 'reprovado'; tipo?: string; page?: string; size?: string;
    };
    const paginacao = (page || size) ? { page: page ? Number(page) : undefined, size: size ? Number(size) : undefined } : undefined;
    return reply.send(await deps.covalidar.buscarFila(id, { status, tipo }, paginacao));
  });

  app.post('/documentos/:docId/covalidar', async (req, reply) => {
    const id = exigirPapel(req, reply, PERFIS_CPL);
    if (!id) return reply;
    const { docId } = req.params as { docId: string };
    const { resultado, justificativa, empresaId } = req.body as { resultado: 'aprovado' | 'reprovado'; justificativa?: string; empresaId: string };
    try {
      // O analista é o dono do token (AD-30): o cliente não escolhe mais quem assina o veredito.
      if (resultado === 'aprovado') await deps.covalidar.aprovar(docId, id.userId, empresaId);
      else await deps.covalidar.reprovar(docId, id.userId, empresaId, justificativa ?? '');
      return reply.code(200).send({ ok: true });
    } catch (e) {
      const code = (e as Error).name?.includes('Justificativa') ? 422 : (e as Error).name === 'DocumentoNaoEncontrado' ? 404 : 400;
      return reply.code(code).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}
