/**
 * Tipos do Módulo de Avaliação de Qualidade da Demanda Técnica
 */

export type TipoRisco =
  | 'FALHA_REQUISITOS'
  | 'MUDANCA_ESCOPO'
  | 'COMUNICACAO'
  | 'TERCEIROS'
  | 'FALTA_RECURSOS'
  | 'FALTA_COMPETENCIA'
  | 'INFRAESTRUTURA'
  | 'GOVERNANCA'
  | 'OUTROS';

export type Reutilizacao = 'BAIXA' | 'MEDIA' | 'ALTA';

export interface DemandaAvaliacaoTextos {
  causaAtraso: string;
  causaCusto: string;
  gargalo: string;
  impactoEquipe: string;
  correcoes: string;
  licoesPositivas: string;
  licoesNegativas: string;
  melhorias: string;
}

export interface DemandaAvaliacaoRequest {
  usuarioId?: number;
  atraso: boolean;
  impactoAtraso: number;
  desvioPrazoPercentual: number;
  desvioCustoPercentual: number;
  impactoFinanceiro: number;
  atendimentoRequisitos: number;
  estabilidade: number;
  retrabalho: number;
  satisfacaoUsuario: number;
  clarezaRequisitos: number;
  qualidadePlanejamento: number;
  aderenciaCronograma: number;
  comunicacao: number;
  capacidadeEquipe: number;
  disponibilidadeEquipe: number;
  possuiBackupCritico: boolean;
  rotatividadeImpactou: boolean;
  valorPercebido: number;
  alinhamentoMeta: number;
  reutilizacao: Reutilizacao;
  avaliacaoGeral: number;
  repetiriaModelo: boolean;
  riscos: TipoRisco[];
  textos: DemandaAvaliacaoTextos;
}

/** Resposta do GET (mesmo shape para preencher formulário em edição) */
export type DemandaAvaliacaoResponse = DemandaAvaliacaoRequest & {
  id?: number;
  demandaTecnicaId?: number;
  dataHoraPreenchimento?: string;
  usuarioId?: number;
  createdAt?: string;
  updatedAt?: string;
};

export interface DemandaAvaliacaoKpis {
  [key: string]: number | string | undefined;
}

export interface DemandaAvaliacaoAnalytics {
  [key: string]: unknown;
}
