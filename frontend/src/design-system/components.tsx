import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Componentes base do design system (Compra Mais). Estilos em index.css. Foco visível âmbar (e-MAG/WCAG 2.1 AA). */

type VarianteBotao = 'primario' | 'amber' | 'secundario' | 'terciario';
export function Botao({ variante = 'primario', className = '', ...props }: { variante?: VarianteBotao } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = variante === 'amber' ? 'btn-amber' : variante === 'primario' ? 'btn-primary' : 'btn-ghost';
  return <button {...props} className={`btn ${cls} ${className}`.trim()} />;
}

/** Pill de status com bolinha (ativa/sucesso, pendente, bloqueado/erro). */
export function Tag({ status, children }: { status: 'ativa' | 'pendente' | 'bloqueado'; children: ReactNode }) {
  const cls = status === 'ativa' ? 'pill-success' : status === 'pendente' ? 'pill-warn' : 'pill-error';
  return <span className={`pill ${cls}`}>{children}</span>;
}

/** Pill genérica por tom. */
export function Pill({ tom = 'success', children }: { tom?: 'success' | 'warn' | 'error'; children: ReactNode }) {
  return <span className={`pill pill-${tom}`}>{children}</span>;
}

/** Etiqueta retangular (ex.: sigla de secretaria "SEASDH"). */
export function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}

export function Card({ navy = false, className = '', children }: { navy?: boolean; className?: string; children: ReactNode }) {
  return <div className={`${navy ? 'card-navy' : 'card'} ${className}`.trim()}>{children}</div>;
}

export function Avatar({ iniciais, size = 40, className = '' }: { iniciais: string; size?: number; className?: string }) {
  return <span className={`avatar ${className}`.trim()} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>{iniciais}</span>;
}

export function Campo({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

/** Stepper horizontal (1 Capacidade — 2 Documentos — ...). */
export function Stepper({ passos, ativo }: { passos: string[]; ativo: number }) {
  return (
    <div className="stepper" role="list">
      {passos.map((p, i) => (
        <span key={p} style={{ display: 'contents' }}>
          <span className={`step ${i === ativo ? 'active' : ''}`} role="listitem">
            <span className="step-num">{i + 1}</span>{p}
          </span>
          {i < passos.length - 1 && <span className="step-sep" aria-hidden />}
        </span>
      ))}
    </div>
  );
}

/** Barra de acessibilidade (e-MAG): alto contraste, ajuste de fonte (lógica de toggle no app). */
export function BarraAcessibilidade() {
  const { t } = useTranslation();
  return (
    <div role="region" aria-label={t('common.a11y.region')} style={{ display: 'inline-flex', gap: 4 }}>
      <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label={t('common.a11y.highContrast')}>A</button>
      <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label={t('common.a11y.increaseFont')}>A+</button>
      <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label={t('common.a11y.decreaseFont')}>A-</button>
    </div>
  );
}
