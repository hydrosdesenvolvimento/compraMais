import type { ReactNode } from 'react';

/** Campo de formulário: rótulo + controle. `className` permite, entre outros, `cm-campo-total` para o
 *  campo ocupar a linha inteira quando dentro da grade de formulário `cm-form-grid`. */
export function Campo({ label, children, htmlFor, className }: { label: string; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={className} style={{ marginBottom: 14 }}>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
