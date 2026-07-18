import { createRouter, createRootRoute, createRoute, redirect, createHashHistory } from '@tanstack/react-router';
import { type ItemMenu } from './design-system/AppShell';
import { ShellFornecedor, ShellAdmin } from './design-system/ShellConectado';
import { AuthLayout } from './design-system/AuthLayout';
import { IconeInicio, IconeEditais, IconeCredenciamentos, IconeContestacao, IconeDocumentos, IconeDemandas, IconeUsuario } from './design-system/icons';

import { AuthPanel } from './pages/publico/AuthPanel';
import { RedefinirSenha } from './pages/publico/RedefinirSenha';
import { Inicio } from './pages/publico/Inicio';
import { Credenciamento } from './pages/publico/Credenciamento';
import { Editais } from './pages/publico/Editais';
import { ContestarCnae } from './pages/publico/ContestarCnae';
import { Documentos } from './pages/publico/Documentos';
import { Contestacao } from './pages/publico/Contestacao';
import { MeusCredenciamentosConectada } from './pages/publico/MeusCredenciamentos';
import { MinhaContaConectada } from './pages/publico/MinhaContaConectada';
import { ProcuradoresConectada } from './pages/publico/ProcuradoresConectada';
import { PrivacidadeConectada } from './pages/publico/PrivacidadeConectada';
import { AtendimentoLgpd } from './pages/admin/AtendimentoLgpd';
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
import { GerarMalote } from './pages/admin/GerarMalote';
import { AdministracaoTelas } from './pages/admin/AdministracaoTelas';
import { EmConstrucao } from './pages/admin/EmConstrucao';
import { Fornecedores } from './pages/admin/Fornecedores';
import { Secretarias } from './pages/admin/Secretarias';
import { SetoresIndustriais } from './pages/admin/SetoresIndustriais';
import { exigirTelaAdmin, exigirTitular } from './lib/guardas';

const DEMO_FORNECEDOR_ID = 'demo-fornecedor';
const DEMO_EDITAL_ID = 'demo-edital';

const ico = { width: 20, height: 20 };
// Ordem = sidebar do protótipo `spec/Prototipo/portal-fornecedor.html` (Início, Editais, Meus
// credenciamentos, Documentos, Demandas). Contestação/Procuradores/Privacidade não estão no protótipo
// (ações do titular sob "Conta") e seguem ao final.
const MENU_FORNECEDOR: ItemMenu[] = [
  { rotuloKey: 'common.nav.inicio', href: '/inicio', cy: 'nav-inicio', icone: <IconeInicio {...ico} /> },
  { rotuloKey: 'common.nav.editais', href: '/editais', cy: 'nav-editais', icone: <IconeEditais {...ico} /> },
  { rotuloKey: 'common.nav.credenciamentos', href: '/credenciamentos', cy: 'nav-credenciamentos', icone: <IconeCredenciamentos {...ico} /> },
  { rotuloKey: 'common.nav.documentos', href: '/documentos', cy: 'nav-documentos', icone: <IconeDocumentos {...ico} /> },
  { rotuloKey: 'common.nav.demandas', href: '/transparencia', cy: 'nav-demandas', icone: <IconeDemandas {...ico} /> },
  { rotuloKey: 'common.nav.contestacao', href: '/contestacao', cy: 'nav-contestacao', icone: <IconeContestacao {...ico} /> },
  { rotuloKey: 'common.nav.procuradores', href: '/procuradores', cy: 'nav-procuradores', icone: <IconeUsuario {...ico} /> },
  { rotuloKey: 'common.nav.privacidade', href: '/privacidade', cy: 'nav-privacidade', icone: <IconeDocumentos {...ico} /> },
];

// O menu do Painel Admin não é mais estático: é montado dentro do ShellAdmin a partir das TELAS visíveis
// ao papel (GET /permissoes/telas/me — "Administração de telas por perfil"). Ver lib/telas-admin.tsx.

const rootRoute = createRootRoute();

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', beforeLoad: () => { throw redirect({ to: '/cadastro' }); } });
const cadastroRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cadastro', component: () => <AuthLayout><AuthPanel /></AuthLayout> });
const redefinirSenhaRoute = createRoute({ getParentRoute: () => rootRoute, path: '/redefinir-senha', component: () => <AuthLayout><RedefinirSenha /></AuthLayout> });

const fornecedorLayout = createRoute({ getParentRoute: () => rootRoute, id: 'fornecedor', component: () => <ShellFornecedor menu={MENU_FORNECEDOR} /> });
const rInicio = createRoute({ getParentRoute: () => fornecedorLayout, path: '/inicio', component: Inicio });
const rMinhaConta = createRoute({ getParentRoute: () => fornecedorLayout, path: '/minha-conta', beforeLoad: () => { if (!estaAutenticado()) throw redirect({ to: '/cadastro' }); }, component: MinhaContaConectada });
const rProcuradores = createRoute({ getParentRoute: () => fornecedorLayout, path: '/procuradores', beforeLoad: () => { if (!estaAutenticado()) throw redirect({ to: '/cadastro' }); exigirTitular(); }, component: ProcuradoresConectada });
const rPrivacidade = createRoute({ getParentRoute: () => fornecedorLayout, path: '/privacidade', beforeLoad: () => { if (!estaAutenticado()) throw redirect({ to: '/cadastro' }); exigirTitular(); }, component: PrivacidadeConectada });
const rEditais = createRoute({ getParentRoute: () => fornecedorLayout, path: '/editais', component: Editais });
const rCredenciamento = createRoute({ getParentRoute: () => fornecedorLayout, path: '/credenciamento/$editalId', component: Credenciamento });
const rContestarCnae = createRoute({ getParentRoute: () => fornecedorLayout, path: '/editais/contestar', component: () => <ContestarCnae editalId={DEMO_EDITAL_ID} /> });
const rMeusCredenciamentos = createRoute({ getParentRoute: () => fornecedorLayout, path: '/credenciamentos', component: MeusCredenciamentosConectada });
const rContestacao = createRoute({ getParentRoute: () => fornecedorLayout, path: '/contestacao', component: () => <Contestacao fornecedorId={DEMO_FORNECEDOR_ID} /> });
const rDocumentos = createRoute({ getParentRoute: () => fornecedorLayout, path: '/documentos', component: () => <Documentos fornecedorId={DEMO_FORNECEDOR_ID} /> });
const rTransparencia = createRoute({ getParentRoute: () => fornecedorLayout, path: '/transparencia', component: Transparencia });
const rTitular = createRoute({ getParentRoute: () => fornecedorLayout, path: '/titular', component: () => <PainelTitular fornecedorId={DEMO_FORNECEDOR_ID} /> });

const adminLayout = createRoute({ getParentRoute: () => rootRoute, id: 'admin', component: () => <ShellAdmin /> });
const rAdminIndex = createRoute({ getParentRoute: () => adminLayout, path: '/admin', beforeLoad: () => { throw redirect({ to: '/admin/dashboard' }); } });
const rAdminDash = createRoute({ getParentRoute: () => adminLayout, path: '/admin/dashboard', beforeLoad: () => exigirTelaAdmin('painel'), component: Dashboard });
const rAdminCoval = createRoute({ getParentRoute: () => adminLayout, path: '/admin/covalidacao', beforeLoad: () => exigirTelaAdmin('covalidacao'), component: () => <FilaCovalidacao fornecedorId={DEMO_FORNECEDOR_ID} /> });
const rAdminEditais = createRoute({ getParentRoute: () => adminLayout, path: '/admin/editais', beforeLoad: () => exigirTelaAdmin('gestaoEditais'), component: GerirEditais });
const rAdminContest = createRoute({ getParentRoute: () => adminLayout, path: '/admin/contestacoes', beforeLoad: () => exigirTelaAdmin('contestacoes'), component: () => <FilaContestacoes editalId={DEMO_EDITAL_ID} /> });
const rAdminMalote = createRoute({ getParentRoute: () => adminLayout, path: '/admin/malote', beforeLoad: () => exigirTelaAdmin('malote'), component: GerarMalote });
const rAdminCatalogos = createRoute({ getParentRoute: () => adminLayout, path: '/admin/catalogos', beforeLoad: () => exigirTelaAdmin('catalogos'), component: ManterCatalogos });
const rAdminUsuarios = createRoute({ getParentRoute: () => adminLayout, path: '/admin/usuarios', beforeLoad: () => exigirTelaAdmin('usuarios'), component: GerirUsuarios });
const rAdminLgpd = createRoute({ getParentRoute: () => adminLayout, path: '/admin/lgpd', beforeLoad: () => exigirTelaAdmin('lgpd'), component: AtendimentoLgpd });
const rAdminAudit = createRoute({ getParentRoute: () => adminLayout, path: '/admin/auditoria', beforeLoad: () => exigirTelaAdmin('auditoria'), component: ConsultaAuditoria });
const rAdminPerfis = createRoute({ getParentRoute: () => adminLayout, path: '/admin/perfis', beforeLoad: () => exigirTelaAdmin('perfis'), component: AdministracaoTelas });

// Telas novas do catálogo de perfis ainda sem UI própria — placeholder navegável ("Em construção").
const rAdminFornecedores = createRoute({ getParentRoute: () => adminLayout, path: '/admin/fornecedores', beforeLoad: () => exigirTelaAdmin('fornecedores'), component: Fornecedores });
const rAdminCredenciamento = createRoute({ getParentRoute: () => adminLayout, path: '/admin/credenciamento', beforeLoad: () => exigirTelaAdmin('credenciamento'), component: () => <EmConstrucao tituloKey="common.nav.credenciamento" /> });
const rAdminAnaliseDoc = createRoute({ getParentRoute: () => adminLayout, path: '/admin/analise-documental', beforeLoad: () => exigirTelaAdmin('analiseDocumental'), component: () => <EmConstrucao tituloKey="common.nav.analiseDocumental" /> });
const rAdminDistribuicao = createRoute({ getParentRoute: () => adminLayout, path: '/admin/distribuicao', beforeLoad: () => exigirTelaAdmin('distribuicao'), component: () => <EmConstrucao tituloKey="common.nav.distribuicao" /> });
const rAdminCadastroReserva = createRoute({ getParentRoute: () => adminLayout, path: '/admin/cadastro-reserva', beforeLoad: () => exigirTelaAdmin('cadastroReserva'), component: () => <EmConstrucao tituloKey="common.nav.cadastroReserva" /> });
const rAdminDesistencias = createRoute({ getParentRoute: () => adminLayout, path: '/admin/desistencias', beforeLoad: () => exigirTelaAdmin('desistencias'), component: () => <EmConstrucao tituloKey="common.nav.desistencias" /> });
const rAdminSecretarias = createRoute({ getParentRoute: () => adminLayout, path: '/admin/secretarias', beforeLoad: () => exigirTelaAdmin('secretarias'), component: Secretarias });
const rAdminSetores = createRoute({ getParentRoute: () => adminLayout, path: '/admin/setores-industriais', beforeLoad: () => exigirTelaAdmin('setoresIndustriais'), component: SetoresIndustriais });
const rAdminTiposArquivos = createRoute({ getParentRoute: () => adminLayout, path: '/admin/tipos-arquivos', beforeLoad: () => exigirTelaAdmin('tiposArquivos'), component: () => <EmConstrucao tituloKey="common.nav.tiposArquivos" /> });

const naoEncontrada = createRoute({ getParentRoute: () => rootRoute, path: '*', beforeLoad: () => { throw redirect({ to: '/cadastro' }); } });

const routeTree = rootRoute.addChildren([
  indexRoute,
  cadastroRoute,
  redefinirSenhaRoute,
  fornecedorLayout.addChildren([rInicio, rMinhaConta, rProcuradores, rPrivacidade, rEditais, rCredenciamento, rMeusCredenciamentos, rContestarCnae, rContestacao, rDocumentos, rTransparencia, rTitular]),
  adminLayout.addChildren([
    rAdminIndex, rAdminDash, rAdminCoval, rAdminEditais, rAdminContest, rAdminMalote, rAdminCatalogos,
    rAdminUsuarios, rAdminLgpd, rAdminAudit, rAdminPerfis,
    rAdminFornecedores, rAdminCredenciamento, rAdminAnaliseDoc, rAdminDistribuicao,
    rAdminCadastroReserva, rAdminDesistencias, rAdminSecretarias, rAdminSetores, rAdminTiposArquivos,
  ]),
  naoEncontrada,
]);

export const router = createRouter({ routeTree, history: createHashHistory(), defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
