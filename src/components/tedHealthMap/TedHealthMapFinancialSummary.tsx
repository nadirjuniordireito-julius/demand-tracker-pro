/**
 * TedHealthMapFinancialSummary - Caixa de dados financeiros do projeto no topo do Health Map
 * Exibe: Valor total Projeto, Valor total Executado (com gráfico de pizza), Saldo a executar.
 */

import { useTranslation } from 'react-i18next';
import { Chart } from 'react-google-charts';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export interface TedHealthMapFinancialSummaryProps {
  valorTotalProjeto: number;
  valorTotalExecutado: number;
  saldoAExecutar: number;
}

export function TedHealthMapFinancialSummary({
  valorTotalProjeto,
  valorTotalExecutado,
  saldoAExecutar,
}: TedHealthMapFinancialSummaryProps) {
  const { t } = useTranslation();

  const exec = Math.max(0, valorTotalExecutado);
  const saldo = Math.max(0, saldoAExecutar);
  const totalPie = exec + saldo;
  const chartData = totalPie > 0
    ? [
        ['', t('healthMapDetail.valueLabel')],
        [t('healthMapDetail.chartExecuted'), exec],
        [t('healthMapDetail.chartPlannedRemaining'), saldo],
      ]
    : null;

  return (
<div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-card p-4 flex flex-wrap items-center justify-between gap-4 min-w-0 max-w-full overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)]">        
      <div className="flex gap-6 min-w-0 shrink">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground shrink-0">
          <span className="whitespace-nowrap">{t('healthMapFinancial.totalProject')}</span>
          <span className="whitespace-nowrap">{t('healthMapFinancial.totalExecuted')}</span>
          <span className="whitespace-nowrap">{t('healthMapFinancial.balanceToExecute')}</span>
        </div>
        <div className="flex flex-col gap-1 text-sm font-medium tabular-nums text-right min-w-0 shrink-0">
          <span className="truncate">{formatCurrency(valorTotalProjeto)}</span>
          <span className="truncate">{formatCurrency(valorTotalExecutado)}</span>
          <span className="truncate">{formatCurrency(saldoAExecutar)}</span>
        </div>
      </div>
      {chartData && (
        <div className="flex items-center gap-4 shrink-0">
          <div className="health-map-pie-chart-wrapper relative overflow-visible flex items-center justify-center" style={{ width: 104, height: 96 }}>
            <Chart
              chartType="PieChart"
              data={chartData}
              options={{
                title: '',
                pieSliceText: 'percentage',
                pieSliceTextStyle: { fontSize: 10 },
                legend: { position: 'none' },
                colors: ['#22c55e', '#1e3a5f'],
                chartArea: { width: '90%', height: '90%', left: '5%', top: '5%', right: '5%', bottom: '5%' },
                backgroundColor: 'transparent',
                tooltip: { trigger: 'none' },
              }}
              width={80}
              height={80}
            />
          </div>
          <div className="flex flex-col gap-1.5 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="rounded-full h-2.5 w-2.5 shrink-0 bg-[#22c55e]" aria-hidden />
              <span>{t('healthMapDetail.chartExecuted')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full h-2.5 w-2.5 shrink-0 bg-[#1e3a5f]" aria-hidden />
              <span>{t('healthMapDetail.chartPlannedRemaining')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
