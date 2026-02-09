/**
 * BubbleChart — Mapa de bolhas com d3-hierarchy pack
 *
 * Semântica de gestão + animações de transição (Framer Motion) + alerta de risco sistêmico.
 */

import { useMemo, useState, useCallback } from 'react';
import { hierarchy, pack, type HierarchyNode } from 'd3-hierarchy';
import { AnimatePresence, motion } from 'framer-motion';
import type { BubbleNode } from '@/types/tedHealthMap';
import { BubbleNode as BubbleNodeComponent } from './BubbleNode';

type ZoomLevel = 'ted' | 'meta' | 'produto';

interface BubbleChartProps {
  data: BubbleNode;
  width: number;
  height: number;
  zoomLevel: ZoomLevel;
  selectedMetaId: string | null;
  selectedProdutoId: string | null;
  onNodeClick?: (node: BubbleNode, position: { x: number; y: number }) => void;
  selectedNode?: BubbleNode | null;
  metaIdsWithRisk?: Set<string>;
  produtoIdsWithRisk?: Set<string>;
}

const metaExit = { scale: 1.2, opacity: 0, transition: { duration: 0.3 } };
const metaEnter = { scale: 1, opacity: 1, transition: { duration: 0.4 } };
const produtoExit = { scale: 0.5, opacity: 0, transition: { duration: 0.25 } };
const produtoEnter = { scale: 1, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } };
const demandaExit = { scale: 0.8, opacity: 0, transition: { duration: 0.2 } };
const demandaEnter = { scale: [0.8, 1.05, 1], opacity: 1, transition: { duration: 0.4 } };

const FIXED_RADIUS = 50;

function getCodigo(node: BubbleNode): string {
  return node.codigo ?? (node.raw as { codigo?: string } | undefined)?.codigo ?? node.name ?? String(node.id);
}

const sortByCodigo = (a: BubbleNode, b: BubbleNode) =>
  getCodigo(a).localeCompare(getCodigo(b), undefined, { numeric: true });

function gridLayout(
  nodes: BubbleNode[],
  width: number,
  height: number,
  radius: number,
  cols: number
): { node: BubbleNode; x: number; y: number; r: number }[] {
  const padding = 16;
  const cellSize = radius * 2 + padding;
  const rows = Math.ceil(nodes.length / cols);
  const totalW = cols * cellSize - padding;
  const totalH = rows * cellSize - padding;
  const offsetX = (width - totalW) / 2 + radius + padding / 2;
  const offsetY = (height - totalH) / 2 + radius + padding / 2;
  return nodes.map((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      node,
      x: offsetX + col * cellSize,
      y: offsetY + row * cellSize,
      r: radius,
    };
  });
}

export function BubbleChart({
  data,
  width,
  height,
  zoomLevel,
  selectedMetaId,
  selectedProdutoId,
  onNodeClick,
  selectedNode,
  metaIdsWithRisk = new Set(),
  produtoIdsWithRisk = new Set(),
}: BubbleChartProps) {
  const circles = useMemo(() => {
    let nodesToShow: BubbleNode[];
    let level: 'meta' | 'produto' | 'demanda';

    if (zoomLevel === 'produto' && selectedMetaId && selectedProdutoId) {
      const meta = (data.children ?? []).find(
        (m) => String(m.id) === String(selectedMetaId)
      );
      const produto = (meta?.children ?? []).find(
        (p) => String(p.id) === String(selectedProdutoId)
      );
      nodesToShow = (produto?.children ?? []).map((c) => ({ ...c, children: undefined })).sort(sortByCodigo);
      level = 'demanda';
    } else if (zoomLevel === 'meta' && selectedMetaId) {
      const meta = (data.children ?? []).find(
        (m) => String(m.id) === String(selectedMetaId)
      );
      nodesToShow = (meta?.children ?? []).map((c) => ({ ...c, children: undefined })).sort(sortByCodigo);
      level = 'produto';
    } else {
      nodesToShow = (data.children ?? []).map((m) => ({ ...m, children: undefined })).sort(sortByCodigo);
      level = 'meta';
    }

    if (nodesToShow.length === 0) return [];

    const fixedRadius = FIXED_RADIUS;

    if (level === 'produto') {
      const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(nodesToShow.length))));
      return gridLayout(nodesToShow, width, height, fixedRadius, cols);
    }

    const root = hierarchy(
      { id: 'root', children: nodesToShow } as { id: string; children: BubbleNode[] },
      (d) => ('children' in d ? d.children : undefined)
    )
      .sum(() => 1)
      .sort((a, b) => {
        const nodeA = a.data as BubbleNode;
        const nodeB = b.data as BubbleNode;
        return getCodigo(nodeA).localeCompare(getCodigo(nodeB), undefined, { numeric: true });
      });

    const packed = pack<{ id: string; children?: BubbleNode[] } | BubbleNode>()
      .size([width, height])
      .padding(12)(root as HierarchyNode<{ id: string; children?: BubbleNode[] } | BubbleNode>);

    const safe = (n: number) => (Number.isFinite(n) ? n : 0);
    const result: { node: BubbleNode; x: number; y: number; r: number }[] = [];
    packed.each((d) => {
      const nodeData = d.data as BubbleNode;
      const isDirectChildOfRoot = d.depth === 1;
      if (isDirectChildOfRoot && nodeData && nodeData.id !== 'root') {
        result.push({
          node: nodeData,
          x: safe(d.x),
          y: safe(d.y),
          r: fixedRadius,
        });
      }
    });
    return result;
  }, [data.children, zoomLevel, selectedMetaId, selectedProdutoId, width, height]);

  const chartLevel = zoomLevel === 'ted' ? 'meta' : zoomLevel === 'meta' ? 'produto' : 'demanda';
  const exitAnim = chartLevel === 'meta' ? metaExit : chartLevel === 'produto' ? produtoExit : demandaExit;
  const enterAnim = chartLevel === 'meta' ? metaEnter : chartLevel === 'produto' ? produtoEnter : demandaEnter;

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const handleHoverChange = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <AnimatePresence mode="wait">
        <motion.svg
          key={zoomLevel}
          width={width}
          height={height}
          className="overflow-visible"
          style={{ position: 'relative' }}
          initial={enterAnim}
          animate={{ scale: 1, opacity: 1 }}
          exit={exitAnim}
        >
          {circles.map(({ node, x, y, r }) => (
            <BubbleNodeComponent
              key={String(node.id)}
              node={node}
              x={x}
              y={y}
              r={r}
              onClick={onNodeClick ? () => onNodeClick(node, { x, y }) : undefined}
              isSelected={String(selectedNode?.id) === String(node.id)}
              hasSystemicRiskMeta={metaIdsWithRisk.has(String(node.id))}
              hasSystemicRiskProduto={produtoIdsWithRisk.has(String(node.id))}
              onHoverChange={handleHoverChange}
              dimmed={hoveredNodeId !== null && hoveredNodeId !== String(node.id)}
            />
          ))}
        </motion.svg>
      </AnimatePresence>
    </div>
  );
}
