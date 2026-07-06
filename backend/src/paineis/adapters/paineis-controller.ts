import type { FastifyInstance } from 'fastify';
import type { DashboardAdmin, Transparencia } from '../application/paineis.js';

const PERFIS_ADMIN = ['cpl', 'administrador', 'smga'];

/** Painéis (Épico 9). Dashboard restrito (FR-002); transparência pública sem auth (FR-003). Somente leitura. */
export function registrarRotasPaineis(app: FastifyInstance, deps: { dashboard: DashboardAdmin; transparencia: Transparencia }): void {
  app.get('/admin/dashboard', async (req, reply) => {
    if (!admin(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Dashboard restricted to CPL/Administrator.' });
    return reply.send(await deps.dashboard.funil());
  });

  // Público — SEM autenticação, só agregados (FR-003/004 / §VI)
  app.get('/transparencia', async (_req, reply) => {
    return reply.send(await deps.transparencia.publico());
  });
}

function admin(req: { headers: Record<string, unknown> }): boolean { return PERFIS_ADMIN.includes(String(req.headers['x-papel'] ?? '')); }
