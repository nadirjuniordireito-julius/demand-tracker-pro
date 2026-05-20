// =====================================================
// Políticas de segurança - Status de Demanda Técnica
// =====================================================

import type { DemandStatus } from '@/types';

/** Status possíveis da demanda técnica */
export const DEMANDA_STATUS = {
  A: 'A', // Em elaboração
  B: 'B', // Em abertura
  C: 'C', // Aberta e assinada
  D: 'D', // Em planejamento
  E: 'E', // Planejado e assinado
  F: 'F', // Em encerramento
  G: 'G', // Encerrado e assinado
  Z: 'Z', // Cancelada
} as const;

/** Códigos canônicos (uma letra) aceitos como status */
const LETTER_CODES = new Set<string>(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Z']);

/** Mapeamento de rótulos/valores alternativos do backend para o código canônico (A–G, Z) */
const LABEL_TO_CODE: Record<string, string> = {
  // A - Em elaboração
  'em elaboração': 'A',
  'em elaboracao': 'A',
  'elaboração': 'A',
  'elaboracao': 'A',
  'in elaboration': 'A',
  // B - Em abertura
  'em abertura': 'B',
  'abertura': 'B',
  'opened': 'B',
  // C - Aberta e assinada
  'aberta': 'C',
  'aberta e assinada': 'C',
  // D - Em planejamento
  'em planejamento': 'D',
  'planejamento': 'D',
  'inplanning': 'D',
  // E - Planejado e assinado
  'em execução': 'E',
  'execução': 'E',
  // F - Em encerramento
  'em encerramento': 'F',
  'encerramento': 'F',
  'inexecution': 'F',
  // G - Encerrado e assinado
  'encerrado': 'G',
  'encerrado e assinado': 'G',
  'closed': 'G',
  // Z - Cancelada
  'cancelada': 'Z',
};

/** Chaves i18n para exibir a descrição do status (demands.statusA, etc.) — mesma semântica dos rótulos em LABEL_TO_CODE */
export const CODE_TO_I18N_KEY: Record<string, string> = {
  A: 'demands.statusA',
  B: 'demands.statusB',
  C: 'demands.statusC',
  D: 'demands.statusD',
  E: 'demands.statusE',
  F: 'demands.statusF',
  G: 'demands.statusG',
  Z: 'demands.statusZ',
};

/**
 * Retorna a chave i18n da descrição do status da demanda para o código (normalizado). Use com t(key) para exibir na UI.
 */
export function getDemandaStatusLabelKey(status: string | undefined): string | undefined {
  const code = normalizeDemandaStatus(status);
  return code != null ? CODE_TO_I18N_KEY[code] : undefined;
}

/**
 * Normaliza status vindo do backend (código 'A' ou rótulo como "Em elaboração") para o código canônico (A–G, Z).
 * Assim o botão SALVAR do Termo de Abertura fica habilitado quando a demanda está em elaboração,
 * independentemente do backend enviar status 'A' ou situacao 'Em elaboração'.
 */
export function normalizeDemandaStatus(status: string | undefined): string | undefined {
  if (status == null || status === '') return undefined;
  const s = String(status).trim();
  if (LETTER_CODES.has(s)) return s;
  const lower = s.toLowerCase();
  return LABEL_TO_CODE[lower] ?? undefined;
}

/** Pode cancelar demanda apenas se status !== G (ou 'closed' formato antigo) */
export const canCancelDemanda = (status: string | undefined): boolean =>
  !!status && status !== 'G' && status !== 'closed';

/** Pode excluir demanda apenas se status !== G (ou 'closed' formato antigo) */
export const canDeleteDemanda = (status: string | undefined): boolean =>
  !status || (status !== 'G' && status !== 'closed');

/** Edição da Demanda: salvar só se status A */
export const canEditDemanda = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'A';

/** Termo de Abertura: salvar formulário em A ou B */
export const canSaveTermoAbertura = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'A' || code === 'B';
};

/** Excluir apenas o PDF anexado em A, B ou D */
export const canDeleteDocTermoAbertura = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'A' || code === 'B' || code === 'D';
};

/** Termo de Planejamento: edição (POST/PUT termo + CRUD doc) em B, C ou D */
const PLANEJAMENTO_EDIT_STATUSES = new Set(['B', 'C', 'D']);
const PLANEJAMENTO_SIGN_STATUSES = new Set(['C', 'D']);

export const canEditTermoPlanejamento = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code != null && PLANEJAMENTO_EDIT_STATUSES.has(code);
};

export const canSaveTermoPlanejamento = canEditTermoPlanejamento;

export const canDeleteDocTermoPlanejamento = canEditTermoPlanejamento;

/** Termo de Encerramento: salvar e excluir documento só se status E ou F */
export const canSaveTermoEncerramento = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'E' || code === 'F';
};
export const canDeleteDocTermoEncerramento = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'E' || code === 'F';
};

/** Termo de Abertura: pode criar se status A */
export const canCreateTermoAbertura = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'A';

/** Documento do termo (gerar PDF, upload assinado, excluir termo/doc) em B ou D */
const ABERTURA_DOC_MANAGE_STATUSES = new Set(['B', 'D']);

const canManageDocTermoAbertura = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code != null && ABERTURA_DOC_MANAGE_STATUSES.has(code);
};

export const canUploadTermoAbertura = canManageDocTermoAbertura;
export const canDeleteTermoAbertura = canManageDocTermoAbertura;
export const canGenerateTermoAbertura = canManageDocTermoAbertura;

export const canCreateTermoPlanejamento = canEditTermoPlanejamento;
export const canUploadTermoPlanejamento = canEditTermoPlanejamento;
export const canDeleteTermoPlanejamento = canEditTermoPlanejamento;

export interface CanAssinarTermoPlanejamentoDocOpts {
  hasCustos: boolean;
  aberturaAssinada: boolean;
  doc?: { dataAssinatura?: string | null } | null;
}

/** Assinar PDF: status C ou D, com custos, abertura assinada e documento não assinado */
export function canAssinarTermoPlanejamentoDoc(
  status: string | undefined,
  opts: CanAssinarTermoPlanejamentoDocOpts
): boolean {
  const code = normalizeDemandaStatus(status);
  if (code == null || !PLANEJAMENTO_SIGN_STATUSES.has(code)) return false;
  if (!opts.hasCustos || !opts.aberturaAssinada) return false;
  if (!opts.doc || opts.doc.dataAssinatura) return false;
  return true;
}

/** POST /api/demandas-execucao somente com demanda em E */
export const canCreateDemandaExecucao = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'E';

/** Termo de Encerramento: pode criar se E; upload e excluir termo se E ou F (em E pode tudo nesta tela) */
export const canCreateTermoEncerramento = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'E';
export const canUploadTermoEncerramento = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'E' || code === 'F';
};
export const canDeleteTermoEncerramento = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'E' || code === 'F';
};

/** Demanda está encerrada (status G ou "ENCERRADA") */
export const isDemandaEncerrada = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'G';

/** Pode avaliar demanda: encerrada e ainda sem avaliação */
export function canAvaliarDemanda(demanda: { status?: string; situacao?: string; avaliacao?: unknown } | null): boolean {
  if (!demanda) return false;
  const status = demanda.status ?? demanda.situacao;
  return isDemandaEncerrada(status) && (demanda.avaliacao == null || demanda.avaliacao === undefined);
}
