import { describe, it, expect, vi } from 'vitest';
import { render, screen, configure, fireEvent } from '@testing-library/react';
import { BotaoIcone } from './BotaoIcone';
import { IconeOlho } from '../icons';

configure({ testIdAttribute: 'data-cy' });

describe('BotaoIcone — botão de ação só-ícone padronizado', () => {
  it('renderiza o ícone no tamanho canônico (18px) dentro da caixa 40×40', () => {
    render(<BotaoIcone icone={IconeOlho} data-cy="ver" aria-label="Ver" />);
    const btn = screen.getByTestId('ver');
    const svg = btn.querySelector('svg');
    expect(svg).toHaveAttribute('width', '18');
    expect(svg).toHaveAttribute('height', '18');
    expect(btn).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('é um <button type="button"> por padrão e encaminha clique + atributos', () => {
    const onClick = vi.fn();
    render(<BotaoIcone icone={IconeOlho} data-cy="ver" aria-label="Ver detalhes" title="Ver" onClick={onClick} />);
    const btn = screen.getByTestId('ver');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveAttribute('aria-label', 'Ver detalhes');
    expect(btn).toHaveAttribute('title', 'Ver');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('quando desabilitado aplica cursor não permitido e não dispara clique', () => {
    const onClick = vi.fn();
    render(<BotaoIcone icone={IconeOlho} data-cy="bloquear" aria-label="Bloquear" disabled onClick={onClick} />);
    const btn = screen.getByTestId('bloquear');
    expect(btn).toBeDisabled();
    expect(btn).toHaveStyle({ cursor: 'not-allowed' });
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('permite ajustar o tamanho do ícone quando o contexto exigir', () => {
    render(<BotaoIcone icone={IconeOlho} data-cy="grande" aria-label="Grande" tamanhoIcone={22} />);
    const svg = screen.getByTestId('grande').querySelector('svg');
    expect(svg).toHaveAttribute('width', '22');
  });

  it('na variante "fechar" usa a caixa do X de modal (raio 10) e ícone 20px', () => {
    render(<BotaoIcone icone={IconeOlho} variante="fechar" data-cy="fechar" aria-label="Fechar" />);
    const btn = screen.getByTestId('fechar');
    expect(btn.querySelector('svg')).toHaveAttribute('width', '20');
    expect(btn).toHaveStyle({ borderRadius: '10px' }); // fechar = 10 (sem borda), acao = 9 (com borda)
  });
});
