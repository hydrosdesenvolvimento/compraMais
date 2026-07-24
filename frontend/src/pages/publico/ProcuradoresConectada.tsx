import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '../../design-system/components';
import { api, HttpError } from '../../lib/api';
import { obterUsuario } from '../../lib/auth';
import { Procuradores } from './Procuradores';

/**
 * Liga a tela "Procuradores" (UC019) ao fornecedor autenticado: lê o `empresaId` da sessão, lista os
 * vínculos (GET), convida (POST) e remove (DELETE), revalidando a lista. Gestão é prerrogativa do
 * titular (RN010): quando o ator não é o titular, o backend responde 403 e mostramos o aviso adequado.
 */
export function ProcuradoresConectada() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fornecedorId = obterUsuario()?.empresaId;
  const [erroConvite, setErroConvite] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['procuradores', fornecedorId],
    queryFn: () => api.procuradores(fornecedorId as string),
    enabled: !!fornecedorId,
    retry: false,
  });

  const convidar = useMutation({
    meta: { semToast: true }, // erro do convite é exibido inline — evita toast duplicado
    mutationFn: (identificador: string) => api.convidarProcurador(fornecedorId as string, identificador),
    onSuccess: () => { setErroConvite(null); void qc.invalidateQueries({ queryKey: ['procuradores', fornecedorId] }); },
    onError: () => setErroConvite(t('procuradores.convite.erro')),
  });

  const remover = useMutation({
    mutationFn: (contaId: string) => api.removerProcurador(fornecedorId as string, contaId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['procuradores', fornecedorId] }); },
  });

  if (!fornecedorId) return <Aviso texto={t('procuradores.estado.semEmpresa')} />;
  if (q.isLoading) return <Aviso texto={t('procuradores.estado.carregando')} />;
  if (q.isError) {
    const somenteTitular = q.error instanceof HttpError && q.error.status === 403;
    return <Aviso texto={t(somenteTitular ? 'procuradores.estado.somenteTitular' : 'procuradores.estado.erro')} tom={somenteTitular ? 'neutro' : 'erro'} />;
  }

  return (
    <Procuradores
      procuradores={q.data ?? []}
      onConvidar={async (identificador) => { await convidar.mutateAsync(identificador).catch(() => {}); }}
      onRemover={(contaId) => remover.mutate(contaId)}
      enviando={convidar.isPending}
      removendoId={remover.isPending ? (remover.variables ?? null) : null}
      erroConvite={erroConvite}
    />
  );
}

function Aviso({ texto, tom = 'neutro' }: { texto: string; tom?: 'neutro' | 'erro' }) {
  return (
    <div className="stack" data-cy="procuradores-estado">
      <Card>
        <p style={{ margin: 0, fontSize: 14, color: tom === 'erro' ? 'var(--erro)' : 'var(--cinza-500)' }}>{texto}</p>
      </Card>
    </div>
  );
}
