import type { FastifyInstance, FastifyReply } from 'fastify';
import type { GerirItensEdital } from '../application/gerir-itens-edital.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/** Mesmo RBAC da gestão de editais (FR-010 / AD-35): Secretaria/CPL/Administrador gerem os itens. */
const PERFIS_GESTAO: readonly Papel[] = ['smga', 'cpl', 'administrador'];

/**
 * Itens do edital (`/editais/:id/itens`) — cadastro a partir do catálogo de materiais e serviços, sem
 * lotes. Escritas exigem RBAC de gestão; a listagem também (é dado operacional do Painel Admin, não
 * transparência pública — os preços NÃO saem por aqui para o portal público, RN013).
 */
export function registrarRotasItensEdital(app: FastifyInstance, deps: { gerir: GerirItensEdital }): void {
  app.get('/editais/:id/itens', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_GESTAO)) return reply;
    const { id } = req.params as { id: string };
    return reply.send(await deps.gerir.listar(id));
  });

  app.post('/editais/:id/itens', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_GESTAO);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    const body = req.body as { itemCatalogoId: string; unidade: string; quantidade: number; precoTeto: number };
    try {
      const out = await deps.gerir.adicionar(id, body, { userId: ator.userId });
      return reply.code(201).send(out);
    } catch (e) { return falha(reply, e); }
  });

  app.delete('/editais/:id/itens/:itemId', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_GESTAO);
    if (!ator) return reply;
    const { id, itemId } = req.params as { id: string; itemId: string };
    try { await deps.gerir.remover(id, itemId, { userId: ator.userId }); return reply.send({ ok: true }); }
    catch (e) { return falha(reply, e); }
  });
}

/** Mapeia os erros do caso de uso para HTTP. */
function falha(reply: FastifyReply, e: unknown): FastifyReply {
  const n = (e as Error).name;
  if (n === 'EditalNaoEncontrado' || n === 'ItemEditalNaoEncontrado') return reply.code(404).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'EditalNaoEditavel' || n === 'ItemDuplicado') return reply.code(409).send({ codigo: n, mensagem: (e as Error).message });
  // UnidadeIndisponivel, PrecoInvalido, QuantidadeInvalida, ItemCatalogoNaoEncontrado, ItemCatalogoInativo
  return reply.code(422).send({ codigo: n, mensagem: (e as Error).message });
}
