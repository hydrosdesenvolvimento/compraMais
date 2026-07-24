import { useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { limparSessao } from '../lib/auth';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  IconePredio, IconeBusca, IconeSino, IconeChevron, IconeMenu,
  IconeUsuario, IconeSair, IconeRelogio, IconeEditais,
} from './icons';

type MenuLinkTo = ComponentProps<typeof Link>['to'];

/** `rotuloKey` é uma chave i18n (ex.: 'common.nav.inicio'); o rótulo é traduzido no render. */
export interface ItemMenu { rotuloKey: string; href: MenuLinkTo; icone: ReactNode; cy?: string }
export interface UsuarioChip { nome: string; papel: string; iniciais: string; fantasia?: string; avatar?: string | null }
export interface Notificacao { tom: 'atencao' | 'info'; titulo: string; texto: string }

const NOTIF_PADRAO: Notificacao[] = [
  { tom: 'atencao', titulo: 'Certidão Federal vence em 5 dias.', texto: 'Enviamos aviso por SMS e e-mail. Atualize antes de 30/06/2026.' },
  { tom: 'info', titulo: 'Novo edital compatível:', texto: 'ED-2026/014 — Fardamento escolar (SEME).' },
];

function ehMobile() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 920px)').matches;
}

/** Avatar do chip/menu: mostra a foto de perfil quando existir, senão as iniciais. */
function AvatarChip({ usuario, style }: { usuario: UsuarioChip; style?: CSSProperties }) {
  if (usuario.avatar) {
    return <img className="cm-avatar-sm" style={{ objectFit: 'cover', ...style }} src={usuario.avatar} alt={usuario.nome} />;
  }
  return <span className="cm-avatar-sm" style={style}>{usuario.iniciais}</span>;
}

/**
 * Shell do portal (mockup Compra Mais): sidebar recolhível com marca + menu + rodapé de versão,
 * topbar com busca, notificações e chip do usuário com dropdowns. Navegação via TanStack Router.
 */
export function AppShell({
  menu, usuario, children, rodapeKey = 'common.shell.footerFornecedor',
  notificacoes = NOTIF_PADRAO, contaHref = '/minha-conta' as MenuLinkTo,
}: {
  menu: ItemMenu[]; usuario: UsuarioChip; children: ReactNode; rodapeKey?: string;
  notificacoes?: Notificacao[]; contaHref?: MenuLinkTo;
}) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [recolhido, setRecolhido] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const alternarMenu = () => (ehMobile() ? setAberto((v) => !v) : setRecolhido((v) => !v));

  return (
    <div className="cm-shell" data-cy="app-shell">
      <aside className="cm-sidebar cm-scroll" data-open={aberto ? '1' : '0'} data-collapsed={recolhido ? '1' : '0'}>
        <div className="cm-brandrow">
          <span className="cm-brandfull">
            <span className="cm-brand-icon"><IconePredio width={24} height={24} /></span>
            <span className="cm-brand-text">
              <span className="cm-brand-name">{t('common.brand.name')}</span>
              <span className="cm-brand-sub">{t('common.brand.sub')}</span>
            </span>
          </span>
          <span className="cm-brandmini"><IconePredio width={22} height={22} /></span>
        </div>

        <nav className="cm-nav" aria-label={t('common.shell.menu')}>
          <div className="cm-grouplabel">{t('common.shell.menu')}</div>
          <div className="cm-navlist">
            {menu.map((m) => {
              const ativo = pathname === m.href || pathname.startsWith(m.href + '/');
              return (
                <Link
                  key={m.href} to={m.href} data-cy={m.cy}
                  className={`cm-navbtn ${ativo ? 'active' : ''}`}
                  aria-current={ativo ? 'page' : undefined}
                  onClick={() => setAberto(false)}
                >
                  <span className="cm-navicon">{m.icone}</span>
                  <span className="cm-navlabel">{t(m.rotuloKey)}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="cm-ver">{t(rodapeKey)}</div>
      </aside>

      <div className="cm-overlay" data-open={aberto ? '1' : '0'} onClick={() => setAberto(false)} aria-hidden />

      <div className="cm-main" data-collapsed={recolhido ? '1' : '0'}>
        <header className="cm-topbar">
          <button className="cm-hamburger" onClick={alternarMenu} aria-label={t('common.shell.openMenu')}><IconeMenu /></button>
          <div className="cm-search">
            <IconeBusca width={17} height={17} stroke="var(--cinza-400)" />
            <input data-cy="busca" placeholder={t('common.shell.search')} aria-label={t('common.shell.searchAria')} />
          </div>
          <div style={{ flex: 1 }} />

          <LanguageSwitcher />


          <div style={{ position: 'relative' }}>
            <button className="cm-iconbtn" onClick={() => setNotifOpen((v) => !v)} aria-label={t('common.shell.notificationsAria')} data-cy="notificacoes">
              <IconeSino />
              {notificacoes.length > 0 && <span className="cm-dot" />}
            </button>
            {notifOpen && (
              <>
                <div className="cm-menu-pop" style={{ width: 340 }} role="region" aria-label={t('common.shell.notificationsAria')}>
                  <div className="cm-menu-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <span style={{ font: '600 14px var(--font-body)', color: 'var(--azul-900)' }}>{t('common.shell.notificationsTitle')}</span>
                    <span style={{ fontSize: 11, color: 'var(--cinza-400)' }}>{t('common.shell.notificationsSubtitle')}</span>
                  </div>
                  <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {notificacoes.length === 0 && (
                      <div style={{ padding: '16px 12px', fontSize: 13, color: 'var(--cinza-500)' }}>{t('common.shell.notificationsEmpty')}</div>
                    )}
                    {notificacoes.map((n, i) => (
                      <div key={i} style={{ display: 'flex', gap: 11, padding: '11px 12px', borderRadius: 10, background: n.tom === 'atencao' ? 'var(--atencao-bg)' : 'transparent' }}>
                        <span style={{ flexShrink: 0, marginTop: 1, color: n.tom === 'atencao' ? '#8A5410' : 'var(--azul-600)' }}>
                          {n.tom === 'atencao' ? <IconeRelogio width={18} height={18} /> : <IconeEditais width={18} height={18} />}
                        </span>
                        <div style={{ fontSize: 13, lineHeight: 1.45, color: n.tom === 'atencao' ? '#8A5410' : 'var(--cinza-700)' }}>
                          <strong>{n.titulo}</strong> {n.texto}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '11px 16px', borderTop: '1px solid var(--divider)', textAlign: 'center' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', font: '600 13px var(--font-body)', color: 'var(--azul-700)' }}>{t('common.shell.notificationsSeeAll')}</button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button className="cm-profile-btn" onClick={() => setProfileOpen((v) => !v)} data-cy="user-chip" aria-label={t('common.shell.userMenuAria')}>
              <AvatarChip usuario={usuario} />
              <span className="cm-hide-sm" style={{ textAlign: 'left', lineHeight: 1.25 }}>
                <span style={{ display: 'block', font: '600 13px var(--font-body)', color: 'var(--azul-900)' }}>{usuario.fantasia ?? usuario.nome}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--cinza-400)' }}>{usuario.papel}</span>
              </span>
              <span className="cm-hide-sm"><IconeChevron width={16} height={16} stroke="var(--cinza-400)" /></span>
            </button>
            {profileOpen && (
              <>
                <div className="cm-menu-pop" style={{ width: 272 }} role="region" aria-label={t('common.shell.userMenuAria')}>
                  <div className="cm-menu-head">
                    <AvatarChip usuario={usuario} style={{ width: 44, height: 44, fontSize: 16 }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="cm-menu-name">{usuario.nome}</div>
                      <div className="cm-menu-role">{usuario.papel}{usuario.fantasia ? ` · ${usuario.fantasia}` : ''}</div>
                    </div>
                  </div>
                  <div style={{ padding: 8 }}>
                    <button className="cm-menu-item" onClick={() => { setProfileOpen(false); navigate({ to: contaHref }); }}>
                      <IconeUsuario width={18} height={18} />{t('common.shell.myAccount')}
                    </button>
                    <button className="cm-menu-item danger" data-cy="sair" onClick={() => { setProfileOpen(false); limparSessao(); navigate({ to: '/cadastro' }); }}>
                      <IconeSair width={18} height={18} />{t('common.shell.logout')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="cm-content cm-scroll">
          <div className="cm-content-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
