import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ConsultarProcessoSei } from '../application/consultar-processo-sei.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

// RBAC: consulta ao SEI é operação de gestão (CPL/SMGA/Administrador). Leitura, mas não pública.
const PERFIS_SEI: readonly Papel[] = ['cpl', 'smga', 'administrador'];

/** Pull do SEI (integração — Épico 6): consulta de processo por número (leitura) + status da config. */
export function registrarRotasSei(app: FastifyInstance, deps: { consultar: ConsultarProcessoSei; status: { configurado: boolean; provider: 'web' | 'mock' } }): void {
  // Status da integração: a UI (ex.: /admin/malote) avisa quando o SEI não está configurado.
  app.get('/sei/status', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_SEI)) return reply;
    return reply.send(deps.status);
  });

  app.get('/sei/processos/:numero', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_SEI)) return reply;
    const { numero } = req.params as { numero: string };
    try {
      return reply.send(await deps.consultar.consultar(decodeURIComponent(numero)));
    } catch (e) { return falha(reply, e); }
  });
}

function falha(reply: FastifyReply, e: unknown): FastifyReply {
  const n = (e as Error).name;
  if (n === 'ProcessoSeiNaoEncontrado') return reply.code(404).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'SeiConsultaIndisponivel') return reply.code(503).send({ codigo: n, mensagem: (e as Error).message }); // fail-open
  if (n === 'NumeroProcessoInvalido') return reply.code(422).send({ codigo: n, mensagem: (e as Error).message });
  return reply.code(500).send({ codigo: n, mensagem: (e as Error).message });
}
