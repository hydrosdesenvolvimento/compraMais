import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Card } from '../../design-system/components';

/**
 * Contestação de CNAE pelo fornecedor (US2 / FR-007). TanStack Form (validação: justificativa
 * obrigatória) + TanStack Query (mutation). A procedência é julgada pela Secretaria.
 */
export function ContestarCnae({ editalId }: { editalId: string }) {
  const { t } = useTranslation();
  const enviar = useMutation({ mutationFn: (v: { cnaeContestado: string; justificativa: string }) => api.contestarCnae(editalId, v) });
  const form = useForm({
    defaultValues: { cnae: '', justificativa: '' },
    onSubmit: async ({ value }) => { await enviar.mutateAsync({ cnaeContestado: value.cnae, justificativa: value.justificativa }); },
  });

  return (
    <Card>
      <h2 style={{ fontSize: 18, marginBottom: 14 }}>{t('editais.contestarCnae.titulo')}</h2>
      <form onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460 }}>
        <form.Field name="cnae">
          {(field) => <input data-cy="cnae" className="input" placeholder={t('editais.contestarCnae.cnaePlaceholder')} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} />}
        </form.Field>
        <form.Field name="justificativa" validators={{ onChange: ({ value }: { value: string }) => (value.trim() ? undefined : t('editais.contestarCnae.justificativaObrigatoria')) }}>
          {(field) => (
            <div>
              <textarea data-cy="justificativa" className="input" placeholder={t('editais.contestarCnae.justificativaPlaceholder')} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} />
              {field.state.meta.isTouched && field.state.meta.errors[0] && <small style={{ color: 'var(--erro)' }}>{String(field.state.meta.errors[0])}</small>}
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => <button data-cy="enviar-contestacao" type="submit" className="btn btn-primary" disabled={!canSubmit || enviar.isPending}>{t('editais.contestarCnae.enviar')}</button>}
        </form.Subscribe>
      </form>
      {enviar.isSuccess && <p data-cy="contestacao-ok" style={{ color: 'var(--sucesso)' }}>{t('editais.contestarCnae.sucesso')}</p>}
    </Card>
  );
}
