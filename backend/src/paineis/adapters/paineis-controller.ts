import type { FastifyInstance } from 'fastify';
import type { DashboardAdmin, Transparencia } from '../application/paineis.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

/** Dashboard operacional: controle da Prefeitura (FR-002). Anônimo → 401; papel errado → 403. */
const PERFIS_DASHBOARD: readonly Papel[] = ['cpl', 'administrador', 'smga'];

/** Painéis (Épico 9). Dashboard restrito (FR-002); transparência pública sem auth (FR-003). Somente leitura. */
export function registrarRotasPaineis(app: FastifyInstance, deps: { dashboard: DashboardAdmin; transparencia: Transparencia }): void {
  app.get('/admin/dashboard', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_DASHBOARD)) return reply;
    return reply.send(await deps.dashboard.funil());
  });

  // Público — SEM autenticação, só agregados (FR-003/004 / §VI). Nenhum guard aqui é deliberado:
  // a transparência é acessível ao cidadão anônimo, e exigir token a quebraria.
  app.get('/transparencia', async (_req, reply) => {
    return reply.send(await deps.transparencia.publico());
  });
}
