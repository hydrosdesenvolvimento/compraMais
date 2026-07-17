import type { FastifyInstance } from 'fastify';
import type { ExecutarDistribuicao, DistribuicaoRepository } from '../application/executar-distribuicao.js';
import type { Identidade, Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/** Gestão dispara e consulta a distribuição (mesma lista de editais — FR-010/AD-35). */
const PERFIS_GESTAO: readonly Papel[] = ['smga', 'cpl', 'administrador'];
/** O próprio fornecedor consulta suas cotas (dono do vínculo). */
const PERFIS_FORNECEDOR: readonly Papel[] = ['titular', 'procurador'];

/** A empresa vem do token (AD-20); sem `empresaId`, o próprio usuário é o fornecedor (autocadastro). */
function empresaDe(id: Identidade): string { return String(id.empresaId ?? id.userId); }

/** Fonte de leitura mínima do edital para exibir o número/objeto na tela "Demandas distribuídas". */
export interface EditalResumoLookup {
  porId(id: string): Promise<{ numero: string; objeto: string } | null>;
}

/**
 * Controller do Motor de Distribuição (Épico 5). A gestão executa a distribuição de um edital que
 * está `em_distribuicao` (guarda AD-37) e consulta a matriz vigente; o fornecedor consulta as cotas
 * que recebeu ("Demandas distribuídas"). RBAC obrigatório (AD-20/AD-35).
 */
export function registrarRotasDistribuicao(
  app: FastifyInstance,
  deps: { executar: ExecutarDistribuicao; repo: DistribuicaoRepository; editais: EditalResumoLookup },
): void {
  app.post('/editais/:id/distribuir', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_GESTAO);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try {
      const registro = await deps.executar.executar(id, { userId: ator.userId });
      return reply.code(201).send(registro);
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.get('/editais/:id/distribuicao', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_GESTAO)) return reply;
    const { id } = req.params as { id: string };
    const matriz = await deps.repo.ultimaDoEdital(id);
    if (!matriz) return reply.code(404).send({ codigo: 'SemDistribuicao', mensagem: 'No distribution has been run for this tender.' });
    return reply.send(matriz);
  });

  app.get('/distribuicao/minhas', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!ator) return reply;
    const cotas = await deps.repo.cotasDoFornecedor(empresaDe(ator));
    // Enriquece com número/objeto do edital (o editalId cru é UUID); cai para null se o edital sumiu.
    const enriquecidas = await Promise.all(cotas.map(async (c) => {
      const e = await deps.editais.porId(c.editalId);
      return { ...c, numeroEdital: e?.numero ?? null, objeto: e?.objeto ?? null };
    }));
    return reply.send(enriquecidas);
  });
}

function erro(e: unknown): number {
  const n = (e as Error).name;
  if (n === 'EditalNaoEncontrado') return 404;
  if (n === 'EditalNaoDistribuivel') return 409; // guarda de estado AD-37
  return 422; // SemAptos, DemandaInvalida, CapacidadeInvalida, AptosDuplicados
}
