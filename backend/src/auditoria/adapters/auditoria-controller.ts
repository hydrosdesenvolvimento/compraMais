import type { FastifyInstance } from 'fastify';
import type { ConsultarTrilha } from '../application/consultar-trilha.js';
import type { ExportarTrilha, FormatoExport } from '../application/exportar-trilha.js';
import type { AuditQuery, AuditPage } from '../infra/audit-repository.js';

// RBAC (FR-008 / clarify Q2): controle + auditor somente-leitura. Demais → 403.
const PERFIS_AUDITORIA = ['cpl', 'administrador', 'auditor'];

/**
 * Superfície de LEITURA da trilha (FR-001..011). Nenhuma rota aqui escreve na trilha (AD-18 / FR-003).
 * Sem mascaramento de PII (clarify Q1): a autorização é a salvaguarda.
 */
export function registrarRotasAuditoria(app: FastifyInstance, deps: { consultar: ConsultarTrilha; exportar: ExportarTrilha }): void {
  app.get('/auditoria', async (req, reply) => {
    if (!autorizado(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Access restricted to control/audit roles.' });
    const { probe, page } = parseFiltro(req);
    try {
      return reply.send(await deps.consultar.consultar(probe, page));
    } catch (e) {
      return reply.code(400).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.get('/auditoria/exportar', async (req, reply) => {
    if (!autorizado(req)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Access restricted to control/audit roles.' });
    const { probe } = parseFiltro(req);
    const { formato } = req.query as { formato?: FormatoExport };
    const fmt: FormatoExport = formato === 'json' ? 'json' : 'csv';
    try {
      const r = await deps.exportar.exportar(probe, fmt);
      reply.header('content-type', r.mime);
      reply.header('content-disposition', `attachment; filename="${r.nome}"`);
      if (r.volumeSinalizado) reply.header('x-audit-volume', `acima-do-teto:${r.total}`); // FR-011
      return reply.send(r.conteudo);
    } catch (e) {
      return reply.code(400).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}

function parseFiltro(req: { query: unknown }): { probe: AuditQuery; page: AuditPage } {
  const q = req.query as Record<string, string | undefined>;
  const probe: AuditQuery = { usuario: q.usuario, evento: q.evento, de: q.de, ate: q.ate, editalId: q.editalId, fornecedorId: q.fornecedorId };
  const page: AuditPage = {
    page: q.page ? Number(q.page) : undefined,
    size: q.size ? Number(q.size) : undefined,
    ordem: q.sort === 'asc' ? 'asc' : q.sort === 'desc' ? 'desc' : undefined,
  };
  return { probe, page };
}

function autorizado(req: { headers: Record<string, unknown> }): boolean {
  return PERFIS_AUDITORIA.includes(String(req.headers['x-papel'] ?? ''));
}
