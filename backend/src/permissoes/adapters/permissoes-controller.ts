import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { GerirVisibilidadeTelas } from '../application/gerir-visibilidade.js';

type Actor = { userId: string; empresaId?: string };

/** Só o Administrador administra a matriz de telas por perfil (superusuário). */
const PERFIL_ADMIN = 'administrador';

/**
 * Controller da "Administração de telas por perfil" (§15/AD-35).
 * - GET  /permissoes/telas       → matriz completa (administrador + papéis configuráveis). RBAC: Administrador.
 * - GET  /permissoes/telas/me    → telas visíveis do PAPEL do próprio requisitante (x-papel). Menu + guardas.
 * - PUT  /permissoes/telas/:papel→ redefine as telas de um papel configurável. RBAC: Administrador.
 * O ator/papel chegam por header (`x-user-id`/`x-papel`), no mesmo modelo dos demais controllers admin.
 */
export function registrarRotasPermissoes(app: FastifyInstance, deps: { gerir: GerirVisibilidadeTelas }): void {
  const { gerir } = deps;

  // Telas visíveis do próprio requisitante — aberto a qualquer sessão (retorna [] p/ papel sem acesso).
  app.get('/permissoes/telas/me', async (req, reply) => {
    const telas = await gerir.telasDoPapel(papel(req));
    return reply.send({ papel: papel(req), telas });
  });

  // Matriz completa — só o Administrador.
  app.get('/permissoes/telas', async (req, reply) => {
    if (!admin(req)) return proibido(reply);
    return reply.send(await gerir.matriz());
  });

  // Redefinir as telas de um papel configurável — só o Administrador.
  app.put('/permissoes/telas/:papel', async (req, reply) => {
    if (!admin(req)) return proibido(reply);
    const { papel: alvo } = req.params as { papel: string };
    const body = (req.body ?? {}) as { telas?: unknown };
    if (!Array.isArray(body.telas)) {
      return reply.code(422).send({ codigo: 'TelasInvalidas', mensagem: 'Body must include `telas: string[]`.' });
    }
    try {
      const telas = await gerir.definir(alvo, body.telas.map(String), actor(req));
      return reply.send({ papel: alvo, telas });
    } catch (e) {
      return falha(reply, e);
    }
  });
}

function papel(req: FastifyRequest): string { return String(req.headers['x-papel'] ?? ''); }
function actor(req: FastifyRequest): Actor { return { userId: String(req.headers['x-user-id'] ?? 'anon') }; }
function admin(req: FastifyRequest): boolean { return papel(req) === PERFIL_ADMIN; }
function proibido(reply: FastifyReply): FastifyReply {
  return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Only Administrator can manage screen visibility.' });
}
function falha(reply: FastifyReply, e: unknown): FastifyReply {
  const n = (e as Error).name;
  if (n === 'PapelNaoConfiguravel') return reply.code(422).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'TelaDesconhecida') return reply.code(422).send({ codigo: n, mensagem: (e as Error).message });
  return reply.code(500).send({ codigo: 'Erro', mensagem: (e as Error).message });
}
