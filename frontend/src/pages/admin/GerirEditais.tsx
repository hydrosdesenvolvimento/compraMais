import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, Botao } from '../../design-system/components';

/**
 * Gestão de editais (US1 / Painel Admin). Consulta (Query, QBE por situação), criação (TanStack Form),
 * publicar/encerrar (Mutations com invalidação). Invariante 1 Edital = 1 Secretaria (backend — FR-002).
 */
export function GerirEditais({ secretariaId }: { secretariaId: string }) {
  const [situacaoFiltro, setSituacaoFiltro] = useState('publicado');
  const qc = useQueryClient();
  const chave = ['gestao-editais', secretariaId] as const;

  const { data: editais = [] } = useQuery({ queryKey: [...chave, situacaoFiltro], queryFn: () => api.gestaoEditais(secretariaId, situacaoFiltro) });
  const invalidar = () => qc.invalidateQueries({ queryKey: chave });

  const criar = useMutation({
    mutationFn: (v: { objeto: string; cnae: string; quantitativos: number; prazo: string }) => api.criarEdital({ secretariaId, objeto: v.objeto, cnaesAlvo: v.cnae.split(',').map((c) => c.trim()).filter(Boolean), quantitativos: v.quantitativos, prazoVigencia: v.prazo }),
    onSuccess: () => { form.reset(); void invalidar(); },
  });
  const publicar = useMutation({ mutationFn: (id: string) => api.publicarEdital(id), onSuccess: () => void invalidar() });
  const encerrar = useMutation({ mutationFn: (id: string) => api.encerrarEdital(id), onSuccess: () => void invalidar() });

  const form = useForm({
    defaultValues: { objeto: '', cnae: '', quantitativos: 1, prazo: '' },
    onSubmit: async ({ value }) => { await criar.mutateAsync(value); },
  });

  return (
    <div className="stack">
      <div><h1 className="page-title">Gestão de editais</h1><p className="page-sub">Crie, publique e encerre editais individualizados (1 secretaria por edital).</p></div>

      <Card>
        <form data-cy="form-edital" onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }} style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
          <form.Field name="objeto">{(f) => <input data-cy="objeto" className="input" placeholder="Objeto da demanda" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} />}</form.Field>
          <form.Field name="cnae">{(f) => <input data-cy="cnae" className="input" placeholder="CNAE(s) alvo (vírgula)" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} />}</form.Field>
          <form.Field name="quantitativos">{(f) => <input data-cy="quantitativos" className="input" type="number" min={1} value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value))} />}</form.Field>
          <form.Field name="prazo">{(f) => <input data-cy="prazo" className="input" type="date" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} />}</form.Field>
          <Botao data-cy="criar" type="submit" disabled={criar.isPending}>Criar edital (rascunho)</Botao>
        </form>
      </Card>

      <label>Filtrar situação
        <select data-cy="filtro-situacao" value={situacaoFiltro} onChange={(e) => setSituacaoFiltro(e.target.value)}>
          <option value="rascunho">Rascunho</option><option value="publicado">Publicado</option><option value="encerrado">Encerrado</option>
        </select>
      </label>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {editais.map((e) => (
          <li key={e.id} data-cy="edital" className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1 }}>{e.objeto} — <em style={{ color: 'var(--texto-suave)' }}>{e.situacao}</em></span>
            {e.situacao === 'rascunho' && <Botao data-cy="publicar" onClick={() => publicar.mutate(e.id)}>Publicar</Botao>}
            {e.situacao === 'publicado' && <Botao data-cy="encerrar" variante="secundario" onClick={() => encerrar.mutate(e.id)}>Encerrar</Botao>}
          </li>
        ))}
      </ul>
    </div>
  );
}
