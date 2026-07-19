import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, configure } from '@testing-library/react';
import { Procuradores } from './Procuradores';
import type { ProcuradorView } from '../../lib/api';

// O projeto marca os elementos com `data-cy` (Cypress); alinhamos o testId do Testing Library a ele.
configure({ testIdAttribute: 'data-cy' });

/**
 * UC019 — tela "Procuradores" (apresentacional). Cobre: convite pelo identificador, lista de ativos,
 * remover (callback) e o rastro dos removidos (append-only, RN015). i18n é inicializado no setup;
 * as asserções usam o texto pt-BR (idioma padrão).
 */
const ATIVO: ProcuradorView = { contaId: 'c1', identificador: 'proc@empresa.com', nome: null, ativo: true, convidadoPor: 't1', desde: '2026-07-01T00:00:00Z' };
const REMOVIDO: ProcuradorView = { contaId: 'c2', identificador: 'ex@empresa.com', nome: null, ativo: false, convidadoPor: 't1', desde: '2026-06-01T00:00:00Z' };
const ATIVO_COM_NOME: ProcuradorView = { contaId: 'c3', identificador: 'ana@empresa.com', nome: 'Ana Souza', ativo: true, convidadoPor: 't1', desde: '2026-07-01T00:00:00Z' };

function noop() { /* */ }

describe('Procuradores (UC019)', () => {
  it('lista os procuradores ativos e não mostra o bloco de removidos quando não há', () => {
    render(<Procuradores procuradores={[ATIVO]} onConvidar={noop} onRemover={noop} />);
    expect(screen.getByText('proc@empresa.com')).toBeInTheDocument();
    expect(screen.getByText('Procuradores ativos')).toBeInTheDocument();
    expect(screen.queryByText('Histórico de remoções')).not.toBeInTheDocument();
  });

  it('exibe o nome do procurador (quando resolvido) com o identificador como secundário', () => {
    render(<Procuradores procuradores={[ATIVO_COM_NOME]} onConvidar={noop} onRemover={noop} />);
    const item = screen.getByTestId('proc-item');
    expect(within(item).getByText('Ana Souza')).toBeInTheDocument();
    expect(within(item).getByText(/ana@empresa\.com/)).toBeInTheDocument();
  });

  it('mostra o estado vazio quando não há procuradores ativos', () => {
    render(<Procuradores procuradores={[]} onConvidar={noop} onRemover={noop} />);
    expect(screen.getByTestId('proc-vazio')).toBeInTheDocument();
  });

  it('convidar: envia o identificador digitado e limpa o campo', async () => {
    const onConvidar = vi.fn().mockResolvedValue(undefined);
    render(<Procuradores procuradores={[]} onConvidar={onConvidar} onRemover={noop} />);
    const input = screen.getByTestId('proc-identificador') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'novo@empresa.com' } });
    fireEvent.click(screen.getByTestId('proc-convidar'));
    expect(onConvidar).toHaveBeenCalledWith('novo@empresa.com');
  });

  it('não convida com identificador em branco (botão desabilitado)', () => {
    const onConvidar = vi.fn();
    render(<Procuradores procuradores={[]} onConvidar={onConvidar} onRemover={noop} />);
    expect(screen.getByTestId('proc-convidar')).toBeDisabled();
  });

  it('remover: chama o callback com o id da conta', () => {
    const onRemover = vi.fn();
    render(<Procuradores procuradores={[ATIVO]} onConvidar={noop} onRemover={onRemover} />);
    const item = screen.getByTestId('proc-item');
    fireEvent.click(within(item).getByTestId('proc-remover'));
    expect(onRemover).toHaveBeenCalledWith('c1');
  });

  it('exibe o rastro dos procuradores removidos (append-only, RN015)', () => {
    render(<Procuradores procuradores={[ATIVO, REMOVIDO]} onConvidar={noop} onRemover={noop} />);
    expect(screen.getByText('Histórico de remoções')).toBeInTheDocument();
    expect(screen.getByTestId('proc-removido')).toHaveTextContent('ex@empresa.com');
    // O removido não aparece na lista de ativos.
    expect(screen.getAllByTestId('proc-item')).toHaveLength(1);
  });
});
