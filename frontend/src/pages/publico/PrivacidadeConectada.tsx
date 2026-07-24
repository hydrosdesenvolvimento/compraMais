import { useTranslation } from 'react-i18next';
import { Card } from '../../design-system/components';
import { obterUsuario } from '../../lib/auth';
import { Privacidade } from './Privacidade';

/**
 * Liga a tela "Privacidade" (UC017) ao titular autenticado. O pedido de direito é chaveado pelo ATOR
 * (o `sub` do token, AD-20), então o self-service usa o `userId` da sessão (não o `empresaId`) para
 * que o protocolo e a listagem "meus pedidos" batam — dado pessoal é da pessoa, não da empresa: dois
 * usuários do mesmo CNPJ não leem os pedidos um do outro. O guard de rota garante a autenticação, e
 * o backend não aceita mais um titular declarado pelo cliente.
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
