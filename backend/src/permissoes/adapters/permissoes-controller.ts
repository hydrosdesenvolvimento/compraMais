import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { GerirVisibilidadeTelas } from '../application/gerir-visibilidade.js';
import type { Identidade, Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';

type Actor = { userId: string; empresaId?: string };

/** Só o Administrador administra a matriz de telas por perfil (superusuário). */
const PERFIS_ADMIN: readonly Papel[] = ['administrador'];

/**
 * Controller da "Administração de telas por perfil" (§15/AD-35).
 * - GET  /permissoes/telas       → matriz completa (administrador + papéis configuráveis). RBAC: Administrador.
 * - GET  /permissoes/telas/me    → telas visíveis do PAPEL do próprio requisitante. Menu + guardas.
 * - PUT  /permissoes/telas/:papel→ redefine as telas de um papel configurável. RBAC: Administrador.
 * Ator e papel vêm do token verificado em `req.identidade` (AD-20) — jamais de header de texto: quando o
 * papel vinha de `x-papel`, qualquer chamador se declarava administrador e recebia a matriz inteira.
 */
export function registrarRotasPermissoes(app: FastifyInstance, deps: { gerir: GerirVisibilidadeTelas }): void {
  const { gerir } = deps;

  // Telas visíveis do próprio requisitante — aberto a qualquer sessão (retorna [] p/ papel sem acesso,
  // e o anônimo cai neste caso: sem token não há papel, logo nenhuma tela).
  app.get('/permissoes/telas/me', async (req, reply) => {
    const meu = papel(req);
    return reply.send({ papel: meu, telas: await gerir.telasDoPapel(meu) });
  });

  // Matriz completa — só o Administrador.
  app.get('/permissoes/telas', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_ADMIN)) return reply;
    return reply.send(await gerir.matriz());
  });

  // Redefinir as telas de um papel configurável — só o Administrador.
  app.put('/permissoes/telas/:papel', async (req, reply) => {
    const quem = exigirPapel(req, reply, PERFIS_ADMIN); if (!quem) return reply;
    const { papel: alvo } = req.params as { papel: string };
    const body = (req.body ?? {}) as { telas?: unknown };
    if (!Array.isArray(body.telas)) {
      return reply.code(422).send({ codigo: 'TelasInvalidas', mensagem: 'Body must include `telas: string[]`.' });
    }
    try {
      const telas = await gerir.definir(alvo, body.telas.map(String), actor(quem));
      return reply.send({ papel: alvo, telas });
    } catch (e) {
      return falha(reply, e);
    }
  });
}

/** Papel do requisitante segundo o token; `''` quando anônimo (→ nenhuma tela). */
function papel(req: FastifyRequest): string { return req.identidade?.papel ?? ''; }
function actor(quem: Identidade): Actor { return { userId: quem.userId, empresaId: quem.empresaId }; }
function falha(reply: FastifyReply, e: unknown): FastifyReply {
  const n = (e as Error).name;
  if (n === 'PapelNaoConfiguravel') return reply.code(422).send({ codigo: n, mensagem: (e as Error).message });
  if (n === 'TelaDesconhecida') return reply.code(422).send({ codigo: n, mensagem: (e as Error).message });
  return reply.code(500).send({ codigo: 'Erro', mensagem: (e as Error).message });
}
