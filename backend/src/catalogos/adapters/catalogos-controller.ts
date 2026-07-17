import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ManterCatalogos } from '../application/manter-catalogos.js';
import type { ItemCatalogo, CatalogoStateBase } from '../domain/item-catalogo.js';
import type { FiltroListagem } from '../application/catalogo-repository.js';
import type { Identidade, Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

type Actor = { userId: string; empresaId?: string };

/**
 * Contrato mínimo consumido pelas rotas (erase dos genéricos do CrudCatalogo). Métodos são checados de
 * forma bivariante em TS, então cada `CrudCatalogo<T, TCriar, TEditar>` concreto satisfaz esta interface.
 */
interface CrudLike {
  criar(input: unknown, actor: Actor): Promise<{ id: string }>;
  editar(id: string, campos: unknown, actor: Actor): Promise<void>;
  inativar(id: string, actor: Actor): Promise<void>;
  reativar(id: string, actor: Actor): Promise<void>;
  listar(filtro?: FiltroListagem): Promise<ItemCatalogo[]>;
}

/**
 * Apenas o Administrador mantém catálogos (UC020). A leitura é aberta (dado de referência):
 * anônimo → 401 nas escritas, papel errado → 403; o GET não passa por guard algum, de propósito.
 */
const PERFIS_ESCRITA: readonly Papel[] = ['administrador'];

/**
 * Controller dos catálogos base (UC020 / RF020-RF022). Um único conjunto de rotas parametrizado por
 * `:catalogo` (`secretarias` | `setores-cnae` | `tipos-documento`) despacha para o CrudCatalogo dono.
 * Escritas exigem RBAC Administrador; a listagem é leitura de referência (consumida por editais/upload).
 */
export function registrarRotasCatalogos(app: FastifyInstance, deps: { manter: ManterCatalogos }): void {
  const catalogos: Record<string, CrudLike> = {
    secretarias: deps.manter.secretarias,
    'setores-cnae': deps.manter.setores,
    'tipos-documento': deps.manter.tiposDocumento,
  };

  function resolver(req: FastifyRequest, reply: FastifyReply): CrudLike | null {
    const { catalogo } = req.params as { catalogo: string };
    const crud = catalogos[catalogo];
    if (!crud) { reply.code(404).send({ codigo: 'CatalogoDesconhecido', mensagem: `Unknown catalog '${catalogo}'.` }); return null; }
    return crud;
  }

  app.get('/catalogos/:catalogo', async (req, reply) => {
    const crud = resolver(req, reply); if (!crud) return;
    const { incluirInativos } = req.query as { incluirInativos?: string };
    const itens = await crud.listar({ incluirInativos: incluirInativos === 'true' });
    return reply.send(itens.map(serializar));
  });

  app.post('/catalogos/:catalogo', async (req, reply) => {
    const quem = exigirPapel(req, reply, PERFIS_ESCRITA); if (!quem) return reply;
    const crud = resolver(req, reply); if (!crud) return;
    try { return reply.code(201).send(await crud.criar(req.body, actor(quem))); }
    catch (e) { return falha(reply, e); }
  });

  app.patch('/catalogos/:catalogo/:id', async (req, reply) => {
    const quem = exigirPapel(req, reply, PERFIS_ESCRITA); if (!quem) return reply;
    const crud = resolver(req, reply); if (!crud) return;
    const { id } = req.params as { id: string };
    try { await crud.editar(id, req.body, actor(quem)); return reply.send({ ok: true }); }
    catch (e) { return falha(reply, e); }
  });

  app.post('/catalogos/:catalogo/:id/inativar', async (req, reply) => {
    const quem = exigirPapel(req, reply, PERFIS_ESCRITA); if (!quem) return reply;
    const crud = resolver(req, reply); if (!crud) return;
    const { id } = req.params as { id: string };
    try { await crud.inativar(id, actor(quem)); return reply.send({ situacao: 'inativo' }); }
    catch (e) { return falha(reply, e); }
  });

  app.post('/catalogos/:catalogo/:id/reativar', async (req, reply) => {
    const quem = exigirPapel(req, reply, PERFIS_ESCRITA); if (!quem) return reply;
    const crud = resolver(req, reply); if (!crud) return;
    const { id } = req.params as { id: string };
    try { await crud.reativar(id, actor(quem)); return reply.send({ situacao: 'ativo' }); }
    catch (e) { return falha(reply, e); }
  });
}

/** Achata o snapshot (meta + campos) numa view de leitura estável. */
function serializar(item: ItemCatalogo): Record<string, unknown> {
  const s = item.estado() as CatalogoStateBase & Record<string, unknown>;
  const { meta, ...campos } = s;
  return {
    id: meta.id, ...campos, ativo: item.ativo,
    registerDate: meta.registerDate, updateDate: meta.updateDate, lastUserUpdate: meta.lastUserUpdate,
  };
}

/** Ator da trilha: vem do token verificado (AD-20), nunca de `x-user-id`. */
function actor(quem: Identidade): Actor { return { userId: quem.userId, empresaId: quem.empresaId }; }

/** Mapeia os erros do caso de uso/adaptador para HTTP. */
function falha(reply: FastifyReply, e: unknown): FastifyReply {
  const n = (e as Error).name;
  if (n === 'ItemCatalogoNaoEncontrado') return reply.code(404).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'ChaveDuplicada' || n === 'ChavePgDuplicada') return reply.code(409).send({ codigo: 'ChaveDuplicada', mensagem: (e as Error).message });
  // CampoObrigatorio, CnaeInvalido, CategoriaInvalida → 422
  return reply.code(422).send({ codigo: n, mensagem: (e as Error).message });
}
