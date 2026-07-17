import type { FastifyInstance } from 'fastify';
import type { SolicitarCredenciamento, Actor } from '../application/solicitar-credenciamento.js';
import type { ListarCredenciamentos } from '../application/listar-credenciamentos.js';
import type { Identidade, Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/** Papéis do próprio fornecedor autorizados a operar o credenciamento (dono do vínculo). */
const PERFIS_FORNECEDOR: readonly Papel[] = ['titular', 'procurador'];

/**
 * Controller do credenciamento (UC004). O fornecedor e o ator (rastro AD-30) vêm do JWT (AD-20):
 * a empresa representada é a do token, não mais um `x-empresa-id` escolhido pelo cliente — antes
 * um titular podia credenciar em nome de qualquer empresa só trocando o header.
 * Conclusão por Termo de Aceite (RN016) e cancelamento antes da distribuição (A2).
 */
export function registrarRotasCredenciamento(app: FastifyInstance, deps: { solicitar: SolicitarCredenciamento; listar: ListarCredenciamentos }): void {
  // Leitura: credenciamentos do fornecedor para o portal. Somente "em andamento" por padrão (não
  // cancelados) — recorte da home; resolvido por `:id` como as demais rotas de leitura do fornecedor
  // (documentos). `?incluirCancelados=true` devolve o histórico completo, que a tela "Meus
  // Credenciamentos" precisa para o filtro de cancelados.
  app.get('/fornecedores/:id/credenciamentos', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { incluirCancelados } = req.query as { incluirCancelados?: string };
    return reply.send(await deps.listar.doFornecedor(id, { incluirCancelados: incluirCancelados === 'true' }));
  });

  app.post('/editais/:id/credenciamentos', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id: editalId } = req.params as { id: string };
    const { capacidade } = req.body as { capacidade: number };
    try {
      const out = await deps.solicitar.iniciar(empresaDe(identidade), editalId, capacidade, ator(identidade));
      return reply.code(201).send({ ...out, estado: 'iniciado' });
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.post('/credenciamentos/:id/termo', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id } = req.params as { id: string };
    const { versaoTermo, finalidade } = req.body as { versaoTermo: string; finalidade: string };
    try {
      const out = await deps.solicitar.aceitarTermo(id, { versaoTermo, finalidade }, ator(identidade));
      return reply.send(out);
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.post('/credenciamentos/:id/cancelar', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id } = req.params as { id: string };
    try {
      const out = await deps.solicitar.cancelar(id, ator(identidade));
      return reply.send(out);
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}

/** Empresa representada pelo chamador — sempre a do token (AD-20). */
function empresaDe(id: Identidade): string {
  return id.empresaId ?? '';
}
function ator(id: Identidade): Actor {
  return { userId: id.userId, empresaId: empresaDe(id) };
}
function erro(e: unknown): number {
  const n = (e as Error).name;
  if (n === 'EditalIncompativel' || n === 'EditalNaoAberto') return 403;
  if (n === 'CredenciamentoNaoEncontrado' || n === 'FornecedorNaoEncontrado') return 404;
  if (n === 'TransicaoCredenciamentoInvalida' || n === 'TransicaoStatusInvalida' || n === 'CredenciamentoJaDistribuido' || n === 'CredenciamentoDuplicado') return 409;
  return 422; // CapacidadeInvalida, TermoIncompleto, etc.
}
