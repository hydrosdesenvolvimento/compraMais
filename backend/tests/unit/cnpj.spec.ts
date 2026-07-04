import { describe, it, expect } from 'vitest';
import { Cnpj, CnpjInvalido } from '../../src/catalogo/domain/cnpj.js';

describe('Cnpj (VO — dígitos verificadores, UC001)', () => {
  it('aceita CNPJ matematicamente válido e normaliza a máscara', () => {
    expect(Cnpj.criar('11222333000181').valor).toBe('11.222.333/0001-81');
    expect(Cnpj.criar('11.222.333/0001-81').valor).toBe('11.222.333/0001-81');
  });

  it('rejeita CNPJ com dígito verificador inválido (exceção UC001)', () => {
    expect(() => Cnpj.criar('12.345.678/0001-90')).toThrow(CnpjInvalido);
  });

  it('rejeita comprimento diferente de 14 dígitos', () => {
    expect(() => Cnpj.criar('11.222.333/0001-8')).toThrow(CnpjInvalido);
  });

  it('rejeita sequência de dígitos repetidos', () => {
    expect(() => Cnpj.criar('00.000.000/0000-00')).toThrow(CnpjInvalido);
    expect(() => Cnpj.criar('11.111.111/1111-11')).toThrow(CnpjInvalido);
  });

  it('equals compara pelo valor normalizado', () => {
    expect(Cnpj.criar('11222333000181').equals(Cnpj.criar('11.222.333/0001-81'))).toBe(true);
  });
});
