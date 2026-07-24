import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';
import type { Peca } from '../../src/malote/domain/malote.js';

/**
 * Integração SEI no nível HTTP — push (`POST /malotes/:id/enviar-sei`) e pull (`GET /sei/processos/:numero`).
 * App em memória (sem DATABASE_URL) → o gateway SEI é o **mock** (config resolve 'mock' em teste), então
 * os fluxos são determinísticos sem SEI real. O caminho real (SeiWebGateway) é coberto por sei-client.spec
 * (login+pesquisar contra fixtures). Execução contra o SEI de homologação = gate de QA.
 */
describe('Integração SEI (HTTP)', () => {
  let app: FastifyInstance;
  const cpl = comoPapel('cpl', { userId: 'cpl1' });
  const fornecedor = comoPapel('titular', { userId: 'f1', empresaId: 'emp1' });
  const pecas: Peca[] = [
    { tipo: 'cnpj', ref: 'cnpj1', tamanhoBytes: 100 },
    { tipo: 'certidao', ref: 'c1', tamanhoBytes: 100 },
  ];
  const flush = () => new Promise((r) => setTimeout(r, 15));

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });

  /** Gera um malote e aguarda a fila levá-lo a `gerado`. */
  async function maloteGerado(): Promise<string> {
    const criar = await app.inject({ method: 'POST', url: '/malotes', headers: cpl, payload: { fornecedorId: 'f1', editalId: 'e1', pecas } });
    const { maloteId } = criar.json() as { maloteId: string };
    await flush();
    return maloteId;
  }

  // ---- Pull: consulta de processo ----
  it('GET /sei/processos/:numero anônimo → 401', async () => {
    const r = await app.inject({ method: 'GET', url: '/sei/processos/4004.017444.00012%2F2026-02' });
    expect(r.statusCode).toBe(401);
  });

  it('GET /sei/processos fornecedor → 403 (operação de gestão)', async () => {
    const r = await app.inject({ method: 'GET', url: '/sei/processos/4004.017444.00012%2F2026-02', headers: fornecedor });
    expect(r.statusCode).toBe(403);
  });

  it('número em formato inválido → 422', async () => {
    const r = await app.inject({ method: 'GET', url: '/sei/processos/123', headers: cpl });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'NumeroProcessoInvalido' });
  });

  it('gestor consulta um processo por número (mock devolve o processo)', async () => {
    const r = await app.inject({ method: 'GET', url: '/sei/processos/4004.017444.00012%2F2026-02', headers: cpl });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ numero: '4004.017444.00012/2026-02' });
  });

  // ---- Push: enviar malote ao SEI ----
  it('POST /malotes/:id/enviar-sei anônimo → 401', async () => {
    const r = await app.inject({ method: 'POST', url: '/malotes/x/enviar-sei', headers: { 'x-papel': 'cpl' } });
    expect(r.statusCode).toBe(401);
  });

  it('envia um malote gerado ao SEI → protocola (número do processo) e marca exportado', async () => {
    const id = await maloteGerado();
    const env = await app.inject({ method: 'POST', url: `/malotes/${id}/enviar-sei`, headers: cpl });
    expect(env.statusCode).toBe(200);
    const body = env.json() as { numeroProcesso: string; jaProtocolado: boolean };
    expect(body.numeroProcesso).toMatch(/^\d{4}\.\d{6}\.\d{5}\/\d{4}-\d{2}$/);
    expect(body.jaProtocolado).toBe(false);

    // o malote passou a exportado e carrega o protocolo
    const consulta = await app.inject({ method: 'GET', url: `/malotes/${id}`, headers: cpl });
    expect(consulta.json()).toMatchObject({ status: 'exportado', protocoloSei: { numeroProcesso: body.numeroProcesso } });

    // idempotente: reenviar devolve o mesmo processo
    const reenvio = await app.inject({ method: 'POST', url: `/malotes/${id}/enviar-sei`, headers: cpl });
    expect((reenvio.json() as { jaProtocolado: boolean; numeroProcesso: string })).toMatchObject({ jaProtocolado: true, numeroProcesso: body.numeroProcesso });
  });

  it('malote inexistente → 404', async () => {
    const r = await app.inject({ method: 'POST', url: '/malotes/nao-existe/enviar-sei', headers: cpl });
    expect(r.statusCode).toBe(404);
  });
});
