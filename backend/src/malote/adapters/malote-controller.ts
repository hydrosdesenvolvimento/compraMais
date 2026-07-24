import type { FastifyInstance } from 'fastify';
import type { GerarMalote, MaloteProbe } from '../application/gerar-malote.js';
import type { Peca, StatusMalote } from '../domain/malote.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

// RBAC (FR-006): montagem/consulta do malote é da CPL + Administrador (+ SMGA). Demais → 403; anônimo → 401.
const PERFIS_MALOTE: readonly Papel[] = ['cpl', 'administrador', 'smga'];

/** Controller do malote SEI (Épico 6). RBAC CPL/Administrador (FR-006). Geração assíncrona (FR-002). */
export function registrarRotasMalote(app: FastifyInstance, deps: { gerar: GerarMalote }): void {
  app.post('/malotes', async (req, reply) => {
    const quem = exigirPapel(req, reply, PERFIS_MALOTE);
    if (!quem) return reply;
    const { fornecedorId, editalId, pecas } = req.body as { fornecedorId: string; editalId: string; pecas: Peca[] };
    // O ator da trilha é o dono do token — não mais um `x-user-id` autodeclarado (AD-20).
    const out = await deps.gerar.solicitar({ fornecedorId, editalId }, pecas ?? [], { userId: quem.userId });
    return reply.code(202).send(out); // 202 Accepted — processamento em background (FR-002/008)
  });

  app.get('/malotes/:id', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_MALOTE)) return reply;
    const { id } = req.params as { id: string };
    const m = (await deps.gerar.consultar({})).find((x) => x.id === id);
    if (!m) return reply.code(404).send({ codigo: 'MaloteNaoEncontrado', mensagem: 'Malote not found.' });
    return reply.send({ id: m.id, status: m.status, fragmentos: m.fragmentos.length, pecas: m.pecas.length, pecaAcimaLimite: m.temPecaAcimaLimite });
  });

  // Busca por instância parcial (QBE — FR-007)
  app.get('/malotes', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_MALOTE)) return reply;
    const { fornecedorId, editalId, status } = req.query as { fornecedorId?: string; editalId?: string; status?: StatusMalote };
    const probe: MaloteProbe = { fornecedorId, editalId, status };
    const ms = await deps.gerar.consultar(probe);
    return reply.send(ms.map((m) => ({ id: m.id, fornecedorId: m.fornecedorId, editalId: m.editalId, status: m.status, fragmentos: m.fragmentos.length })));
  });

  app.post('/malotes/:id/exportar', async (req, reply) => {
    const quem = exigirPapel(req, reply, PERFIS_MALOTE);
    if (!quem) return reply;
    const { id } = req.params as { id: string };
    try {
      const r = await deps.gerar.exportar(id, { userId: quem.userId });
      return reply.send({ status: 'exportado', jaExportado: r.jaExportado }); // idempotente (FR-004)
    } catch (e) {
      const code = (e as Error).name === 'MaloteNaoEncontrado' ? 404 : 409;
      return reply.code(code).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}
