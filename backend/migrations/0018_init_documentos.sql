-- Migração 0018 — documentos: tabelas `documentos` e `documentos_conteudo` (UC006 / FR-007/008/015 /
-- AD-19 / AD-33). Forward-only (AD-28): NUNCA alterar destrutivamente após aplicada. Fecha a última
-- lacuna de durabilidade do sistema: todo agregado já tinha par Postgres MENOS justamente o que guarda
-- os documentos comprobatórios e a PII de sócios, que viviam num Map em memória. Consequência do
-- defeito: um restart do backend apagava a fila de covalidação (UC006) e os uploads dos fornecedores.
-- Mesma classe do fix de 0004/0005/0007/0009.
--
-- Separação em DUAS tabelas (AD-19): `documentos` guarda o AGREGADO (metadados + status de covalidação)
-- e `documentos_conteudo` guarda o BLOB CIFRADO, atrás da porta ObjectStorage. O conteúdo já chega
-- cifrado pela camada de cima (PiiCipher); o storage NÃO decifra e NÃO conhece a chave — por isso a
-- tabela de conteúdo não tem coluna de chave/IV nem qualquer campo em claro. A separação também mantém
-- as leituras quentes da fila de covalidação (que só tocam metadados) fora do caminho do blob.

CREATE TABLE IF NOT EXISTS documentos (
  id                 text PRIMARY KEY,
  fornecedor_id      text NOT NULL,
  tipo               text NOT NULL,
  -- Ponteiro estável para o objeto cifrado (`pg://<chave>`), coerente com o `mem://` do adaptador
  -- em memória. Opaco para o domínio: só o ObjectStorage interpreta o esquema.
  arquivo_ref        text NOT NULL,
  formato            text NOT NULL,
  -- `text` (e não `date`) de propósito: `Documento.estaVigente` compara ISO-8601 lexicograficamente;
  -- gravar como texto preserva exatamente o valor do snapshot (mesma escolha de `editais.prazo_vigencia`).
  data_validade      text,
  -- Ciclo da Covalidação (AD-15): pendente → aprovado | reprovado; reprovado → pendente (reenvio, FR-010).
  status             text NOT NULL,
  motivo_reprovacao  text,
  register_date      timestamptz NOT NULL DEFAULT now(),
  update_date        timestamptz NOT NULL DEFAULT now(),
  last_user_update   text NOT NULL
);

-- Consultas quentes: documentos de um fornecedor (portal) e QBE por tipo (FR-015).
CREATE INDEX IF NOT EXISTS idx_documentos_fornecedor ON documentos (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_documentos_forn_tipo ON documentos (fornecedor_id, tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_status ON documentos (status);
-- Índices PARCIAIS que sustentam a fila de covalidação (padrão de 0009/0010): a fila só olha
-- `pendente`, então o índice indexa só essa fatia — menor e estável mesmo quando a massa de
-- aprovados/reprovados crescer. `listarPendentes(fornecedorId)` usa o primeiro; a contagem global do
-- funil (painel) usa o segundo.
CREATE INDEX IF NOT EXISTS idx_documentos_forn_pend ON documentos (fornecedor_id) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_documentos_pendentes ON documentos (register_date) WHERE status = 'pendente';

-- Conteúdo cifrado em repouso (AD-19). `chave` é o caminho lógico `<fornecedorId>/<documentoId>`
-- montado por GerirDocumentos; o `arquivo_ref` do agregado aponta para cá via `pg://<chave>`.
-- Sem FK para `documentos`: o put() do storage acontece ANTES do salvar() do agregado (o ref só existe
-- depois do put), e uma FK inverteria essa ordem. O acoplamento é o ponteiro, não a integridade.
CREATE TABLE IF NOT EXISTS documentos_conteudo (
  chave             text PRIMARY KEY,
  conteudo_cifrado  text NOT NULL,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now()
);
