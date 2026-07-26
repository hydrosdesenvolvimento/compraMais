import type { FastifyInstance, FastifyReply } from 'fastify';
import type { GerirNotificacoes } from '../application/listar-notificacoes.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/** Notificações são a superfície do fornecedor (titular/procurador). Escopadas ao token (AD-20). */
const PERFIS_FORNECEDOR: readonly Papel[] = ['titular', 'procurador'];

/**
 * Rotas das notificações do fornecedor (histórico + leitura). A empresa vem SEMPRE do token
 * (`identidade.empresaId`), nunca de parâmetro — um fornecedor só lê/altera as próprias notificações.
 */
export function registrarRotasNotificacoes(app: FastifyInstance, deps: { gerir: GerirNotificacoes }): void {
  app.get('/notificacoes', async (req, reply) => {
    const id = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!id) return reply;
    const { page, size, incluirOcultas } = req.query as { page?: string; size?: string; incluirOcultas?: string };
    const paginacao = { page: page ? Number(page) : undefined, size: size ? Number(size) : undefined, incluirOcultas: incluirOcultas === 'true' };
    return reply.send(await deps.gerir.listar(String(id.empresaId ?? ''), paginacao));
  });

  app.post('/notificacoes/:id/ler', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.marcarLida(id, String(ator.empresaId ?? '')); return reply.code(204).send(); }
    catch (e) { return falha(reply, e); }
  });

  app.post('/notificacoes/ler-todas', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!ator) return reply;
    return reply.send(await deps.gerir.marcarTodasLidas(String(ator.empresaId ?? '')));
  });

  app.post('/notificacoes/:id/ocultar', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.ocultar(id, String(ator.empresaId ?? '')); return reply.code(204).send(); }
    catch (e) { return falha(reply, e); }
  });

  app.post('/notificacoes/:id/reexibir', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.reexibir(id, String(ator.empresaId ?? '')); return reply.code(204).send(); }
    catch (e) { return falha(reply, e); }
  });
}

function falha(reply: FastifyReply, e: unknown): FastifyReply {
  if ((e as Error).name === 'NotificacaoNaoEncontrada') return reply.code(404).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
  return reply.code(422).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
}
