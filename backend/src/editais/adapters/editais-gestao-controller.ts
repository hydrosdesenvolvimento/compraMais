import type { FastifyInstance } from 'fastify';
import type { GerirEditais } from '../application/gerir-editais.js';
import type { BuscarEditais } from '../application/buscar-editais.js';
import type { SituacaoEdital } from '../domain/edital.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/**
 * RBAC da gestão de editais (FR-010 / AD-35).
 *
 * ⚠️ Correção (AD-35): a lista anterior era `['secretaria', 'gestor', 'cpl', 'smga']`. `secretaria` e
 * `gestor` NÃO são papéis — são CARGOS (rótulos de `shared/identity/cargos-internos.ts`), e ambos
 * mapeiam para o papel `smga`. Como o RBAC compara papel, aquelas duas entradas nunca casavam com
 * ninguém: eram ruído que só "funcionava" enquanto o papel vinha de um header de texto que o próprio
 * cliente escolhia. `administrador` foi incluído — o Administrador não conseguia gerir editais.
 */
const PERFIS_GESTAO: readonly Papel[] = ['smga', 'cpl', 'administrador'];

/**
 * Gestão de editais (Secretaria/Gestor — FR-001/003/004/005/010/013). RBAC obrigatório.
 * Convive com a vitrine (`GET /editais`, fornecedor): aqui a busca QBE fica em `GET /gestao/editais`
 * para não colidir com a rota da vitrine (reconciliação do achado I1 do analyze).
 */
export function registrarRotasGestaoEditais(app: FastifyInstance, deps: { gerir: GerirEditais; buscar: BuscarEditais }): void {
  app.post('/editais', async (req, reply) => {
    const id = exigirPapel(req, reply, PERFIS_GESTAO);
    if (!id) return reply;
    const body = req.body as { secretariaId: string; objeto: string; cnaesAlvo: string[]; quantitativos: number; prazoVigencia: string };
    try {
      const out = await deps.gerir.criar(body, { userId: id.userId });
      return reply.code(201).send({ ...out, situacao: 'rascunho' });
    } catch (e) {
      return reply.code(422).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.post('/editais/:id/publicar', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_GESTAO);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.publicar(id, { userId: ator.userId }); return reply.send({ situacao: 'publicado' }); }
    catch (e) { return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  app.patch('/editais/:id', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_GESTAO);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.editar(id, req.body as Record<string, unknown>, { userId: ator.userId }); return reply.send({ ok: true }); }
    catch (e) { return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  app.post('/editais/:id/encerrar', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_GESTAO);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.encerrar(id, { userId: ator.userId }); return reply.send({ situacao: 'encerrado' }); }
    catch (e) {
      const code = (e as Error).name === 'ContestacoesPendentes' ? 409 : erro(e);
      return reply.code(code).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  // Busca por instância parcial (QBE — FR-011): probe `secretariaId`/`situacao`/`cnae`; page/size fora do probe.
  app.get('/gestao/editais', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_GESTAO)) return reply;
    const { secretariaId, situacao, cnae, page, size } = req.query as {
      secretariaId?: string; situacao?: SituacaoEdital; cnae?: string; page?: string; size?: string;
    };
    const paginacao = (page || size) ? { page: page ? Number(page) : undefined, size: size ? Number(size) : undefined } : undefined;
    return reply.send(await deps.buscar.buscar({ secretariaId, situacao, cnae }, paginacao));
  });
}

function erro(e: unknown): number {
  const n = (e as Error).name;
  if (n === 'EditalNaoEncontrado') return 404;
  if (n === 'TransicaoInvalida') return 409;
  return 422; // EditalIncompleto, CnaeInvalido, etc.
}
