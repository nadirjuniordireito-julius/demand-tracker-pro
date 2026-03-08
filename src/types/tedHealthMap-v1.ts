/**
 * TED Health Map — Tipos e modelo de dados
 *
 * Semântica de gestão:
 * - valor: peso financeiro (raio da bolha)
 * - desvioPrazoDias: cor do fill (verde=adiantado, amarelo=no prazo, vermelho=atrasado)
 * - desvioEsforcoHoras + desvioFinanceiro: stroke/halo
 * - risco7d: tendência de risco (opacidade/pulsação)
 */

import type { Projeto, ProjetoMeta, MetaProduto, DemandaTecnica } from './index';

/** Níveis da hierarquia TED > Meta > Produto > Demanda */
export type BubbleLevel = 'ted' | 'meta' | 'produto' | 'demanda';

/** Cor derivada: desvioPrazoDias < 0 verde, = 0 amarelo, > 0 vermelho */
export type ScheduleStatusColor = 'green' | 'yellow' | 'red';

/** Nó genérico para qualquer nível da hierarquia */
export interface BubbleNode {
  id: string;
  name: string;
  /** Código exibido no centro da bolha (meta, produto, demanda) */
  codigo?: string;
  level: BubbleLevel;
  /** Valor financeiro da meta (para tamanho/raio da bolha) */
  valor: number;
  /** Dias de desvio de prazo (negativo=adiantado, 0=no prazo, positivo=atrasado) */
  desvioPrazoDias?: number;
  /** Horas reais − planejadas (positivo = over) */
  desvioEsforcoHoras?: number;
  /** Custo real − planejado (positivo = over) */
  desvioFinanceiro?: number;
  /** Tendência de risco nos últimos 7 dias (positivo = risco em alta) */
  risco7d?: number;
  /** Status da demanda (ex: Em elaboração, Aberta, Planejado, Encerrado) */
  status?: string;
  /** Perfis envolvidos na demanda */
  perfisEnvolvidos?: string[];
  /** Desvio combinado (horas normalizadas) para halo - |valor| > 20 = alerta */
  deviation?: number;
  /** Impacto no pai (0-1) - > 0.3 = destaque */
  impactoNoPai?: number;
  /** Status agregado vindo do backend: OK | RISCO | CRITICO */
  statusLabel?: 'OK' | 'RISCO' | 'CRITICO';
  /** Cor de prazo vinda do backend: green | yellow | red */
  statusColor?: ScheduleStatusColor;
  /** Intensidade do halo vinda do backend (0-1) */
  haloIntensity?: number;
  /** Indica risco em alta vindo do backend */
  hasRisingRisk?: boolean;
  children?: BubbleNode[];
  /** Dados brutos para o painel de detalhes */
  raw?: Projeto | ProjetoMeta | MetaProduto | DemandaTecnica;
}

/** Regra de cor: desvioPrazoDias → verde (adiantado), amarelo (no prazo), vermelho (atrasado) */
export function getScheduleStatusColor(desvioPrazoDias?: number): ScheduleStatusColor {
  if (desvioPrazoDias == null) return 'yellow';
  if (desvioPrazoDias < 0) return 'green';
  if (desvioPrazoDias > 0) return 'red';
  return 'yellow';
}

/** Intensidade do halo baseada em desvioEsforcoHoras e desvioFinanceiro */
export function getHaloIntensity(node: BubbleNode): number {
  const effort = Math.abs(node.desvioEsforcoHoras ?? 0);
  const financial = Math.abs(node.desvioFinanceiro ?? 0);
  if (effort === 0 && financial === 0) return 0;
  return Math.min(1, (effort / 100 + financial / 10000) / 2);
}

/** Indica se há tendência de risco em alta (para pulsação/opacidade) */
export function hasRisingRisk(node: BubbleNode): boolean {
  const r = node.risco7d ?? 0;
  return r > 0.2;
}
