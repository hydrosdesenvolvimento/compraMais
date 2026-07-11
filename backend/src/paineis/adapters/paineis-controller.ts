import type { FastifyInstance } from 'fastify';
import type { DashboardAdmin, Transparencia } from '../application/paineis.js';

const PERFIS_ADMIN = ['cpl', 'administrador', 'smga'];

/** Painéis (Épico 9). Dashboard restrito (FR-002); transparência pública sem auth (FR-003). Somente leitura. */
export function registrarRotasPaineis(app: FastifyInstance, deps: { dashboard: DashboardAdmin; transparencia: Transparencia }): void {
  app.get('/admin/dashboard', async (req, reply) => {
    if (!admin(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Dashboard restricted to CPL/Administrator.' });
    return reply.send(await deps.dashboard.funil());
  });

  // Público — SEM autenticação, só agregados (RN013 / UC011). Filtro básico por período (A1): ?de&ate (YYYY-MM-DD).
  app.get('/transparencia', async (req, reply) => {
    const { de, ate } = req.query as { de?: string; ate?: string };
    return reply.send(await deps.transparencia.publico({ de, ate }));
  });
}

function admin(req: { headers: Record<string, unknown> }): boolean { return PERFIS_ADMIN.includes(String(req.headers['x-papel'] ?? '')); }
