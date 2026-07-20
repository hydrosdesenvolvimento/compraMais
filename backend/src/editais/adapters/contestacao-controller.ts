import type { FastifyInstance } from 'fastify';
import type { ContestarCnae, ResolverContestacao, ContestacaoRepository } from '../application/contestar-cnae.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/**
 * RBAC da resolução (FR-008/009 / AD-35). ⚠️ A lista anterior era `['secretaria', 'gestor', 'cpl',
 * 'smga']`: `secretaria` e `gestor` são CARGOS (`shared/identity/cargos-internos.ts`), não papéis —
 * ambos mapeiam para `smga`. `administrador` incluído por simetria com a gestão de editais.
 */
const PERFIS_RESOLVE: readonly Papel[] = ['smga', 'cpl', 'administrador'];

/** Quem contesta é a empresa, pela voz do titular ou do procurador (FR-007). */
const PERFIS_FORNECEDOR: readonly Papel[] = ['titular', 'procurador'];

/** Contestação de CNAE (US2). Abertura = fornecedor; resolução = Secretaria/CPL (FR-007/008/009). */
export function registrarRotasContestacao(app: FastifyInstance, deps: {
  contestar: ContestarCnae; resolver: ResolverContestacao; contestacoes: ContestacaoRepository;
}): void {
  app.post('/editais/:id/contestacoes-cnae', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    const { cnaeContestado, justificativa } = req.body as { cnaeContestado: string; justificativa: string };
    // A empresa vem do token (AD-20). Sem `empresaId` no token, o próprio usuário é o fornecedor
    // (autocadastro), como no header `x-empresa-id ?? x-user-id` que isto substitui.
    const fornecedorId = String(ator.empresaId ?? ator.userId);
    try {
      const out = await deps.contestar.abrir(id, fornecedorId, cnaeContestado, justificativa);
      return reply.code(201).send({ ...out, situacao: 'pendente' });
    } catch (e) {
      const n = (e as Error).name;
      const code = n === 'FornecedorNaoLegitimo' ? 403 : n === 'EditalNaoEncontrado' ? 404 : 422;
      return reply.code(code).send({ codigo: n, mensagem: (e as Error).message });
    }
  });

  app.get('/editais/:id/contestacoes-cnae', async (req, reply) => {
    const { id } = req.params as { id: string };
    const lista = await deps.contestacoes.doEdital(id);
    return reply.send(lista.map((c) => ({ id: c.id, cnae: c.cnaeContestado, justificativa: c.justificativa, situacao: c.situacao, motivoResolucao: c.motivoResolucao })));
  });

  app.post('/contestacoes-cnae/:id/acatar', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_RESOLVE);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    const { novoCnaes } = req.body as { novoCnaes: string[] };
    try { await deps.resolver.acatar(id, novoCnaes, { userId: ator.userId }); return reply.send({ situacao: 'acatada' }); }
    catch (e) { return reply.code(codigoResolucao(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  app.post('/contestacoes-cnae/:id/recusar', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_RESOLVE);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    const { motivo } = req.body as { motivo: string };
    try { await deps.resolver.recusar(id, motivo ?? '', { userId: ator.userId }); return reply.send({ situacao: 'recusada' }); }
    catch (e) { return reply.code(codigoResolucao(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });
}

function codigoResolucao(e: unknown): number {
  const n = (e as Error).name;
  if (n === 'ContestacaoNaoEncontrada') return 404;
  if (n === 'MotivoRecusaObrigatorio') return 422;
  return 409; // já resolvida etc.
}
