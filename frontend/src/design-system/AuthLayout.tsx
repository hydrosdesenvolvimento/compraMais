import type { ReactNode } from 'react';
import { IconePredio } from './icons';

/**
 * Layout de autenticação (mockup Compra Mais): à esquerda o painel institucional claro com a marca e
 * uma malha decorativa âmbar/azul; à direita o painel navy em gradiente com o cartão de acesso
 * (children = abas Entrar/Criar conta do AuthPanel).
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-aside cm-hide-sm" aria-hidden="true">
        <svg width="100%" height="100%" viewBox="0 0 620 820" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="cmL1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1E5AA0" stopOpacity="0" />
              <stop offset="0.55" stopColor="#3B82C4" stopOpacity="0.45" />
              <stop offset="1" stopColor="#F2B705" stopOpacity="0.75" />
            </linearGradient>
            <radialGradient id="cmGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#F2B705" stopOpacity="0.16" />
              <stop offset="1" stopColor="#F2B705" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="120" cy="680" r="230" fill="url(#cmGlow)" />
          <path d="M-40 250 C 160 170, 300 360, 680 230" fill="none" stroke="url(#cmL1)" strokeWidth="2" />
          <path d="M-40 320 C 200 240, 340 430, 680 300" fill="none" stroke="url(#cmL1)" strokeWidth="1.4" />
        </svg>
        <div className="auth-aside-inner">
          <div className="auth-brand-lockup">
            <span className="cm-brand-icon"><IconePredio width={30} height={30} /></span>
            <span className="cm-brand-text">
              <span className="cm-brand-name" style={{ fontSize: 26 }}>Compra Mais</span>
              <span className="cm-brand-sub" style={{ fontSize: 12 }}>RIO BRANCO · SISTEMA DIGITAL DE COMPRAS PÚBLICAS</span>
            </span>
          </div>
          <p style={{ marginTop: 28, fontSize: 17, lineHeight: 1.6, color: 'var(--cinza-700)', maxWidth: 460 }}>
            O comércio local conectado às compras da cidade. Credenciamento 100% digital, editais
            filtrados pelo seu ramo e distribuição justa de demandas — sem fila, sem papel.
          </p>
          <div style={{ marginTop: 26, display: 'flex', gap: 22, flexWrap: 'wrap', font: '600 13px var(--font-body)', color: 'var(--azul-700)' }}>
            <span>Transparência</span><span>Confiança</span><span>Eficiência</span><span>Parceria</span>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <svg width="100%" height="100%" viewBox="0 0 620 820" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, transform: 'scaleX(-1)' }} aria-hidden="true">
          <defs>
            <linearGradient id="cmL2" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#1E5AA0" stopOpacity="0" />
              <stop offset="1" stopColor="#5B9BD5" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path d="M-40 250 C 160 170, 300 360, 680 230" fill="none" stroke="url(#cmL2)" strokeWidth="1.5" />
          <path d="M-40 360 C 200 290, 340 470, 680 340" fill="none" stroke="url(#cmL2)" strokeWidth="1.2" />
        </svg>
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
