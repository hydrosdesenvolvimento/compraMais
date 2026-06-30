import type { ReactNode } from 'react';
import { IconePredio, IconeCheck } from './icons';

/**
 * Layout de autenticação (design de referência): painel institucional navy à esquerda e a área de
 * formulário (children) à direita, com o seletor "LAYOUT A/B" decorativo.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <div className="auth-brand">
          <span className="brand-icon"><IconePredio width={24} height={24} /></span>
          <span>
            <span className="brand-name">Compra Mais</span>
            <span className="brand-sub" style={{ display: 'block' }}>PREFEITURA DE RIO BRANCO</span>
          </span>
        </div>
        <h1>O comércio local conectado às compras da cidade.</h1>
        <p className="auth-lead">
          Credenciamento 100% digital, editais filtrados pelo seu ramo e distribuição justa de
          demandas — sem fila, sem papel.
        </p>
        <ul className="auth-list">
          <li><IconeCheck className="auth-check" width={22} height={22} /> Cadastro automático via Receita Federal</li>
          <li><IconeCheck className="auth-check" width={22} height={22} /> Triagem antifraude em Dívida Ativa e SICAF</li>
          <li><IconeCheck className="auth-check" width={22} height={22} /> Reuso de documentos entre editais</li>
        </ul>
        <div className="auth-foot">Lei nº 14.133/2021 · Lei Municipal 2.027 · SMGA / CPL</div>
      </aside>

      <main className="auth-main" style={{ position: 'relative' }}>
        <div className="layout-toggle" aria-hidden>LAYOUT <b>A</b> B</div>
        <div className="auth-form">{children}</div>
      </main>
    </div>
  );
}
