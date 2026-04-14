import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { useTranslation } from 'react-i18next';
import JuliusEChart from '@/components/charts/JuliusEChart';
import type { ProdutoEvolucaoTrimestralDTO } from '@/types';

interface ProductBarChart3Props {
  data: ProdutoEvolucaoTrimestralDTO;
  className?: string;
}

const parseDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  if ([y, m, d].some((n) => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d);
};

export default function ProductBarChart3({ data, className }: ProductBarChart3Props) {
  const { t, i18n } = useTranslation();

  const localeCode = useMemo(() => {
    const lang = i18n.resolvedLanguage ?? i18n.language ?? 'pt';
    if (lang.startsWith('en')) return 'en-US';
    if (lang.startsWith('es')) return 'es-ES';
    return 'pt-BR';
  }, [i18n.language, i18n.resolvedLanguage]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(localeCode, {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2,
      }),
    [localeCode]
  );

  const monthYearFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeCode, {
        month: '2-digit',
        year: 'numeric',
      }),
    [localeCode]
  );

  const categories = useMemo(
    () =>
      data.trimestres.map((trimestre) => `${t('dashboard.map.quarterLabel')} ${trimestre.trimestreSequencia}`),
    [data.trimestres, t]
  );

  const plannedSeries = useMemo(() => data.trimestres.map((t) => t.totalPrevisto ?? 0), [data.trimestres]);
  const executedSeries = useMemo(() => data.trimestres.map((t) => t.totalExecutado ?? 0), [data.trimestres]);

  const quarterPeriods = useMemo(
    () =>
      data.trimestres.map((trimestre) => {
        const start = parseDateOnly(trimestre.dataInicio);
        const end = parseDateOnly(trimestre.dataFim);
        if (!start || !end) return '—';
        return `${monthYearFormatter.format(start)} - ${monthYearFormatter.format(end)}`;
      }),
    [data.trimestres, monthYearFormatter]
  );

  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      animationDuration: 650,
      color: ['#36A2EB', '#00E396'],
      grid: {
        left: 20,
        right: 24,
        top: 96,
        bottom: 64,
        containLabel: true,
      },
      title: {
        text: t('dashboard.map.quarterlyEvolutionModalTitle'),
        subtext: `${data.codigoProduto} - ${data.nomeProduto}`,
        left: 'left',
        top: 12,
        textStyle: {
          color: 'hsl(var(--foreground))',
          fontWeight: 700,
          fontSize: 20,
        },
        subtextStyle: {
          color: 'hsl(var(--muted-foreground))',
          fontSize: 13,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#0f172a',
        borderWidth: 0,
        textStyle: { color: '#f8fafc' },
        formatter: (params: unknown) => {
          const lines: string[] = [];
          const list = Array.isArray(params) ? params : [];
          const first = list[0] as { dataIndex?: number; axisValueLabel?: string } | undefined;
          const idx = first?.dataIndex ?? 0;

          lines.push(`<strong>${first?.axisValueLabel ?? ''}</strong>`);
          lines.push(`${t('dashboard.map.period')}: ${quarterPeriods[idx] ?? '—'}`);

          for (const item of list as Array<{ marker?: string; seriesName?: string; value?: number }>) {
            lines.push(`${item.marker ?? ''}${item.seriesName}: ${currencyFormatter.format(Number(item.value ?? 0))}`);
          }

          return lines.join('<br/>');
        },
      },
      legend: {
        bottom: 8,
        data: [t('dashboard.map.planned'), t('dashboard.map.executed')],
        textStyle: {
          color: 'hsl(var(--foreground))',
        },
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisTick: { alignWithLabel: true },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (val: number) => currencyFormatter.format(val),
        },
        splitLine: {
          lineStyle: { color: 'hsl(var(--border))' },
        },
      },
      series: [
        {
          name: t('dashboard.map.planned'),
          type: 'bar',
          barMaxWidth: 38,
          data: plannedSeries,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
          },
        },
        {
          name: t('dashboard.map.executed'),
          type: 'bar',
          barMaxWidth: 38,
          data: executedSeries,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
          },
        },
      ],
    }),
    [categories, currencyFormatter, data.codigoProduto, data.nomeProduto, executedSeries, plannedSeries, quarterPeriods, t]
  );

  return <JuliusEChart option={option} className={className} height={500} />;
}
