import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarRange,
  Coins,
  Gauge,
  Info,
  Package,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  formatCurrency,
  formatMonthYear,
  formatPercent,
  monthsElapsedInclusive,
  numberToWords,
  parseDateOnly,
} from '@/lib/formatters';
import type { ProdutoResumoDTO } from '@/types';

interface ProdutoVidaViewProps {
  produto: ProdutoResumoDTO;
  stickyHero?: boolean;
}

/**
 * Card visual de uma métrica do produto. Mostra label, valor formatado e
 * uma barra de progresso opcional comparando com um valor de referência.
 */
function MetricCard({
  icon,
  label,
  value,
  hint,
  ratio,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  ratio?: number;
  tone: 'orcamento' | 'execucao' | 'executado';
}) {
  const tones = {
    orcamento: {
      iconWrap: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
      ring: 'ring-sky-200/60 dark:ring-sky-500/20',
      bar: '[&>div]:bg-sky-500',
    },
    execucao: {
      iconWrap: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
      ring: 'ring-amber-200/60 dark:ring-amber-500/20',
      bar: '[&>div]:bg-amber-500',
    },
    executado: {
      iconWrap: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
      ring: 'ring-emerald-200/60 dark:ring-emerald-500/20',
      bar: '[&>div]:bg-emerald-500',
    },
  } as const;
  const t = tones[tone];
  return (
    <div className={cn('rounded-2xl border border-border/70 bg-card p-4 ring-1 transition-shadow hover:shadow-md', t.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', t.iconWrap)}>
          {icon}
        </div>
      </div>
      {typeof ratio === 'number' && (
        <Progress value={Math.max(0, Math.min(100, ratio))} className={cn('mt-3 h-1.5', t.bar)} />
      )}
    </div>
  );
}

/**
 * Visualização "A vida deste produto" — apresenta o ProdutoResumoDTO em um
 * formato moderno e amigável, dividido em hero, cronograma, recursos
 * financeiros e ritmo mensal de entrega.
 *
 * Reutilizável: pode ser embutida em modal, tela autônoma ou drawer.
 */
export function ProdutoVidaView({ produto, stickyHero = false }: ProdutoVidaViewProps) {
  const { t, i18n } = useTranslation();

  const percentual = useMemo(() => {
    const v = produto.percentualExecucao ?? 0;
    return Math.max(0, Math.min(100, Math.round(v)));
  }, [produto.percentualExecucao]);

  const orcamento = produto.valorTotalOrcamento ?? 0;
  const emExecucao = produto.valorTotalEmExecucao ?? 0;
  const executado = produto.valorTotalExecutado ?? 0;

  const ratioEmExecucao = orcamento > 0 ? (emExecucao / orcamento) * 100 : 0;
  const ratioExecutado = orcamento > 0 ? (executado / orcamento) * 100 : 0;

  const meses = produto.mesesPrevistosExecucao ?? 0;
  const mesesTranscorridos = useMemo(() => {
    const d = parseDateOnly(produto.inicioPrevisaoExecucao);
    if (!d) return 0;
    return monthsElapsedInclusive(d, new Date());
  }, [produto.inicioPrevisaoExecucao]);

  const cronogramaPercent =
    meses > 0 ? Math.max(0, Math.min(100, (mesesTranscorridos / meses) * 100)) : 0;

  const previstaMensal = produto.valorMediaEntregaPrevistaMensal ?? 0;
  const realMensal = produto.valorMediaEntregaRealMensal ?? 0;
  const ritmoDelta = realMensal - previstaMensal;
  const ritmoRatio = previstaMensal > 0 ? (realMensal / previstaMensal) * 100 : 0;

  const situacaoLabel = (produto.situacao ?? '').trim() || t('produto.vida.statusEmpty');
  const situacaoTone = situacaoLabel.toLowerCase().includes('encerr')
    ? 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20'
    : situacaoLabel.toLowerCase().includes('execu')
      ? 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20'
      : 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-200 dark:ring-slate-500/20';

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          'relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/5 p-6 shadow-sm',
          stickyHero && 'sticky top-0 z-20',
        )}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative grid gap-6 md:grid-cols-[auto,1fr,auto] md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Package className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                <span className="font-medium uppercase tracking-wide">
                  {t('produto.vida.metaLabel')}
                </span>
                <span className="font-semibold text-foreground">
                  {[produto.codigoMeta, produto.nomeMeta].filter(Boolean).join(' · ')}
                </span>
              </div>
              <p
                className="text-2xl font-semibold leading-tight tracking-tight"
                style={{ color: '#001f3f' }}
              >
                {[produto.codigoProduto, produto.nomeProduto].filter(Boolean).join(' · ')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('produto.vida.subtitle')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <span className="font-medium uppercase tracking-wide">
                {t('produto.vida.executionPercent')}
              </span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                {formatPercent(produto.percentualExecucao)}
              </span>
            </div>
            <Progress
              value={percentual}
              className={cn(
                'h-2 [&>div]:transition-all',
                percentual >= 100 ? '[&>div]:bg-emerald-500' : '[&>div]:bg-primary',
              )}
            />
            <p className="text-xs text-muted-foreground">
              {t('produto.vida.heroHint')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1',
                situacaoTone,
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('produto.vida.statusLabel')}: {situacaoLabel}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Cronograma + Ritmo lado a lado */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">
                {t('produto.vida.cronogramaTitle')}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('produto.vida.cronogramaDescription')}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('produto.vida.startLabel')}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatMonthYear(produto.inicioPrevisaoExecucao)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('produto.vida.endLabel')}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatMonthYear(produto.fimPrevisaoExecucao)}
              </p>
            </div>
          </div>

          {meses > 0 ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t('produto.vida.elapsedMonths', {
                    count: mesesTranscorridos,
                    countWord: numberToWords(mesesTranscorridos, i18n.language),
                  })}
                </span>
                <span>
                  {t('produto.vida.monthsPrevision', {
                    count: meses,
                    countWord: numberToWords(meses, i18n.language),
                  })}
                </span>
              </div>
              <Progress
                value={cronogramaPercent}
                className={cn(
                  'h-1.5',
                  cronogramaPercent >= 100 ? '[&>div]:bg-emerald-500' : '[&>div]:bg-indigo-500',
                )}
              />
            </div>
          ) : (
            <p className="mt-4 text-xs italic text-muted-foreground">
              {t('produto.vida.cronogramaEmpty')}
            </p>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300">
              <Gauge className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">
                {t('produto.vida.ritmoTitle')}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('produto.vida.ritmoDescription')}
              </p>
            </div>
          </div>

          {previstaMensal > 0 || realMensal > 0 ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('produto.vida.previsionLabel')}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(previstaMensal)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('produto.vida.realLabel')}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(realMensal)}
                  </p>
                  {produto.inicioRealExecucao && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-orange-600">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600" aria-hidden />
                      <span className="italic">
                        {t('produto.vida.inicioRealExecucaoRitmo', {
                          date: formatMonthYear(produto.inicioRealExecucao),
                        })}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('produto.vida.realLabel')}</span>
                  <span className="tabular-nums">{formatPercent(ritmoRatio)}</span>
                </div>
                <Progress
                  value={Math.max(0, Math.min(100, ritmoRatio))}
                  className={cn(
                    'h-1.5',
                    ritmoDelta >= 0 ? '[&>div]:bg-emerald-500' : '[&>div]:bg-rose-500',
                  )}
                />
              </div>

              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1',
                  ritmoDelta > 0
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'
                    : ritmoDelta < 0
                      ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20'
                      : 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-200 dark:ring-slate-500/20',
                )}
              >
                {ritmoDelta > 0 && <TrendingUp className="h-3.5 w-3.5" />}
                {ritmoDelta < 0 && <TrendingDown className="h-3.5 w-3.5" />}
                {ritmoDelta === 0
                  ? t('produto.vida.deltaNeutral')
                  : ritmoDelta > 0
                    ? t('produto.vida.deltaPositive', { value: formatCurrency(Math.abs(ritmoDelta)) })
                    : t('produto.vida.deltaNegative', { value: formatCurrency(Math.abs(ritmoDelta)) })}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs italic text-muted-foreground">
              {t('produto.vida.ritmoEmpty')}
            </p>
          )}
        </motion.section>
      </div>

      {/* Recursos financeiros */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            <Coins className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">
              {t('produto.vida.financasTitle')}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('produto.vida.financasDescription')}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricCard
            icon={<Wallet className="h-5 w-5" />}
            label={t('produto.vida.budgetedLabel')}
            value={formatCurrency(orcamento)}
            tone="orcamento"
          />
          <MetricCard
            icon={<Gauge className="h-5 w-5" />}
            label={t('produto.vida.inExecutionLabel')}
            value={formatCurrency(emExecucao)}
            hint={t('produto.vida.financasInExecutionRule')}
            ratio={ratioEmExecucao}
            tone="execucao"
          />
          <MetricCard
            icon={<Sparkles className="h-5 w-5" />}
            label={t('produto.vida.executedLabel')}
            value={formatCurrency(executado)}
            ratio={ratioExecutado}
            tone="executado"
          />
        </div>
      </motion.section>
    </div>
  );
}

export default ProdutoVidaView;
