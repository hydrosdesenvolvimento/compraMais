import type { FastifyInstance } from 'fastify';
import type { ExecutarDistribuicao, DistribuicaoRepository } from '../application/executar-distribuicao.js';
import type { ListarDemandasFornecedor } from '../application/listar-demandas-fornecedor.js';
import type { ResumoDistribuicaoEdital } from '../application/resumir-distribuicao-edital.js';
import type { ListarCadastroReserva } from '../application/listar-cadastro-reserva.js';
import type { Identidade, Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/** Gestão dispara e consulta a distribuição (mesma lista de editais — FR-010/AD-35). */
const PERFIS_GESTAO: readonly Papel[] = ['smga', 'cpl', 'administrador'];
/** O próprio fornecedor consulta suas demandas distribuídas (dono do vínculo). */
const PERFIS_FORNECEDOR: readonly Papel[] = ['titular', 'procurador'];

/** A empresa vem do token (AD-20); sem `empresaId`, o próprio usuário é o fornecedor (autocadastro). */
function empresaDe(id: Identidade): string { return String(id.empresaId ?? id.userId); }

/**
 * Controller do Motor de Distribuição (Épico 5 / UC008). A gestão executa a distribuição de um edital
 * distribuível e consulta a matriz vigente; o fornecedor consulta as demandas que lhe foram
 * distribuídas ("Demandas distribuídas"), com o rateio e o Cadastro de Reserva. RBAC (AD-20/AD-35).
 */
export function registrarRotasDistribuicao(
  app: FastifyInstance,
  deps: { executar: ExecutarDistribuicao; repo: DistribuicaoRepository; demandas: ListarDemandasFornecedor; resumo: ResumoDistribuicaoEdital; reserva: ListarCadastroReserva },
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

  // Painel Admin · "Distribuição Inteligente": cabeçalho + totais + rateio enriquecido (nome +
  // capacidade + cota). Mostra a matriz homologada se já existir, senão o preview do Motor (RN005).
  app.get('/gestao/editais/:id/distribuicao', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_GESTAO)) return reply;
    const { id } = req.params as { id: string };
    try {
      return reply.send(await deps.resumo.resumir(id));
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  // Painel Admin · "Cadastro de Reserva": fila cronológica global dos retardatários (aptos fora da
  // matriz vigente), sem alterar as cotas já distribuídas (UC009 / RN004). Somente leitura.
  app.get('/gestao/cadastro-reserva', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_GESTAO)) return reply;
    return reply.send(await deps.reserva.listar());
  });

  app.get('/distribuicao/minhas', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!ator) return reply;
    const demandas = await deps.demandas.listar(empresaDe(ator));
    return reply.send(demandas);
  });
}

function erro(e: unknown): number {
  const n = (e as Error).name;
  if (n === 'EditalNaoEncontrado') return 404;
  if (n === 'EditalNaoDistribuivel') return 409; // guarda de estado
  return 422; // SemAptos, DemandaInvalida, CapacidadeInvalida, AptosDuplicados
}
