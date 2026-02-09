/**
 * BubbleNode — Bolha individual com semântica de gestão
 *
 * r (raio) = valor da meta (calculado pelo D3 pack)
 * fill = cor por desvio de prazo (verde=adiantado, amarelo=no prazo, vermelho=atrasado)
 * stroke/halo = desvio de esforço ou custo
 * opacity/pulsação = tendência de risco (risco7d)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BubbleNode as BubbleNodeType } from '@/types/tedHealthMap';
import { getScheduleStatusColor, getHaloIntensity, hasRisingRisk } from '@/types/tedHealthMap';
import { cn } from '@/lib/utils';

const BUBBLE_FILL_LIGHT = '#f2f2f2';
const BUBBLE_FILL_HOVER = '#d8d8d8';
const CENTER_TEXT_NAVY = '#001f3f';
const colorMap = {
  green: 'hsl(142, 65%, 42%)',
  yellow: 'hsl(45, 93%, 47%)',
  red: 'hsl(0, 72%, 50%)',
};

interface BubbleNodeProps {
  node: BubbleNodeType;
  x: number;
  y: number;
  r: number;
  onClick?: () => void;
  isSelected?: boolean;
  hasSystemicRiskMeta?: boolean;
  hasSystemicRiskProduto?: boolean;
  onHoverChange?: (nodeId: string | null) => void;
  dimmed?: boolean;
}

export function BubbleNode({
  node,
  x,
  y,
  r,
  onClick,
  isSelected,
  hasSystemicRiskMeta = false,
  hasSystemicRiskProduto = false,
  onHoverChange,
  dimmed = false,
}: BubbleNodeProps) {
  const color = node.statusColor ?? getScheduleStatusColor(node.desvioPrazoDias);
  const deviation = node.deviation ?? Math.abs(node.desvioEsforcoHoras ?? 0);
  const hasDeviationHalo = deviation !== 0 && Math.abs(deviation) > 20;
  const hasImpacto = (node.impactoNoPai ?? 0) > 0.3;
  const haloIntensity = node.haloIntensity ?? getHaloIntensity(node);
  const statusColorRed = color === 'red';
  const systemicRiskMeta = hasSystemicRiskMeta && node.level === 'meta';
  const systemicRiskProduto = hasSystemicRiskProduto && node.level === 'produto';

  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;
  const safeR = Number.isFinite(r) && r > 0 ? r : 12;
  const displayCode = node.codigo ?? (node.raw as { codigo?: string } | undefined)?.codigo;
  const centerLabel = displayCode ?? node.name;
  const fontSize = 14;
  const centerCharWidth = fontSize * 0.55;
  const usableWidth = 2 * safeR * 0.68;
  const maxCenterChars = Math.max(4, Math.floor(usableWidth / centerCharWidth));
  const centerDisplay =
    centerLabel.length > maxCenterChars ? centerLabel.slice(0, maxCenterChars - 1) + '…' : centerLabel;

  const [showBalloon, setShowBalloon] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const paddingX = 16;
  const paddingY = 10;
  const charWidth = 6.8;
  const maxBalloonW = 320;
  const isDemanda = node.level === 'demanda';
  const rawDemanda = isDemanda ? (node.raw as { codigo?: string; descricao?: string; nome?: string } | undefined) : undefined;
  const tooltipCodigo = isDemanda ? (displayCode ?? rawDemanda?.codigo ?? '') : '';
  const tooltipDescricao = isDemanda ? (rawDemanda?.descricao ?? rawDemanda?.nome ?? node.name) : '';
  const tooltipContentLength = isDemanda ? Math.max(tooltipCodigo.length, tooltipDescricao.length) : node.name.length;
  const balloonW = Math.min(maxBalloonW, Math.max(80, paddingX * 2 + tooltipContentLength * charWidth));
  const balloonH = isDemanda ? 28 + paddingY * 2 + 18 : 28 + paddingY * 2;
  const balloonY = -safeR - balloonH - 14;
  const tailSize = 6;
  const tailGap = 4; // gap so triangle tip does not touch/invade the bubble
  const tailTipY = -safeR - tailGap;
  const tailBaseY = balloonY + balloonH;
  const maxChars = Math.floor((balloonW - paddingX * 2) / charWidth);
  const tooltipLabel = node.name.length > maxChars ? node.name.slice(0, maxChars - 1) + '…' : node.name;
  const tooltipLine1 = isDemanda ? (tooltipCodigo.length > maxChars ? tooltipCodigo.slice(0, maxChars - 1) + '…' : tooltipCodigo) : '';
  const tooltipLine2 = isDemanda ? (tooltipDescricao.length > maxChars ? tooltipDescricao.slice(0, maxChars - 1) + '…' : tooltipDescricao) : '';

  return (
    <g
      transform={`translate(${safeX},${safeY})`}
      onClick={onClick}
      onMouseEnter={() => {
        setShowBalloon(true);
        setIsHovered(true);
        onHoverChange?.(node.id);
      }}
      onMouseLeave={() => {
        setShowBalloon(false);
        setIsHovered(false);
        onHoverChange?.(null);
      }}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        zIndex: showBalloon ? 100 : 1,
        opacity: dimmed ? 0.2 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      <defs>
        <clipPath id={`bubble-clip-${String(node.id)}`}>
          <circle r={safeR} cx={0} cy={0} />
        </clipPath>
        <clipPath id={`tooltip-outside-bubble-${String(node.id)}`} clipPathUnits="userSpaceOnUse">
          <path
            fillRule="evenodd"
            d={`M -500 -500 L 500 -500 L 500 500 L -500 500 Z M 0,0 m 0,-${safeR + 3} a ${safeR + 3},${safeR + 3} 0 1,1 0,${2 * (safeR + 3)} a ${safeR + 3},${safeR + 3} 0 1,1 0,${-2 * (safeR + 3)} Z`}
          />
        </clipPath>
        <filter id={`glow-red-${String(node.id)}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`glow-yellow-${String(node.id)}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {systemicRiskMeta && (
        <motion.circle
          r={safeR + 8}
          fill="none"
          stroke="hsl(var(--destructive))"
          strokeWidth={3}
          strokeOpacity={0.8}
          filter={`url(#glow-red-${String(node.id)})`}
          className="animate-pulse"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {(haloIntensity > 0 || systemicRiskProduto) && !systemicRiskMeta && (
        <motion.circle
          r={safeR + (systemicRiskProduto ? 6 : 4)}
          fill="none"
          stroke={systemicRiskProduto ? colorMap.yellow : colorMap[color]}
          strokeWidth={systemicRiskProduto ? 3 : 2}
          strokeOpacity={systemicRiskProduto ? 0.9 : haloIntensity}
          filter={systemicRiskProduto ? `url(#glow-yellow-${String(node.id)})` : undefined}
          className={systemicRiskProduto ? 'animate-pulse' : ''}
          initial={{ opacity: 0 }}
          animate={
            systemicRiskProduto
              ? { opacity: [0.7, 1, 0.7] }
              : { opacity: 1 }
          }
          transition={
            systemicRiskProduto
              ? { duration: 1.2, repeat: Infinity }
              : { duration: 0.3 }
          }
        />
      )}
      {hasDeviationHalo && !systemicRiskMeta && (
        <circle
          r={safeR + 5}
          fill="none"
          stroke="hsl(25, 95%, 53%)"
          strokeWidth={2}
          strokeOpacity={0.8}
        />
      )}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={
          statusColorRed
            ? { scale: [1, 1.06, 1], opacity: 1 }
            : { scale: isHovered ? 1.1 : 1, opacity: 1 }
        }
        transition={
          statusColorRed
            ? { scale: { repeat: Infinity, duration: 1.2 }, opacity: { duration: 0.3 } }
            : {
                scale: {
                  type: 'spring',
                  stiffness: 400,
                  damping: 14,
                },
                opacity: { duration: 0.3 },
              }
        }
      >
        <motion.circle
          r={safeR}
          fill={isHovered ? BUBBLE_FILL_HOVER : BUBBLE_FILL_LIGHT}
          stroke="#000"
          strokeWidth={1}
          transition={{ duration: 0.2 }}
          className={cn(onClick && 'hover:opacity-95')}
        />
      </motion.g>
      <g clipPath={`url(#bubble-clip-${String(node.id)})`}>
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-semibold pointer-events-none"
          fill={CENTER_TEXT_NAVY}
          style={{ fontSize }}
        >
          {centerDisplay}
        </text>
      </g>

      <AnimatePresence>
        {showBalloon && (
          <motion.g
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            pointerEvents="none"
          >
            <g clipPath={`url(#tooltip-outside-bubble-${String(node.id)})`}>
              <rect
                x={-balloonW / 2}
                y={balloonY}
                width={balloonW}
                height={balloonH}
                rx={8}
                ry={8}
                fill="#1a1a1a"
                stroke="#333"
                strokeWidth={1}
              />
              <path
                d={`M ${-tailSize},${tailBaseY} L ${tailSize},${tailBaseY} L 0,${tailTipY} Z`}
                fill="#1a1a1a"
                stroke="#333"
                strokeWidth={1}
                strokeLinejoin="round"
              />
            {isDemanda ? (
              <g className="pointer-events-none" style={{ letterSpacing: '0.02em', fontSize: 12 }}>
                <text textAnchor="middle" x={0} y={balloonY + paddingY + 14} fill="#facc15" fontWeight="bold">
                  {tooltipLine1 || '—'}
                </text>
                <text textAnchor="middle" x={0} y={balloonY + paddingY + 14 + 16} fill="white" className="font-normal">
                  {tooltipLine2 || '—'}
                </text>
              </g>
            ) : (
              <text
                textAnchor="middle"
                x={0}
                y={balloonY + balloonH / 2 + 4}
                fill="white"
                className="text-[12px] font-normal pointer-events-none"
                style={{ letterSpacing: '0.02em' }}
              >
                {tooltipLabel}
              </text>
            )}
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
}
