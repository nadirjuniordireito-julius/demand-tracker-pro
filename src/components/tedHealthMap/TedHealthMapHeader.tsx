/**
 * TedHealthMapHeader - Header do TED Health Map
 * Exibe nome do TED, termometro de saude, valor executado x comprometido,
 * burn rate e indicador de tendencia. Alerta de risco sistêmico (efeito dominó).
 */

import { Thermometer, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface TedHealthMapHeaderProps {
  projectName: string;
  healthPercent: number;
  executedValue: number;
  committedValue: number;
  burnRate?: string;
  trend?: 'up' | 'down' | 'stable';
  hasSystemicRisk?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function TedHealthMapHeader({
  projectName,
  healthPercent,
  executedValue,
  committedValue,
  burnRate = '-',
  trend = 'stable',
  hasSystemicRisk = false,
}: TedHealthMapHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-lg font-normal tracking-tight flex items-center gap-2">
          {projectName}
          {hasSystemicRisk && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 text-warning"
              title="Risco sistêmico: demanda crítica detectada"
            >
              <AlertTriangle className="h-5 w-5" />
            </motion.span>
          )}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {formatCurrency(executedValue)} / {formatCurrency(committedValue)}
          </span>
          <span className="text-sm text-muted-foreground">Burn rate: {burnRate}</span>
          {trend !== 'stable' && (
            <span
              className={cn(
                'flex items-center gap-1 text-sm',
                trend === 'up' ? 'text-destructive' : 'text-success'
              )}
            >
              {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </span>
          )}
          {trend === 'stable' && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Minus className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Thermometer className="h-5 w-5 text-muted-foreground" />
        <motion.div
          className="flex-1"
          animate={hasSystemicRisk ? { x: [0, -2, 2, -1, 1, 0] } : {}}
          transition={{ duration: 0.5, repeat: hasSystemicRisk ? Infinity : 0, repeatDelay: 2 }}
        >
          <Progress value={healthPercent} className="h-2" />
        </motion.div>
        <span className="text-sm font-normal text-muted-foreground">{healthPercent}% saude</span>
      </div>
    </div>
  );
}
