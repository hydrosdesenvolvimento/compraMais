import { Card, Pill, Avatar, Botao, Campo } from '../../design-system/components';
import { IconeSync, IconeCadeado } from '../../design-system/icons';

/**
 * "Minha conta" (UX-DR4 / RN009 / RF018) — dashboard do fornecedor conforme o design de referência.
 * Dados oficiais da Receita em SOMENTE LEITURA; só Nome Fantasia/Endereço/Telefone editáveis.
 */
export interface MinhaContaProps {
  fornecedor: { razaoSocial: string; cnpj: string; porte: string };
  ultimaSync?: { quando: string; status: 'sucesso' | 'erro' };
  onSincronizar: () => void;
}

export function MinhaConta({ fornecedor, ultimaSync, onSincronizar }: MinhaContaProps) {
  const iniciais = fornecedor.razaoSocial.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Minha conta</h1>
        <p className="page-sub">Dados oficiais da empresa obtidos pela Receita Federal (API do CNPJ). Apenas Nome Fantasia, Endereço e Telefone podem ser editados.</p>
      </div>

      <div className="card-navy" data-cy="card-sync" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <span className="avatar" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', width: 54, height: 54 }}><IconeSync /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <strong style={{ fontSize: 18 }}>Sincronizar dados do CNPJ</strong>
          {ultimaSync && <div style={{ color: '#c7d6ea', fontSize: 14, marginTop: 4 }}>Última sincronização: <b style={{ color: '#fff' }}>{ultimaSync.quando}</b></div>}
          {ultimaSync && <div style={{ marginTop: 10 }}><Pill tom={ultimaSync.status === 'sucesso' ? 'success' : 'error'}>{ultimaSync.status === 'sucesso' ? 'Sucesso' : 'Erro'}</Pill></div>}
        </div>
        <Botao data-cy="sincronizar" variante="amber" onClick={onSincronizar}><IconeSync width={18} height={18} /> Sincronizar agora</Botao>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Avatar iniciais={iniciais} size={56} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <h2 style={{ fontSize: 22 }}>{fornecedor.razaoSocial}</h2>
            <div style={{ color: 'var(--texto-suave)' }}>CNPJ {fornecedor.cnpj}</div>
          </div>
          <Pill tom="success">Ativa</Pill>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--texto-suave)', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', margin: '20px 0 12px' }}>
          <IconeCadeado width={15} height={15} /> DADOS OFICIAIS · RECEITA FEDERAL (SOMENTE LEITURA)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <Campo label="Razão social"><input className="input" readOnly value={fornecedor.razaoSocial} /></Campo>
          <Campo label="CNPJ"><input className="input" readOnly value={fornecedor.cnpj} /></Campo>
          <Campo label="Porte"><input className="input" readOnly value={fornecedor.porte} /></Campo>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Dados editáveis</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <Campo label="Nome Fantasia"><input className="input" name="nomeFantasia" placeholder="Nome Fantasia" /></Campo>
          <Campo label="Endereço"><input className="input" name="endereco" placeholder="Endereço" /></Campo>
          <Campo label="Telefone"><input className="input" name="telefone" placeholder="(68) 0000-0000" /></Campo>
        </div>
        <Botao variante="primario" style={{ marginTop: 8 }}>Salvar alterações</Botao>
      </Card>
    </div>
  );
}
