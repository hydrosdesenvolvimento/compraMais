import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '../../design-system/components';
import { api } from '../../lib/api';
import { obterUsuario } from '../../lib/auth';
import { MinhaConta } from './MinhaConta';

/**
 * Liga a tela "Minha conta" (UC018) ao fornecedor autenticado: lê o `empresaId` da sessão, busca o
 * perfil real (GET /fornecedores/:id) e revalida após a re-sincronização. O guard de rota já garante
 * autenticação; aqui tratamos os estados de carregamento/erro e a ausência de empresa vinculada.
 */
export function MinhaContaConectada() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fornecedorId = obterUsuario()?.empresaId;

  const q = useQuery({
    queryKey: ['fornecedor', fornecedorId],
    queryFn: () => api.fornecedor(fornecedorId as string),
    enabled: !!fornecedorId,
  });

  if (!fornecedorId) return <Aviso texto={t('minhaConta.estado.semEmpresa')} />;
  if (q.isLoading) return <Aviso texto={t('minhaConta.estado.carregando')} />;
  if (q.isError || !q.data) return <Aviso texto={t('minhaConta.estado.erro')} tom="erro" />;

  const p = q.data;
  const ultimaSync = p.sincronizadoEm
    ? { quando: p.sincronizadoEm, status: (p.situacao === 'ativa' ? 'sucesso' : 'revisao') as 'sucesso' | 'revisao' }
    : undefined;

  return (
    <MinhaConta
      fornecedorId={fornecedorId}
      fornecedor={{
        razaoSocial: p.razaoSocial, cnpj: p.cnpj, porte: p.porte, situacao: p.situacao,
        nomeFantasia: p.nomeFantasia, telefone: p.telefone, endereco: p.endereco,
      }}
      ultimaSync={ultimaSync}
      onSincronizado={() => { void qc.invalidateQueries({ queryKey: ['fornecedor', fornecedorId] }); }}
    />
  );
}

function Aviso({ texto, tom = 'neutro' }: { texto: string; tom?: 'neutro' | 'erro' }) {
  return (
    <div className="stack" data-cy="minha-conta-estado">
      <Card>
        <p style={{ margin: 0, fontSize: 14, color: tom === 'erro' ? 'var(--erro)' : 'var(--cinza-500)' }}>{texto}</p>
      </Card>
    </div>
  );
}
