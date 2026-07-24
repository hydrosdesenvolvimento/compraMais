import type { FastifyInstance } from 'fastify';
import type { GerirEditais } from '../application/gerir-editais.js';
import type { BuscarEditais } from '../application/buscar-editais.js';
import type { ListarElegiveisEdital } from '../application/listar-elegiveis-edital.js';
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
    const body = req.body as { secretariaId: string; objeto: string; cnaesAlvo: string[]; prazoVigencia: string };
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

  // Edição pela gestão (FR-013): só em rascunho (edital não publicado). O caso de uso aplica a guarda.
  app.patch('/editais/:id', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_GESTAO);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.editarComoRascunho(id, req.body as Record<string, unknown>, { userId: ator.userId }); return reply.send({ ok: true }); }
    catch (e) { return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  // Despublicação (publicado → rascunho): só se não houver credenciamentos associados.
  app.post('/editais/:id/despublicar', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_GESTAO);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.despublicar(id, { userId: ator.userId }); return reply.send({ situacao: 'rascunho' }); }
    catch (e) { return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  app.post('/editais/:id/encerrar', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_GESTAO);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { await deps.gerir.encerrar(id, { userId: ator.userId }); return reply.send({ situacao: 'encerrado' }); }
    catch (e) { return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  // Busca por instância parcial (QBE — FR-011): probe `secretariaId`/`situacao`/`cnae`/`texto`; page/size fora do
  // probe. Resposta paginada `{ items, total, page, size }` — `total` alimenta o pager da tela de gestão.
  app.get('/gestao/editais', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_GESTAO)) return reply;
    const { secretariaId, situacao, cnae, texto, page, size } = req.query as {
      secretariaId?: string; situacao?: SituacaoEdital; cnae?: string; texto?: string; page?: string; size?: string;
    };
    const probe = { secretariaId, situacao, cnae, texto: texto?.trim() || undefined };
    const paginacao = { page: page ? Number(page) : undefined, size: size ? Number(size) : undefined };
    return reply.send(await deps.buscar.buscarPagina(probe, paginacao));
  });
}

/**
 * Tela "Credenciamento em Edital" (Painel Admin · Operação): fornecedores elegíveis de um edital
 * (filtro CNAE RN001 + regularidade RN002 + situação do credenciamento). Registrada à parte porque
 * a projeção cruza módulos (fornecedores/credenciamento/bloqueios) cujos repositórios só existem mais
 * adiante no server; mesmo RBAC de gestão. Só leitura.
 */
export function registrarRotaElegiveisEdital(app: FastifyInstance, deps: { elegiveis: ListarElegiveisEdital }): void {
  app.get('/gestao/editais/:id/elegiveis', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_GESTAO)) return reply;
    const { id } = req.params as { id: string };
    try { return reply.send(await deps.elegiveis.listar(id)); }
    catch (e) { return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });
}

function erro(e: unknown): number {
  const n = (e as Error).name;
  if (n === 'EditalNaoEncontrado') return 404;
  // Conflitos de estado/regra: transição inválida, edital não editável, com credenciamentos, ou contestações pendentes.
  if (n === 'TransicaoInvalida' || n === 'EditalNaoEditavel' || n === 'EditalComCredenciamentos' || n === 'ContestacoesPendentes') return 409;
  return 422; // EditalIncompleto, CnaeInvalido, etc.
}
