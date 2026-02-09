import { useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  FolderKanban,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApi } from '@/hooks/useApi';
import { DashboardSkeleton, ErrorState } from '@/components/common/LoadingStates';
import { dashboardService } from '@/services/dashboardService';
import type { DashboardStats, DemandaPorProjeto, DemandaPorStatus } from '@/types';

const DashboardCharts = lazy(() => import('./DashboardCharts'));

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function DashboardPage() {
  const { t } = useTranslation();
  
  const { data: stats, isLoading: isLoadingStats, error: errorStats, execute: executeStats } = useApi<DashboardStats>(null);
  const { data: demandsByProject, isLoading: isLoadingProjects, execute: executeProjects } = useApi<DemandaPorProjeto[]>(null);
  const { data: demandsByStatus, isLoading: isLoadingStatus, execute: executeStatus } = useApi<DemandaPorStatus[]>(null);

  const loadData = async () => {
    await Promise.all([
      executeStats(() => dashboardService.getStats()),
      executeProjects(() => dashboardService.getDemandsByProject()),
      executeStatus(() => dashboardService.getDemandsByStatus()),
    ]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isLoading = isLoadingStats || isLoadingProjects || isLoadingStatus;

  if (errorStats) {
    return <ErrorState onRetry={loadData} />;
  }

  if (isLoading || !stats) {
    return <DashboardSkeleton />;
  }

  const costVariance = stats.custosPlanejados - stats.custosRealizados;
  const costVariancePercent = ((costVariance / stats.custosPlanejados) * 100).toFixed(1);

  const statsCards = [
    {
      title: t('dashboard.totalDemands'),
      value: stats.totalDemandas,
      icon: FileText,
      trend: '+5 este mês',
      trendUp: true,
    },
    {
      title: t('dashboard.openDemands'),
      value: stats.demandasAbertas,
      icon: FolderKanban,
      trend: '3 novas',
      trendUp: true,
    },
    {
      title: t('dashboard.closedDemands'),
      value: stats.demandasEncerradas,
      icon: CheckCircle,
      trend: '+8 este mês',
      trendUp: true,
    },
    {
      title: t('dashboard.costVariance'),
      value: formatCurrency(Math.abs(costVariance)),
      icon: costVariance >= 0 ? TrendingDown : TrendingUp,
      trend: `${costVariance >= 0 ? '-' : '+'}${costVariancePercent}%`,
      trendUp: costVariance >= 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-sm font-light text-muted-foreground">
          Visão geral da plataforma de gestão operacional de projetos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-normal text-primary">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-8 w-8 text-foreground" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-normal">{stat.value}</div>
              <p className={`text-xs ${stat.trendUp ? 'text-success' : 'text-destructive'} flex items-center gap-1 mt-1`}>
                {stat.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal text-primary">
              {t('dashboard.plannedCosts')}
            </CardTitle>
            <DollarSign className="h-8 w-8 text-foreground" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-normal">{formatCurrency(stats.custosPlanejados)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal text-primary">
              {t('dashboard.actualCosts')}
            </CardTitle>
            <Activity className="h-8 w-8 text-foreground" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-normal">{formatCurrency(stats.custosRealizados)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts (lazy-loaded para reduzir chunk inicial) */}
      <Suspense fallback={<div className="grid gap-4 lg:grid-cols-2"><div className="h-[340px] rounded-lg bg-muted/50 animate-pulse" /><div className="h-[340px] rounded-lg bg-muted/50 animate-pulse" /></div>}>
        <DashboardCharts demandsByProject={demandsByProject} demandsByStatus={demandsByStatus} />
      </Suspense>
    </div>
  );
}
