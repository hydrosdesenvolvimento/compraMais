import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { cores, tipografia } from './design-system/tokens';
import { BarraAcessibilidade } from './design-system/components';

// Páginas públicas (Portal do Fornecedor / Transparência)
import { AuthPanel } from './pages/publico/AuthPanel';
import { Editais } from './pages/publico/Editais';
import { ContestarCnae } from './pages/publico/ContestarCnae';
import { Documentos } from './pages/publico/Documentos';
import { Contestacao } from './pages/publico/Contestacao';
import { MinhaConta } from './pages/publico/MinhaConta';
import { PainelTitular } from './pages/publico/PainelTitular';
import { Transparencia } from './pages/publico/Transparencia';

// Páginas administrativas (Painel CPL/SMGA)
import { Dashboard } from './pages/admin/Dashboard';
import { FilaCovalidacao } from './pages/admin/FilaCovalidacao';
import { GerirEditais } from './pages/admin/GerirEditais';
import { FilaContestacoes } from './pages/admin/FilaContestacoes';
import { ConsultaAuditoria } from './pages/admin/ConsultaAuditoria';

/**
 * Shell único do compraMais (AD-3): hospeda as DUAS superfícies — Portal Público e Painel Admin —
 * num só container/SPA, compartilhando o Design System. Roteamento por HASH para não colidir com
 * os prefixos de API encaminhados pelo proxy (Vite em dev, nginx em prod): a navegação fica no
 * fragmento (#/...), enquanto fetch('/editais'), fetch('/admin/dashboard') etc. vão ao backend.
 *
 * Onda 1 (dados sintéticos): páginas que dependem de identidade recebem ids de demonstração; a
 * resolução real virá da sessão/identidade (shared/identity) numa próxima fase.
 */
const DEMO_FORNECEDOR_ID = 'demo-fornecedor';
const DEMO_EDITAL_ID = 'demo-edital';
const DEMO_SECRETARIA_ID = 'demo-secretaria';

const demoFornecedor = { razaoSocial: 'Empresa Demonstração LTDA', cnpj: '12.345.678/0001-90', porte: 'ME' };

async function sincronizarDemo(): Promise<void> {
  await fetch(`/fornecedores/${DEMO_FORNECEDOR_ID}/sincronizar`, { method: 'POST' });
}

function Navegacao() {
  const link = { color: cores.branco, textDecoration: 'none', padding: '6px 10px', borderRadius: 6 };
  return (
    <nav aria-label="Navegação principal" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: cores.azul800, padding: 8 }}>
      <Link data-cy="nav-cadastro" style={link} to="/cadastro">Cadastro</Link>
      <Link data-cy="nav-editais" style={link} to="/editais">Editais</Link>
      <Link data-cy="nav-documentos" style={link} to="/documentos">Documentos</Link>
      <Link data-cy="nav-contestacao" style={link} to="/contestacao">Pendências</Link>
      <Link data-cy="nav-conta" style={link} to="/minha-conta">Minha conta</Link>
      <Link data-cy="nav-titular" style={link} to="/titular">Meus direitos</Link>
      <Link data-cy="nav-transparencia" style={link} to="/transparencia">Transparência</Link>
      <span aria-hidden style={{ borderLeft: `1px solid ${cores.azul500}`, margin: '0 6px' }} />
      <Link data-cy="nav-admin" style={link} to="/admin/dashboard">Admin</Link>
      <Link data-cy="nav-covalidacao" style={link} to="/admin/covalidacao">Covalidação</Link>
      <Link data-cy="nav-gestao-editais" style={link} to="/admin/editais">Gestão de editais</Link>
      <Link data-cy="nav-auditoria" style={link} to="/admin/auditoria">Auditoria</Link>
    </nav>
  );
}

export default function App() {
  return (
    <HashRouter>
      {/* Foco visível âmbar (e-MAG / WCAG 2.1 AA) — contrato do Design System. */}
      <style>{`*:focus-visible { outline: 3px solid ${cores.acentoAmbar}; outline-offset: 3px; }`}</style>
      <div data-cy="app-root" style={{ fontFamily: tipografia.familia, color: cores.tinta, minHeight: '100vh' }}>
        <header style={{ background: cores.azul900, color: cores.branco, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>compraMais · Prefeitura de Rio Branco</strong>
          <BarraAcessibilidade />
        </header>
        <Navegacao />
        <main>
          <Routes>
            {/* Portal Público */}
            <Route path="/" element={<Navigate to="/cadastro" replace />} />
            <Route path="/cadastro" element={<AuthPanel />} />
            <Route path="/inicio" element={<Editais />} />
            <Route path="/editais" element={<Editais />} />
            <Route path="/editais/contestar" element={<ContestarCnae editalId={DEMO_EDITAL_ID} />} />
            <Route path="/documentos" element={<Documentos fornecedorId={DEMO_FORNECEDOR_ID} />} />
            <Route path="/contestacao" element={<Contestacao fornecedorId={DEMO_FORNECEDOR_ID} />} />
            <Route path="/minha-conta" element={<MinhaConta fornecedor={demoFornecedor} onSincronizar={sincronizarDemo} />} />
            <Route path="/titular" element={<PainelTitular fornecedorId={DEMO_FORNECEDOR_ID} />} />
            <Route path="/transparencia" element={<Transparencia />} />

            {/* Painel Administrativo */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/covalidacao" element={<FilaCovalidacao fornecedorId={DEMO_FORNECEDOR_ID} />} />
            <Route path="/admin/editais" element={<GerirEditais secretariaId={DEMO_SECRETARIA_ID} />} />
            <Route path="/admin/contestacoes" element={<FilaContestacoes editalId={DEMO_EDITAL_ID} />} />
            <Route path="/admin/auditoria" element={<ConsultaAuditoria />} />

            <Route path="*" element={<Navigate to="/cadastro" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
