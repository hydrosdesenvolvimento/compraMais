import { describe, it, expect } from 'vitest';
import { Fornecedor, SituacaoNaoApta } from '../../src/catalogo/domain/fornecedor.js';
import { Cnpj } from '../../src/catalogo/domain/cnpj.js';

const base = {
  id: 'f1',
  cnpj: Cnpj.criar('12.345.678/0001-90'),
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
});
