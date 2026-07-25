import type { FastifyInstance } from 'fastify';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';
import { GerarRelatorio, ehTipoRelatorio, TIPOS_RELATORIO, type FiltroRelatorio } from '../application/relatorios.js';

/** Relatórios gerenciais dos processos — restrito à gestão (SMGA/CPL/Administrador). Somente leitura. */
const PERFIS_RELATORIOS: readonly Papel[] = ['cpl', 'administrador', 'smga'];

/** Lê e valida o filtro comum a partir da query (?tipo=&de=&ate=&secretaria=). Datas YYYY-MM-DD. */
function lerFiltro(q: Record<string, string | undefined>): FiltroRelatorio {
  const data = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return { de: data(q.de), ate: data(q.ate), secretariaId: q.secretaria?.trim() || undefined };
}

/**
 * Relatórios (perfil SMGA). Uma única rota parametrizada por `tipo`; devolve dado estruturado
 * ({ colunas, linhas, totais }) sem texto localizado — a rotulação/PDF/CSV é do frontend (PRJ-DEC-12).
 * Não declara response schema (evita o field-stripping do fast-json-stringify sobre `linhas` dinâmicas).
 */
export function registrarRotasRelatorios(app: FastifyInstance, deps: { gerar: GerarRelatorio }): void {
  // Catálogo dos tipos disponíveis (para a UI montar o seletor sem hardcode duplicado).
  app.get('/admin/relatorios/tipos', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_RELATORIOS)) return reply;
    return reply.send({ tipos: TIPOS_RELATORIO });
  });

  app.get('/admin/relatorios/:tipo', async (req, reply) => {
    if (!exigirPapel(req, reply, PERFIS_RELATORIOS)) return reply;
    const { tipo } = req.params as { tipo: string };
    if (!ehTipoRelatorio(tipo)) {
      return reply.code(400).send({ codigo: 'TipoRelatorioInvalido', mensagem: `Unknown report type: ${tipo}` });
    }
    const filtro = lerFiltro(req.query as Record<string, string | undefined>);
    return reply.send(await deps.gerar.gerar(tipo, filtro));
  });
}
