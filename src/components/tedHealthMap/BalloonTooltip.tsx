/**
 * BalloonTooltip — Mesmo padrão visual do tooltip das bolhas (BubbleNode):
 * caixa escura (#1a1a1a), borda #333, cauda (triângulo) apontando para o trigger.
 */

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const TAIL_SIZE = 6;

type Side = 'top' | 'right' | 'bottom' | 'left';

interface BalloonTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: Side;
  sideOffset?: number;
  className?: string;
}

function TailSvg({ side }: { side: Side }) {
  const w = TAIL_SIZE * 2;
  const h = TAIL_SIZE;
  // Triangle pointing toward the trigger: bottom = tail on top of balloon (points up), top = tail on bottom (points down)
  const pathBySide: Record<Side, string> = {
    bottom: `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`,
    top: `M 0 0 L ${w} 0 L ${w / 2} ${h} Z`,
    left: `M ${h} 0 L ${h} ${w} L 0 ${w / 2} Z`,
    right: `M 0 0 L ${h} 0 L ${h / 2} ${w} Z`,
  };
  const styleBySide: Record<Side, React.CSSProperties> = {
    bottom: { top: 0, left: '50%', transform: 'translate(-50%, -100%)' },
    top: { bottom: 0, left: '50%', transform: 'translate(-50%, 100%)' },
    left: { left: 0, top: '50%', transform: 'translate(-100%, -50%)' },
    right: { right: 0, top: '50%', transform: 'translate(100%, -50%)' },
  };
  const viewBoxBySide: Record<Side, string> = {
    bottom: `0 0 ${w} ${h}`,
    top: `0 0 ${w} ${h}`,
    left: `0 0 ${h} ${w}`,
    right: `0 0 ${h} ${w}`,
  };
  return (
    <svg
      className="absolute pointer-events-none"
      style={styleBySide[side]}
      width={side === 'left' || side === 'right' ? h : w}
      height={side === 'left' || side === 'right' ? w : h}
      viewBox={viewBoxBySide[side]}
    >
      <path
        d={pathBySide[side]}
        fill="#1a1a1a"
        stroke="#333"
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BalloonTooltip({
  children,
  content,
  side = 'bottom',
  sideOffset = 8,
  className,
}: BalloonTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={sideOffset}
        className={cn(
          'p-0 border-0 bg-transparent shadow-none overflow-visible max-w-[320px]',
          className
        )}
      >
        <div
          className="relative rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-xs text-white tracking-wide"
          style={{ letterSpacing: '0.02em' }}
        >
          {content}
          <TailSvg side={side} />
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
