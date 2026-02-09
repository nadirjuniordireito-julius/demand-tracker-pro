/**
 * Valores padrão do formulário de Avaliação de Qualidade da Demanda
 */

import type { AvaliacaoDemandaFormData } from './avaliacaoSchema';

const emptyTextos = {
  causaAtraso: '',
  causaCusto: '',
  gargalo: '',
  impactoEquipe: '',
  correcoes: '',
  licoesPositivas: '',
  licoesNegativas: '',
  melhorias: '',
};

export const avaliacaoDemandaDefaultValues: AvaliacaoDemandaFormData = {
  atraso: false,
  impactoAtraso: 0,
  desvioPrazoPercentual: 0,
  desvioCustoPercentual: 0,
  impactoFinanceiro: 1,
  atendimentoRequisitos: 1,
  estabilidade: 1,
  retrabalho: 1,
  satisfacaoUsuario: 1,
  clarezaRequisitos: 1,
  qualidadePlanejamento: 1,
  aderenciaCronograma: 1,
  comunicacao: 1,
  capacidadeEquipe: 1,
  disponibilidadeEquipe: 1,
  possuiBackupCritico: false,
  rotatividadeImpactou: false,
  valorPercebido: 1,
  alinhamentoMeta: 1,
  reutilizacao: 'MEDIA',
  avaliacaoGeral: 1,
  repetiriaModelo: false,
  riscos: [],
  textos: emptyTextos,
};

const TEXTOS_KEYS = [
  'causaAtraso',
  'causaCusto',
  'gargalo',
  'impactoEquipe',
  'correcoes',
  'licoesPositivas',
  'licoesNegativas',
  'melhorias',
] as const;

function normalizeTextos(textos: AvaliacaoDemandaFormData['textos'] | undefined) {
  const base = { ...emptyTextos };
  if (!textos || typeof textos !== 'object') return base;
  TEXTOS_KEYS.forEach((key) => {
    if (key in textos && typeof (textos as Record<string, unknown>)[key] === 'string') {
      (base as Record<string, string>)[key] = (textos as Record<string, string>)[key];
    }
  });
  return base;
}

/** Chaves em snake_case que o backend pode enviar */
const TEXTOS_SNAKE_KEYS: Record<(typeof TEXTOS_KEYS)[number], string> = {
  causaAtraso: 'causa_atraso',
  causaCusto: 'causa_custo',
  gargalo: 'gargalo',
  impactoEquipe: 'impacto_equipe',
  correcoes: 'correcoes',
  licoesPositivas: 'licoes_positivas',
  licoesNegativas: 'licoes_negativas',
  melhorias: 'melhorias',
};

function pickString(obj: Record<string, unknown>, camelKey: string, snakeKey: string): string {
  const v = obj[camelKey] ?? obj[snakeKey];
  return typeof v === 'string' ? v : '';
}

/**
 * Extrai o objeto textos a partir da resposta da API.
 * O backend pode enviar os campos de Lições em response.textos ou no nível raiz,
 * em camelCase ou snake_case.
 */
export function textosFromAvaliacaoResponse(
  res: Record<string, unknown> | null | undefined
): AvaliacaoDemandaFormData['textos'] {
  if (!res || typeof res !== 'object') return { ...emptyTextos };
  const base = { ...emptyTextos };
  const fillFrom = (obj: Record<string, unknown>) => {
    TEXTOS_KEYS.forEach((key) => {
      const s = pickString(obj, key, TEXTOS_SNAKE_KEYS[key]);
      if (s !== '') (base as Record<string, string>)[key] = s;
    });
  };
  fillFrom(res);
  // Backend pode enviar como "textos" ou "texto" (singular)
  const nested = res.textos ?? res.texto;
  if (nested != null && typeof nested === 'object') fillFrom(nested as Record<string, unknown>);
  return base;
}

export function formToRequest(data: AvaliacaoDemandaFormData) {
  return {
    atraso: data.atraso,
    impactoAtraso: data.impactoAtraso,
    desvioPrazoPercentual: data.desvioPrazoPercentual,
    desvioCustoPercentual: data.desvioCustoPercentual,
    impactoFinanceiro: data.impactoFinanceiro,
    atendimentoRequisitos: data.atendimentoRequisitos,
    estabilidade: data.estabilidade,
    retrabalho: data.retrabalho,
    satisfacaoUsuario: data.satisfacaoUsuario,
    clarezaRequisitos: data.clarezaRequisitos,
    qualidadePlanejamento: data.qualidadePlanejamento,
    aderenciaCronograma: data.aderenciaCronograma,
    comunicacao: data.comunicacao,
    capacidadeEquipe: data.capacidadeEquipe,
    disponibilidadeEquipe: data.disponibilidadeEquipe,
    possuiBackupCritico: data.possuiBackupCritico,
    rotatividadeImpactou: data.rotatividadeImpactou,
    valorPercebido: data.valorPercebido,
    alinhamentoMeta: data.alinhamentoMeta,
    reutilizacao: data.reutilizacao,
    avaliacaoGeral: data.avaliacaoGeral,
    repetiriaModelo: data.repetiriaModelo,
    riscos: data.riscos ?? [],
    textos: normalizeTextos(data.textos),
  };
}
