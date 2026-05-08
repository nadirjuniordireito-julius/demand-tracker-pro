/**
 * TED Health Map — Normaliza resposta da API para BubbleNode
 *
 * O backend pode retornar `value` em vez de `valor`, `fillPercent`, etc.
 * Status de meta/produto/demanda: quando a API envia status VERDE|AMARELO|VERMELHO|CINZA,
 * preenche semaforoStatus (mesma lógica do semáforo de projeto).
 */

import type { BubbleNode, BubbleSemaforoStatus } from '@/types/tedHealthMap';

const SEMAFORO_STATUS_VALUES: BubbleSemaforoStatus[] = ['VERDE', 'AMARELO', 'VERMELHO', 'CINZA'];

function toSemaforoStatus(v: unknown): BubbleSemaforoStatus | undefined {
  const s = typeof v === 'string' ? v.toUpperCase() : '';
  return SEMAFORO_STATUS_VALUES.includes(s as BubbleSemaforoStatus) ? (s as BubbleSemaforoStatus) : undefined;
}

export type ApiNode = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  codigo?: string;
  level?: string;
  value?: number;
  valor?: number;
  fillPercent?: number;
  status?: string;
  semaforoStatus?: string;
  children?: ApiNode[];
};

function getValor(node: ApiNode): number {
  const v = node.valor ?? node.value;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normaliza um nó da API para BubbleNode.
 * Mapeia `value` → `valor` quando o backend retorna em inglês.
 * Infere level pela posição na árvore quando a API não envia (TED → filhos = meta, meta → filhos = produto, produto → filhos = demanda).
 */
export function normalizeBubbleNode(
  apiNode: ApiNode,
  parentLevel: BubbleNode['level'] | null = null
): BubbleNode {
  const valor = getValor(apiNode);
  const raw = (apiNode.raw ?? { ...apiNode }) as BubbleNode['raw'];
  const codigo = apiNode.codigo != null ? String(apiNode.codigo) : (raw as { codigo?: string } | undefined)?.codigo;

  const inferredLevel: BubbleNode['level'] =
    parentLevel === null
      ? 'ted'
      : parentLevel === 'ted'
        ? 'meta'
        : parentLevel === 'meta'
          ? 'produto'
          : 'demanda';
  const level = (apiNode.level as BubbleNode['level']) ?? inferredLevel;

  const children = (apiNode.children as ApiNode[] | undefined)?.map((child) =>
    normalizeBubbleNode(child, level)
  );

  const statusStr = apiNode.status != null ? String(apiNode.status) : undefined;
  const semaforoStatus =
    toSemaforoStatus(apiNode.semaforoStatus ?? apiNode.status) ?? (statusStr ? toSemaforoStatus(statusStr) : undefined);

  return {
    id: String(apiNode.id ?? ''),
    name: String(apiNode.name ?? ''),
    codigo: codigo != null ? String(codigo) : undefined,
    level,
    valor,
    desvioPrazoDias: apiNode.desvioPrazoDias as number | undefined,
    desvioEsforcoHoras: apiNode.desvioEsforcoHoras as number | undefined,
    desvioFinanceiro: apiNode.desvioFinanceiro as number | undefined,
    risco7d: apiNode.risco7d as number | undefined,
    status: statusStr,
    semaforoStatus,
    perfisEnvolvidos: apiNode.perfisEnvolvidos as string[] | undefined,
    deviation: apiNode.deviation as number | undefined,
    impactoNoPai: apiNode.impactoNoPai as number | undefined,
    statusLabel: apiNode.statusLabel as BubbleNode['statusLabel'],
    statusColor: apiNode.statusColor as BubbleNode['statusColor'],
    haloIntensity: apiNode.haloIntensity as number | undefined,
    hasRisingRisk: apiNode.hasRisingRisk as boolean | undefined,
    children,
    raw,
  };
}
