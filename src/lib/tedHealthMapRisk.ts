/**
 * TED Health Map — Risco sistêmico (efeito dominó)
 *
 * Demanda crítica: desvio_prazo > 5 dias OU desvio_esforco > 20h OU desvio_financeiro > 10% do valor
 * Propagação: Demanda crítica → Produto amarelo pulsante → Meta halo vermelho → TED barra vibra
 */

import type { BubbleNode } from '@/types/tedHealthMap';

function isCriticalDemanda(demanda: BubbleNode): boolean {
  const prazo = demanda.desvioPrazoDias ?? 0;
  const esforco = demanda.desvioEsforcoHoras ?? 0;
  const financeiro = demanda.desvioFinanceiro ?? 0;
  const valor = demanda.valor ?? 1;
  return prazo > 5 || esforco > 20 || financeiro / valor > 0.1;
}

export function hasCriticalDemand(produto: BubbleNode): boolean {
  const demandas = produto.children ?? [];
  return demandas.some((d) => d.level === 'demanda' && isCriticalDemanda(d));
}

export function metaHasRisk(meta: BubbleNode): boolean {
  const produtos = meta.children ?? [];
  return produtos.some((p) => p.level === 'produto' && hasCriticalDemand(p));
}

export function tedHasRisk(ted: BubbleNode): boolean {
  const metas = ted.children ?? [];
  return metas.some((m) => m.level === 'meta' && metaHasRisk(m));
}
