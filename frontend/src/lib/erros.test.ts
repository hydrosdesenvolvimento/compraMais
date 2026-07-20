import { describe, it, expect } from 'vitest';
import { textoDoErro } from './erros';
import { HttpError } from './api';

describe('textoDoErro — resolução de erro para toast', () => {
  it('mapeia o código do backend para a mensagem localizada (pt-BR)', () => {
    const e = new HttpError(404, '/fornecedores/demo-fornecedor', 'FornecedorNaoEncontrado', 'Supplier not found.');
    expect(textoDoErro(e)).toBe('Fornecedor não encontrado.');
  });

  it('cai na mensagem do backend quando o código não tem tradução curada', () => {
    const e = new HttpError(422, '/x', 'CodigoSemTraducao', 'Something specific happened.');
    expect(textoDoErro(e)).toBe('Something specific happened.');
  });

  it('usa a mensagem genérica por status quando não há corpo de erro', () => {
    const e = new HttpError(500, '/x');
    expect(textoDoErro(e)).toBe('Erro inesperado (status 500).');
  });

  it('trata falha de rede (erro que não é HttpError)', () => {
    expect(textoDoErro(new TypeError('Failed to fetch'))).toBe('Falha de conexão. Verifique sua internet e tente novamente.');
  });
});
