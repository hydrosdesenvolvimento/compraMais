/**
 * Baseline do catálogo de Tipos de Documento (RF022 / UC020) — os "documentos exigidos" do Passo 2 do
 * credenciamento e do dropdown de upload da tela de Documentos. Fonte única compartilhada entre o seed
 * durável (Postgres) e o bootstrap em memória (`buildServer` sem banco), para que ambos os modos exibam
 * os mesmos tipos e a guarda de upload (`GerirDocumentos.enviar`) tenha um catálogo consistente.
 *
 * `obrigatorio` é parametrizável (RF022 / §02): o Administrador ajusta na tela "Tipos de Arquivos".
 * Os nomes espelham os documentos do protótipo (portal-fornecedor.html) marcados como exigidos; o
 * Atestado de Capacidade Técnica fica opcional (só consta do rascunho v1.0 descartado, não canônico).
 */
export interface TipoDocumentoBaseline {
  nome: string;
  categoria: 'cadastral' | 'fiscal' | 'contratual';
  exigeValidade: boolean;
  exigeExercicio: boolean;
  validadeDias: number | null;
  obrigatorio: boolean;
}

export const TIPOS_DOCUMENTO_BASELINE: readonly TipoDocumentoBaseline[] = [
  { nome: 'Cartão CNPJ', categoria: 'cadastral', exigeValidade: false, exigeExercicio: false, validadeDias: null, obrigatorio: true },
  { nome: 'Contrato Social', categoria: 'contratual', exigeValidade: false, exigeExercicio: false, validadeDias: null, obrigatorio: true },
  { nome: 'Certidão Negativa de Débitos Federais', categoria: 'fiscal', exigeValidade: true, exigeExercicio: false, validadeDias: 180, obrigatorio: true },
  { nome: 'Certidão Negativa de Débitos Estaduais', categoria: 'fiscal', exigeValidade: true, exigeExercicio: false, validadeDias: 90, obrigatorio: true },
  { nome: 'Certidão Negativa de Débitos Trabalhistas (CNDT)', categoria: 'fiscal', exigeValidade: true, exigeExercicio: false, validadeDias: 180, obrigatorio: true },
  { nome: 'Certidão de Regularidade do FGTS', categoria: 'fiscal', exigeValidade: true, exigeExercicio: false, validadeDias: 90, obrigatorio: true },
  { nome: 'Balanço Patrimonial', categoria: 'contratual', exigeValidade: false, exigeExercicio: true, validadeDias: null, obrigatorio: true },
  { nome: 'Atestado de Capacidade Técnica', categoria: 'contratual', exigeValidade: false, exigeExercicio: false, validadeDias: null, obrigatorio: false },
];
