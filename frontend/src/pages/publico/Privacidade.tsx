import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type TipoDireito, type CategoriaDado, type SolicitacaoTitularView } from '../../lib/api';
import { Card, Botao, Campo } from '../../design-system/components';

/**
 * "Meus dados / Privacidade" (UC017 / LGPD). O PRÓPRIO titular protocola pedidos de acesso, correção ou
 * exclusão (§V — não delegável a procurador; o backend bloqueia com 403) e acompanha o status de cada um.
 * O atendimento é do Encarregado (DPO); aqui o titular apenas solicita e consulta.
 */
export function Privacidade({ titularId }: { titularId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<TipoDireito>('acesso');
  const [detalhe, setDetalhe] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDado | ''>('');
  const [erro, setErro] = useState<string | null>(null);

  const chave = ['minhas-solicitacoes', titularId] as const;
  const { data: solicitacoes = [], isLoading } = useQuery({ queryKey: chave, queryFn: () => api.minhasSolicitacoes(titularId) });

  const solicitar = useMutation({
    meta: { semToast: true }, // feedback de erro é inline nesta tela — evita toast duplicado
    mutationFn: () => api.solicitarDireito(tipo, detalhe.trim() || undefined, tipo === 'exclusao' && categoria ? categoria : undefined),
    onSuccess: () => { setDetalhe(''); setCategoria(''); setErro(null); void qc.invalidateQueries({ queryKey: chave }); },
    onError: () => setErro(t('privacidade.erro')),
  });

  return (
    <div className="stack">
      <div><h1 className="page-title">{t('privacidade.titulo')}</h1><p className="page-sub">{t('privacidade.subtitulo')}</p></div>

      <Card>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>{t('privacidade.novo.titulo')}</h2>
        <Campo label={t('privacidade.novo.tipo')} htmlFor="lgpd-tipo">
          <select id="lgpd-tipo" data-cy="lgpd-tipo" className="input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoDireito)}>
            <option value="acesso">{t('privacidade.tipos.acesso')}</option>
            <option value="correcao">{t('privacidade.tipos.correcao')}</option>
            <option value="exclusao">{t('privacidade.tipos.exclusao')}</option>
          </select>
        </Campo>
        {tipo === 'exclusao' && (
          <Campo label={t('privacidade.novo.categoria')} htmlFor="lgpd-categoria">
            <select id="lgpd-categoria" data-cy="lgpd-categoria" className="input" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDado | '')}>
              <option value="">{t('privacidade.novo.categoriaAny')}</option>
              <option value="cadastral">{t('privacidade.categorias.cadastral')}</option>
              <option value="fiscal">{t('privacidade.categorias.fiscal')}</option>
              <option value="contratual">{t('privacidade.categorias.contratual')}</option>
            </select>
          </Campo>
        )}
        <Campo label={t('privacidade.novo.detalhe')} htmlFor="lgpd-detalhe">
          <textarea
            id="lgpd-detalhe" data-cy="lgpd-detalhe" className="input" rows={3}
            placeholder={t('privacidade.novo.detalhePlaceholder')} value={detalhe} onChange={(e) => setDetalhe(e.target.value)}
          />
        </Campo>
        <Botao data-cy="lgpd-solicitar" onClick={() => solicitar.mutate()} disabled={solicitar.isPending}>
          {solicitar.isPending ? t('privacidade.novo.enviando') : t('privacidade.novo.solicitar')}
        </Botao>
        {solicitar.isSuccess && <p data-cy="lgpd-ok" style={{ color: 'var(--sucesso)', marginTop: 10 }}>{t('privacidade.novo.registrada')}</p>}
        {erro && <p data-cy="lgpd-erro" role="alert" style={{ color: 'var(--erro)', marginTop: 10 }}>{erro}</p>}
      </Card>

      <Card>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>{t('privacidade.lista.titulo')}</h2>
        {isLoading ? (
          <p data-cy="lgpd-carregando">{t('privacidade.lista.carregando')}</p>
        ) : solicitacoes.length === 0 ? (
          <p data-cy="lgpd-vazio" style={{ color: 'var(--cinza-500)' }}>{t('privacidade.lista.vazio')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {solicitacoes.map((s) => (
              <li key={s.id} data-cy="lgpd-solicitacao" data-status={s.status} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <strong>{t(`privacidade.tipos.${s.tipo}`)}</strong>
                  <StatusPill status={s.status} />
                </div>
                {s.detalhe && <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--cinza-500)' }}>{s.detalhe}</p>}
                {s.resultado && <p style={{ margin: '6px 0 0', fontSize: 13.5 }}><em>{t('privacidade.lista.resposta')}:</em> {s.resultado}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: SolicitacaoTitularView['status'] }) {
  const { t } = useTranslation();
  const cls = status === 'atendida' ? 'pill-success' : status === 'recusada' ? 'pill-error' : 'pill-warn';
  return <span className={`pill ${cls}`}>{t(`privacidade.status.${status}`)}</span>;
}
