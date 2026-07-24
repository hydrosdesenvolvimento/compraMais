import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Card, Botao } from '../../design-system/components';
import { TELAS_ADMIN, TELAS_ADMIN_ONLY, TELAS_OBRIGATORIAS_POR_PAPEL } from '../../lib/telas-admin';

/**
 * "Administração de telas por perfil" (§15/AD-35). O Administrador define quais TELAS do Painel Admin cada
 * papel interno enxerga — inclusive as suas próprias. Duas travas: `perfis` do administrador não pode ser
 * desmarcada (anti-lockout) e as telas de configuração exclusivas do admin ficam bloqueadas para os demais
 * papéis. Cada alteração persiste (PUT /permissoes/telas/:papel) e entra na trilha (VisibilidadeTelasAlterada);
 * escritas exigem RBAC Administrador (403 sem o papel).
 */
const rotuloTela: Record<string, string> = Object.fromEntries(TELAS_ADMIN.map((t) => [t.key, t.item.rotuloKey]));
const ADMIN_ONLY = new Set<string>(TELAS_ADMIN_ONLY);

export function AdministracaoTelas() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['matriz-telas'], queryFn: () => api.matrizTelas() });

  // Estado de edição local por papel (Set de telas visíveis), semeado a partir da matriz do servidor.
  const [edicao, setEdicao] = useState<Record<string, Set<string>>>({});
  const linhas = useMemo(() => data?.linhas ?? [], [data]);
  const telas = useMemo(() => data?.telas ?? [], [data]);

  const conjuntoAtual = (papel: string): Set<string> => {
    if (edicao[papel]) return edicao[papel];
    const linha = linhas.find((l) => l.papel === papel);
    return new Set(linha?.telasVisiveis ?? []);
  };

  const alternar = (papel: string, tela: string) => {
    const atual = new Set(conjuntoAtual(papel));
    if (atual.has(tela)) atual.delete(tela); else atual.add(tela);
    setEdicao((e) => ({ ...e, [papel]: atual }));
  };

  const salvar = useMutation({
    mutationFn: (papel: string) => api.salvarTelasPapel(papel, [...conjuntoAtual(papel)]),
    onSuccess: (_r, papel) => {
      setEdicao((e) => { const c = { ...e }; delete c[papel]; return c; });
      void qc.invalidateQueries({ queryKey: ['matriz-telas'] });
      void qc.invalidateQueries({ queryKey: ['telas-admin'] }); // reflete no menu dos papéis afetados
    },
  });

  const rotuloPapel = (papel: string) => t(`common.papel.${papel}`, { defaultValue: papel });
  const sujo = (papel: string) => !!edicao[papel];

  const cabecalho = useMemo(() => telas.map((k) => (
    <th key={k} scope="col" style={{ padding: '8px 6px', fontWeight: 600, fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' }}>
      {t(rotuloTela[k] ?? k)}
    </th>
  )), [telas, t]);

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">{t('admin.perfis.titulo')}</h1>
        <p className="page-sub">{t('admin.perfis.subtitulo')}</p>
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table data-cy="matriz-telas" style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--divider)' }}>
                <th scope="col" style={{ padding: '8px 6px', textAlign: 'left', fontSize: 12 }}>{t('admin.perfis.colPerfil')}</th>
                {cabecalho}
                <th scope="col" style={{ padding: '8px 6px' }} />
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => {
                const visiveis = conjuntoAtual(linha.papel);
                const obrigatorias = new Set<string>(TELAS_OBRIGATORIAS_POR_PAPEL[linha.papel] ?? []);
                return (
                  <tr key={linha.papel} data-cy={`linha-${linha.papel}`} style={{ borderBottom: '1px solid var(--divider)' }}>
                    <th scope="row" style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {rotuloPapel(linha.papel)}
                      {linha.editavel && linha.customizado && !sujo(linha.papel) && (
                        <em style={{ color: 'var(--texto-suave)', fontWeight: 400 }}> · {t('admin.perfis.customizado')}</em>
                      )}
                    </th>
                    {telas.map((tela) => {
                      // `perfis` do admin é obrigatória (marcada e travada); telas de config do admin ficam
                      // bloqueadas (desmarcadas) para os demais papéis.
                      const obrigatoria = obrigatorias.has(tela);
                      const bloqueadaOutros = linha.papel !== 'administrador' && ADMIN_ONLY.has(tela);
                      const travada = obrigatoria || bloqueadaOutros;
                      return (
                        <td key={tela} style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            data-cy={`chk-${linha.papel}-${tela}`}
                            aria-label={`${rotuloPapel(linha.papel)} — ${t(rotuloTela[tela] ?? tela)}`}
                            checked={obrigatoria || (visiveis.has(tela) && !bloqueadaOutros)}
                            disabled={!linha.editavel || travada}
                            onChange={() => alternar(linha.papel, tela)}
                          />
                        </td>
                      );
                    })}
                    <td style={{ padding: '8px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {linha.editavel && (
                        <Botao
                          data-cy={`salvar-${linha.papel}`}
                          variante="secundario"
                          disabled={!sujo(linha.papel) || salvar.isPending}
                          onClick={() => salvar.mutate(linha.papel)}
                        >
                          {t('admin.perfis.salvar')}
                        </Botao>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {salvar.isSuccess && <p data-cy="salvo" style={{ color: 'var(--sucesso, #178a4a)', marginTop: 10 }}>{t('admin.perfis.salvo')}</p>}
        {salvar.isError && <p role="alert" style={{ color: 'var(--erro, #c0392b)', marginTop: 10 }}>{t('admin.perfis.erro')}</p>}
      </Card>
    </div>
  );
}
