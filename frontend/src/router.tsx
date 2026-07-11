import { createRouter, createRootRoute, createRoute, redirect, createHashHistory, Outlet } from '@tanstack/react-router';
import { AppShell, type ItemMenu, type UsuarioChip } from './design-system/AppShell';
import { AuthLayout } from './design-system/AuthLayout';
import { IconeInicio, IconeEditais, IconeCredenciamentos, IconeDocumentos, IconeDemandas, IconeUsuario } from './design-system/icons';

import { AuthPanel } from './pages/publico/AuthPanel';
import { RedefinirSenha } from './pages/publico/RedefinirSenha';
import { Inicio } from './pages/publico/Inicio';
import { Credenciamento } from './pages/publico/Credenciamento';
import { Editais } from './pages/publico/Editais';
import { ContestarCnae } from './pages/publico/ContestarCnae';
import { Documentos } from './pages/publico/Documentos';
import { Contestacao } from './pages/publico/Contestacao';
import { MinhaContaConectada } from './pages/publico/MinhaContaConectada';
import { ProcuradoresConectada } from './pages/publico/ProcuradoresConectada';
import { estaAutenticado } from './lib/auth';
import { PainelTitular } from './pages/publico/PainelTitular';
import { Transparencia } from './pages/publico/Transparencia';
import { Dashboard } from './pages/admin/Dashboard';
import { FilaCovalidacao } from './pages/admin/FilaCovalidacao';
import { GerirEditais } from './pages/admin/GerirEditais';
import { FilaContestacoes } from './pages/admin/FilaContestacoes';
import { ConsultaAuditoria } from './pages/admin/ConsultaAuditoria';
import { ManterCatalogos } from './pages/admin/ManterCatalogos';
import { GerirUsuarios } from './pages/admin/GerirUsuarios';

const DEMO_FORNECEDOR_ID = 'demo-fornecedor';
const DEMO_EDITAL_ID = 'demo-edital';
const DEMO_SECRETARIA_ID = 'demo-secretaria';

const ico = { width: 20, height: 20 };
const MENU_FORNECEDOR: ItemMenu[] = [
  { rotuloKey: 'common.nav.inicio', href: '/inicio', cy: 'nav-inicio', icone: <IconeInicio {...ico} /> },
  { rotuloKey: 'common.nav.editais', href: '/editais', cy: 'nav-editais', icone: <IconeEditais {...ico} /> },
  { rotuloKey: 'common.nav.credenciamentos', href: '/contestacao', cy: 'nav-credenciamentos', icone: <IconeCredenciamentos {...ico} /> },
  { rotuloKey: 'common.nav.documentos', href: '/documentos', cy: 'nav-documentos', icone: <IconeDocumentos {...ico} /> },
  { rotuloKey: 'common.nav.demandas', href: '/transparencia', cy: 'nav-demandas', icone: <IconeDemandas {...ico} /> },
  { rotuloKey: 'common.nav.procuradores', href: '/procuradores', cy: 'nav-procuradores', icone: <IconeUsuario {...ico} /> },
];
const USUARIO_FORNECEDOR: UsuarioChip = { nome: 'Marcos Albuquerque', papel: 'Procurador', iniciais: 'VA', fantasia: 'Vale do Acre Uniformes' };

const MENU_ADMIN: ItemMenu[] = [
  { rotuloKey: 'common.nav.painel', href: '/admin/dashboard', cy: 'nav-admin', icone: <IconeInicio {...ico} /> },
  { rotuloKey: 'common.nav.covalidacao', href: '/admin/covalidacao', cy: 'nav-covalidacao', icone: <IconeCredenciamentos {...ico} /> },
  { rotuloKey: 'common.nav.gestaoEditais', href: '/admin/editais', cy: 'nav-gestao-editais', icone: <IconeEditais {...ico} /> },
  { rotuloKey: 'common.nav.contestacoes', href: '/admin/contestacoes', cy: 'nav-contestacoes', icone: <IconeEditais {...ico} /> },
  { rotuloKey: 'common.nav.catalogos', href: '/admin/catalogos', cy: 'nav-catalogos', icone: <IconeDocumentos {...ico} /> },
  { rotuloKey: 'common.nav.usuarios', href: '/admin/usuarios', cy: 'nav-usuarios', icone: <IconeUsuario {...ico} /> },
  { rotuloKey: 'common.nav.auditoria', href: '/admin/auditoria', cy: 'nav-auditoria', icone: <IconeDocumentos {...ico} /> },
];
const USUARIO_ADMIN: UsuarioChip = { nome: 'CPL — Compra Mais', papel: 'Controle / SMGA', iniciais: 'CP' };

const rootRoute = createRootRoute();

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', beforeLoad: () => { throw redirect({ to: '/cadastro' }); } });
const cadastroRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cadastro', component: () => <AuthLayout><AuthPanel /></AuthLayout> });
const redefinirSenhaRoute = createRoute({ getParentRoute: () => rootRoute, path: '/redefinir-senha', component: () => <AuthLayout><RedefinirSenha /></AuthLayout> });

const fornecedorLayout = createRoute({ getParentRoute: () => rootRoute, id: 'fornecedor', component: () => <AppShell menu={MENU_FORNECEDOR} usuario={USUARIO_FORNECEDOR}><Outlet /></AppShell> });
const rInicio = createRoute({ getParentRoute: () => fornecedorLayout, path: '/inicio', component: Inicio });
const rMinhaConta = createRoute({ getParentRoute: () => fornecedorLayout, path: '/minha-conta', beforeLoad: () => { if (!estaAutenticado()) throw redirect({ to: '/cadastro' }); }, component: MinhaContaConectada });
const rProcuradores = createRoute({ getParentRoute: () => fornecedorLayout, path: '/procuradores', beforeLoad: () => { if (!estaAutenticado()) throw redirect({ to: '/cadastro' }); }, component: ProcuradoresConectada });
const rEditais = createRoute({ getParentRoute: () => fornecedorLayout, path: '/editais', component: Editais });
const rCredenciamento = createRoute({ getParentRoute: () => fornecedorLayout, path: '/credenciamento/$editalId', component: Credenciamento });
const rContestarCnae = createRoute({ getParentRoute: () => fornecedorLayout, path: '/editais/contestar', component: () => <ContestarCnae editalId={DEMO_EDITAL_ID} /> });
const rContestacao = createRoute({ getParentRoute: () => fornecedorLayout, path: '/contestacao', component: () => <Contestacao fornecedorId={DEMO_FORNECEDOR_ID} /> });
const rDocumentos = createRoute({ getParentRoute: () => fornecedorLayout, path: '/documentos', component: () => <Documentos fornecedorId={DEMO_FORNECEDOR_ID} /> });
const rTransparencia = createRoute({ getParentRoute: () => fornecedorLayout, path: '/transparencia', component: Transparencia });
const rTitular = createRoute({ getParentRoute: () => fornecedorLayout, path: '/titular', component: () => <PainelTitular fornecedorId={DEMO_FORNECEDOR_ID} /> });

const adminLayout = createRoute({ getParentRoute: () => rootRoute, id: 'admin', component: () => <AppShell menu={MENU_ADMIN} usuario={USUARIO_ADMIN} rodapeKey="common.shell.footerAdmin" notificacoes={[]} contaHref="/admin/dashboard"><Outlet /></AppShell> });
const rAdminIndex = createRoute({ getParentRoute: () => adminLayout, path: '/admin', beforeLoad: () => { throw redirect({ to: '/admin/dashboard' }); } });
const rAdminDash = createRoute({ getParentRoute: () => adminLayout, path: '/admin/dashboard', component: Dashboard });
const rAdminCoval = createRoute({ getParentRoute: () => adminLayout, path: '/admin/covalidacao', component: () => <FilaCovalidacao fornecedorId={DEMO_FORNECEDOR_ID} /> });
const rAdminEditais = createRoute({ getParentRoute: () => adminLayout, path: '/admin/editais', component: () => <GerirEditais secretariaId={DEMO_SECRETARIA_ID} /> });
const rAdminContest = createRoute({ getParentRoute: () => adminLayout, path: '/admin/contestacoes', component: () => <FilaContestacoes editalId={DEMO_EDITAL_ID} /> });
const rAdminCatalogos = createRoute({ getParentRoute: () => adminLayout, path: '/admin/catalogos', component: ManterCatalogos });
const rAdminUsuarios = createRoute({ getParentRoute: () => adminLayout, path: '/admin/usuarios', component: GerirUsuarios });
const rAdminAudit = createRoute({ getParentRoute: () => adminLayout, path: '/admin/auditoria', component: ConsultaAuditoria });

const naoEncontrada = createRoute({ getParentRoute: () => rootRoute, path: '*', beforeLoad: () => { throw redirect({ to: '/cadastro' }); } });

const routeTree = rootRoute.addChildren([
  indexRoute,
  cadastroRoute,
  redefinirSenhaRoute,
  fornecedorLayout.addChildren([rInicio, rMinhaConta, rProcuradores, rEditais, rCredenciamento, rContestarCnae, rContestacao, rDocumentos, rTransparencia, rTitular]),
  adminLayout.addChildren([rAdminIndex, rAdminDash, rAdminCoval, rAdminEditais, rAdminContest, rAdminCatalogos, rAdminUsuarios, rAdminAudit]),
  naoEncontrada,
]);

export const router = createRouter({ routeTree, history: createHashHistory(), defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
