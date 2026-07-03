import type { ButtonHTMLAttributes } from 'react';

/** Botão base do design system (Compra Mais). Variantes: primário, amber, secundário, terciário (secundário/terciário usam estilo ghost). Estilos em index.css. */
type VarianteBotao = 'primario' | 'amber' | 'secundario' | 'terciario';

export function Botao({ variante = 'primario', className = '', ...props }: { variante?: VarianteBotao } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = variante === 'amber' ? 'btn-amber' : variante === 'primario' ? 'btn-primary' : 'btn-ghost';
  return <button {...props} className={`btn ${cls} ${className}`.trim()} />;
}
