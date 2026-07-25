import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Card } from '../../design-system/components';
import { IconeCadeado } from '../../design-system/icons';
import { SecaoLabel, CampoOficial, FotoResponsavel, TrocaSenhaForm } from '../conta-perfil';

/** cargo (chave do domínio) → chave i18n em `admin.usuarios.cargos.*` (camelCase). */
const CARGO_KEY: Record<string, string> = {
  administrador: 'administrador', analista_cpl: 'analistaCpl', coordenador_cpl: 'coordenadorCpl',
  secretario: 'secretario', gestor: 'gestor', auditor: 'auditor', dpo: 'dpo',
};

/**
 * "Minha conta" do servidor (Painel Admin). Dados do usuário autenticado provenientes do módulo
 * Usuários (UC021) exibidos READ-ONLY — a edição de cargo/perfil/secretaria é do Administrador, não
 * autosserviço. O usuário só gere a própria FOTO e SENHA (GET/PATCH /auth/perfil, POST /auth/senha).
 * Reusa os blocos de foto/senha/campos de `conta-perfil` (compartilhados com a "Minha conta" do fornecedor).
 */
export function MinhaContaAdmin() {
  const { t, i18n } = useTranslation();
  const [editSenha, setEditSenha] = useState(false);
  const perfilQ = useQuery({ queryKey: ['perfil-proprio'], queryFn: () => api.perfilProprio() });
  const p = perfilQ.data;

  const papelLabel = (papel: string) => t(`common.papel.${papel}`, { defaultValue: papel });
  const cargoLabel = (cargo: string | null) => (cargo ? t(`admin.usuarios.cargos.${CARGO_KEY[cargo] ?? cargo}`, { defaultValue: cargo }) : '—');
  const fmtData = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' }); };

  return (
    <div className="stack" data-cy="minha-conta-admin">
      <div>
        <h1 className="page-title">{t('minhaContaAdmin.titulo')}</h1>
        <p className="page-sub">{t('minhaContaAdmin.subtitulo')}</p>
      </div>

      <Card>
        <SecaoLabel>{t('minhaContaAdmin.dadosLabel')}</SecaoLabel>
        {perfilQ.isError ? (
          <p data-cy="perfil-proprio-erro" style={{ margin: 0, fontSize: 13.5, color: 'var(--erro)' }}>{t('minhaConta.responsavel.erroCarregar')}</p>
        ) : (
          <>
            <FotoResponsavel
              avatar={p?.avatar ?? null} nome={p?.nome ?? ''} carregando={perfilQ.isLoading}
              titulo={p?.nome ?? '—'}
              subtitulo={p ? `${papelLabel(p.papel)}${p.secretaria ? ` · ${p.secretaria}` : ''}` : ''}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px 18px', marginTop: 22 }}>
              <CampoOficial rotulo={t('minhaContaAdmin.nome')} valor={p?.nome ?? '—'} />
              <CampoOficial rotulo={t('minhaContaAdmin.email')} valor={p?.email ?? '—'} />
              <CampoOficial rotulo={t('minhaContaAdmin.cargo')} valor={cargoLabel(p?.cargo ?? null)} />
              <CampoOficial rotulo={t('minhaContaAdmin.perfil')} valor={p ? papelLabel(p.papel) : '—'} />
              <CampoOficial rotulo={t('minhaContaAdmin.secretaria')} valor={p?.secretaria || '—'} />
              <CampoOficial rotulo={t('minhaContaAdmin.situacao')} valor={p ? t(p.ativo ? 'minhaContaAdmin.ativo' : 'minhaContaAdmin.inativo') : '—'} />
              <CampoOficial rotulo={t('minhaContaAdmin.dataCadastro')} valor={p ? fmtData(p.registerDate) : '—'} />
            </div>
          </>
        )}
      </Card>

      <Card>
        <SecaoLabel cor="var(--cinza-500)" icone={<IconeCadeado width={15} height={15} strokeWidth={1.9} style={{ color: 'var(--cinza-400)' }} />}>
          {t('minhaContaAdmin.segurancaLabel')}
        </SecaoLabel>
        <label className="label">{t('minhaConta.responsavel.senha')}</label>
        {!editSenha ? (
          <button data-cy="abrir-troca-senha" className="btn btn-ghost" style={{ padding: '11px 18px' }} type="button" onClick={() => setEditSenha(true)}>
            <IconeCadeado width={16} height={16} /> {t('minhaConta.responsavel.alterarSenha')}
          </button>
        ) : (
          <TrocaSenhaForm onFechar={() => setEditSenha(false)} />
        )}
      </Card>
    </div>
  );
}
