/**
 * TedHealthMapLegend — Legenda do status das bolhas (anel colorido)
 * Mesma regra do semáforo: VERDE | AMARELO | VERMELHO | CINZA
 */

import { useTranslation } from 'react-i18next';
import { BUBBLE_SEMAFORO_COLORS } from '@/types/tedHealthMap';
import type { BubbleSemaforoStatus } from '@/types/tedHealthMap';
import { cn } from '@/lib/utils';

const STATUS_ORDER: BubbleSemaforoStatus[] = ['VERDE', 'AMARELO', 'VERMELHO', 'CINZA'];

const STATUS_I18N_KEYS: Record<BubbleSemaforoStatus, string> = {
  VERDE: 'healthMapDetail.legend.green',
  AMARELO: 'healthMapDetail.legend.yellow',
  VERMELHO: 'healthMapDetail.legend.red',
  CINZA: 'healthMapDetail.legend.gray',
};

export interface TedHealthMapLegendProps {
  /** Classe extra no container */
  className?: string;
  /** Layout compacto (só círculos + texto curto) */
  compact?: boolean;
}

export function TedHealthMapLegend({ className, compact = false }: TedHealthMapLegendProps) {
  const { t } = useTranslation();

  return (
    <div
      role="figure"
      aria-label={t('healthMapDetail.legend.title')}
      className={cn(
        'rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-sm',
        'flex flex-col gap-2 p-2.5',
        compact && 'gap-1.5 p-2',
        className
      )}
    >
      <p className={cn('text-xs font-medium text-muted-foreground', compact && 'text-[11px]')}>
        {t('healthMapDetail.legend.title')}
      </p>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 list-none m-0 p-0">
        {STATUS_ORDER.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              className="shrink-0 rounded-full border border-black/10 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
              style={{
                width: compact ? 10 : 12,
                height: compact ? 10 : 12,
                backgroundColor: BUBBLE_SEMAFORO_COLORS[status],
              }}
              aria-hidden
            />
            <span className={cn('text-xs text-foreground', compact && 'text-[11px]')}>
              {t(STATUS_I18N_KEYS[status])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
