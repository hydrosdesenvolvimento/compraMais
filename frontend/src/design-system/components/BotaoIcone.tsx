import type { ButtonHTMLAttributes, ComponentType, CSSProperties, SVGProps } from 'react';

/**
 * Botão de ação só-ícone do design system (Compra Mais).
 *
 * Padroniza as "caixinhas" 40×40 que envolvem ícones de botão e o tamanho canônico do glyph.
 * Antes, dois papéis estavam copiados à mão em várias telas com tamanhos divergentes:
 *  - `acao`   — botão de ação das listagens (ver, editar, bloquear, ativar/inativar…):
 *               caixa branca com borda; ícone 18px (antes 16/17/20/21, caixa 36 ou 40).
 *  - `fechar` — botão de fechar modal ("X" no cabeçalho): caixa cinza sem borda; ícone 20px.
 *
 * Use este componente em vez de recriar `iconeAcao`/`botaoX` à mão.
 */
type VarianteIcone = 'acao' | 'fechar';

type Props = {
  /** Componente de ícone do design system (ex.: `IconeOlho`). */
  icone: ComponentType<SVGProps<SVGSVGElement>>;
  /** Papel visual do botão. Padrão: `acao`. */
  variante?: VarianteIcone;
  /** Sobrescreve o tamanho do glyph em px (padrão: 18 em `acao`, 20 em `fechar`). */
  tamanhoIcone?: number;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const base: CSSProperties = {
  width: 40, height: 40, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', flex: '0 0 auto',
};

const estilos: Record<VarianteIcone, CSSProperties> = {
  acao: { ...base, border: '1px solid var(--border)', borderRadius: 9, background: '#fff', color: 'var(--cinza-600, #556)' },
  fechar: { ...base, border: 'none', borderRadius: 10, background: 'var(--cinza-100, #eef1f5)', color: 'var(--cinza-500)' },
};

const tamanhoPadrao: Record<VarianteIcone, number> = { acao: 18, fechar: 20 };

const desabilitado: CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

export function BotaoIcone({
  icone: Icone, variante = 'acao', tamanhoIcone, type = 'button', disabled = false, style, ...props
}: Props) {
  const px = tamanhoIcone ?? tamanhoPadrao[variante];
  return (
    <button
      type={type}
      disabled={disabled}
      style={{ ...estilos[variante], ...(disabled ? desabilitado : null), ...style }}
      {...props}
    >
      <Icone width={px} height={px} aria-hidden />
    </button>
  );
}
