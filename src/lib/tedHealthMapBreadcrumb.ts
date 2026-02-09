import type { BubbleNode } from '@/types/tedHealthMap';

export function getNarrativeBreadcrumb(
  rootNode: BubbleNode,
  focusedNode: BubbleNode | null,
  selectedNode: BubbleNode | null
): string {
  if (!focusedNode && !selectedNode) return rootNode.name;
  const node = selectedNode ?? focusedNode;
  if (!node) return rootNode.name;

  const days = node.desvioPrazoDias ?? 0;
  const financial = node.desvioFinanceiro ?? 0;

  if (days > 0 && node.level === 'meta') return `O atraso do TED vem da ${node.name}.`;
  if (days > 0 && node.level === 'produto') {
    const meta = focusedNode?.level === 'meta' ? focusedNode : null;
    return meta ? `O atraso do TED vem da ${meta.name}, causado pelo ${node.name}.` : `O atraso concentra-se no ${node.name}.`;
  }
  if (days > 0 && node.level === 'demanda') return `A demanda ${node.name} esta em atraso.`;
  if (financial > 0 && node.level === 'meta') return `O desvio financeiro concentra-se na ${node.name}.`;
  if (financial > 0 && node.level === 'produto') {
    const meta = focusedNode?.level === 'meta' ? focusedNode : null;
    return meta ? `O desvio financeiro vem da ${meta.name}, causado pelo ${node.name}.` : `O desvio concentra-se no ${node.name}.`;
  }
  if (days <= 0 && financial <= 0) return `O TED esta no prazo.`;
  return node.name;
}
