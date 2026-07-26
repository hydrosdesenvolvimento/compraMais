import type { FastifyInstance, FastifyReply } from 'fastify';
import type { GerirItensEdital } from '../application/gerir-itens-edital.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/** Mesmo RBAC da gestão de editais (FR-010 / AD-35): Secretaria/CPL/Administrador gerem os itens. */
const PERFIS_GESTAO: readonly Papel[] = ['smga', 'cpl', 'administrador'];
/** Fornecedor: pode LER os itens (sem o preço-teto interno, RN013) para declarar capacidade por item. */
const PERFIS_FORNECEDOR: readonly Papel[] = ['titular', 'procurador'];

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

  // Itens visíveis ao FORNECEDOR para o passo de capacidade do credenciamento (RN005). Sem o `precoTeto`
  // (uso interno da administração, RN013) — só o necessário para declarar quanto atende de cada item.
  app.get('/editais/:id/itens/para-credenciamento', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_FORNECEDOR)) return reply;
    const { id } = req.params as { id: string };
    const [itens, exigeProvaDeVida] = await Promise.all([deps.gerir.listar(id), deps.gerir.exigeProvaDeVida(id)]);
    // Envelope: além dos itens (capacidade), a POLÍTICA do edital para o wizard exibir/pular a prova de vida (UC007).
    return reply.send({
      exigeProvaDeVida,
      itens: itens.map((it) => ({ itemId: it.id, numero: it.numero, nome: it.nome, descricao: it.descricao, unidade: it.unidade, quantidade: it.quantidade })),
    });
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
