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
  'planejado': 'E',
  'planejado e assinado': 'E',
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

/** Termo de Abertura: salvar e excluir documento só se status A ou B */
export const canSaveTermoAbertura = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'A' || code === 'B';
};
export const canDeleteDocTermoAbertura = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'A' || code === 'B';
};

/** Termo de Planejamento: salvar e excluir documento só se status C ou D */
export const canSaveTermoPlanejamento = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'C' || code === 'D';
};
export const canDeleteDocTermoPlanejamento = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'C' || code === 'D';
};

/** Termo de Encerramento: salvar e excluir documento só se status E ou F */
export const canSaveTermoEncerramento = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'E' || code === 'F';
};
export const canDeleteDocTermoEncerramento = (status: string | undefined): boolean => {
  const code = normalizeDemandaStatus(status);
  return code === 'E' || code === 'F';
};

/** Termo de Abertura: pode criar se status A; upload se B; excluir termo se B */
export const canCreateTermoAbertura = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'A';
export const canUploadTermoAbertura = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'B';
export const canDeleteTermoAbertura = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'B';

/** Termo de Planejamento: pode criar se C; upload se D; excluir termo se D */
export const canCreateTermoPlanejamento = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'C';
export const canUploadTermoPlanejamento = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'D';
export const canDeleteTermoPlanejamento = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'D';

/** Termo de Encerramento: pode criar se E; upload se F; excluir termo se F */
export const canCreateTermoEncerramento = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'E';
export const canUploadTermoEncerramento = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'F';
export const canDeleteTermoEncerramento = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'F';

/** Demanda está encerrada (status G ou "ENCERRADA") */
export const isDemandaEncerrada = (status: string | undefined): boolean =>
  normalizeDemandaStatus(status) === 'G';

/** Pode avaliar demanda: encerrada e ainda sem avaliação */
export function canAvaliarDemanda(demanda: { status?: string; situacao?: string; avaliacao?: unknown } | null): boolean {
  if (!demanda) return false;
  const status = demanda.status ?? demanda.situacao;
  return isDemandaEncerrada(status) && (demanda.avaliacao == null || demanda.avaliacao === undefined);
}
