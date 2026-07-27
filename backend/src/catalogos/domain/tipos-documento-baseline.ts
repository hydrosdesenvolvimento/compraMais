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
  // Foto do responsável (UC007 · prova de vida): referência biométrica enviada como documento e
  // covalidada pela CPL como os demais. O nome deve casar com TIPO_DOC_FOTO_RESPONSAVEL (biometria).
  { nome: 'Foto do Responsável', categoria: 'cadastral', exigeValidade: false, exigeExercicio: false, validadeDias: null, obrigatorio: true },
];

/**
 * Tipos que o SISTEMA usa pelo nome e que, por isso, não podem ser excluídos fisicamente do catálogo
 * (RF022 · exclusão do Administrador). Editar e inativar continuam permitidos — a guarda existe só
 * contra a remoção definitiva, que é irreversível e quebraria o fluxo que depende do nome.
 *
 * `Foto do Responsável` é consumido por nome pelo enrollment da prova de vida (UC007,
 * `TIPO_DOC_FOTO_RESPONSAVEL` em `biometria/domain/biometria.ts`); sem ele o upload da foto falha com
 * `TipoDocumentoDesconhecido`. A lista vive aqui, e não em `biometria`, para não inverter o boundary
 * (catálogos não conhecem biometria); um teste amarra as duas pontas contra drift.
 */
export const TIPOS_DOCUMENTO_DE_SISTEMA: readonly string[] = ['Foto do Responsável'];
