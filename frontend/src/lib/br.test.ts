import { describe, it, expect } from 'vitest';
import { validarCpf, mascaraCpf, mascaraCep } from './br';

describe('utils BR', () => {
  it('valida CPF por dígitos verificadores', () => {
    expect(validarCpf('529.982.247-25')).toBe(true);
    expect(validarCpf('52998224725')).toBe(true);
    expect(validarCpf('111.111.111-11')).toBe(false); // sequência repetida
    expect(validarCpf('123.456.789-00')).toBe(false);
    expect(validarCpf('529.982.247-20')).toBe(false); // DV errado
  });

  it('aplica máscara de CPF progressivamente', () => {
    expect(mascaraCpf('52998224725')).toBe('529.982.247-25');
    expect(mascaraCpf('529')).toBe('529');
    expect(mascaraCpf('5299822')).toBe('529.982.2');
    expect(mascaraCpf('529982247259999')).toBe('529.982.247-25'); // limita a 11 dígitos
  });

  it('aplica máscara de CEP', () => {
    expect(mascaraCep('69900062')).toBe('69900-062');
    expect(mascaraCep('699')).toBe('699');
  });
});
