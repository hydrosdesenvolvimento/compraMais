import { useState } from 'react';
import { Card, Pill, Avatar, Botao, Campo } from '../../design-system/components';
import { IconeSync, IconeCadeado } from '../../design-system/icons';
import { mascaraCpf, mascaraCep, validarCpf, consultarCep } from '../../lib/br';

/**
 * "Minha conta" (UX-DR4 / RN009 / RF018) — dashboard do fornecedor conforme o design de referência.
 * Dados oficiais da Receita em SOMENTE LEITURA; editáveis com autofill de CEP (BrasilAPI) e CPF do
 * responsável (máscara + validação de dígitos — CPF não tem consulta pública).
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

      <DadosEditaveis />
    </div>
  );
}

/** Formulário editável com autofill de CEP (BrasilAPI) e CPF do responsável (máscara + validação). */
function DadosEditaveis() {
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState({ rua: '', bairro: '', cidade: '', uf: '' });
  const [cepStatus, setCepStatus] = useState<'idle' | 'buscando' | 'ok' | 'erro'>('idle');
  const [cpf, setCpf] = useState('');

  const cpfDigitos = cpf.replace(/\D/g, '');
  const cpfValido = cpfDigitos.length === 11 ? validarCpf(cpf) : null;

  async function buscarCep(valor: string) {
    if (valor.replace(/\D/g, '').length !== 8) return;
    setCepStatus('buscando');
    try {
      const e = await consultarCep(valor);
      if (e) { setEndereco({ rua: e.rua, bairro: e.bairro, cidade: e.cidade, uf: e.estado }); setCepStatus('ok'); }
      else setCepStatus('erro');
    } catch { setCepStatus('erro'); }
  }

  return (
    <Card>
      <h3 style={{ fontSize: 16, marginBottom: 14 }}>Dados editáveis</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        <Campo label="Nome Fantasia"><input className="input" name="nomeFantasia" placeholder="Nome Fantasia" /></Campo>

        <Campo label="CEP">
          <input
            className="input" data-cy="cep" inputMode="numeric" placeholder="00000-000" value={cep}
            onChange={(e) => { const m = mascaraCep(e.target.value); setCep(m); setCepStatus('idle'); if (m.replace(/\D/g, '').length === 8) void buscarCep(m); }}
            onBlur={(e) => void buscarCep(e.target.value)}
          />
          {cepStatus === 'buscando' && <small style={{ color: 'var(--texto-suave)' }}>Buscando endereço…</small>}
          {cepStatus === 'ok' && <small style={{ color: 'var(--sucesso)' }}>Endereço preenchido pela BrasilAPI</small>}
          {cepStatus === 'erro' && <small style={{ color: 'var(--erro)' }}>CEP não encontrado</small>}
        </Campo>

        <Campo label="Logradouro"><input className="input" data-cy="rua" placeholder="Rua / Avenida" value={endereco.rua} onChange={(e) => setEndereco({ ...endereco, rua: e.target.value })} /></Campo>
        <Campo label="Bairro"><input className="input" data-cy="bairro" placeholder="Bairro" value={endereco.bairro} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} /></Campo>
        <Campo label="Cidade"><input className="input" data-cy="cidade" placeholder="Cidade" value={endereco.cidade} onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })} /></Campo>
        <Campo label="UF"><input className="input" data-cy="uf" placeholder="UF" maxLength={2} value={endereco.uf} onChange={(e) => setEndereco({ ...endereco, uf: e.target.value.toUpperCase() })} /></Campo>

        <Campo label="Telefone"><input className="input" name="telefone" placeholder="(68) 0000-0000" /></Campo>

        <Campo label="CPF do responsável">
          <input
            className="input" data-cy="cpf" inputMode="numeric" placeholder="000.000.000-00" value={cpf}
            onChange={(e) => setCpf(mascaraCpf(e.target.value))}
            aria-invalid={cpfValido === false}
            style={cpfValido === false ? { borderColor: 'var(--erro)' } : cpfValido ? { borderColor: 'var(--sucesso)' } : undefined}
          />
          {cpfValido === true && <small data-cy="cpf-ok" style={{ color: 'var(--sucesso)' }}>CPF válido</small>}
          {cpfValido === false && <small data-cy="cpf-erro" style={{ color: 'var(--erro)' }}>CPF inválido</small>}
        </Campo>
      </div>
      <Botao variante="primario" style={{ marginTop: 8 }}>Salvar alterações</Botao>
    </Card>
  );
}
