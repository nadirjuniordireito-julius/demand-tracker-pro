import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Files,
  Frown,
  Package,
  PieChart,
  Target,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProject } from '@/contexts/ProjectContext';
import { projetoService } from '@/services/projetoService';
import { metaProdutoService } from '@/services/metaProdutoService';
import { useApi } from '@/hooks/useApi';
import type { ProdutoEvolucaoTrimestralDTO, SemaforoNodeDTO } from '@/types';
import ProductMarketSharePieChart from '@/pages/charts/ProductMarketSharePieChart';
import ProductBarChart3 from '@/pages/charts/ProductBarChart3';
import ExecucaoGanttPage from '@/modules/execucaoDemanda/pages/ExecucaoGanttPage';
import { ViewTermos } from '@/pages/demandas/ViewTermos';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const parseDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  if ([y, m, d].some((n) => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d);
};

const formatMonthYearRange = (start?: string | null, end?: string | null, separator = 'a') => {
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  if (!s || !e) return '—';
  return `${format(s, 'MM/yyyy', { locale: ptBR })} ${separator} ${format(e, 'MM/yyyy', { locale: ptBR })}`;
};

const formatCurrency = (value?: number | null) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    : '—';

const formatCurrencyWithoutSymbol = (value?: number | null) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : '—';

const formatPercent = (value?: number | null) =>
  typeof value === 'number' ? `${Math.round(value)}%` : '—';

const getDemandaStatusLabel = (node: SemaforoNodeDTO, t: (key: string) => string) => {
  const code = String(node.statusDemanda ?? '').toUpperCase();
  if (!code) return '—';
  const i18n = t(`demands.status${code}`);
  return i18n.startsWith('demands.status') ? code : i18n;
};

const getDemandaStatusBadgeClass = (code: string) => {
  if (code === 'A') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (code === 'D') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (code === 'F') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-muted text-muted-foreground border-border';
};

export default function DashboardMap() {
  const { t } = useTranslation();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id ?? null;

  const { data, isLoading, error, execute } = useApi<SemaforoNodeDTO | null>(null, {
    showErrorToast: true,
  });

  useEffect(() => {
    if (!projectId) return;
    void execute(async () => {
      const semaforo = await projetoService.getSemaforo(projectId);
      console.log(semaforo);
      return semaforo;
    });
  }, [projectId, execute]);

  const metas = useMemo(
    () =>
      [...(data?.children ?? [])]
        .filter((n) => n.nivel === 'META')
        .sort((a, b) => (a.codigo ?? '').localeCompare(b.codigo ?? '', undefined, { numeric: true })),
    [data]
  );

  const [selectedMetaId, setSelectedMetaId] = useState<number | null>(null);
  const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(null);
  const [isMarketShareModalOpen, setIsMarketShareModalOpen] = useState(false);
  const [isQuarterlyEvolutionModalOpen, setIsQuarterlyEvolutionModalOpen] = useState(false);
  const [quarterlySelectedProdutoName, setQuarterlySelectedProdutoName] = useState<string>('');
  const [viewTermosOpen, setViewTermosOpen] = useState(false);
  const [viewTermosIds, setViewTermosIds] = useState({
    idTermoAbertura: 0,
    idTermoPlanejamento: 0,
    idTermoEncerramento: 0,
  });
  const [execucaoGanttOpen, setExecucaoGanttOpen] = useState(false);
  const [execucaoGanttDemandaId, setExecucaoGanttDemandaId] = useState<number | null>(null);

  const reduceMotion = useReducedMotion();
  const mapColumnContainerVariants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.12,
          delayChildren: reduceMotion ? 0 : 0.04,
        },
      },
    }),
    [reduceMotion],
  );
  const mapCardVariants = useMemo(
    () => ({
      hidden: {
        opacity: reduceMotion ? 1 : 0.62,
        filter: reduceMotion ? 'blur(0px)' : 'blur(12px)',
        y: reduceMotion ? 0 : 8,
      },
      visible: {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        transition: {
          duration: reduceMotion ? 0.01 : 0.52,
          ease: [0.22, 1, 0.36, 1] as const,
        },
      },
    }),
    [reduceMotion],
  );

  const {
    data: quarterlyEvolutionData,
    isLoading: isQuarterlyEvolutionLoading,
    error: quarterlyEvolutionError,
    execute: executeQuarterlyEvolution,
  } = useApi<ProdutoEvolucaoTrimestralDTO | null>(null, { showErrorToast: true });

  useEffect(() => {
    const firstMetaId = metas[0]?.id ?? null;
    setSelectedMetaId(firstMetaId);
  }, [metas]);

  const selectedMeta = useMemo(
    () => metas.find((m) => m.id === selectedMetaId) ?? null,
    [metas, selectedMetaId]
  );

  const produtos = useMemo(
    () =>
      [...(selectedMeta?.children ?? [])]
        .filter((n) => n.nivel === 'PRODUTO')
        .sort((a, b) => (a.codigo ?? '').localeCompare(b.codigo ?? '', undefined, { numeric: true })),
    [selectedMeta]
  );

  useEffect(() => {
    const firstProdutoId = produtos[0]?.id ?? null;
    setSelectedProdutoId(firstProdutoId);
  }, [produtos]);

  const selectedProduto = useMemo(
    () => produtos.find((p) => p.id === selectedProdutoId) ?? null,
    [produtos, selectedProdutoId]
  );

  const demandas = useMemo(
    () =>
      [...(selectedProduto?.children ?? [])]
        .filter((n) => n.nivel === 'DEMANDA' && String(n.statusDemanda ?? '').toUpperCase() !== 'Z')
        .sort((a, b) => (a.codigo ?? '').localeCompare(b.codigo ?? '', undefined, { numeric: true })),
    [selectedProduto]
  );

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.map.welcome')}</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {t('projectMeta.selectProjectDescription')}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
     

      {isLoading && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">{t('common.loadingData')}</CardContent>
        </Card>
      )}

      {!isLoading && error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('dashboard.map.goals')}</CardTitle>
              
            </CardHeader>
            <CardContent className="space-y-2">
              {metas.length === 0 && <p className="text-sm text-muted-foreground">{t('projectSemaphore.noData')}</p>}
              {metas.map((meta) => {
                const active = meta.id === selectedMetaId;
                return (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => setSelectedMetaId(meta.id)}
                    className={`group w-full rounded-lg border p-3 text-left transition-[background-color,box-shadow] duration-200 hover:bg-muted/60 ${
                      active
                        ? 'border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]'
                        : 'border-border'
                    }`}
                    aria-selected={active}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`inline-flex items-center gap-1.5 ${active ? 'border-l-4 border-primary pl-2 -ml-1' : ''}`}>
                        {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        <p className="text-base font-semibold">{meta.codigo}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div
                      className={`space-y-2 transition-[filter] duration-200 ${
                        active ? '' : 'blur-[0.65px] group-hover:blur-none'
                      }`}
                    >
                      <p className="line-clamp-2 text-sm font-medium">{meta.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatMonthYearRange(meta.dataInicio, meta.dataFim, t('dashboard.map.dateRangeSeparator'))}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Progress value={meta.percentualExecutado ?? 0} className="h-2" />
                        <span className="text-sm font-semibold text-primary min-w-[46px] text-right">
                          {formatPercent(meta.percentualExecutado)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <motion.div
            key={selectedMetaId ?? 'none'}
            className="space-y-4 xl:col-span-9"
            initial="hidden"
            animate="visible"
            variants={mapColumnContainerVariants}
          >
            <motion.div variants={mapCardVariants} className="will-change-[filter,opacity]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      <span>{t('dashboard.map.goals')}</span>
                    </span>
                  </CardTitle>
                </CardHeader>
              <CardContent className="pt-1">
                {selectedMeta ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-2xl font-bold">{selectedMeta.codigo} - {selectedMeta.nome}</p>
                       
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('dashboard.map.plannedValue')}</p>
                        <p className="text-2xl font-semibold">{formatCurrencyWithoutSymbol(selectedMeta.valorTotalPrevisto)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('dashboard.map.executedValue')}</p>
                        <p className="text-2xl font-semibold">{formatCurrencyWithoutSymbol(selectedMeta.valorTotalExecutado)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('dashboard.map.period')}</p>
                        <p className="text-base font-medium">
                          {formatMonthYearRange(
                            selectedMeta.dataInicio,
                            selectedMeta.dataFim,
                            t('dashboard.map.dateRangeSeparator'),
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('dashboard.map.progress')}</p>
                        <div className="flex items-center gap-2">
                          <Progress value={selectedMeta.percentualExecutado ?? 0} className="h-2" />
                          <span className="text-sm font-semibold text-primary">{formatPercent(selectedMeta.percentualExecutado)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('dashboard.map.selectGoal')}</p>
                )}
              </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={mapCardVariants} className="will-change-[filter,opacity]">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <span>{t('dashboard.map.products')}</span>
                      </span>
                    </CardTitle>
                  <button
                    type="button"
                    onClick={() => setIsMarketShareModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                    disabled={!selectedMeta || produtos.length === 0}
                  >
                    <PieChart className="h-3.5 w-3.5" />
                    {t('dashboard.map.marketShareButton')}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="overflow-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="px-3 py-2 text-left">{t('dashboard.map.code')}</th>
                      <th className="px-3 py-2 text-left">{t('dashboard.map.name')}</th>
                      <th className="px-3 py-2 text-left">{t('dashboard.map.period')}</th>
                      <th className="px-3 py-2 text-right">{t('dashboard.map.budgeted')}</th>
                      <th className="px-3 py-2 text-right">{t('dashboard.map.executed')}</th>
                      <th className="px-3 py-2 text-left">{t('dashboard.map.progress')}</th>
                      <th className="px-3 py-2 text-center">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                          {t('dashboard.map.noProducts')}
                        </td>
                      </tr>
                    )}
                    {produtos.map((produto) => (
                      <tr
                        key={produto.id}
                        className={`cursor-pointer border-b transition ${
                          produto.id === selectedProdutoId ? 'bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]' : ''
                        }`}
                        onClick={() => setSelectedProdutoId(produto.id)}
                        aria-selected={produto.id === selectedProdutoId}
                      >
                        <td className={`text-sm px-2 py-2 font-semibold ${produto.id === selectedProdutoId ? 'border-l-4 border-primary' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            {produto.id === selectedProdutoId && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            <span>{produto.codigo}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 max-w-[280px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate">{produto.nome}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[420px] break-words">{produto.nome}</TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="px-3 py-2">{formatMonthYearRange(produto.dataInicio, produto.dataFim, t('dashboard.map.dateRangeSeparator'))}</td>
                        <td className="px-3 py-2 text-right">{formatCurrencyWithoutSymbol(produto.valorTotalPrevisto)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrencyWithoutSymbol(produto.valorTotalExecutado)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-right text-primary font-semibold">
                              {formatPercent(produto.percentualExecutado)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-muted-foreground transition hover:text-foreground"
                                aria-label={t('dashboard.map.quarterlyEvolutionTooltip')}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedProdutoId(produto.id);
                                  setQuarterlySelectedProdutoName([produto.codigo, produto.nome].filter(Boolean).join(' - '));
                                  setIsQuarterlyEvolutionModalOpen(true);
                                  void executeQuarterlyEvolution(() => metaProdutoService.getEvolucaoTrimestral(produto.id));
                                }}
                              >
                                <BarChart3 className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              {t('dashboard.map.quarterlyEvolutionTooltip')}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
              </Card>
            </motion.div>

            <Dialog open={isMarketShareModalOpen} onOpenChange={setIsMarketShareModalOpen}>
              <DialogContent className="max-w-[94vw] w-[1180px] p-0 overflow-hidden">
                <DialogTitle className="sr-only">{t('dashboard.map.marketShareTitle')}</DialogTitle>
                <button
                  type="button"
                  aria-label={t('common.close')}
                  className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background/95 text-muted-foreground transition hover:text-foreground"
                  onClick={() => setIsMarketShareModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="p-5 pt-8">
                  <ProductMarketSharePieChart
                    produtos={produtos}
                    metaCodigo={selectedMeta?.codigo}
                    metaNome={selectedMeta?.nome}
                    selectedProdutoId={selectedProdutoId}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <ViewTermos
              open={viewTermosOpen}
              onOpenChange={setViewTermosOpen}
              idTermoAbertura={viewTermosIds.idTermoAbertura}
              idTermoPlanejamento={viewTermosIds.idTermoPlanejamento}
              idTermoEncerramento={viewTermosIds.idTermoEncerramento}
            />
            <Dialog open={execucaoGanttOpen} onOpenChange={setExecucaoGanttOpen}>
              <DialogContent className="max-w-[96vw] w-[1380px] h-[92vh] p-0 overflow-hidden">
                <DialogTitle className="sr-only">{t('dashboard.map.viewExecutionGanttTooltip')}</DialogTitle>
                <button
                  type="button"
                  aria-label={t('common.close')}
                  className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background/95 text-muted-foreground transition hover:text-foreground"
                  onClick={() => setExecucaoGanttOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
                {execucaoGanttDemandaId ? (
                  <ExecucaoGanttPage demandaTecnicaId={execucaoGanttDemandaId} embedded />
                ) : null}
              </DialogContent>
            </Dialog>

            <Dialog open={isQuarterlyEvolutionModalOpen} onOpenChange={setIsQuarterlyEvolutionModalOpen}>
              <DialogContent className="max-w-[94vw] w-[980px] p-0 overflow-hidden">
                <DialogTitle className="sr-only">{t('dashboard.map.quarterlyEvolutionModalTitle')}</DialogTitle>
                <button
                  type="button"
                  aria-label={t('common.close')}
                  className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background/95 text-muted-foreground transition hover:text-foreground"
                  onClick={() => setIsQuarterlyEvolutionModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="min-h-[440px] p-6 text-sm text-muted-foreground">
                  {isQuarterlyEvolutionLoading && t('common.loadingData')}
                  {!isQuarterlyEvolutionLoading && quarterlyEvolutionError && quarterlyEvolutionError}
                  {!isQuarterlyEvolutionLoading &&
                    !quarterlyEvolutionError &&
                    quarterlyEvolutionData &&
                    quarterlyEvolutionData.trimestres.length > 0 && <ProductBarChart3 data={quarterlyEvolutionData} />}
                  {!isQuarterlyEvolutionLoading &&
                    !quarterlyEvolutionError &&
                    (!quarterlyEvolutionData || quarterlyEvolutionData.trimestres.length === 0) &&
                    `${t('dashboard.map.quarterlyEvolutionNoData')} ${
                      quarterlySelectedProdutoName ? `(${quarterlySelectedProdutoName})` : ''
                    }`}
                </div>
              </DialogContent>
            </Dialog>

            <motion.div variants={mapCardVariants} className="will-change-[filter,opacity]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span>{t('projectSemaphore.demands')}</span>
                    </span>{' '}
                    <p className="mt-1 text-sm font-medium text-orange-700">
                      {selectedProduto ? `${selectedProduto.codigo} - ${selectedProduto.nome}` : t('dashboard.map.noProductSelected')}
                    </p>
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-muted-foreground">
                        <th className="px-3 py-2 text-left">{t('dashboard.map.code')}</th>
                        <th className="px-3 py-2 text-left">{t('dashboard.map.description')}</th>
                        <th className="px-3 py-2 text-left">{t('dashboard.map.status')}</th>
                        <th className="px-3 py-2 text-right">{t('dashboard.map.planned')}</th>
                        <th className="px-3 py-2 text-right">{t('dashboard.map.executed')}</th>
                        <th className="px-3 py-2 text-left">{t('dashboard.map.progress')}</th>
                        <th className="px-3 py-2 text-center">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demandas.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Frown className="h-14 w-14 text-red-500" />
                              <span>{selectedProduto ? t('dashboard.map.noDemands') : t('dashboard.map.selectProductToViewDemands')}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {demandas.map((demanda) => {
                        const code = String(demanda.statusDemanda ?? '').toUpperCase();
                        return (
                          <tr key={demanda.id} className="border-b">
                            <td className="px-1 py-2 font-semibold">{demanda.codigo}</td>
                            <td className="px-1 py-2 max-w-[280px]">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate">{demanda.nome}</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[420px] break-words">{demanda.nome}</TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="px-1 py-2">
                              <Badge variant="outline" className={getDemandaStatusBadgeClass(code)}>
                                {getDemandaStatusLabel(demanda, t)}
                              </Badge>
                            </td>
                            <td className="px-1 py-2 text-right">{formatCurrencyWithoutSymbol(demanda.valorTotalPrevisto)}</td>
                            <td className="px-1 py-2 text-right">{formatCurrencyWithoutSymbol(demanda.valorTotalExecutado)}</td>
                            <td className="px-1 py-2">
                              <div className="flex items-center gap-2">
                                <span className="w-12 text-right text-primary font-semibold">
                                  {formatPercent(demanda.percentualExecutado)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-muted-foreground transition hover:text-foreground"
                                      aria-label={t('dashboard.map.viewTermosDemandTooltip')}
                                      onClick={() => {
                                        setViewTermosIds({
                                          idTermoAbertura: demanda.idTermoAbertura ?? 0,
                                          idTermoPlanejamento: demanda.idTermoPlanejamento ?? 0,
                                          idTermoEncerramento: demanda.idTermoEncerramento ?? 0,
                                        });
                                        setViewTermosOpen(true);
                                      }}
                                    >
                                      <Files className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-xs">
                                    {t('dashboard.map.viewTermosDemandTooltip')}
                                  </TooltipContent>
                                </Tooltip>
                                {code === 'E' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-muted-foreground transition hover:text-foreground"
                                        aria-label={t('dashboard.map.viewExecutionGanttTooltip')}
                                        onClick={() => {
                                          setExecucaoGanttDemandaId(demanda.id);
                                          setExecucaoGanttOpen(true);
                                        }}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">
                                      {t('dashboard.map.viewExecutionGanttTooltip')}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
