import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type EnderecoView } from '../../lib/api';
import { Botao, BotaoIcone } from '../../design-system/components';
import { IconeFechar, IconeInfo } from '../../design-system/icons';

/** 7 dígitos da subclasse → máscara Receita DDDD-D/DD (ex.: 1412601 → 1412-6/01). */
function formatarCnae(codigo: string | null | undefined): string {
  const d = (codigo ?? '').replace(/\D/g, '');
  return d.length === 7 ? `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}` : codigo ?? '—';
}

export type ModoModal = 'criar' | 'ver' | 'editar';

const overlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 };
const card: CSSProperties = { background: '#fff', borderRadius: 16, width: 'min(680px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,.25)' };
const rotulo: CSSProperties = { font: '600 13px var(--font-body)', color: 'var(--azul-900)', marginBottom: 6, display: 'block' };
const CNPJ_VAZIO = { cnpj: '', razaoSocial: '', porte: '', cnaePrincipal: '' };

/**
 * Modal único de fornecedor — o mesmo para CRIAR, VER e EDITAR (Painel Admin), fiel ao protótipo.
 *  - criar: campos oficiais editáveis (cadastro manual, POST /admin/fornecedores).
 *  - ver:   tudo read-only; botão "Editar" alterna para o modo de edição; "Sincronizar" (RF018).
 *  - editar: campos oficiais permanecem read-only (RN009); só o contato (Nome fantasia, Telefone,
 *    Endereço) é editável (PATCH .../contato).
 */
export function ModalFornecedor({ modo, id, onFechar, onMudou }: { modo: ModoModal; id?: string; onFechar: () => void; onMudou: () => void }) {
  const { t } = useTranslation();
  const [modoAtual, setModoAtual] = useState<ModoModal>(modo);

  // Fecha no Escape (comportamento de diálogo).
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const titulo = modoAtual === 'criar' ? t('admin.fornecedores.modal.tituloCriar') : modoAtual === 'editar' ? t('admin.fornecedores.modal.tituloEditar') : t('admin.fornecedores.modal.tituloVer');
  const subtitulo = modoAtual === 'criar' ? t('admin.fornecedores.modal.subtituloCriar') : t('admin.fornecedores.modal.subtituloVerEditar');

  return (
    <div style={overlay} onClick={onFechar} data-cy="modal-overlay">
      <div style={card} role="dialog" aria-modal="true" aria-label={titulo} data-cy="modal-fornecedor" onClick={(e) => e.stopPropagation()}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--azul-900)' }}>{titulo}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--cinza-500)' }}>{subtitulo}</p>
          </div>
          <BotaoIcone icone={IconeFechar} variante="fechar" onClick={onFechar} data-cy="fechar-modal" aria-label={t('admin.fornecedores.fechar')} />
        </header>

        {modoAtual === 'criar'
          ? <CorpoCriar onFechar={onFechar} onMudou={onMudou} />
          : <CorpoVerEditar id={id!} editando={modoAtual === 'editar'} onEditar={() => setModoAtual('editar')} onFechar={onFechar} onMudou={onMudou} />}
      </div>
    </div>
  );
}

/** Formulário de cadastro manual (fiel ao protótipo: CNPJ, Razão social, Porte, CNAE principal). */
function CorpoCriar({ onFechar, onMudou }: { onFechar: () => void; onMudou: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState(CNPJ_VAZIO);

  const criar = useMutation({
    mutationFn: () => api.fornecedorAdminCriar(form),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['fornecedores-admin'] }); onMudou(); onFechar(); },
  });

  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [campo]: e.target.value });

  return (
    <form data-cy="form-criar" onSubmit={(e) => { e.preventDefault(); criar.mutate(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gap: 18 }}>
        <label>
          <span style={rotulo}>{t('admin.fornecedores.campos.cnpj')}</span>
          <input className="input" data-cy="campo-cnpj" required placeholder="00.000.000/0000-00" value={form.cnpj} onChange={set('cnpj')} style={{ width: '100%' }} />
        </label>
        <label>
          <span style={rotulo}>{t('admin.fornecedores.campos.razaoSocial')}</span>
          <input className="input" data-cy="campo-razao-social" required placeholder={t('admin.fornecedores.modal.razaoPlaceholder')} value={form.razaoSocial} onChange={set('razaoSocial')} style={{ width: '100%' }} />
        </label>
        <div className="cm-form-grid">
          <label>
            <span style={rotulo}>{t('admin.fornecedores.campos.porte')}</span>
            <input className="input" data-cy="campo-porte" required placeholder="MEI / ME / EPP" value={form.porte} onChange={set('porte')} style={{ width: '100%' }} />
          </label>
          <label>
            <span style={rotulo}>{t('admin.fornecedores.campos.cnaePrincipal')}</span>
            <input className="input" data-cy="campo-cnae-principal" required placeholder="0000-0/00" value={form.cnaePrincipal} onChange={set('cnaePrincipal')} style={{ width: '100%' }} />
          </label>
        </div>
        <BannerHistorico />
        {criar.isError && <p role="alert" data-cy="erro-criar" style={{ margin: 0, fontSize: 13, color: 'var(--erro)' }}>{t('admin.fornecedores.modal.erroCriar')}</p>}
      </div>
      <Rodape>
        <Botao type="button" variante="secundario" data-cy="cancelar" onClick={onFechar}>{t('admin.fornecedores.modal.cancelar')}</Botao>
        <Botao type="submit" data-cy="salvar-fornecedor" disabled={criar.isPending}>{t('admin.fornecedores.modal.salvar')}</Botao>
      </Rodape>
    </form>
  );
}

/** Detalhe (ver) / edição de contato (editar) — reusa o read model do portal (RN009/RF018). */
function CorpoVerEditar({ id, editando, onEditar, onFechar, onMudou }: { id: string; editando: boolean; onEditar: () => void; onFechar: () => void; onMudou: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const chave = ['fornecedor-admin-detalhe', id];

  const { data: perfil, isLoading } = useQuery({ queryKey: chave, queryFn: () => api.fornecedorAdminDetalhe(id) });
  const [contato, setContato] = useState({ nomeFantasia: '', telefone: '' });
  const [endereco, setEndereco] = useState<EnderecoView | null>(null);
  const [carregado, setCarregado] = useState<string | null>(null);

  if (perfil && carregado !== id) {
    setContato({ nomeFantasia: perfil.nomeFantasia ?? '', telefone: perfil.telefone ?? '' });
    setEndereco(perfil.endereco ?? null);
    setCarregado(id);
  }

  const invalidar = () => { void qc.invalidateQueries({ queryKey: chave }); onMudou(); };
  const salvar = useMutation({
    mutationFn: () => api.fornecedorAdminEditarContato(id, { nomeFantasia: contato.nomeFantasia || undefined, telefone: contato.telefone || undefined, endereco: endereco ?? undefined }),
    onSuccess: () => { invalidar(); onFechar(); },
  });
  const sincronizar = useMutation({ mutationFn: () => api.fornecedorAdminSincronizar(id), onSuccess: invalidar });

  const campoEndereco = (k: keyof EnderecoView, label: string) => (
    <label>
      <span style={rotulo}>{label}</span>
      <input className="input" data-cy={`endereco-${k}`} disabled={!editando} value={endereco?.[k] ?? ''} style={{ width: '100%' }}
        onChange={(e) => setEndereco({ ...(endereco ?? { logradouro: '', numero: '', bairro: '', cidade: '', uf: '', cep: '' }), [k]: e.target.value })} />
    </label>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gap: 18 }}>
        {isLoading || !perfil ? (
          <p className="page-sub">{t('admin.fornecedores.carregando')}</p>
        ) : (
          <>
            {/* Dados oficiais (read-only, RN009) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              <Oficial rotulo={t('admin.fornecedores.campos.cnpj')} valor={perfil.cnpj} />
              <Oficial rotulo={t('admin.fornecedores.campos.razaoSocial')} valor={perfil.razaoSocial} />
              <Oficial rotulo={t('admin.fornecedores.campos.porte')} valor={perfil.porte} />
              <Oficial rotulo={t('admin.fornecedores.campos.cnaePrincipal')} valor={formatarCnae(perfil.cnaes.find((c) => c.tipo === 'principal')?.codigoSubclasse)} />
              <Oficial rotulo={t('admin.fornecedores.campos.situacao')} valor={t(`admin.fornecedores.situacao.${perfil.situacao}`)} />
              <Oficial rotulo={t('admin.fornecedores.campos.status')} valor={t(`admin.fornecedores.status.${perfil.status}`)} />
              <Oficial rotulo={t('admin.fornecedores.campos.sincronizadoEm')} valor={perfil.sincronizadoEm ? new Date(perfil.sincronizadoEm).toLocaleString() : t('admin.fornecedores.nuncaSincronizado')} />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Botao type="button" data-cy="sincronizar" variante="secundario" disabled={sincronizar.isPending} onClick={() => sincronizar.mutate()}>
                {sincronizar.isPending ? t('admin.fornecedores.sincronizando') : t('admin.fornecedores.sincronizar')}
              </Botao>
              {sincronizar.isSuccess && <span data-cy="sincronizar-resultado" style={{ fontSize: 13, color: sincronizar.data?.status === 'erro' ? 'var(--erro)' : 'var(--sucesso)' }}>{t(`admin.fornecedores.sincResultado.${sincronizar.data?.status ?? 'erro'}`)}</span>}
              {sincronizar.isError && <span role="alert" style={{ fontSize: 13, color: 'var(--erro)' }}>{t('admin.fornecedores.sincResultado.erro')}</span>}
            </div>

            {/* Contato — editável só no modo edição (RN009) */}
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16, display: 'grid', gap: 14 }}>
              <strong style={{ fontSize: 14, color: 'var(--azul-900)' }}>{t('admin.fornecedores.contatoTitulo')}</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <label>
                  <span style={rotulo}>{t('admin.fornecedores.campos.nomeFantasia')}</span>
                  <input className="input" data-cy="campo-nome-fantasia" disabled={!editando} value={contato.nomeFantasia} onChange={(e) => setContato({ ...contato, nomeFantasia: e.target.value })} style={{ width: '100%' }} />
                </label>
                <label>
                  <span style={rotulo}>{t('admin.fornecedores.campos.telefone')}</span>
                  <input className="input" data-cy="campo-telefone" disabled={!editando} value={contato.telefone} onChange={(e) => setContato({ ...contato, telefone: e.target.value })} style={{ width: '100%' }} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                {campoEndereco('logradouro', t('admin.fornecedores.endereco.logradouro'))}
                {campoEndereco('numero', t('admin.fornecedores.endereco.numero'))}
                {campoEndereco('bairro', t('admin.fornecedores.endereco.bairro'))}
                {campoEndereco('cidade', t('admin.fornecedores.endereco.cidade'))}
                {campoEndereco('uf', t('admin.fornecedores.endereco.uf'))}
                {campoEndereco('cep', t('admin.fornecedores.endereco.cep'))}
              </div>
              {salvar.isError && <p role="alert" data-cy="erro-contato" style={{ margin: 0, fontSize: 13, color: 'var(--erro)' }}>{t('admin.fornecedores.erroSalvarContato')}</p>}
            </div>
          </>
        )}
      </div>

      <Rodape>
        <Botao type="button" variante="secundario" data-cy="fechar-modal-rodape" onClick={onFechar}>{t('admin.fornecedores.fechar')}</Botao>
        {editando
          ? <Botao type="button" data-cy="salvar-contato" disabled={salvar.isPending || !perfil} onClick={() => salvar.mutate()}>{t('admin.fornecedores.salvarContato')}</Botao>
          : <Botao type="button" data-cy="editar-modal" onClick={onEditar}>{t('admin.fornecedores.modal.editar')}</Botao>}
      </Rodape>
    </div>
  );
}

/** Aviso do protótipo: exclusão é lógica (RN015) — nunca apaga, converte para Inativo/Bloqueado. */
function BannerHistorico() {
  const { t } = useTranslation();
  return (
    <div data-cy="banner-historico" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10, background: 'var(--azul-50)', color: 'var(--azul-900)', fontSize: 13 }}>
      <IconeInfo width={18} height={18} style={{ flexShrink: 0, marginTop: 1, color: 'var(--azul-700)' }} />
      <span>{t('admin.fornecedores.modal.avisoHistorico')}</span>
    </div>
  );
}

function Rodape({ children }: { children: ReactNode }) {
  return <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--divider)', background: 'var(--cinza-50, #f8fafc)', borderRadius: '0 0 16px 16px' }}>{children}</footer>;
}

function Oficial({ rotulo: r, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div style={{ font: '600 11px var(--font-body)', letterSpacing: '.04em', color: 'var(--cinza-500)', textTransform: 'uppercase', marginBottom: 3 }}>{r}</div>
      <div style={{ fontSize: 14, color: 'var(--cinza-900)' }}>{valor}</div>
    </div>
  );
}
