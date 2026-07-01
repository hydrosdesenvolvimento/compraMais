import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { Card, Pill, Avatar, Botao, Campo } from '../../design-system/components';
import { IconeSync, IconeCadeado } from '../../design-system/icons';
import { mascaraCpf, mascaraCep, validarCpf, consultarCep } from '../../lib/br';
import { api } from '../../lib/api';

/**
 * "Minha conta" (UX-DR4 / RN009 / RF018) — dashboard do fornecedor (design de referência).
 * Sincronização e autofill de CEP via TanStack Query; formulário editável via TanStack Form
 * (autofill de endereço por CEP + CPF do responsável com validação de dígitos).
 */
export interface MinhaContaProps {
  fornecedor: { razaoSocial: string; cnpj: string; porte: string };
  fornecedorId: string;
  ultimaSync?: { quando: string; status: 'sucesso' | 'erro' };
}

export function MinhaConta({ fornecedor, fornecedorId, ultimaSync }: MinhaContaProps) {
  const iniciais = fornecedor.razaoSocial.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  const sincronizar = useMutation({ mutationFn: () => api.sincronizar(fornecedorId) });
  const syncStatus = sincronizar.isSuccess ? 'sucesso' : sincronizar.isError ? 'erro' : ultimaSync?.status;

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
          {syncStatus && <div style={{ marginTop: 10 }}><Pill tom={syncStatus === 'sucesso' ? 'success' : 'error'}>{syncStatus === 'sucesso' ? 'Sucesso' : 'Erro'}</Pill></div>}
        </div>
        <Botao data-cy="sincronizar" variante="amber" onClick={() => sincronizar.mutate()} disabled={sincronizar.isPending}><IconeSync width={18} height={18} /> Sincronizar agora</Botao>
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

/** Formulário editável (TanStack Form): autofill de CEP (Query) e CPF do responsável (validação). */
function DadosEditaveis() {
  const cepMut = useMutation({ mutationFn: (cep: string) => consultarCep(cep) });
  const form = useForm({
    defaultValues: { nomeFantasia: '', cep: '', rua: '', bairro: '', cidade: '', uf: '', telefone: '', cpf: '' },
    onSubmit: async () => { /* persistência do perfil — PATCH /fornecedores/:id (próxima fase) */ },
  });

  function buscarCep(valor: string) {
    if (valor.replace(/\D/g, '').length !== 8) return;
    cepMut.mutate(valor, {
      onSuccess: (e) => {
        if (!e) return;
        form.setFieldValue('rua', e.rua);
        form.setFieldValue('bairro', e.bairro);
        form.setFieldValue('cidade', e.cidade);
        form.setFieldValue('uf', e.estado);
      },
    });
  }

  return (
    <Card>
      <h3 style={{ fontSize: 16, marginBottom: 14 }}>Dados editáveis</h3>
      <form onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <form.Field name="nomeFantasia">{(f) => <Campo label="Nome Fantasia"><input className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="Nome Fantasia" /></Campo>}</form.Field>

          <form.Field name="cep">
            {(f) => (
              <Campo label="CEP">
                <input data-cy="cep" className="input" inputMode="numeric" placeholder="00000-000" value={f.state.value}
                  onChange={(e) => { const m = mascaraCep(e.target.value); f.handleChange(m); if (m.replace(/\D/g, '').length === 8) buscarCep(m); }}
                  onBlur={(e) => buscarCep(e.target.value)} />
                {cepMut.isPending && <small style={{ color: 'var(--texto-suave)' }}>Buscando endereço…</small>}
                {cepMut.isSuccess && cepMut.data && <small style={{ color: 'var(--sucesso)' }}>Endereço preenchido pela BrasilAPI</small>}
                {cepMut.isSuccess && !cepMut.data && <small style={{ color: 'var(--erro)' }}>CEP não encontrado</small>}
              </Campo>
            )}
          </form.Field>

          <form.Field name="rua">{(f) => <Campo label="Logradouro"><input data-cy="rua" className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="Rua / Avenida" /></Campo>}</form.Field>
          <form.Field name="bairro">{(f) => <Campo label="Bairro"><input data-cy="bairro" className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="Bairro" /></Campo>}</form.Field>
          <form.Field name="cidade">{(f) => <Campo label="Cidade"><input data-cy="cidade" className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="Cidade" /></Campo>}</form.Field>
          <form.Field name="uf">{(f) => <Campo label="UF"><input data-cy="uf" className="input" maxLength={2} value={f.state.value} onChange={(e) => f.handleChange(e.target.value.toUpperCase())} placeholder="UF" /></Campo>}</form.Field>
          <form.Field name="telefone">{(f) => <Campo label="Telefone"><input className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="(68) 0000-0000" /></Campo>}</form.Field>

          <form.Field name="cpf" validators={{ onChange: ({ value }: { value: string }) => (value.replace(/\D/g, '').length === 11 && !validarCpf(value) ? 'CPF inválido' : undefined) }}>
            {(f) => (
              <Campo label="CPF do responsável">
                <input data-cy="cpf" className="input" inputMode="numeric" placeholder="000.000.000-00" value={f.state.value}
                  onChange={(e) => f.handleChange(mascaraCpf(e.target.value))}
                  aria-invalid={f.state.meta.errors.length > 0}
                  style={f.state.meta.errors.length > 0 ? { borderColor: 'var(--erro)' } : f.state.value.replace(/\D/g, '').length === 11 ? { borderColor: 'var(--sucesso)' } : undefined} />
                {f.state.meta.errors[0] ? <small data-cy="cpf-erro" style={{ color: 'var(--erro)' }}>{String(f.state.meta.errors[0])}</small>
                  : f.state.value.replace(/\D/g, '').length === 11 && <small data-cy="cpf-ok" style={{ color: 'var(--sucesso)' }}>CPF válido</small>}
              </Campo>
            )}
          </form.Field>
        </div>
        <Botao variante="primario" type="submit" style={{ marginTop: 8 }}>Salvar alterações</Botao>
      </form>
    </Card>
  );
}
