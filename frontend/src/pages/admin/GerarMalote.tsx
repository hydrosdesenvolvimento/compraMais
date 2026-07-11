import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type MaloteListaView, type PecaMalote, type TipoPecaMalote } from '../../lib/api';
import { Card, Botao } from '../../design-system/components';

/**
 * UC010 — Gerar Malote SEI (Painel Admin, ator CPL). A CPL consolida a documentação aprovada de um
 * fornecedor num dossiê ordenado (CNPJ→Pessoal→Anexos→Certidões, RN008) e fragmentado pelo limite do SEI
 * (RNF002/FR-009). A geração é assíncrona e DURÁVEL (202 → worker monta pela fila; sobrevive a restart);
 * a exportação é idempotente (FR-004). Escritas exigem RBAC CPL/Administrador no backend (403 sem papel).
 */
const TIPOS: TipoPecaMalote[] = ['cnpj', 'pessoal', 'anexo', 'certidao'];
const FORM_VAZIO = { fornecedorId: '', editalId: '' };
const PECA_VAZIA = { tipo: 'cnpj' as TipoPecaMalote, ref: '', tamanho: '' };
const FILTRO_VAZIO = { fornecedorId: '', editalId: '', status: '' };

function paramsDe(f: typeof FILTRO_VAZIO): URLSearchParams {
  const p = new URLSearchParams();
  if (f.fornecedorId) p.set('fornecedorId', f.fornecedorId);
  if (f.editalId) p.set('editalId', f.editalId);
  if (f.status) p.set('status', f.status);
  return p;
}

export function GerarMalote() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState(FORM_VAZIO);
  const [pecas, setPecas] = useState<PecaMalote[]>([]);
  const [peca, setPeca] = useState(PECA_VAZIA);
  const [filtros, setFiltros] = useState(FILTRO_VAZIO);
  const [aplicado, setAplicado] = useState(FILTRO_VAZIO);
  const [exportInfo, setExportInfo] = useState<Record<string, 'exportado' | 'jaExportado'>>({});

  const { data: malotes = [], refetch } = useQuery({
    queryKey: ['malotes', aplicado],
    queryFn: () => api.malotesListar(paramsDe(aplicado)),
    refetchInterval: 5000, // reflete pendente → gerado sem recarregar
    retry: false,
  });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['malotes'] });

  const gerar = useMutation({
    mutationFn: () => api.maloteGerar({ ...form, pecas }),
    onSuccess: () => { setForm(FORM_VAZIO); setPecas([]); setPeca(PECA_VAZIA); void invalidar(); },
  });
  const exportar = useMutation({
    mutationFn: (id: string) => api.maloteExportar(id),
    onSuccess: (r, id) => { setExportInfo((m) => ({ ...m, [id]: r.jaExportado ? 'jaExportado' : 'exportado' })); void invalidar(); },
  });

  function adicionarPeca() {
    const tamanhoBytes = Number(peca.tamanho);
    if (!peca.ref || !Number.isFinite(tamanhoBytes) || tamanhoBytes <= 0) return;
    setPecas((ps) => [...ps, { tipo: peca.tipo, ref: peca.ref, tamanhoBytes }]);
    setPeca(PECA_VAZIA);
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">{t('admin.malote.titulo')}</h1>
        <p className="page-sub">{t('admin.malote.subtitulo')}</p>
      </div>

      <Card>
        <form data-cy="form-malote" onSubmit={(e) => { e.preventDefault(); gerar.mutate(); }} style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
          <strong>{t('admin.malote.gerar.titulo')}</strong>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.malote.gerar.fornecedorId')}
            <input data-cy="campo-fornecedor" className="input" value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })} />
          </label>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.malote.gerar.editalId')}
            <input data-cy="campo-edital" className="input" value={form.editalId} onChange={(e) => setForm({ ...form, editalId: e.target.value })} />
          </label>

          <span className="label">{t('admin.malote.gerar.pecas')}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <select data-cy="peca-tipo" className="input" style={{ maxWidth: 170 }} value={peca.tipo} onChange={(e) => setPeca({ ...peca, tipo: e.target.value as TipoPecaMalote })}>
              {TIPOS.map((tp) => <option key={tp} value={tp}>{t(`admin.malote.tipos.${tp}`)}</option>)}
            </select>
            <input data-cy="peca-ref" className="input" style={{ maxWidth: 160 }} placeholder={t('admin.malote.gerar.ref')} value={peca.ref} onChange={(e) => setPeca({ ...peca, ref: e.target.value })} />
            <input data-cy="peca-tamanho" className="input" style={{ maxWidth: 150 }} type="number" min={1} placeholder={t('admin.malote.gerar.tamanho')} value={peca.tamanho} onChange={(e) => setPeca({ ...peca, tamanho: e.target.value })} />
            <Botao data-cy="add-peca" type="button" variante="secundario" onClick={adicionarPeca}>{t('admin.malote.gerar.adicionarPeca')}</Botao>
          </div>
          {pecas.length === 0
            ? <p data-cy="sem-pecas" className="page-sub">{t('admin.malote.gerar.semPecas')}</p>
            : <ul data-cy="lista-pecas" style={{ margin: 0, paddingLeft: 18 }}>
                {pecas.map((p, i) => <li key={`${p.ref}-${i}`} data-cy="item-peca">{t(`admin.malote.tipos.${p.tipo}`)} · {p.ref} · {p.tamanhoBytes} B</li>)}
              </ul>}

          <Botao data-cy="gerar" type="submit" disabled={gerar.isPending || pecas.length === 0 || !form.fornecedorId || !form.editalId}>
            {t('admin.malote.gerar.enviar')}
          </Botao>
          {gerar.isSuccess && <p data-cy="gerar-ok" style={{ color: 'var(--sucesso, #178a4a)' }}>{t('admin.malote.gerar.enviado')}</p>}
          {gerar.isError && <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.malote.gerar.erro')}</p>}
        </form>
      </Card>

      <Card>
        <div data-cy="filtros" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input data-cy="filtro-fornecedor" className="input" style={{ maxWidth: 160 }} placeholder={t('admin.malote.filtros.fornecedorId')} value={filtros.fornecedorId} onChange={(e) => setFiltros({ ...filtros, fornecedorId: e.target.value })} />
          <input data-cy="filtro-edital" className="input" style={{ maxWidth: 160 }} placeholder={t('admin.malote.filtros.editalId')} value={filtros.editalId} onChange={(e) => setFiltros({ ...filtros, editalId: e.target.value })} />
          <select data-cy="filtro-status" className="input" style={{ maxWidth: 160 }} value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
            <option value="">{t('admin.malote.filtros.todos')}</option>
            <option value="pendente">{t('admin.malote.status.pendente')}</option>
            <option value="gerado">{t('admin.malote.status.gerado')}</option>
            <option value="exportado">{t('admin.malote.status.exportado')}</option>
          </select>
          <Botao data-cy="filtrar" onClick={() => setAplicado({ ...filtros })}>{t('admin.malote.filtros.aplicar')}</Botao>
          <Botao data-cy="atualizar" variante="secundario" onClick={() => void refetch()}>{t('admin.malote.lista.atualizar')}</Botao>
        </div>
      </Card>

      {malotes.length === 0 ? (
        <p data-cy="vazio" className="page-sub">{t('admin.malote.lista.vazio')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {malotes.map((m: MaloteListaView) => (
            <li key={m.id} data-cy="item-malote" data-status={m.status} className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ flex: 1 }}>
                <strong>{m.fornecedorId}</strong> · {m.editalId}
                <em style={{ color: 'var(--texto-suave)' }}> — <span data-cy="status">{t(`admin.malote.status.${m.status}`)}</span> · {t('admin.malote.lista.fragmentos', { n: m.fragmentos })}</em>
              </span>
              {m.status !== 'pendente' && (
                <Botao data-cy="exportar" variante="secundario" disabled={exportar.isPending} onClick={() => exportar.mutate(m.id)}>
                  {t('admin.malote.lista.exportar')}
                </Botao>
              )}
              {exportInfo[m.id] && (
                <span data-cy="export-msg" style={{ color: 'var(--sucesso, #178a4a)' }}>
                  {t(`admin.malote.lista.${exportInfo[m.id]}`)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
