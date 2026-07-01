import { createRouter, createRootRoute, createRoute, redirect, createHashHistory, Outlet } from '@tanstack/react-router';
import { AppShell, type ItemMenu, type UsuarioChip } from './design-system/AppShell';
import { AuthLayout } from './design-system/AuthLayout';
import { IconeInicio, IconeEditais, IconeCredenciamentos, IconeDocumentos, IconeDemandas } from './design-system/icons';

import { AuthPanel } from './pages/publico/AuthPanel';
import { Editais } from './pages/publico/Editais';
import { ContestarCnae } from './pages/publico/ContestarCnae';
import { Documentos } from './pages/publico/Documentos';
import { Contestacao } from './pages/publico/Contestacao';
import { MinhaConta } from './pages/publico/MinhaConta';
import { PainelTitular } from './pages/publico/PainelTitular';
import { Transparencia } from './pages/publico/Transparencia';
import { Dashboard } from './pages/admin/Dashboard';
import { FilaCovalidacao } from './pages/admin/FilaCovalidacao';
import { GerirEditais } from './pages/admin/GerirEditais';
import { FilaContestacoes } from './pages/admin/FilaContestacoes';
import { ConsultaAuditoria } from './pages/admin/ConsultaAuditoria';

const DEMO_FORNECEDOR_ID = 'demo-fornecedor';
const DEMO_EDITAL_ID = 'demo-edital';
const DEMO_SECRETARIA_ID = 'demo-secretaria';
const demoFornecedor = { razaoSocial: 'Confecções Vale do Acre Ltda', cnpj: '12.345.678/0001-90', porte: 'ME' };
const demoSync = { quando: '24/06/2026 às 09:12', status: 'sucesso' as const };

const ico = { width: 20, height: 20 };
const MENU_FORNECEDOR: ItemMenu[] = [
  { rotulo: 'Início', href: '/inicio', cy: 'nav-inicio', icone: <IconeInicio {...ico} /> },
  { rotulo: 'Editais', href: '/editais', cy: 'nav-editais', icone: <IconeEditais {...ico} /> },
  { rotulo: 'Meus credenciamentos', href: '/contestacao', cy: 'nav-credenciamentos', icone: <IconeCredenciamentos {...ico} /> },
  { rotulo: 'Documentos', href: '/documentos', cy: 'nav-documentos', icone: <IconeDocumentos {...ico} /> },
  { rotulo: 'Demandas distribuídas', href: '/transparencia', cy: 'nav-demandas', icone: <IconeDemandas {...ico} /> },
];
const USUARIO_FORNECEDOR: UsuarioChip = { nome: 'Vale do Acre Uniformes', papel: 'Procurador', iniciais: 'VA' };

const MENU_ADMIN: ItemMenu[] = [
  { rotulo: 'Painel', href: '/admin/dashboard', cy: 'nav-admin', icone: <IconeInicio {...ico} /> },
  { rotulo: 'Covalidação', href: '/admin/covalidacao', cy: 'nav-covalidacao', icone: <IconeCredenciamentos {...ico} /> },
  { rotulo: 'Gestão de editais', href: '/admin/editais', cy: 'nav-gestao-editais', icone: <IconeEditais {...ico} /> },
  { rotulo: 'Contestações', href: '/admin/contestacoes', cy: 'nav-contestacoes', icone: <IconeEditais {...ico} /> },
  { rotulo: 'Auditoria', href: '/admin/auditoria', cy: 'nav-auditoria', icone: <IconeDocumentos {...ico} /> },
];
const USUARIO_ADMIN: UsuarioChip = { nome: 'CPL — Compra Mais', papel: 'Controle / SMGA', iniciais: 'CP' };

const rootRoute = createRootRoute();

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', beforeLoad: () => { throw redirect({ to: '/cadastro' }); } });
const cadastroRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cadastro', component: () => <AuthLayout><AuthPanel /></AuthLayout> });

const fornecedorLayout = createRoute({ getParentRoute: () => rootRoute, id: 'fornecedor', component: () => <AppShell menu={MENU_FORNECEDOR} usuario={USUARIO_FORNECEDOR}><Outlet /></AppShell> });
const rInicio = createRoute({ getParentRoute: () => fornecedorLayout, path: '/inicio', component: () => <MinhaConta fornecedor={demoFornecedor} fornecedorId={DEMO_FORNECEDOR_ID} ultimaSync={demoSync} /> });
const rMinhaConta = createRoute({ getParentRoute: () => fornecedorLayout, path: '/minha-conta', component: () => <MinhaConta fornecedor={demoFornecedor} fornecedorId={DEMO_FORNECEDOR_ID} ultimaSync={demoSync} /> });
const rEditais = createRoute({ getParentRoute: () => fornecedorLayout, path: '/editais', component: Editais });
const rContestarCnae = createRoute({ getParentRoute: () => fornecedorLayout, path: '/editais/contestar', component: () => <ContestarCnae editalId={DEMO_EDITAL_ID} /> });
const rContestacao = createRoute({ getParentRoute: () => fornecedorLayout, path: '/contestacao', component: () => <Contestacao fornecedorId={DEMO_FORNECEDOR_ID} /> });
const rDocumentos = createRoute({ getParentRoute: () => fornecedorLayout, path: '/documentos', component: () => <Documentos fornecedorId={DEMO_FORNECEDOR_ID} /> });
const rTransparencia = createRoute({ getParentRoute: () => fornecedorLayout, path: '/transparencia', component: Transparencia });
const rTitular = createRoute({ getParentRoute: () => fornecedorLayout, path: '/titular', component: () => <PainelTitular fornecedorId={DEMO_FORNECEDOR_ID} /> });

const adminLayout = createRoute({ getParentRoute: () => rootRoute, id: 'admin', component: () => <AppShell menu={MENU_ADMIN} usuario={USUARIO_ADMIN} rodape="Painel administrativo · CPL / SMGA"><Outlet /></AppShell> });
const rAdminIndex = createRoute({ getParentRoute: () => adminLayout, path: '/admin', beforeLoad: () => { throw redirect({ to: '/admin/dashboard' }); } });
const rAdminDash = createRoute({ getParentRoute: () => adminLayout, path: '/admin/dashboard', component: Dashboard });
const rAdminCoval = createRoute({ getParentRoute: () => adminLayout, path: '/admin/covalidacao', component: () => <FilaCovalidacao fornecedorId={DEMO_FORNECEDOR_ID} /> });
const rAdminEditais = createRoute({ getParentRoute: () => adminLayout, path: '/admin/editais', component: () => <GerirEditais secretariaId={DEMO_SECRETARIA_ID} /> });
const rAdminContest = createRoute({ getParentRoute: () => adminLayout, path: '/admin/contestacoes', component: () => <FilaContestacoes editalId={DEMO_EDITAL_ID} /> });
const rAdminAudit = createRoute({ getParentRoute: () => adminLayout, path: '/admin/auditoria', component: ConsultaAuditoria });

const naoEncontrada = createRoute({ getParentRoute: () => rootRoute, path: '$', beforeLoad: () => { throw redirect({ to: '/cadastro' }); } });

const routeTree = rootRoute.addChildren([
  indexRoute,
  cadastroRoute,
  fornecedorLayout.addChildren([rInicio, rMinhaConta, rEditais, rContestarCnae, rContestacao, rDocumentos, rTransparencia, rTitular]),
  adminLayout.addChildren([rAdminIndex, rAdminDash, rAdminCoval, rAdminEditais, rAdminContest, rAdminAudit]),
  naoEncontrada,
]);

export const router = createRouter({ routeTree, history: createHashHistory(), defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
