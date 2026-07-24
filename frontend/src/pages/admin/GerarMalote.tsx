import { useEffect, useState, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type MaloteListaView, type PecaMalote, type ProcessoSeiView, type TipoPecaMalote } from '../../lib/api';
import { Botao, BotaoIcone, Campo } from '../../design-system/components';
import { celula, cabecalho } from '../../design-system/tabela';
import { IconeDownload, IconeFiltro, IconeSync, IconeFechar, IconeAlerta } from '../../design-system/icons';

/**
 * Painel Admin · "Malote SEI" (UC010 / RF007, ator CPL). A CPL consolida a documentação aprovada de um
 * fornecedor num dossiê ordenado (CNPJ→Pessoal→Anexos→Certidões, RN008) e fragmentado pelo limite do SEI
 * (RNF002/FR-009). A geração é assíncrona e DURÁVEL (202 → worker monta pela fila; sobrevive a restart) e a
 * exportação é idempotente (FR-004). Escritas exigem RBAC CPL/Administrador no backend (403 sem papel).
 *
 * Fiel ao protótipo `spec/Prototipo/painel-administrativo.html`: linguagem visual do painel (cabeçalho +
 * ação primária, toolbar de filtros, tabela com pills de status e ações). A geração vive num modal
 * ("+ Gerar malote"); a listagem é QBE (fornecedor/edital/status) com auto-refetch que reflete
 * `pendente → gerado` sem recarregar. O editor manual de peças é temporário — fiar as peças aos documentos
 * aprovados reais da covalidação (UC006) é follow-up registrado no UC010.
 */
const TIPOS: TipoPecaMalote[] = ['cnpj', 'pessoal', 'anexo', 'certidao'];
const PECA_VAZIA = { tipo: 'cnpj' as TipoPecaMalote, ref: '', tamanho: '' };
const FILTRO_VAZIO = { fornecedorId: '', editalId: '', status: '' };
type MaloteStatus = MaloteListaView['status'];

function paramsDe(f: typeof FILTRO_VAZIO): URLSearchParams {
  const p = new URLSearchParams();
  if (f.fornecedorId) p.set('fornecedorId', f.fornecedorId);
  if (f.editalId) p.set('editalId', f.editalId);
  if (f.status) p.set('status', f.status);
  return p;
}

const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };
/** Cor da pill por status: pendente (âmbar), gerado (azul institucional), exportado (verde sucesso). */
const CORES_STATUS: Record<MaloteStatus, CSSProperties> = {
  pendente: { background: '#FEF3C7', color: '#92600A' },
  gerado: { background: 'var(--azul-50)', color: 'var(--azul-800)' },
  exportado: { background: 'var(--sucesso-bg)', color: 'var(--sucesso)' },
};
const iconeAcao: CSSProperties = { width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 9, background: '#fff', color: 'var(--azul-700)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 12px' };

export function GerarMalote() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [consultaAberta, setConsultaAberta] = useState(false); // modal de consulta ao SEI (pull)
  const [filtros, setFiltros] = useState(FILTRO_VAZIO);
  const [aplicado, setAplicado] = useState(FILTRO_VAZIO);
  const [exportInfo, setExportInfo] = useState<Record<string, 'exportado' | 'jaExportado'>>({});
  const [seiInfo, setSeiInfo] = useState<Record<string, string>>({}); // maloteId → nº do processo protocolado

  const { data: malotes = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['malotes', aplicado],
    queryFn: () => api.malotesListar(paramsDe(aplicado)),
    refetchInterval: 5000, // reflete pendente → gerado sem recarregar
    retry: false,
  });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['malotes'] });

  // Status da integração SEI: se SEI_BASE_URL/credenciais não estão setados, a tela avisa e desabilita
  // as ações de SEI. Default `true` enquanto carrega, para não piscar o aviso nem esconder as ações.
  const { data: seiStatus } = useQuery({ queryKey: ['sei-status'], queryFn: () => api.seiStatus(), retry: false, staleTime: 60000 });

  const exportar = useMutation({
    mutationFn: (id: string) => api.maloteExportar(id),
    onSuccess: (r, id) => { setExportInfo((m) => ({ ...m, [id]: r.jaExportado ? 'jaExportado' : 'exportado' })); void invalidar(); },
  });
  // Push ao SEI (Épico 6): cria o processo e protocola o malote (idempotente). Guarda o nº do processo.
  const enviarSei = useMutation({
    mutationFn: (id: string) => api.maloteEnviarSei(id),
    onSuccess: (r, id) => { setSeiInfo((m) => ({ ...m, [id]: r.numeroProcesso })); void invalidar(); },
  });

  const colunas = [
    t('admin.malote.campos.fornecedor'),
    t('admin.malote.campos.edital'),
    t('admin.malote.campos.status'),
    t('admin.malote.campos.fragmentos'),
    t('admin.malote.campos.acoes'),
  ];

  // SEI não configurado (SEI_BASE_URL/credenciais ausentes): a tela exibe SOMENTE o aviso de configuração,
  // sem lista, filtros ou ações — o painel do malote depende da integração e não deve operar sem ela.
  if (seiStatus && !seiStatus.configurado) {
    return (
      <div className="stack" data-cy="admin-malote">
        <h1 className="page-title">{t('admin.malote.titulo')}</h1>
        <div data-cy="sei-nao-configurado" role="status" className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '20px 22px', background: 'var(--atencao-bg, #FEF3C7)', border: '1px solid #F1D08A', color: '#8A5410' }}>
          <span aria-hidden style={{ display: 'inline-flex', flexShrink: 0, marginTop: 1 }}><IconeAlerta width={22} height={22} /></span>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ font: '700 15px var(--font-body)' }}>{t('admin.malote.sei.naoConfiguradoTitulo')}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{t('admin.malote.sei.naoConfigurado')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" data-cy="admin-malote">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{t('admin.malote.titulo')}</h1>
          <p className="page-sub">{t('admin.malote.subtitulo')}</p>
        </div>
        <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Botao data-cy="consultar-sei" variante="secundario" onClick={() => setConsultaAberta(true)}>{t('admin.malote.sei.consultarTitulo')}</Botao>
          <Botao data-cy="novo-malote" onClick={() => setModalAberto(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>+</span>{t('admin.malote.novoMalote')}
          </Botao>
        </div>
      </div>

      <div className="card">
        <div data-cy="filtros" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span aria-hidden style={{ color: 'var(--cinza-500)', display: 'inline-flex' }}><IconeFiltro width={18} height={18} /></span>
          <input data-cy="filtro-fornecedor" className="input" style={{ maxWidth: 180 }} placeholder={t('admin.malote.filtros.fornecedorId')} value={filtros.fornecedorId} onChange={(e) => setFiltros({ ...filtros, fornecedorId: e.target.value })} />
          <input data-cy="filtro-edital" className="input" style={{ maxWidth: 180 }} placeholder={t('admin.malote.filtros.editalId')} value={filtros.editalId} onChange={(e) => setFiltros({ ...filtros, editalId: e.target.value })} />
          <select data-cy="filtro-status" className="input" style={{ maxWidth: 170 }} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
            <option value="">{t('admin.malote.filtros.todos')}</option>
            <option value="pendente">{t('admin.malote.status.pendente')}</option>
            <option value="gerado">{t('admin.malote.status.gerado')}</option>
            <option value="exportado">{t('admin.malote.status.exportado')}</option>
          </select>
          <Botao data-cy="filtrar" onClick={() => setAplicado({ ...filtros })}>{t('admin.malote.filtros.aplicar')}</Botao>
          <Botao data-cy="atualizar" variante="secundario" onClick={() => void refetch()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconeSync width={16} height={16} />{t('admin.malote.lista.atualizar')}
          </Botao>
        </div>
      </div>

      {isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('admin.malote.carregando')}</p>
      ) : isError ? (
        <p data-cy="erro-carregar" role="alert" style={{ color: 'var(--erro)' }}>{t('admin.malote.erroCarregar')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {malotes.length === 0 ? (
            <div data-cy="vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
              <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.malote.vazioTitulo')}</div>
              <div style={{ fontSize: 13.5 }}>{t('admin.malote.vazioDica')}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table data-cy="tabela-malotes" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderRadius: 0 }}>
                <thead>
                  <tr>
                    {colunas.map((c, i) => (
                      <th key={c} scope="col" style={cabecalho(false, i === colunas.length - 1 ? 'right' : 'left')}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {malotes.map((m: MaloteListaView) => (
                    <tr key={m.id} data-cy="item-malote" data-id={m.id} data-status={m.status}>
                      <td style={{ ...celula, font: '700 14px var(--font-body)', color: 'var(--azul-900)', minWidth: 160 }}>{m.fornecedorId}</td>
                      <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-700)', whiteSpace: 'nowrap' }}>{m.editalId}</td>
                      <td style={celula}>
                        <span data-cy="status" style={{ ...pill, ...CORES_STATUS[m.status] }}>{t(`admin.malote.status.${m.status}`)}</span>
                      </td>
                      <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-700)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {t('admin.malote.lista.fragmentos', { n: m.fragmentos })}
                      </td>
                      <td style={{ ...celula, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                          {/* Já protocolado (do backend) ou recém-enviado (estado local): mostra o nº do processo. */}
                          {(m.protocoloSei?.numeroProcesso || seiInfo[m.id]) && (
                            <span data-cy="sei-processo" style={{ fontSize: 12.5, color: 'var(--azul-700)', fontVariantNumeric: 'tabular-nums' }}>
                              {t('admin.malote.sei.processo', { numero: m.protocoloSei?.numeroProcesso ?? seiInfo[m.id] })}
                            </span>
                          )}
                          {exportInfo[m.id] && (
                            <span data-cy="export-msg" style={{ fontSize: 12.5, color: 'var(--sucesso)' }}>
                              {t(`admin.malote.lista.${exportInfo[m.id]}`)}
                            </span>
                          )}
                          {/* Enviar ao SEI: só para malote gerado ainda não protocolado. */}
                          {m.status === 'gerado' && !m.protocoloSei && !seiInfo[m.id] && (
                            <button type="button" data-cy="enviar-sei" title={t('admin.malote.sei.enviar')} aria-label={t('admin.malote.sei.enviar')} disabled={enviarSei.isPending} onClick={() => enviarSei.mutate(m.id)} style={iconeAcao}>
                              <span style={{ font: '600 13px var(--font-body)' }}>{t('admin.malote.sei.enviar')}</span>
                            </button>
                          )}
                          {m.status !== 'pendente' && (
                            <button type="button" data-cy="exportar" title={t('admin.malote.lista.exportar')} aria-label={t('admin.malote.lista.exportar')} disabled={exportar.isPending} onClick={() => exportar.mutate(m.id)} style={iconeAcao}>
                              <IconeDownload width={18} height={18} /><span style={{ font: '600 13px var(--font-body)' }}>{t('admin.malote.lista.exportar')}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalAberto && <ModalGerarMalote onFechar={() => setModalAberto(false)} onGerado={() => void invalidar()} />}
      {consultaAberta && <ModalConsultarSei onFechar={() => setConsultaAberta(false)} />}
    </div>
  );
}

/**
 * Consulta um processo no SEI por número (pull — Épico 6). Read-only: mostra o processo e seus
 * documentos. Distingue "não encontrado" e "SEI indisponível" (fail-open) das mensagens do backend.
 */
function ModalConsultarSei({ onFechar }: { onFechar: () => void }) {
  const { t } = useTranslation();
  const [numero, setNumero] = useState('');
  const consulta = useMutation<ProcessoSeiView, Error, string>({ mutationFn: (n: string) => api.seiConsultarProcesso(n) });

  return (
    <div role="dialog" aria-modal="true" aria-label={t('admin.malote.sei.consultarTitulo')} data-cy="modal-consultar-sei"
      onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}>
      <div onClick={(ev) => ev.stopPropagation()} className="card" style={{ width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--azul-900)' }}>{t('admin.malote.sei.consultarTitulo')}</h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--cinza-500)' }}>{t('admin.malote.sei.consultarSub')}</p>
          </div>
          <BotaoIcone icone={IconeFechar} variante="fechar" data-cy="fechar-consulta" title={t('admin.malote.sei.fechar')} aria-label={t('admin.malote.sei.fechar')} onClick={onFechar} />
        </div>

        <form data-cy="form-consulta-sei" onSubmit={(e) => { e.preventDefault(); if (numero.trim()) consulta.mutate(numero.trim()); }} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', margin: '12px 0' }}>
          <Campo label={t('admin.malote.sei.numeroLabel')} htmlFor="sei-numero" className="cm-campo-total">
            <input id="sei-numero" data-cy="sei-numero" className="input" placeholder="0000.000000.00000/0000-00" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </Campo>
          <Botao type="submit" data-cy="consultar" disabled={consulta.isPending || !numero.trim()}>{t('admin.malote.sei.consultar')}</Botao>
        </form>

        {consulta.isError && <p data-cy="consulta-erro" role="alert" style={{ color: 'var(--erro, #c0392b)', fontSize: 13 }}>{t('admin.malote.sei.erroConsulta')}</p>}
        {consulta.data && (
          <div data-cy="consulta-resultado" className="card" style={{ padding: 14 }}>
            <div style={{ font: '600 14px var(--font-body)', color: 'var(--azul-900)' }}>{t('admin.malote.sei.processoLabel', { numero: consulta.data.numero })}</div>
            <div style={{ fontSize: 12.5, color: 'var(--cinza-500)', margin: '2px 0 8px' }}>{t('admin.malote.sei.documentos', { n: consulta.data.documentos.length })}</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--cinza-800)' }}>
              {consulta.data.documentos.map((d) => <li key={d.idDocumento} data-cy="documento-sei">{d.titulo ?? d.idDocumento}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const overlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 };
const cardModal: CSSProperties = { background: '#fff', borderRadius: 16, width: 'min(680px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,.25)' };
const rotulo: CSSProperties = { font: '600 13px var(--font-body)', color: 'var(--azul-900)', marginBottom: 6, display: 'block' };

/**
 * Modal de geração — fornecedor + edital + editor de peças (tipo/ref/tamanho). A ordem legal é aplicada no
 * domínio do backend (RN008); o editor só monta a lista bruta. Bloqueia o envio até fornecedor, edital e
 * ao menos uma peça válida.
 */
function ModalGerarMalote({ onFechar, onGerado }: { onFechar: () => void; onGerado: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ fornecedorId: '', editalId: '' });
  const [pecas, setPecas] = useState<PecaMalote[]>([]);
  const [peca, setPeca] = useState(PECA_VAZIA);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const gerar = useMutation({
    mutationFn: () => api.maloteGerar({ ...form, pecas }),
    onSuccess: () => { onGerado(); onFechar(); },
  });

  function adicionarPeca() {
    const tamanhoBytes = Number(peca.tamanho);
    if (!peca.ref || !Number.isFinite(tamanhoBytes) || tamanhoBytes <= 0) return;
    setPecas((ps) => [...ps, { tipo: peca.tipo, ref: peca.ref, tamanhoBytes }]);
    setPeca(PECA_VAZIA);
  }
  const removerPeca = (i: number) => setPecas((ps) => ps.filter((_, idx) => idx !== i));

  const podeGerar = !!form.fornecedorId && !!form.editalId && pecas.length > 0 && !gerar.isPending;
  const titulo = t('admin.malote.gerar.titulo');

  return (
    <div style={overlay} onClick={onFechar} data-cy="modal-overlay">
      <div style={cardModal} role="dialog" aria-modal="true" aria-label={titulo} data-cy="modal-malote" onClick={(e) => e.stopPropagation()}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--azul-900)' }}>{titulo}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('admin.malote.modal.subtitulo')}</p>
          </div>
          <BotaoIcone icone={IconeFechar} variante="fechar" onClick={onFechar} data-cy="fechar-modal" aria-label={t('admin.malote.modal.fechar')} />
        </header>

        <form data-cy="form-malote" onSubmit={(e) => { e.preventDefault(); if (podeGerar) gerar.mutate(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gap: 18 }}>
            <div className="cm-form-grid">
              <label>
                <span style={rotulo}>{t('admin.malote.gerar.fornecedorId')}</span>
                <input className="input" data-cy="campo-fornecedor" required value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })} style={{ width: '100%' }} />
              </label>
              <label>
                <span style={rotulo}>{t('admin.malote.gerar.editalId')}</span>
                <input className="input" data-cy="campo-edital" required value={form.editalId} onChange={(e) => setForm({ ...form, editalId: e.target.value })} style={{ width: '100%' }} />
              </label>
            </div>

            <div>
              <span style={rotulo}>{t('admin.malote.gerar.pecas')}</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <select data-cy="peca-tipo" className="input" style={{ maxWidth: 180 }} value={peca.tipo} onChange={(e) => setPeca({ ...peca, tipo: e.target.value as TipoPecaMalote })}>
                  {TIPOS.map((tp) => <option key={tp} value={tp}>{t(`admin.malote.tipos.${tp}`)}</option>)}
                </select>
                <input data-cy="peca-ref" className="input" style={{ maxWidth: 170 }} placeholder={t('admin.malote.gerar.ref')} value={peca.ref} onChange={(e) => setPeca({ ...peca, ref: e.target.value })} />
                <input data-cy="peca-tamanho" className="input" style={{ maxWidth: 150 }} type="number" min={1} placeholder={t('admin.malote.gerar.tamanho')} value={peca.tamanho} onChange={(e) => setPeca({ ...peca, tamanho: e.target.value })} />
                <Botao data-cy="add-peca" type="button" variante="secundario" onClick={adicionarPeca}>{t('admin.malote.gerar.adicionarPeca')}</Botao>
              </div>
              {pecas.length === 0 ? (
                <p data-cy="sem-pecas" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--cinza-500)' }}>{t('admin.malote.gerar.semPecas')}</p>
              ) : (
                <ul data-cy="lista-pecas" style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                  {pecas.map((p, i) => (
                    <li key={`${p.ref}-${i}`} data-cy="item-peca" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--cinza-100)', fontSize: 13 }}>
                      <span style={{ flex: 1 }}><strong>{t(`admin.malote.tipos.${p.tipo}`)}</strong> · {p.ref} · {p.tamanhoBytes} B</span>
                      <button type="button" data-cy="remover-peca" aria-label={t('admin.malote.modal.removerPeca')} title={t('admin.malote.modal.removerPeca')} onClick={() => removerPeca(i)} style={{ border: 'none', background: 'transparent', color: 'var(--cinza-500)', cursor: 'pointer', display: 'inline-flex' }}>
                        <IconeFechar width={16} height={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div data-cy="aviso-limite" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10, background: 'var(--azul-50)', color: 'var(--azul-900)', fontSize: 13 }}>
              <span aria-hidden style={{ flexShrink: 0, marginTop: 1, color: 'var(--azul-700)', display: 'inline-flex' }}><IconeAlerta width={18} height={18} /></span>
              <span>{t('admin.malote.lista.acimaLimite')}</span>
            </div>

            {gerar.isError && <p role="alert" data-cy="erro" style={{ margin: 0, fontSize: 13, color: 'var(--erro)' }}>{t('admin.malote.gerar.erro')}</p>}
          </div>

          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--divider)', background: 'var(--cinza-100)', borderRadius: '0 0 16px 16px' }}>
            <Botao type="button" variante="secundario" data-cy="cancelar" onClick={onFechar}>{t('admin.malote.modal.cancelar')}</Botao>
            <Botao type="submit" data-cy="gerar" disabled={!podeGerar}>{t('admin.malote.gerar.enviar')}</Botao>
          </footer>
        </form>
      </div>
    </div>
  );
}
