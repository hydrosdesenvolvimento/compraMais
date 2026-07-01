import type { ReactNode } from 'react';
import { IconePredio } from './icons';

/**
 * Layout de autenticação (mockup Compra Mais): à esquerda o painel institucional CLARO com o
 * lockup da marca centralizado (mark + nome + subtítulo + tagline) sobre malha decorativa
 * azul→âmbar; à direita o painel navy em gradiente com o cartão de acesso (children).
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      {/* Painel institucional (claro) — lockup centralizado, sem texto de marketing */}
      <aside className="auth-aside cm-hide-sm">
        <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 620 820" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="cmL1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1E5AA0" stopOpacity="0" />
              <stop offset="0.55" stopColor="#3B82C4" stopOpacity="0.55" />
              <stop offset="1" stopColor="#F2B705" stopOpacity="0.85" />
            </linearGradient>
            <radialGradient id="cmGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#F2B705" stopOpacity="0.18" />
              <stop offset="1" stopColor="#F2B705" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="150" cy="700" r="240" fill="url(#cmGlow)" />
          <path d="M-40 250 C 160 170, 300 360, 680 230" fill="none" stroke="url(#cmL1)" strokeWidth="2" />
          <path d="M-40 300 C 180 220, 320 410, 680 280" fill="none" stroke="url(#cmL1)" strokeWidth="1.4" />
          <path d="M-40 360 C 200 290, 340 470, 680 340" fill="none" stroke="url(#cmL1)" strokeWidth="1.1" />
        </svg>

        <div className="auth-lockup">
          <span className="auth-lockup-mark"><IconePredio width={42} height={42} /></span>
          <div className="auth-lockup-name">Compra Mais</div>
          <div className="auth-lockup-eyebrow">RIO BRANCO</div>
          <div className="auth-lockup-sub">Sistema Digital de Compras Públicas</div>
          <div className="auth-lockup-tags">
            <span>Transparência</span><i aria-hidden>·</i>
            <span>Confiança</span><i aria-hidden>·</i>
            <span>Eficiência</span><i aria-hidden>·</i>
            <span>Parceria</span>
          </div>
        </div>
      </aside>

      {/* Painel de acesso (navy) — cartão com abas + formulário */}
      <main className="auth-main">
        <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 620 820" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, transform: 'scaleX(-1)' }}>
          <defs>
            <linearGradient id="cmL2" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#1E5AA0" stopOpacity="0" />
              <stop offset="1" stopColor="#5B9BD5" stopOpacity="0.5" />
            </linearGradient>
            <radialGradient id="cmGlow2" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#F2B705" stopOpacity="0.18" />
              <stop offset="1" stopColor="#F2B705" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="540" cy="120" r="230" fill="url(#cmGlow2)" />
          <path d="M-40 250 C 160 170, 300 360, 680 230" fill="none" stroke="url(#cmL2)" strokeWidth="1.5" />
          <path d="M-40 300 C 180 220, 320 410, 680 280" fill="none" stroke="url(#cmL2)" strokeWidth="2" />
          <path d="M-40 360 C 200 290, 340 470, 680 340" fill="none" stroke="url(#cmL2)" strokeWidth="1.2" />
          <g stroke="#FFFFFF" strokeOpacity="0.06" strokeWidth="34" strokeLinecap="round">
            <line x1="540" y1="690" x2="540" y2="800" />
            <line x1="486" y1="745" x2="596" y2="745" />
          </g>
        </svg>
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
