import type { FastifyInstance } from 'fastify';
import type { GerirDireitosTitular, SolicitacaoProbe } from '../application/gerir-direitos.js';
import type { ConsolidarPendencias } from '../application/consolidar-pendencias.js';
import type { TipoDireito, StatusSolicitacao } from '../domain/solicitacao-titular.js';

// FR-009 / clarify Q2: atendimento restrito ao Encarregado (dpo) + Administrador (fallback). CPL fora.
const PERFIS_DPO = ['administrador', 'dpo'];

/**
 * Direitos do titular (LGPD) + tela única consolidada (Épico 7).
 * §V: direito que exige o PRÓPRIO titular NÃO é exercível por procurador → bloqueado na abertura.
 */
export function registrarRotasTitular(app: FastifyInstance, deps: { direitos: GerirDireitosTitular; pendencias: ConsolidarPendencias }): void {
  // Solicitar direito (acesso/correção/exclusão) — somente o próprio titular (não procurador) — FR-002/003/004/005
  app.post('/titular/solicitacoes', async (req, reply) => {
    if (papel(req) === 'procurador') return reply.code(403).send({ codigo: 'LGPDTitular', mensagem: 'This right requires the data subject themselves; an attorney cannot exercise it (§V).' });
    const { tipo, detalhe, categoria } = req.body as { tipo: TipoDireito; detalhe?: string; categoria?: 'cadastral' | 'fiscal' | 'contratual' };
    const out = await deps.direitos.solicitar(actor(req), tipo, detalhe, categoria);
    return reply.code(201).send({ ...out, status: 'pendente' });
  });

  // Consulta QBE de solicitações — DPO/Admin (ou o próprio titular)
  app.get('/titular/solicitacoes', async (req, reply) => {
    const { titularId, tipo, status } = req.query as { titularId?: string; tipo?: TipoDireito; status?: StatusSolicitacao };
    if (!dpo(req) && titularId !== actor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Access restricted.' });
    const probe: SolicitacaoProbe = { titularId: dpo(req) ? titularId : actor(req), tipo, status };
    const r = await deps.direitos.consultar(probe);
    return reply.send(r.map((s) => ({ id: s.id, titularId: s.titularId, tipo: s.tipo, detalhe: s.detalhe, categoria: s.categoria, status: s.status, resultado: s.resultado })));
  });

  app.post('/titular/solicitacoes/:id/atender', async (req, reply) => {
    if (!dpo(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only DPO/Administrator can fulfill.' });
    const { id } = req.params as { id: string };
    const { resultado } = req.body as { resultado: string };
    try { await deps.direitos.atender(id, resultado ?? 'atendida', { userId: actor(req) }); return reply.send({ status: 'atendida' }); }
    catch (e) { return reply.code((e as Error).name === 'SolicitacaoNaoEncontrada' ? 404 : 409).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  // Recusar com justificativa (fluxo passo 2 — "atende OU recusa"). Motivo obrigatório (RN003).
  app.post('/titular/solicitacoes/:id/recusar', async (req, reply) => {
    if (!dpo(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only DPO/Administrator can reject.' });
    const { id } = req.params as { id: string };
    const { motivo } = req.body as { motivo: string };
    try { await deps.direitos.recusar(id, motivo, { userId: actor(req) }); return reply.send({ status: 'recusada' }); }
    catch (e) {
      const n = (e as Error).name;
      const code = n === 'SolicitacaoNaoEncontrada' ? 404 : n === 'MotivoRecusaObrigatorio' ? 400 : 409;
      return reply.code(code).send({ codigo: n, mensagem: (e as Error).message });
    }
  });

  app.post('/titular/solicitacoes/:id/descartar', async (req, reply) => {
    if (!dpo(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only DPO/Administrator can dispose.' });
    const { id } = req.params as { id: string };
    const { dataRegistro } = req.body as { dataRegistro: string };
    try { const r = await deps.direitos.avaliarDescarte(id, dataRegistro, { userId: actor(req) }); return reply.send(r); }
    catch (e) {
      const n = (e as Error).name;
      const code = n === 'DescarteRetido' ? 409 : n === 'SolicitacaoNaoEncontrada' ? 404 : 400;
      return reply.code(code).send({ codigo: n, mensagem: (e as Error).message }); // 409 = retido pela política (FR-008)
    }
  });

  // Tela única consolidada (FR-001) — o próprio titular ou DPO/Admin
  app.get('/fornecedores/:id/pendencias-consolidadas', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!dpo(req) && id !== actor(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Access restricted.' });
    return reply.send(await deps.pendencias.listar(id));
  });
}

function actor(req: { headers: Record<string, unknown> }): string { return String(req.headers['x-user-id'] ?? req.headers['x-empresa-id'] ?? 'anon'); }
function papel(req: { headers: Record<string, unknown> }): string { return String(req.headers['x-papel'] ?? ''); }
function dpo(req: { headers: Record<string, unknown> }): boolean { return PERFIS_DPO.includes(papel(req)); }
