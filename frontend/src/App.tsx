import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppShell, type ItemMenu, type UsuarioChip } from './design-system/AppShell';
import { AuthLayout } from './design-system/AuthLayout';
import {
  IconeInicio, IconeEditais, IconeCredenciamentos, IconeDocumentos, IconeDemandas,
} from './design-system/icons';

// Páginas do Portal do Fornecedor
import { AuthPanel } from './pages/publico/AuthPanel';
import { Editais } from './pages/publico/Editais';
import { ContestarCnae } from './pages/publico/ContestarCnae';
import { Documentos } from './pages/publico/Documentos';
import { Contestacao } from './pages/publico/Contestacao';
import { MinhaConta } from './pages/publico/MinhaConta';
import { PainelTitular } from './pages/publico/PainelTitular';
import { Transparencia } from './pages/publico/Transparencia';

// Painel administrativo (CPL/SMGA)
import { Dashboard } from './pages/admin/Dashboard';
import { FilaCovalidacao } from './pages/admin/FilaCovalidacao';
import { GerirEditais } from './pages/admin/GerirEditais';
import { FilaContestacoes } from './pages/admin/FilaContestacoes';
import { ConsultaAuditoria } from './pages/admin/ConsultaAuditoria';

/**
 * Shell único (AD-3): Portal do Fornecedor + Painel Admin, com o layout do design de referência
 * (sidebar + topbar). Roteamento por HASH para não colidir com os prefixos de API do proxy.
 * Onda 1: dados sintéticos; identidade real virá da sessão (shared/identity) depois.
 */
const DEMO_FORNECEDOR_ID = 'demo-fornecedor';
const DEMO_EDITAL_ID = 'demo-edital';
const DEMO_SECRETARIA_ID = 'demo-secretaria';

const demoFornecedor = { razaoSocial: 'Confecções Vale do Acre Ltda', cnpj: '12.345.678/0001-90', porte: 'ME' };
const demoSync = { quando: '24/06/2026 às 09:12', status: 'sucesso' as const };
async function sincronizarDemo(): Promise<void> { await fetch(`/fornecedores/${DEMO_FORNECEDOR_ID}/sincronizar`, { method: 'POST' }); }

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

function LayoutFornecedor() {
  return <AppShell menu={MENU_FORNECEDOR} usuario={USUARIO_FORNECEDOR}><Outlet /></AppShell>;
}
function LayoutAdmin() {
  return <AppShell menu={MENU_ADMIN} usuario={USUARIO_ADMIN} rodape="Painel administrativo · CPL / SMGA"><Outlet /></AppShell>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Autenticação — sem shell (painel dividido) */}
        <Route path="/cadastro" element={<AuthLayout><AuthPanel /></AuthLayout>} />

        {/* Portal do Fornecedor — shell */}
        <Route element={<LayoutFornecedor />}>
          <Route path="/inicio" element={<MinhaConta fornecedor={demoFornecedor} ultimaSync={demoSync} onSincronizar={sincronizarDemo} />} />
          <Route path="/minha-conta" element={<MinhaConta fornecedor={demoFornecedor} ultimaSync={demoSync} onSincronizar={sincronizarDemo} />} />
          <Route path="/editais" element={<Editais />} />
          <Route path="/editais/contestar" element={<ContestarCnae editalId={DEMO_EDITAL_ID} />} />
          <Route path="/contestacao" element={<Contestacao fornecedorId={DEMO_FORNECEDOR_ID} />} />
          <Route path="/documentos" element={<Documentos fornecedorId={DEMO_FORNECEDOR_ID} />} />
          <Route path="/transparencia" element={<Transparencia />} />
          <Route path="/titular" element={<PainelTitular fornecedorId={DEMO_FORNECEDOR_ID} />} />
        </Route>

        {/* Painel administrativo — shell */}
        <Route element={<LayoutAdmin />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/covalidacao" element={<FilaCovalidacao fornecedorId={DEMO_FORNECEDOR_ID} />} />
          <Route path="/admin/editais" element={<GerirEditais secretariaId={DEMO_SECRETARIA_ID} />} />
          <Route path="/admin/contestacoes" element={<FilaContestacoes editalId={DEMO_EDITAL_ID} />} />
          <Route path="/admin/auditoria" element={<ConsultaAuditoria />} />
        </Route>

        <Route path="/" element={<Navigate to="/cadastro" replace />} />
        <Route path="*" element={<Navigate to="/cadastro" replace />} />
      </Routes>
    </HashRouter>
  );
}
