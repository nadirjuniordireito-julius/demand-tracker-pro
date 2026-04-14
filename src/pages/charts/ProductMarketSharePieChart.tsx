import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import JuliusEChart from '@/components/charts/JuliusEChart';
import { useTranslation } from 'react-i18next';

interface ProductMarketShareDataItem {
  id: number;
  codigo?: string | null;
  nome?: string | null;
  valorTotalPrevisto?: number | null;
  valorTotalExecutado?: number | null;
}

interface ProductMarketSharePieChartProps {
  produtos: ProductMarketShareDataItem[];
  metaCodigo?: string | null;
  metaNome?: string | null;
  selectedProdutoId?: number | null;
  className?: string;
}

const colorPalette = [
  '#00E396',
  '#00B8D9',
  '#7C4DFF',
  '#FFB300',
  '#FF6B6B',
  '#00D9A6',
  '#36A2EB',
  '#A66BFF',
  '#26D0CE',
  '#F97316',
  '#EC4899',
  '#22C55E',
];

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function ProductMarketSharePieChart({
  produtos,
  metaCodigo,
  metaNome,
  selectedProdutoId,
  className,
}: ProductMarketSharePieChartProps) {
  const { t, i18n } = useTranslation();

  const localeCode = useMemo(() => {
    const lang = i18n.resolvedLanguage ?? i18n.language ?? 'pt';
    if (lang.startsWith('en')) return 'en-US';
    if (lang.startsWith('es')) return 'es-ES';
    return 'pt-BR';
  }, [i18n.language, i18n.resolvedLanguage]);

  const chartCurrencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(localeCode, {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2,
      }),
    [localeCode]
  );

  const chartPercentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(localeCode, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [localeCode]
  );

  const pieData = useMemo(
    () =>
      produtos
        .map((produto, index) => {
          const value = Math.max(0, Number(produto.valorTotalPrevisto ?? 0));
          const produtoLabel = [produto.codigo, produto.nome].filter(Boolean).join(' - ');
          return {
            id: produto.id,
            value,
            executedValue: Math.max(0, Number(produto.valorTotalExecutado ?? 0)),
            name: produtoLabel || `${t('dashboard.map.marketShareProductFallback')} ${index + 1}`,
            itemStyle: { color: colorPalette[index % colorPalette.length] },
          };
        })
        .filter((item) => item.value > 0),
    [produtos, t]
  );

  const total = useMemo(() => pieData.reduce((acc, item) => acc + item.value, 0), [pieData]);

  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 900,
      animationDurationUpdate: 600,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0f172a',
        borderWidth: 0,
        textStyle: { color: '#f8fafc' },
        formatter: (params: unknown) => {
          const safe = asRecord(params);
          const safeData = asRecord(safe.data);
          const value = toNumber(safe.value);
          const executedValue = toNumber(safeData.executedValue ?? safe.executedValue);
          const executionPercent = value > 0 ? (executedValue / value) * 100 : 0;
          const percent = toNumber(safe.percent);
          const lines = [
            `<strong>${String(safe.name ?? '')}</strong>`,
            `${t('dashboard.map.marketShareTooltipShare')}: ${chartPercentFormatter.format(percent)}%`,
            `${t('dashboard.map.marketShareTooltipPlanned')}: ${chartCurrencyFormatter.format(value)}`,
            `${t('dashboard.map.executed')}: ${chartCurrencyFormatter.format(executedValue)}`,
            `${t('dashboard.map.progress')}: ${chartPercentFormatter.format(executionPercent)}%`,
          ];
          return lines.join('<br/>');
        },
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        left: 'center',
        bottom: 4,
        itemWidth: 10,
        itemHeight: 10,
        pageIconColor: 'hsl(var(--foreground))',
        pageTextStyle: {
          color: 'hsl(var(--muted-foreground))',
        },
        textStyle: {
          color: 'hsl(var(--foreground))',
          fontSize: 12,
        },
      },
      graphic:
        pieData.length === 0
          ? {
              type: 'text',
              left: 'center',
              top: 'middle',
              style: {
                text: t('dashboard.map.marketShareNoData'),
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 14,
                fontWeight: 500,
              },
            }
          : undefined,
      series: [
        {
          name: 'Produtos',
          type: 'pie',
          radius: ['38%', '72%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          padAngle: 1.4,
          minAngle: 2,
          selectedMode: 'single',
          itemStyle: {
            borderRadius: 5,
            borderColor: '#fff',
            borderWidth: 2,
          },
          labelLine: {
            show: true,
            length: 10,
            length2: 10,
            smooth: true,
          },
          label: {
            show: true,
            color: 'hsl(var(--foreground))',
            formatter: (params: unknown) => {
              const safe = asRecord(params);
              const percent = toNumber(safe.percent);
              return `${chartPercentFormatter.format(percent)}%`;
            },
            fontSize: 10,
            lineHeight: 13,
          },
          emphasis: {
            scale: true,
            scaleSize: 8,
            label: {
              show: true,
              fontWeight: 700,
            },
            itemStyle: {
              shadowBlur: 16,
              shadowColor: 'rgba(15, 23, 42, 0.25)',
            },
          },
          data: pieData.map((item) => ({
            ...item,
            selected: selectedProdutoId != null && item.id === selectedProdutoId,
          })),
        },
      ],
      title: [
        {
          text: t('dashboard.map.marketShareTitle'),
          subtext: [metaCodigo, metaNome].filter(Boolean).join(' - ') || t('dashboard.map.marketShareSelectedGoal'),
          left: 'left',
          top: 4,
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
        {
          text: total > 0 ? chartCurrencyFormatter.format(total) : chartCurrencyFormatter.format(0),
          subtext: t('dashboard.map.marketShareGoalPlannedTotal'),
          left: '50%',
          top: '38%',
          textAlign: 'center',
          textVerticalAlign: 'middle',
          textStyle: {
            color: 'hsl(var(--foreground))',
            fontSize: 18,
            fontWeight: 700,
          },
          subtextStyle: {
            color: 'hsl(var(--muted-foreground))',
            fontSize: 12,
          },
        },
      ],
    }),
    [chartCurrencyFormatter, chartPercentFormatter, metaCodigo, metaNome, pieData, selectedProdutoId, t, total]
  );

  return <JuliusEChart option={option} className={className} height={560} />;
}
