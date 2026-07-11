import { useTranslation } from 'react-i18next';
import { Card } from '../../design-system/components';
import { obterUsuario } from '../../lib/auth';
import { Privacidade } from './Privacidade';

/**
 * Liga a tela "Privacidade" (UC017) ao titular autenticado. O pedido de direito é chaveado pelo ATOR
 * (x-user-id) no backend, então o self-service usa o `userId` da sessão (não o `empresaId`) para que o
 * protocolo e a listagem "meus pedidos" batam. O guard de rota já garante a autenticação.
 */
export function PrivacidadeConectada() {
  const { t } = useTranslation();
  const titularId = obterUsuario()?.userId;
  if (!titularId) {
    return (
      <div className="stack" data-cy="privacidade-estado">
        <Card><p style={{ margin: 0, fontSize: 14, color: 'var(--cinza-500)' }}>{t('privacidade.semSessao')}</p></Card>
      </div>
    );
  }
  return <Privacidade titularId={titularId} />;
}
