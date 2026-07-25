import type { TFunction } from 'i18next';

/**
 * Portes canônicos do enquadramento da empresa (espelha o backend `catalogo/domain/fornecedor`). Usado
 * no select do cadastro administrativo e na declaração de MEI do autocadastro. MEI vem primeiro por ser
 * o foco da plataforma (compras municipalizadas voltadas à economia local).
 */
export const PORTES = ['MEI', 'ME', 'EPP', 'DEMAIS'] as const;
export type Porte = (typeof PORTES)[number];

/** Rótulo localizado do porte; valores fora do vocabulário canônico exibem o próprio código. */
export function rotuloPorte(t: TFunction, valor: string): string {
  return t(`common.porte.${valor}`, { defaultValue: valor });
}
