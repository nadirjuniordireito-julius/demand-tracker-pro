import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  FolderKanban, 
  CheckCircle, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useApi } from '@/hooks/useApi';
import { DashboardSkeleton, ErrorState } from '@/components/common/LoadingStates';
import type { DashboardStats, DemandaPorProjeto, DemandaPorStatus } from '@/types';

// Mock data para demonstração
const mockStats: DashboardStats = {
  totalDemandas: 45,
  demandasAbertas: 12,
  demandasEncerradas: 28,
  custosPlanejados: 450000,
  custosRealizados: 425000,
};

const mockDemandsByProject: DemandaPorProjeto[] = [
  { projetoNome: 'Projeto Alpha', quantidade: 15 },
  { projetoNome: 'Projeto Beta', quantidade: 12 },
  { projetoNome: 'Projeto Gamma', quantidade: 8 },
  { projetoNome: 'Projeto Delta', quantidade: 6 },
  { projetoNome: 'Projeto Epsilon', quantidade: 4 },
];

const mockDemandsByStatus: DemandaPorStatus[] = [
  { name: 'Abertas', value: 12, color: '#3b82f6' },
  { name: 'Em Planejamento', value: 5, color: '#f59e0b' },
  { name: 'Em Execução', value: 8, color: '#8b5cf6' },
  { name: 'Encerradas', value: 28, color: '#22c55e' },
];

const simulateApiCall = <T,>(data: T, delay = 1200): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), delay));
};

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
      executeStats(() => simulateApiCall(mockStats)),
      executeProjects(() => simulateApiCall(mockDemandsByProject)),
      executeStatus(() => simulateApiCall(mockDemandsByStatus)),
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
      color: 'bg-info/10 text-info',
      trend: '+5 este mês',
      trendUp: true,
    },
    {
      title: t('dashboard.openDemands'),
      value: stats.demandasAbertas,
      icon: FolderKanban,
      color: 'bg-warning/10 text-warning',
      trend: '3 novas',
      trendUp: true,
    },
    {
      title: t('dashboard.closedDemands'),
      value: stats.demandasEncerradas,
      icon: CheckCircle,
      color: 'bg-success/10 text-success',
      trend: '+8 este mês',
      trendUp: true,
    },
    {
      title: t('dashboard.costVariance'),
      value: formatCurrency(Math.abs(costVariance)),
      icon: costVariance >= 0 ? TrendingDown : TrendingUp,
      color: costVariance >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
      trend: `${costVariance >= 0 ? '-' : '+'}${costVariancePercent}%`,
      trendUp: costVariance >= 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de demandas técnicas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.plannedCosts')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.custosPlanejados)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.actualCosts')}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.custosRealizados)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar Chart - Demands by Project */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.demandsByProject')}</CardTitle>
            <CardDescription>
              Quantidade de demandas por projeto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demandsByProject || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="projetoNome" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Demands by Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.demandsByStatus')}</CardTitle>
            <CardDescription>
              Distribuição de demandas por situação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demandsByStatus || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(demandsByStatus || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
