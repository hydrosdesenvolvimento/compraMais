import { describe, it, expect } from 'vitest';
import { ReceitaBrasilApiGateway, mapearCnpj } from '../../src/shared/acl/receita/receita-brasilapi.js';
import { CepBrasilApiGateway, mapearCep } from '../../src/shared/acl/cep/cep-brasilapi.js';
import type { Fetcher } from '../../src/shared/acl/http.js';

const ok = (body: unknown): Fetcher => async () => ({ ok: true, status: 200, json: async () => body });
const erro = (status: number): Fetcher => async () => ({ ok: false, status, json: async () => ({}) });

const CNPJ_BRASILAPI = {
  razao_social: 'Confecções Vale do Acre Ltda',
  porte: 'MICRO EMPRESA',
  descricao_situacao_cadastral: 'ATIVA',
  cnae_fiscal: 1412601,
  cnaes_secundarios: [{ codigo: 4781400 }],
  qsa: [{ nome_socio: 'ALAN CARLOS GUEDES DE OLIVEIRA', qualificacao_socio: 'Sócio-Administrador', cnpj_cpf_do_socio: '***550179**' }],
};
const CEP_BRASILAPI = {
  cep: '69900-062', state: 'AC', city: 'Rio Branco', neighborhood: 'Centro', street: 'Rua Benjamin Constant',
  location: { coordinates: { latitude: '-9.9754', longitude: '-67.8249' } },
};

describe('BrasilAPI — CNPJ (Receita)', () => {
  it('mapeia a resposta da BrasilAPI para DadosCnpj', () => {
    const d = mapearCnpj(CNPJ_BRASILAPI);
    expect(d.razaoSocial).toBe('Confecções Vale do Acre Ltda');
    expect(d.porte).toBe('ME');
    expect(d.situacaoCadastral).toBe('ativa');
    expect(d.cnaes[0]).toEqual({ codigoSubclasse: '1412601', tipo: 'principal' });
    expect(d.cnaes[1]).toEqual({ codigoSubclasse: '4781400', tipo: 'secundario' });
    expect(d.cnaes[0]?.codigoSubclasse).toMatch(/^\d{7}$/);
    expect(d.socios?.[0]).toEqual({ nome: 'ALAN CARLOS GUEDES DE OLIVEIRA', qualificacao: 'Sócio-Administrador', documento: '***550179**' });
  });

  it('consulta verificada quando a BrasilAPI responde 200', async () => {
    const gw = new ReceitaBrasilApiGateway('https://x', ok(CNPJ_BRASILAPI), 1000);
    const r = await gw.consultarCnpj('12.345.678/0001-90');
    expect(r.frescor).toBe('verificado');
    expect(r.fonte).toBe('Receita');
    expect(r.valor?.razaoSocial).toBe('Confecções Vale do Acre Ltda');
  });

  it('degrada para indisponível em erro/timeout (fallback manual)', async () => {
    const gw = new ReceitaBrasilApiGateway('https://x', erro(503), 1000);
    const r = await gw.consultarCnpj('00.000.000/0000-00');
    expect(r.frescor).toBe('indisponivel');
    expect(r.valor).toBeNull();
  });
});

describe('BrasilAPI — CEP', () => {
  it('mapeia a resposta da BrasilAPI para Endereco (com coordenadas numéricas)', () => {
    const e = mapearCep(CEP_BRASILAPI);
    expect(e).toMatchObject({ cep: '69900062', estado: 'AC', cidade: 'Rio Branco', bairro: 'Centro' });
    expect(e.latitude).toBeCloseTo(-9.9754, 3);
    expect(e.longitude).toBeCloseTo(-67.8249, 3);
  });

  it('consulta verificada quando a BrasilAPI responde 200', async () => {
    const gw = new CepBrasilApiGateway('https://x', ok(CEP_BRASILAPI), 1000);
    const r = await gw.consultarCep('69900-062');
    expect(r.frescor).toBe('verificado');
    expect(r.fonte).toBe('BrasilAPI');
    expect(r.valor?.cidade).toBe('Rio Branco');
  });

  it('degrada para indisponível quando o CEP não existe (404)', async () => {
    const gw = new CepBrasilApiGateway('https://x', erro(404), 1000);
    const r = await gw.consultarCep('00000-000');
    expect(r.frescor).toBe('indisponivel');
    expect(r.valor).toBeNull();
  });
});
