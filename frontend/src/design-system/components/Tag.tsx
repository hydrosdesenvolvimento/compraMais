import type { ReactNode } from 'react';

/** Pill de status com bolinha (ativa/sucesso, pendente, bloqueado/erro). */
export function Tag({ status, children }: { status: 'ativa' | 'pendente' | 'bloqueado'; children: ReactNode }) {
  const cls = status === 'ativa' ? 'pill-success' : status === 'pendente' ? 'pill-warn' : 'pill-error';
  return <span className={`pill ${cls}`}>{children}</span>;
}
