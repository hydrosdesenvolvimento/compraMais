import { describe, it, expect } from 'vitest';
import { validarCpf, mascaraCpf, mascaraCep, tempoDecorrido } from './br';

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

  it('formata o tempo decorrido na maior unidade sensível (RN011)', () => {
    const agora = new Date('2026-07-08T12:00:00Z');
    expect(tempoDecorrido('2026-07-08T11:58:00Z', 'pt-BR', agora)).toBe('há 2 minutos');
    expect(tempoDecorrido('2026-07-08T09:00:00Z', 'pt-BR', agora)).toBe('há 3 horas');
    expect(tempoDecorrido('2026-07-06T12:00:00Z', 'pt-BR', agora)).toBe('anteontem');
    expect(tempoDecorrido('2026-07-08T11:59:40Z', 'pt-BR', agora)).toBe('este minuto');
  });
});
