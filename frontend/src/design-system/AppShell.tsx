import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconePredio, IconeBusca, IconeSino, IconeChevron, IconeMenu } from './icons';
import { Avatar } from './components';

export interface ItemMenu { rotulo: string; href: string; icone: ReactNode; cy?: string }
export interface UsuarioChip { nome: string; papel: string; iniciais: string }

/**
 * Shell do portal (design de referência): sidebar branca com marca + menu + rodapé, e topbar com
 * busca, notificações e chip do usuário. O conteúdo da rota entra na área principal.
 */
export function AppShell({ menu, usuario, children, rodape = 'Versão 2.0 · MVP FIEAC' }: {
  menu: ItemMenu[]; usuario: UsuarioChip; children: ReactNode; rodape?: string;
}) {
  const { pathname } = useLocation();
  return (
    <div className="shell" data-cy="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon"><IconePredio width={24} height={24} /></span>
          <span>
            <span className="brand-name">Compra Mais</span>
            <span className="brand-sub" style={{ display: 'block' }}>RIO BRANCO</span>
          </span>
        </div>
        <div className="menu-label">MENU</div>
        <nav className="nav" aria-label="Menu principal">
          {menu.map((m) => {
            const ativo = pathname === m.href || pathname.startsWith(m.href + '/');
            return (
              <Link key={m.href} to={m.href} data-cy={m.cy} className={`nav-item ${ativo ? 'active' : ''}`} aria-current={ativo ? 'page' : undefined}>
                <span className="nav-icon">{m.icone}</span>{m.rotulo}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">{rodape}</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" aria-label="Abrir menu"><IconeMenu /></button>
          <div className="search">
            <IconeBusca width={18} height={18} />
            <input data-cy="busca" placeholder="Buscar editais, documentos…" aria-label="Buscar" />
          </div>
          <span style={{ flex: 1 }} />
          <button className="icon-btn" aria-label="Notificações"><IconeSino /></button>
          <div className="user-chip" data-cy="user-chip">
            <Avatar iniciais={usuario.iniciais} size={34} />
            <span>
              <span className="user-name">{usuario.nome}</span>
              <span className="user-role" style={{ display: 'block' }}>{usuario.papel}</span>
            </span>
            <IconeChevron width={16} height={16} />
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
