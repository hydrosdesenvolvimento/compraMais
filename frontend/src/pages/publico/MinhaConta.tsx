import { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Pill, Botao, Campo, CapturaFacial } from '../../design-system/components';
import { IconeSync, IconeCadeado, IconeCheck } from '../../design-system/icons';
import { mascaraCep, consultarCep } from '../../lib/br';
import { api, HttpError, type EnderecoView } from '../../lib/api';
import { atualizarUsuarioSessao } from '../../lib/auth';
import { SecaoLabel, CampoOficial, FotoResponsavel, TrocaSenhaForm } from '../conta-perfil';

/** Divide um nome completo em nome (1ª palavra) + sobrenome (resto), espelhando a junção ao salvar. */
function dividirNome(completo: string): { nome: string; sobrenome: string } {
  const partes = completo.trim().split(/\s+/).filter(Boolean);
  return { nome: partes[0] ?? '', sobrenome: partes.slice(1).join(' ') };
}

/**
 * "Minha conta" (UX-DR4 / RN009 / RF018) — dashboard do fornecedor (design de referência).
 * Sincronização e autofill de CEP via TanStack Query; formulário editável via TanStack Form
 * (autofill de endereço por CEP). RN009 restringe os campos editáveis a Nome Fantasia, Endereço e
 * Telefone — não há CPF do responsável aqui (o backend rejeita qualquer outro campo com 422).
 */
export type SituacaoCadastral = 'ativa' | 'baixada' | 'inapta' | 'suspensa';

export interface MinhaContaProps {
  fornecedor: {
    razaoSocial: string;
    cnpj: string;
    porte: string;
    situacao: SituacaoCadastral;
    nomeFantasia?: string;
    telefone?: string;
    endereco?: EnderecoView;
  };
  fornecedorId: string;
  ultimaSync?: { quando: string; status: 'sucesso' | 'revisao' | 'erro' };
  /** Chamado após uma sincronização bem-sucedida para o container revalidar os dados oficiais. */
  onSincronizado?: () => void;
}

/** Formata o timestamp ISO devolvido pela re-sincronização (UC018) no idioma ativo. */
function formatarQuando(iso: string | undefined, lang: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' });
}

export function MinhaConta({ fornecedor, fornecedorId, ultimaSync, onSincronizado }: MinhaContaProps) {
  const { t, i18n } = useTranslation();
  const iniciais = fornecedor.razaoSocial.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  const sincronizar = useMutation({
    mutationFn: () => api.sincronizar(fornecedorId),
    // Sucesso/revisão atualizam os dados oficiais no servidor → o container revalida o GET.
    onSuccess: (r) => { if (r.status !== 'erro') onSincronizado?.(); },
  });
  // UC018: o backend responde 200 com { status, quando, fonte } inclusive para erro/revisão (A1/exceção);
  // uma falha HTTP (rede) cai em `isError`. O timestamp devolvido atualiza a "última sincronização".
  const resultado = sincronizar.data;
  const syncStatus = resultado?.status ?? (sincronizar.isError ? 'erro' : ultimaSync?.status);
  const quandoExibido = formatarQuando(resultado?.quando, i18n.language) ?? formatarQuando(ultimaSync?.quando, i18n.language);
  const situacaoLabel = t(`minhaConta.empresa.situacao.${fornecedor.situacao}`);
  const situacaoTom = fornecedor.situacao === 'ativa' ? 'success' : 'warn';

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
      <ResponsavelCard fantasia={fornecedor.razaoSocial} />

      {/* Foto de reconhecimento facial (referência da prova de vida, UC007) */}
      <FotoReconhecimentoCard fornecedorId={fornecedorId} />

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
          <Pill tom={situacaoTom}>{situacaoLabel}</Pill>
        </div>

        <div style={{ paddingTop: 24 }}>
          <SecaoLabel cor="var(--cinza-500)" icone={<IconeCadeado width={15} height={15} strokeWidth={1.9} style={{ color: 'var(--cinza-400)' }} />}>
            {t('minhaConta.empresa.dadosOficiaisLabel')}
          </SecaoLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px 18px' }}>
            <CampoOficial rotulo={t('minhaConta.empresa.razaoSocial')} valor={fornecedor.razaoSocial} />
            <CampoOficial rotulo={t('minhaConta.empresa.cnpj')} valor={fornecedor.cnpj} />
            <CampoOficial rotulo={t('minhaConta.empresa.situacaoCadastral')} valor={situacaoLabel} />
            <CampoOficial rotulo={t('minhaConta.empresa.porteEmpresa')} valor={fornecedor.porte} />
          </div>

          <DadosEditaveis fornecedorId={fornecedorId} onSalvo={onSincronizado} inicial={{ nomeFantasia: fornecedor.nomeFantasia, telefone: fornecedor.telefone, endereco: fornecedor.endereco }} />
        </div>
      </Card>
    </div>
  );
}

/**
 * Cartão "Foto de reconhecimento" (UC007): o responsável cadastra/atualiza a foto de referência da
 * prova de vida. A foto é enviada como documento "Foto do Responsável" e analisada pela CPL — só passa
 * a valer na prova de vida quando aprovada. Reusa `CapturaFacial` (webcam + fallback de upload).
 */
function FotoReconhecimentoCard({ fornecedorId }: { fornecedorId: string }) {
  const { t } = useTranslation();
  const [msg, setMsg] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);
  const [consentBio, setConsentBio] = useState(false);
  const mut = useMutation({
    mutationFn: (imagem: string) => api.enrolarFotoResponsavel(fornecedorId, imagem),
    onSuccess: () => setMsg({ tom: 'ok', texto: t('minhaConta.fotoReconhecimento.enviada') }),
    onError: (e) => {
      const codigo = e instanceof HttpError ? e.codigo : undefined;
      setMsg({ tom: 'erro', texto: t(`credenciamento.provaVida.${codigo}`, { defaultValue: t('minhaConta.fotoReconhecimento.erro') }) });
    },
  });

  return (
    <Card>
      <div data-cy="foto-reconhecimento" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ font: '700 15px var(--font-body)', color: 'var(--azul-900)' }}>{t('minhaConta.fotoReconhecimento.titulo')}</div>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('minhaConta.fotoReconhecimento.descricao')}</p>
        <label data-cy="foto-ref-consentimento" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', font: '400 13px var(--font-body)', color: 'var(--cinza-700)', cursor: 'pointer' }}>
          <input type="checkbox" data-cy="foto-ref-consentimento-check" checked={consentBio} onChange={(e) => setConsentBio(e.target.checked)} style={{ marginTop: 2 }} />
          <span>{t('credenciamento.provaVida.consentimento')}</span>
        </label>
        <CapturaFacial onCapturar={(img) => { setMsg(null); mut.mutate(img); }} ocupado={!consentBio || mut.isPending} cyPrefix="foto-ref" />
        {msg && (
          <div
            data-cy={msg.tom === 'ok' ? 'foto-ref-ok' : 'foto-ref-erro'}
            style={{ color: msg.tom === 'ok' ? 'var(--sucesso, #067647)' : 'var(--erro, #B42318)', font: '600 13px var(--font-body)' }}
          >
            {msg.texto}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Cartão "Dados do responsável": foto, nome/sobrenome e alteração de senha (UC015 · A2, RF018).
 * Foto e nome pertencem ao PRÓPRIO usuário autenticado (GET/PATCH /auth/perfil), não ao fornecedor —
 * por isso o cartão busca o próprio perfil em vez de receber os dados por prop. O `nome` completo é
 * dividido em nome + sobrenome na UI e rejuntado ao salvar (o backend guarda um único `nome`).
 */
function ResponsavelCard({ fantasia }: { fantasia: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editSenha, setEditSenha] = useState(false);

  const perfilQ = useQuery({ queryKey: ['perfil-proprio'], queryFn: () => api.perfilProprio() });
  const perfil = perfilQ.data;

  return (
    <Card>
      <SecaoLabel>{t('minhaConta.responsavel.secaoLabel')}</SecaoLabel>

      {perfilQ.isError ? (
        <p data-cy="perfil-proprio-erro" style={{ margin: 0, fontSize: 13.5, color: 'var(--erro)' }}>{t('minhaConta.responsavel.erroCarregar')}</p>
      ) : (
        <>
          <FotoResponsavel avatar={perfil?.avatar ?? null} nome={perfil?.nome ?? fantasia} fantasia={fantasia} carregando={perfilQ.isLoading} />
          <NomeResponsavel perfilNome={perfil?.nome} carregando={perfilQ.isLoading}
            onSalvo={(atualizado) => {
              qc.setQueryData(['perfil-proprio'], atualizado);
              atualizarUsuarioSessao({ nome: atualizado.nome });
            }} />
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <label className="label">{t('minhaConta.responsavel.senha')}</label>
        {!editSenha ? (
          <button data-cy="abrir-troca-senha" className="btn btn-ghost" style={{ padding: '11px 18px' }} type="button" onClick={() => setEditSenha(true)}>
            <IconeCadeado width={16} height={16} /> {t('minhaConta.responsavel.alterarSenha')}
          </button>
        ) : (
          <TrocaSenhaForm onFechar={() => setEditSenha(false)} />
        )}
      </div>
    </Card>
  );
}

/** Bloco nome + sobrenome (controlados, divididos do `nome` da sessão e rejuntados ao salvar). */
function NomeResponsavel({ perfilNome, carregando, onSalvo }: { perfilNome: string | undefined; carregando: boolean; onSalvo: (p: { userId: string; email: string; nome: string; avatar: string | null }) => void }) {
  const { t } = useTranslation();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');

  // Reidrata os campos quando o perfil chega (ou muda). Antes disso, ficam vazios (placeholders).
  useEffect(() => {
    if (perfilNome === undefined) return;
    const d = dividirNome(perfilNome);
    setNome(d.nome);
    setSobrenome(d.sobrenome);
  }, [perfilNome]);

  const nomeMut = useMutation({
    mutationFn: (completo: string) => api.atualizarPerfilProprio({ nome: completo }),
    onSuccess: (atualizado) => onSalvo(atualizado),
  });

  const completo = `${nome} ${sobrenome}`.replace(/\s+/g, ' ').trim();
  const original = (perfilNome ?? '').trim().replace(/\s+/g, ' ');
  const alterado = completo !== original;
  const vazio = completo.length === 0;

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
        <Campo label={t('minhaConta.responsavel.nome')}>
          <input data-cy="responsavel-nome" className="input" value={nome} disabled={carregando} onChange={(e) => setNome(e.target.value)} placeholder={t('minhaConta.responsavel.nome')} />
        </Campo>
        <Campo label={t('minhaConta.responsavel.sobrenome')}>
          <input data-cy="responsavel-sobrenome" className="input" value={sobrenome} disabled={carregando} onChange={(e) => setSobrenome(e.target.value)} placeholder={t('minhaConta.responsavel.sobrenome')} />
        </Campo>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        {nomeMut.isSuccess && !alterado && <small data-cy="nome-salvo" style={{ color: 'var(--sucesso)', marginRight: 'auto' }}>{t('minhaConta.responsavel.nomeSalvo')}</small>}
        {nomeMut.isError && <small data-cy="nome-erro" style={{ color: 'var(--erro)', marginRight: 'auto' }}>{t('minhaConta.responsavel.nomeErro')}</small>}
        {vazio && alterado && <small data-cy="nome-vazio" style={{ color: 'var(--erro)', marginRight: 'auto' }}>{t('minhaConta.responsavel.nomeObrigatorio')}</small>}
        <Botao data-cy="salvar-nome" variante="primario" type="button" disabled={!alterado || vazio || nomeMut.isPending || carregando} onClick={() => nomeMut.mutate(completo)} style={{ padding: '11px 20px' }}>
          <IconeCheck width={15} height={15} strokeWidth={2} /> {nomeMut.isPending ? t('minhaConta.responsavel.salvando') : t('minhaConta.responsavel.salvarNome')}
        </Botao>
      </div>
    </div>
  );
}

/** Formulário editável (TanStack Form): Nome Fantasia, Telefone e Endereço com autofill de CEP (RN009). */
function DadosEditaveis({ fornecedorId, inicial, onSalvo }: {
  fornecedorId: string;
  inicial?: { nomeFantasia?: string; telefone?: string; endereco?: EnderecoView };
  onSalvo?: () => void;
}) {
  const { t } = useTranslation();
  const cepMut = useMutation({ mutationFn: (cep: string) => consultarCep(cep) });
  const end = inicial?.endereco;
  // RN009: persiste só Nome Fantasia, Endereço e Telefone (PATCH /fornecedores/:id → 204). Após salvar,
  // o container revalida o GET (onSalvo). O backend rejeita campos oficiais (422).
  const salvar = useMutation({
    mutationFn: (patch: { nomeFantasia?: string; telefone?: string; endereco?: EnderecoView }) => api.editarPerfil(fornecedorId, patch),
    onSuccess: () => onSalvo?.(),
  });
  const form = useForm({
    // Prefill com os dados editáveis reais do fornecedor (RN009).
    defaultValues: {
      nomeFantasia: inicial?.nomeFantasia ?? '', telefone: inicial?.telefone ?? '',
      cep: end?.cep ? mascaraCep(end.cep) : '', rua: end?.logradouro ?? '', numero: end?.numero ?? '',
      complemento: end?.complemento ?? '', bairro: end?.bairro ?? '', cidade: end?.cidade ?? '', uf: end?.uf ?? '',
    },
    onSubmit: async ({ value }) => {
      const cep = value.cep.replace(/\D/g, '');
      const patch: { nomeFantasia?: string; telefone?: string; endereco?: EnderecoView } = {
        nomeFantasia: value.nomeFantasia, telefone: value.telefone,
      };
      // Só envia o endereço se houver conteúdo, para não sobrescrever o oficial com campos em branco.
      if (value.rua || cep) {
        patch.endereco = { logradouro: value.rua, numero: value.numero, complemento: value.complemento || undefined, bairro: value.bairro, cidade: value.cidade, uf: value.uf, cep };
      }
      await salvar.mutateAsync(patch).catch(() => { /* erro exposto via salvar.isError */ });
    },
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
        <form.Field name="numero">{(f) => <Campo label={t('minhaConta.editaveis.numero')}><input data-cy="numero" className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder={t('minhaConta.editaveis.numero')} /></Campo>}</form.Field>
        <form.Field name="complemento">{(f) => <Campo label={t('minhaConta.editaveis.complemento')}><input data-cy="complemento" className="input" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder={t('minhaConta.editaveis.complemento')} /></Campo>}</form.Field>
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
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 26, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {salvar.isSuccess && <small data-cy="perfil-salvo" style={{ color: 'var(--sucesso)', marginRight: 'auto' }}>{t('minhaConta.editaveis.salvo')}</small>}
        {salvar.isError && <small data-cy="perfil-erro" style={{ color: 'var(--erro)', marginRight: 'auto' }}>{t('minhaConta.editaveis.salvarErro')}</small>}
        <button type="button" className="btn btn-ghost" style={{ padding: '11px 20px' }} onClick={() => form.reset()}>{t('minhaConta.editaveis.cancelar')}</button>
        <Botao data-cy="salvar-perfil" variante="primario" type="submit" disabled={salvar.isPending} style={{ padding: '12px 24px' }}>
          <IconeCheck width={16} height={16} strokeWidth={2} /> {salvar.isPending ? t('minhaConta.editaveis.salvando') : t('minhaConta.editaveis.salvar')}
        </Botao>
      </div>
    </form>
  );
}
