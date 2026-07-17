import type { FastifyInstance } from 'fastify';
import type { ListarEditaisCompativeis } from '../application/listar-editais-compativeis.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/** A vitrine é a superfície do fornecedor (FR-009): quem representa a empresa é titular ou procurador. */
const PERFIS_FORNECEDOR: readonly Papel[] = ['titular', 'procurador'];

/**
 * Controller da vitrine (FR-009). 403 ao acessar edital incompatível por link direto.
 *
 * A empresa vem do token (`identidade.empresaId`), não mais do header `x-empresa-id` (AD-20): o
 * header deixava qualquer chamador enxergar a vitrine de qualquer CNPJ — bastava digitar o id.
 */
export function registrarRotasEditais(app: FastifyInstance, deps: { vitrine: ListarEditaisCompativeis }): void {
  app.get('/editais', async (req, reply) => {
    const id = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!id) return reply;
    const lista = await deps.vitrine.listar(String(id.empresaId ?? ''));
    // Projeção da vitrine (FR-009): além de id/objeto, expõe a secretaria demandante e o prazo de
    // vigência para o portal do fornecedor (home) montar o painel de editais com prazo e origem, sem
    // um segundo round-trip. `secretariaId` é resolvido para sigla no front (catálogo de secretarias).
    return reply.send(lista.map((e) => ({
      id: e.id, objeto: e.objeto, secretariaId: e.secretariaId,
      prazoVigencia: e.prazoVigencia, quantitativos: e.quantitativos,
    })));
  });

  app.get('/editais/:id', async (req, reply) => {
    const ator = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!ator) return reply;
    const { id } = req.params as { id: string };
    try {
      const e = await deps.vitrine.detalhar(String(ator.empresaId ?? ''), id);
      return reply.send({ id: e.id, subclassesExigidas: e.subclassesExigidas });
    } catch (err) {
      return reply.code(403).send({ codigo: (err as Error).name, mensagem: (err as Error).message });
    }
  });
}
