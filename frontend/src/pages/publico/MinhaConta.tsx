import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { Card, Pill, Botao, Campo } from '../../design-system/components';
import { IconeSync, IconeCadeado, IconeCamera, IconeCheck } from '../../design-system/icons';
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
  ultimaSync?: { quando: string; status: 'sucesso' | 'revisao' | 'erro' };
}

/** Formata o timestamp ISO devolvido pela re-sincronização (UC018) no idioma ativo. */
function formatarQuando(iso: string | undefined, lang: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' });
}

/* Rótulo de seção maiúsculo (ex.: "DADOS OFICIAIS · RECEITA FEDERAL"). */
function SecaoLabel({ children, cor = 'var(--azul-700)', icone }: { children: ReactNode; cor?: string; icone?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px' }}>
      {icone}
      <span style={{ font: '600 11px var(--font-body)', letterSpacing: '.08em', color: cor }}>{children}</span>
    </div>
  );
}

/* Campo somente-leitura no estilo do mockup (fundo azul tint). */
function CampoOficial({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div style={{ font: '600 11.5px var(--font-body)', color: 'var(--cinza-500)', marginBottom: 5 }}>{rotulo}</div>
      <div style={{ padding: '11px 14px', background: 'var(--azul-50)', border: '1px solid var(--azul-100)', borderRadius: 9, fontSize: 14, color: 'var(--azul-900)' }}>{valor}</div>
    </div>
  );
}

export function MinhaConta({ fornecedor, fornecedorId, ultimaSync }: MinhaContaProps) {
  const { t, i18n } = useTranslation();
  const iniciais = fornecedor.razaoSocial.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  const sincronizar = useMutation({ mutationFn: () => api.sincronizar(fornecedorId) });
  // UC018: o backend responde 200 com { status, quando, fonte } inclusive para erro/revisão (A1/exceção);
  // uma falha HTTP (rede) cai em `isError`. O timestamp devolvido atualiza a "última sincronização".
  const resultado = sincronizar.data;
  const syncStatus = resultado?.status ?? (sincronizar.isError ? 'erro' : ultimaSync?.status);
  const quandoExibido = formatarQuando(resultado?.quando, i18n.language) ?? ultimaSync?.quando;

  return (
    <div className="stack">
      <div style={{ marginBottom: 4 }}>
        <h1 className="page-title" style={{ fontWeight: 600 }}>{t('minhaConta.titulo')}</h1>
        <p className="page-sub">{t('minhaConta.subtitulo')}</p>
      </div>

      {/* Barra de sincronização do CNPJ (navy) */}
      <div
        className="card-navy"
        data-cy="card-sync"
        style={{ background: 'linear-gradient(135deg,var(--azul-900),var(--azul-700))', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}
      >
        <span
          className="avatar"
          style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.13)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', flexShrink: 0 }}
        >
          <IconeSync width={24} height={24} />
        </span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ font: '600 16px var(--font-body)' }}>{t('minhaConta.sync.titulo')}</div>
          {quandoExibido && (
            <div data-cy="sync-ultima" style={{ fontSize: 13, color: 'var(--azul-100)', marginTop: 3 }}>
              <Trans i18nKey="minhaConta.sync.ultima" values={{ quando: quandoExibido }} components={{ b: <strong style={{ color: '#fff' }} /> }} />
            </div>
          )}
          {syncStatus === 'sucesso' && (
            <div data-cy="sync-sucesso" style={{ fontSize: 12.5, color: 'var(--ambar-300)', marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconeCheck width={14} height={14} strokeWidth={2.4} /> {t('minhaConta.sync.sucesso')}
            </div>
          )}
          {syncStatus === 'revisao' && (
            <div data-cy="sync-revisao" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Pill tom="warn">{t('minhaConta.sync.revisao')}</Pill>
              <span style={{ fontSize: 12.5, color: 'var(--azul-100)' }}>{t('minhaConta.sync.revisaoDetalhe')}</span>
            </div>
          )}
          {syncStatus === 'erro' && (
            <div data-cy="sync-erro" style={{ marginTop: 8 }}><Pill tom="error">{t('minhaConta.sync.erro')}</Pill></div>
          )}
        </div>
        <Botao
          data-cy="sincronizar"
          variante="amber"
          onClick={() => sincronizar.mutate()}
          disabled={sincronizar.isPending}
          style={{ padding: '12px 22px', borderRadius: 10, flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          <IconeSync width={17} height={17} /> {sincronizar.isPending ? t('minhaConta.sync.sincronizando') : t('minhaConta.sync.sincronizarAgora')}
        </Botao>
      </div>

      {/* Dados do responsável / foto / senha */}
      <ResponsavelCard iniciais={iniciais} fantasia={fornecedor.razaoSocial} />

      {/* Empresa: identidade + dados oficiais (somente leitura) + editáveis */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '2px 0 22px', borderBottom: '1px solid var(--divider)', flexWrap: 'wrap' }}>
          <span
            className="avatar"
            style={{ width: 64, height: 64, borderRadius: 14, fontSize: 22, flexShrink: 0 }}
          >
            {iniciais}
          </span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ font: '600 18px var(--font-body)', color: 'var(--azul-900)' }}>{fornecedor.razaoSocial}</div>
            <div style={{ fontSize: 13.5, color: 'var(--cinza-500)', marginTop: 2 }}>{t('minhaConta.empresa.cnpjPrefixo')} {fornecedor.cnpj}</div>
          </div>
          <Pill tom="success">{t('minhaConta.empresa.ativa')}</Pill>
        </div>

        <div style={{ paddingTop: 24 }}>
          <SecaoLabel cor="var(--cinza-500)" icone={<IconeCadeado width={15} height={15} strokeWidth={1.9} style={{ color: 'var(--cinza-400)' }} />}>
            {t('minhaConta.empresa.dadosOficiaisLabel')}
          </SecaoLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px 18px' }}>
            <CampoOficial rotulo={t('minhaConta.empresa.razaoSocial')} valor={fornecedor.razaoSocial} />
            <CampoOficial rotulo={t('minhaConta.empresa.cnpj')} valor={fornecedor.cnpj} />
            <CampoOficial rotulo={t('minhaConta.empresa.situacaoCadastral')} valor={t('minhaConta.empresa.ativa')} />
            <CampoOficial rotulo={t('minhaConta.empresa.porteEmpresa')} valor={fornecedor.porte} />
          </div>

          <DadosEditaveis />
        </div>
      </Card>
    </div>
  );
}

/** Cartão "Dados do responsável": avatar, nome/sobrenome, foto e alteração de senha. */
function ResponsavelCard({ iniciais, fantasia }: { iniciais: string; fantasia: string }) {
  const { t } = useTranslation();
  const [editSenha, setEditSenha] = useState(false);

  return (
    <Card>
      <SecaoLabel>{t('minhaConta.responsavel.secaoLabel')}</SecaoLabel>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', paddingBottom: 22, borderBottom: '1px solid var(--divider)' }}>
        <span className="avatar" style={{ width: 80, height: 80, fontSize: 28, flexShrink: 0 }}>{iniciais}</span>
        <div>
          <div style={{ font: '600 17px var(--font-body)', color: 'var(--azul-900)' }}>{t('minhaConta.responsavel.responsavelLegal')}</div>
          <div style={{ fontSize: 13.5, color: 'var(--cinza-500)', margin: '2px 0 12px' }}>{t('minhaConta.responsavel.procurador')} · {fantasia}</div>
          <button className="btn btn-ghost" style={{ padding: '9px 16px', fontSize: 13.5 }} type="button">
            <IconeCamera width={16} height={16} /> {t('minhaConta.responsavel.alterarFoto')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginTop: 22 }}>
        <Campo label={t('minhaConta.responsavel.nome')}><input className="input" placeholder={t('minhaConta.responsavel.nome')} /></Campo>
        <Campo label={t('minhaConta.responsavel.sobrenome')}><input className="input" placeholder={t('minhaConta.responsavel.sobrenome')} /></Campo>
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="label">{t('minhaConta.responsavel.senha')}</label>
        {!editSenha ? (
          <button className="btn btn-ghost" style={{ padding: '11px 18px' }} type="button" onClick={() => setEditSenha(true)}>
            <IconeCadeado width={16} height={16} /> {t('minhaConta.responsavel.alterarSenha')}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="input" type="password" placeholder={t('minhaConta.responsavel.novaSenhaPlaceholder')} style={{ flex: 1, minWidth: 240 }} />
            <button
              type="button"
              onClick={() => setEditSenha(false)}
              style={{ padding: '11px 16px', border: 'none', background: 'none', color: 'var(--cinza-500)', font: '600 13.5px var(--font-body)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {t('minhaConta.responsavel.cancelar')}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Formulário editável (TanStack Form): autofill de CEP (Query) e CPF do responsável (validação). */
function DadosEditaveis() {
  const { t } = useTranslation();
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
    <form onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}>
      <div style={{ margin: '28px 0 0' }}>
        <SecaoLabel icone={
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--azul-700)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        }>
          {t('minhaConta.editaveis.secaoLabel')}
        </SecaoLabel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        <form.Field name="nomeFantasia">{(f) => <Campo label={t('minhaConta.editaveis.nomeFantasia')}><input className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder={t('minhaConta.editaveis.nomeFantasia')} /></Campo>}</form.Field>
        <form.Field name="telefone">{(f) => <Campo label={t('minhaConta.editaveis.telefone')}><input className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="(68) 0000-0000" /></Campo>}</form.Field>
      </div>

      <div style={{ font: '600 11px var(--font-body)', letterSpacing: '.08em', color: 'var(--azul-700)', margin: '24px 0 14px' }}>{t('minhaConta.editaveis.endereco')}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
        <form.Field name="rua">{(f) => <Campo label={t('minhaConta.editaveis.logradouro')}><input data-cy="rua" className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder={t('minhaConta.editaveis.ruaAvenida')} /></Campo>}</form.Field>
        <form.Field name="bairro">{(f) => <Campo label={t('minhaConta.editaveis.bairro')}><input data-cy="bairro" className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder={t('minhaConta.editaveis.bairro')} /></Campo>}</form.Field>
        <form.Field name="cidade">{(f) => <Campo label={t('minhaConta.editaveis.cidade')}><input data-cy="cidade" className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder={t('minhaConta.editaveis.cidade')} /></Campo>}</form.Field>
        <form.Field name="uf">{(f) => <Campo label={t('minhaConta.editaveis.uf')}><input data-cy="uf" className="input" maxLength={2} value={f.state.value} onChange={(e) => f.handleChange(e.target.value.toUpperCase())} placeholder={t('minhaConta.editaveis.uf')} /></Campo>}</form.Field>

        <form.Field name="cep">
          {(f) => (
            <Campo label={t('minhaConta.editaveis.cep')}>
              <input data-cy="cep" className="input" inputMode="numeric" placeholder="00000-000" value={f.state.value}
                onChange={(e) => { const m = mascaraCep(e.target.value); cepMut.reset(); f.handleChange(m); if (m.replace(/\D/g, '').length === 8) buscarCep(m); }}
                onBlur={(e) => buscarCep(e.target.value)} />
              {cepMut.isPending && <small style={{ color: 'var(--texto-suave)' }}>{t('minhaConta.editaveis.cepBuscando')}</small>}
              {cepMut.isSuccess && cepMut.data && <small style={{ color: 'var(--sucesso)' }}>{t('minhaConta.editaveis.cepPreenchido')}</small>}
              {cepMut.isSuccess && !cepMut.data && <small style={{ color: 'var(--erro)' }}>{t('minhaConta.editaveis.cepNaoEncontrado')}</small>}
            </Campo>
          )}
        </form.Field>

        <form.Field name="cpf" validators={{ onChange: ({ value }: { value: string }) => (value.replace(/\D/g, '').length === 11 && !validarCpf(value) ? t('minhaConta.editaveis.cpfInvalido') : undefined) }}>
          {(f) => (
            <Campo label={t('minhaConta.editaveis.cpfResponsavel')}>
              <input data-cy="cpf" className="input" inputMode="numeric" placeholder="000.000.000-00" value={f.state.value}
                onChange={(e) => f.handleChange(mascaraCpf(e.target.value))}
                aria-invalid={f.state.meta.errors.length > 0}
                style={f.state.meta.errors.length > 0 ? { borderColor: 'var(--erro)' } : f.state.value.replace(/\D/g, '').length === 11 ? { borderColor: 'var(--sucesso)' } : undefined} />
              {f.state.meta.errors[0] ? <small data-cy="cpf-erro" style={{ color: 'var(--erro)' }}>{String(f.state.meta.errors[0])}</small>
                : f.state.value.replace(/\D/g, '').length === 11 && <small data-cy="cpf-ok" style={{ color: 'var(--sucesso)' }}>{t('minhaConta.editaveis.cpfValido')}</small>}
            </Campo>
          )}
        </form.Field>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 26, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" style={{ padding: '11px 20px' }}>{t('minhaConta.editaveis.cancelar')}</button>
        <Botao variante="primario" type="submit" style={{ padding: '12px 24px' }}>
          <IconeCheck width={16} height={16} strokeWidth={2} /> {t('minhaConta.editaveis.salvar')}
        </Botao>
      </div>
    </form>
  );
}
