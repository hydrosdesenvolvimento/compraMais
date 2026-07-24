import type { FastifyInstance } from 'fastify';
import type { GerirDireitosTitular, SolicitacaoProbe } from '../application/gerir-direitos.js';
import type { ConsolidarPendencias } from '../application/consolidar-pendencias.js';
import type { TipoDireito, StatusSolicitacao } from '../domain/solicitacao-titular.js';
import type { Identidade, Papel } from '../../shared/identity/identity-provider.js';
import { exigirAutenticado, exigirPapel } from '../../shared/http/autenticacao.js';

// FR-009 / clarify Q2: atendimento restrito ao Encarregado (dpo) + Administrador (fallback). CPL fora.
const PERFIS_DPO: readonly Papel[] = ['administrador', 'dpo'];

/**
 * Direitos do titular (LGPD) + tela única consolidada (Épico 7).
 * §V: direito que exige o PRÓPRIO titular NÃO é exercível por procurador → bloqueado na abertura.
 *
 * Identidade (AD-20): quem é o titular vem do token, nunca de `x-user-id`/`x-empresa-id`. Isso muda a
 * natureza do isolamento self-service abaixo: antes o ator era AUTODECLARADO — bastava trocar o header
 * para abrir um pedido em nome de outra pessoa ou ler a fila do DPO. Agora é VERIFICADO.
 */
export function registrarRotasTitular(app: FastifyInstance, deps: { direitos: GerirDireitosTitular; pendencias: ConsolidarPendencias }): void {
  // Solicitar direito (acesso/correção/exclusão) — somente o próprio titular (não procurador) — FR-002/003/004/005
  app.post('/titular/solicitacoes', async (req, reply) => {
    const quem = exigirAutenticado(req, reply);
    if (!quem) return reply;
    // §V é mais específico que o RBAC: o procurador está autenticado e existe, mas este direito é
    // indelegável. Por isso o código próprio (`LGPDTitular`) em vez do 403 genérico do guard.
    if (quem.papel === 'procurador') return reply.code(403).send({ codigo: 'LGPDTitular', mensagem: 'This right requires the data subject themselves; an attorney cannot exercise it (§V).' });
    const { tipo, detalhe, categoria } = req.body as { tipo: TipoDireito; detalhe?: string; categoria?: 'cadastral' | 'fiscal' | 'contratual' };
    // O pedido nasce colado ao dono do token: não há como protocolar em nome de terceiro.
    const out = await deps.direitos.solicitar(titularDe(quem), tipo, detalhe, categoria);
    return reply.code(201).send({ ...out, status: 'pendente' });
  });

  // Consulta QBE de solicitações — DPO/Admin (ou o próprio titular, restrito aos PRÓPRIOS pedidos)
  app.get('/titular/solicitacoes', async (req, reply) => {
    const quem = exigirAutenticado(req, reply);
    if (!quem) return reply;
    const { titularId, tipo, status } = req.query as { titularId?: string; tipo?: TipoDireito; status?: StatusSolicitacao };
    const ehDpo = PERFIS_DPO.includes(quem.papel);
    if (!ehDpo && titularId !== titularDe(quem)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Access restricted.' });
    // Não-DPO: o probe é reescrito para a identidade do token, então o filtro não é negociável pelo cliente.
    const probe: SolicitacaoProbe = { titularId: ehDpo ? titularId : titularDe(quem), tipo, status };
    const r = await deps.direitos.consultar(probe);
    return reply.send(r.map((s) => ({ id: s.id, titularId: s.titularId, tipo: s.tipo, detalhe: s.detalhe, categoria: s.categoria, status: s.status, resultado: s.resultado })));
  });

  app.post('/titular/solicitacoes/:id/atender', async (req, reply) => {
    const quem = exigirPapel(req, reply, PERFIS_DPO);
    if (!quem) return reply;
    const { id } = req.params as { id: string };
    const { resultado } = req.body as { resultado: string };
    try { await deps.direitos.atender(id, resultado ?? 'atendida', { userId: quem.userId }); return reply.send({ status: 'atendida' }); }
    catch (e) { return reply.code((e as Error).name === 'SolicitacaoNaoEncontrada' ? 404 : 409).send({ codigo: (e as Error).name, mensagem: (e as Error).message }); }
  });

  // Recusar com justificativa (fluxo passo 2 — "atende OU recusa"). Motivo obrigatório (RN003).
  app.post('/titular/solicitacoes/:id/recusar', async (req, reply) => {
    const quem = exigirPapel(req, reply, PERFIS_DPO);
    if (!quem) return reply;
    const { id } = req.params as { id: string };
    const { motivo } = req.body as { motivo: string };
    try { await deps.direitos.recusar(id, motivo, { userId: quem.userId }); return reply.send({ status: 'recusada' }); }
    catch (e) {
      const n = (e as Error).name;
      const code = n === 'SolicitacaoNaoEncontrada' ? 404 : n === 'MotivoRecusaObrigatorio' ? 400 : 409;
      return reply.code(code).send({ codigo: n, mensagem: (e as Error).message });
    }
  });

  app.post('/titular/solicitacoes/:id/descartar', async (req, reply) => {
    const quem = exigirPapel(req, reply, PERFIS_DPO);
    if (!quem) return reply;
    const { id } = req.params as { id: string };
    const { dataRegistro } = req.body as { dataRegistro: string };
    try { const r = await deps.direitos.avaliarDescarte(id, dataRegistro, { userId: quem.userId }); return reply.send(r); }
    catch (e) {
      const n = (e as Error).name;
      const code = n === 'DescarteRetido' ? 409 : n === 'SolicitacaoNaoEncontrada' ? 404 : 400;
      return reply.code(code).send({ codigo: n, mensagem: (e as Error).message }); // 409 = retido pela política (FR-008)
    }
  });

  // Tela única consolidada (FR-001) — o próprio titular ou DPO/Admin
  app.get('/fornecedores/:id/pendencias-consolidadas', async (req, reply) => {
    const quem = exigirAutenticado(req, reply);
    if (!quem) return reply;
    const { id } = req.params as { id: string };
    if (!PERFIS_DPO.includes(quem.papel) && id !== fornecedorDe(quem)) return reply.code(403).send({ codigo: 'RBAC', mensagem: 'Access restricted.' });
    return reply.send(await deps.pendencias.listar(id));
  });
}

/**
 * Chave de self-service do titular. É o `userId` do token, e não a empresa: o dado tratado aqui é
 * PESSOAL (LGPD) — dois usuários da mesma empresa não podem ler os pedidos um do outro.
 */
function titularDe(quem: Identidade): string { return quem.userId; }

/**
 * Fornecedor do chamador na tela única. Aqui o recorte é da EMPRESA (documentos, bloqueios, CNAE);
 * `userId` só entra como fallback para identidades sem empresa vinculada, como no header antigo.
 */
function fornecedorDe(quem: Identidade): string { return quem.empresaId ?? quem.userId; }
