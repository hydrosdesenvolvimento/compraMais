import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ListarFornecedores, FiltroFornecedores, OrdemFornecedores } from '../application/listar-fornecedores.js';
import type { CriarFornecedorAdmin } from '../application/criar-fornecedor-admin.js';
import type { GerirConta } from '../application/gerir-conta.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import type { SituacaoCadastral, StatusCredenciamento } from '../domain/fornecedor.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/**
 * Painel Admin · "Gestão de Fornecedores". Rotas `/admin/fornecedores` protegidas por RBAC: a
 * listagem de empresas cadastradas é dado administrativo da OPERAÇÃO (Secretaria/Gestor) — distinta
 * do portal público `/fornecedores/:id`, onde o próprio fornecedor gere a "Minha conta" (UC018).
 *
 * As ações de detalhe/edição de contato/re-sincronização reusam o MESMO caso de uso `GerirConta`
 * (RN009 mantém Receita read-only; RF018 re-sincroniza). A diferença é só o guard: aqui o servidor
 * atua sobre qualquer fornecedor, autenticado pelo papel do JWT (AD-20/AD-35).
 *
 * RBAC estático espelha a matriz PADRÃO de visibilidade (`fornecedores` ∈ smga; `administrador` é
 * superusuário). Não segue overrides configuráveis por papel — coerente com os demais controllers
 * admin (ex.: `/admin/usuarios`). Ampliar a papéis configurados fica para quando houver a demanda.
 */
const PERFIS: readonly Papel[] = ['administrador', 'smga'];

const STATUS: readonly StatusCredenciamento[] = ['requerente', 'pendente_analise', 'credenciado', 'apto', 'em_correcao'];
const SITUACOES: readonly SituacaoCadastral[] = ['ativa', 'baixada', 'inapta', 'suspensa'];
const ORDENS: readonly OrdemFornecedores[] = ['cnpj', 'razaoSocial', 'porte', 'status'];

export function registrarRotasFornecedoresAdmin(
  app: FastifyInstance,
  deps: { listar: ListarFornecedores; criar: CriarFornecedorAdmin; conta: GerirConta },
): void {
  app.get('/admin/fornecedores', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS)) return reply;
    return reply.send(await deps.listar.executar(lerFiltro(req)));
  });

  // Cadastro administrativo (manual): o servidor insere a empresa; sem login/consent (ver caso de uso).
  app.post('/admin/fornecedores', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS);
    if (!ator) return reply;
    const b = req.body as Record<string, unknown>;
    try {
      const out = await deps.criar.executar({
        cnpjRaw: String(b.cnpjRaw ?? b.cnpj ?? ''),
        razaoSocial: String(b.razaoSocial ?? ''),
        porte: String(b.porte ?? ''),
        cnaePrincipal: String(b.cnaePrincipal ?? ''),
        nomeFantasia: b.nomeFantasia != null ? String(b.nomeFantasia) : undefined,
        telefone: b.telefone != null ? String(b.telefone) : undefined,
      }, { userId: ator.userId });
      return reply.code(201).send(out);
    } catch (e) { return falha(reply, e); }
  });

  app.get('/admin/fornecedores/:id', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS)) return reply;
    const { id } = req.params as { id: string };
    try { return reply.send(await deps.conta.obterPerfil(id)); }
    catch (e) { return falha(reply, e); }
  });

  app.patch('/admin/fornecedores/:id/contato', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try {
      await deps.conta.editarPerfil(id, req.body as Record<string, unknown>, { userId: ator.userId });
      return reply.code(204).send();
    } catch (e) { return falha(reply, e); }
  });

  app.post('/admin/fornecedores/:id/sincronizar', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try { return reply.send(await deps.conta.reSincronizar(id, { userId: ator.userId })); }
    catch (e) { return falha(reply, e); }
  });
}

/** Query → filtro tipado. Status/situação inválidos são ignorados (não são erro de borda). */
function lerFiltro(req: FastifyRequest): FiltroFornecedores {
  const q = req.query as Record<string, string | undefined>;
  const status = STATUS.includes(q.status as StatusCredenciamento) ? (q.status as StatusCredenciamento) : undefined;
  const situacao = SITUACOES.includes(q.situacao as SituacaoCadastral) ? (q.situacao as SituacaoCadastral) : undefined;
  const ordenarPor = ORDENS.includes(q.ordenarPor as OrdemFornecedores) ? (q.ordenarPor as OrdemFornecedores) : undefined;
  const direcao = q.direcao === 'desc' ? 'desc' : q.direcao === 'asc' ? 'asc' : undefined;
  const pagina = Number(q.pagina);
  const tamanho = Number(q.tamanho);
  return {
    busca: q.busca,
    status,
    situacao,
    ordenarPor,
    direcao,
    pagina: Number.isFinite(pagina) ? pagina : undefined,
    tamanho: Number.isFinite(tamanho) ? tamanho : undefined,
  };
}

/** Erros do caso de uso/domínio → HTTP. Espelha o mapeamento do controller público de cadastro. */
function falha(reply: FastifyReply, e: unknown): FastifyReply {
  const n = (e as Error).name;
  if (n === 'FornecedorNaoEncontrado') return reply.code(404).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'CnpjJaCadastrado') return reply.code(409).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'CampoNaoEditavel' || n === 'CnpjInvalido' || n === 'DadosFornecedorInvalidos' || n === 'SituacaoNaoApta') {
    return reply.code(422).send({ codigo: n, mensagem: (e as Error).message });
  }
  return reply.code(400).send({ codigo: n, mensagem: (e as Error).message });
}
