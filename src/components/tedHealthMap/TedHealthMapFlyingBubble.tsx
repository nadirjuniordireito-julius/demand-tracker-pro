/**
 * Bolha que anima em trajetória parabólica até o sidebar e explode ao chegar.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

const BUBBLE_RADIUS = 50;

export interface FlyingBubbleProps {
  startPx: { left: number; top: number };
  endPx: { left: number; top: number };
  onComplete: () => void;
}

/** Gera keyframes de uma parábola: y(t) = start + (end - start)*t + 4*peakOffset*t*(1-t), t em [0,1] */
function parabolicKeyframes(
  start: number,
  end: number,
  peakOffset: number,
  steps: number
): number[] {
  const result: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const linear = start + (end - start) * t;
    const parabola = 4 * peakOffset * t * (1 - t);
    result.push(linear + parabola);
  }
  return result;
}

export function TedHealthMapFlyingBubble({ startPx, endPx, onComplete }: FlyingBubbleProps) {
  const [phase, setPhase] = useState<'flying' | 'exploding'>('flying');

  const peakOffset = -120;
  const steps = 12;
  const leftKeyframes = parabolicKeyframes(startPx.left, endPx.left, 0, steps);
  const topKeyframes = parabolicKeyframes(startPx.top, endPx.top, peakOffset, steps);
  const times = Array.from({ length: steps + 1 }, (_, i) => i / steps);

  const handleFlyComplete = () => {
    setPhase('exploding');
  };

  const handleExplosionComplete = () => {
    onComplete();
  };

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[100]" aria-hidden>
      {phase === 'flying' && (
        <motion.div
          className="absolute rounded-full border border-black bg-[#f2f2f2]"
          style={{
            width: BUBBLE_RADIUS * 2,
            height: BUBBLE_RADIUS * 2,
            left: startPx.left,
            top: startPx.top,
          }}
          animate={{
            left: leftKeyframes,
            top: topKeyframes,
          }}
          transition={{
            duration: 0.7,
            times,
            ease: 'linear',
          }}
          onAnimationComplete={handleFlyComplete}
        />
      )}
      {phase === 'exploding' && (
        <motion.div
          className="absolute rounded-full border border-black bg-[#f2f2f2]"
          style={{
            width: BUBBLE_RADIUS * 2,
            height: BUBBLE_RADIUS * 2,
            left: endPx.left,
            top: endPx.top,
            transformOrigin: 'center center',
          }}
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          onAnimationComplete={handleExplosionComplete}
        />
      )}
    </div>,
    document.body
  );
}
