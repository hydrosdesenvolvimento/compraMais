import { describe, it, expect } from 'vitest';
import { Fornecedor, SituacaoNaoApta } from '../../src/catalogo/domain/fornecedor.js';
import { Cnpj } from '../../src/catalogo/domain/cnpj.js';

const base = {
  id: 'f1',
  cnpj: Cnpj.criar('11.222.333/0001-81'),
  razaoSocial: 'Padaria X',
  porte: 'ME',
  cnaes: [{ codigoSubclasse: '1091101', tipo: 'principal' as const, ativo: true }],
  situacao: 'ativa' as const,
  origem: 'oficial' as const,
  contato: {},
};

describe('Fornecedor (domínio)', () => {
  it('cadastra quando situação é ativa', () => {
    const f = Fornecedor.cadastrar(base);
    expect(f.situacao).toBe('ativa');
  });

  it('rejeita cadastro de situação não apta (FR-005)', () => {
    expect(() => Fornecedor.cadastrar({ ...base, situacao: 'inapta' })).toThrow(SituacaoNaoApta);
  });

  it('compatibilidade por subclasse exata (D2)', () => {
    const f = Fornecedor.cadastrar(base);
    expect(f.compativelCom(['1091101'])).toBe(true);
    expect(f.compativelCom(['4721102'])).toBe(false);
  });

  it('edição de contato não altera campos oficiais', () => {
    const f = Fornecedor.cadastrar(base);
    f.editarContato({ nomeFantasia: 'Pão Quente' });
    expect(f.contato.nomeFantasia).toBe('Pão Quente');
    expect(f.razaoSocial).toBe('Padaria X'); // read-only (RN009)
  });

  it('nasce com status Requerente e guarda o timestamp de sincronização (UC001 passo 5 / RF018)', () => {
    const f = Fornecedor.cadastrar({ ...base, sincronizadoEm: '2026-07-03T10:00:00Z' });
    expect(f.status).toBe('requerente');
    expect(f.sincronizadoEm).toBe('2026-07-03T10:00:00Z');
  });

  it('re-sincroniza campos oficiais e situação e grava novo timestamp (UC018 passo 3 / RF018)', () => {
    const f = Fornecedor.cadastrar({ ...base, sincronizadoEm: '2026-06-01T00:00:00Z' });
    f.aplicarSincronizacao(
      { razaoSocial: 'Padaria Y', porte: 'EPP', cnaes: [{ codigoSubclasse: '4721102', tipo: 'principal', ativo: true }], situacao: 'ativa' },
      '2026-07-06T09:00:00Z',
    );
    expect(f.razaoSocial).toBe('Padaria Y');
    expect(f.porte).toBe('EPP');
    expect(f.cnaes[0]?.codigoSubclasse).toBe('4721102');
    expect(f.sincronizadoEm).toBe('2026-07-06T09:00:00Z');
    expect(f.precisaRevisaoCpl()).toBe(false);
  });

  it('sinaliza revisão da CPL quando a situação oficial deixa de ser ativa (UC018 exceção)', () => {
    const f = Fornecedor.cadastrar(base);
    f.aplicarSincronizacao({ razaoSocial: 'Padaria X', porte: 'ME', cnaes: base.cnaes, situacao: 'baixada' }, '2026-07-06T09:00:00Z');
    expect(f.situacao).toBe('baixada');
    expect(f.precisaRevisaoCpl()).toBe(true);
  });

  it('guarda endereço estruturado geolocalizável editável (RF019/RN009)', () => {
    const endereco = { logradouro: 'Rua A', numero: '100', bairro: 'Centro', cidade: 'Rio Branco', uf: 'AC', cep: '69900062', latitude: -9.97, longitude: -67.82 };
    const f = Fornecedor.cadastrar({ ...base, contato: { endereco } });
    expect(f.contato.endereco?.cidade).toBe('Rio Branco');
    f.editarContato({ endereco: { ...endereco, numero: '250' } });
    expect(f.contato.endereco?.numero).toBe('250');
  });
});
