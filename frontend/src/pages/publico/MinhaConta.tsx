import { cores } from '../../design-system/tokens';

/**
 * "Minha conta" (UX-DR4 / RN009 / RF018). Dados oficiais da Receita em SOMENTE LEITURA;
 * só Nome Fantasia/Endereço/Telefone editáveis. "Sincronizar agora" com timestamp/status.
 */
export interface MinhaContaProps {
  fornecedor: { razaoSocial: string; cnpj: string; porte: string };
  ultimaSync?: { quando: string; status: 'sucesso' | 'erro' };
  onSincronizar: () => void;
}

export function MinhaConta({ fornecedor, ultimaSync, onSincronizar }: MinhaContaProps) {
  return (
    <main style={{ padding: 32 }}>
      <h1>Minha conta</h1>
      <p>Dados oficiais da empresa obtidos pela Receita Federal (API do CNPJ). Apenas Nome Fantasia,
        Endereço e Telefone podem ser editados.</p>

      <section style={{ background: cores.azul900, color: cores.branco, borderRadius: 8, padding: 20 }}>
        <strong>Sincronizar dados do CNPJ</strong>
        {ultimaSync && <div>Última sincronização: {ultimaSync.quando} · {ultimaSync.status}</div>}
        <button onClick={onSincronizar} style={{ background: cores.acentoAmbar }}>Sincronizar agora</button>
      </section>

      <fieldset disabled>{/* read-only (RN009) */}
        <legend>Dados oficiais (somente leitura)</legend>
        <input readOnly value={fornecedor.razaoSocial} />
        <input readOnly value={fornecedor.cnpj} />
        <input readOnly value={fornecedor.porte} />
      </fieldset>

      <fieldset>
        <legend>Editáveis</legend>
        <input name="nomeFantasia" placeholder="Nome Fantasia" />
        <input name="endereco" placeholder="Endereço" />
        <input name="telefone" placeholder="Telefone" />
      </fieldset>
    </main>
  );
}
