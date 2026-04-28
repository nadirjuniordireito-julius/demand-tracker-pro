import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronUp,
  ChevronRight,
  Eye,
  FileText,
  Files,
  Frown,
  Info,
  Package,
  PieChart,
  Star,
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
import { ViewTermos } from '@/pages/demandas/ViewTermos';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DASHBOARD_MAP_RETURN_CONTEXT_KEY = 'dashboardMap:returnContext';

type DashboardMapReturnContext = {
  selectedMetaId: number | null;
  selectedProdutoId: number | null;
  scrollY: number;
};

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

const isRichTextEmpty = (raw?: string | null) => {
  if (!raw?.trim()) return true;
  const text = raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
  return !text;
};

const looksLikeHtml = (s: string) => /<[a-z][\s\S]*?>/i.test(s);

/** Remove trechos mais arriscados antes de renderizar HTML no tooltip. */
const sanitizeTooltipHtml = (html: string) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)/gi, '');

function ProductDescriptionTooltipBody({
  raw,
  emptyLabel,
}: {
  raw?: string | null;
  emptyLabel: string;
}): ReactNode {
  if (isRichTextEmpty(raw)) return emptyLabel;
  const s = raw!.trim();
  if (looksLikeHtml(s)) {
    return (
      <div
        className="max-h-[min(40vh,280px)] overflow-y-auto text-left font-normal text-popover-foreground [&_*]:font-normal [&_p]:mb-2 [&_p:last-child]:mb-0 [&_br]:block [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_a]:break-all [&_a]:underline [&_a]:text-primary [&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/40 [&_blockquote]:pl-2 [&_blockquote]:italic"
        // eslint-disable-next-line react/no-danger -- conteúdo já vem do editor rico no backend (mesmo padrão de DemandaTimelineModal)
        dangerouslySetInnerHTML={{ __html: sanitizeTooltipHtml(s) }}
      />
    );
  }
  return <span className="whitespace-pre-wrap break-words font-normal">{s}</span>;
}

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
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id ?? null;

  const { data, isLoading, error, execute } = useApi<SemaforoNodeDTO | null>(null, {
    showErrorToast: true,
  });

  useEffect(() => {
    if (!projectId) return;
    void execute(async () => {
      const semaforo = await projetoService.getSemaforo(projectId);
      console.log('SemaforoNodeDTO obtido:', semaforo);
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
  const [showGoToTop, setShowGoToTop] = useState(false);
  const [viewTermosIds, setViewTermosIds] = useState({
    idTermoAbertura: 0,
    idTermoPlanejamento: 0,
    idTermoEncerramento: 0,
  });
  const pendingMetaIdRef = useRef<number | null>(null);
  const pendingProdutoIdRef = useRef<number | null>(null);
  const pendingScrollYRef = useRef<number | null>(null);
  const restoredScrollRef = useRef(false);
  const pageRootRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const rightColumnRef = useRef<HTMLDivElement | null>(null);
  const demandasCardRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);

  const reduceMotion = useReducedMotion();

  const getScrollContainer = useCallback(() => {
    if (scrollContainerRef.current) return scrollContainerRef.current;
    const root = pageRootRef.current;
    const main = root?.closest('main') as HTMLElement | null;
    scrollContainerRef.current = main;
    return main;
  }, []);

  const animateScrollTo = useCallback(
    (targetTop: number) => {
      const scrollContainer = getScrollContainer();
      const isWindowScroll = !scrollContainer;
      const getCurrentTop = () => (isWindowScroll ? window.scrollY : scrollContainer.scrollTop);
      const setTop = (top: number) => {
        if (isWindowScroll) {
          window.scrollTo({ top, behavior: 'auto' });
          return;
        }
        scrollContainer.scrollTo({ top, behavior: 'auto' });
      };

      const startTop = getCurrentTop();
      const maxTop = isWindowScroll
        ? Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
        : Math.max(scrollContainer.scrollHeight - scrollContainer.clientHeight, 0);
      const clampedTarget = Math.min(Math.max(targetTop, 0), maxTop);

      if (reduceMotion) {
        setTop(clampedTarget);
        return;
      }

      if (scrollAnimationFrameRef.current) {
        window.cancelAnimationFrame(scrollAnimationFrameRef.current);
      }

      const durationMs = 900;
      const startTime = performance.now();
      const easeInOutCubic = (x: number) =>
        x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = easeInOutCubic(progress);
        setTop(startTop + (clampedTarget - startTop) * eased);

        if (progress < 1) {
          scrollAnimationFrameRef.current = window.requestAnimationFrame(step);
          return;
        }
        scrollAnimationFrameRef.current = null;
      };

      scrollAnimationFrameRef.current = window.requestAnimationFrame(step);
    },
    [getScrollContainer, reduceMotion],
  );

  const scrollToDemandasCard = useCallback(() => {
    const demandasCard = demandasCardRef.current;
    if (!demandasCard) return;

    const scrollContainer = getScrollContainer();
    const targetTop = (() => {
      if (!scrollContainer) {
        const cardRect = demandasCard.getBoundingClientRect();
        return window.scrollY + cardRect.top - 20;
      }
      const cardRect = demandasCard.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      return scrollContainer.scrollTop + (cardRect.top - containerRect.top) - 20;
    })();

    animateScrollTo(targetTop);
  }, [animateScrollTo, getScrollContainer]);

  const handleProdutoRowClick = useCallback(
    (produtoId: number) => {
      setSelectedProdutoId(produtoId);
      window.requestAnimationFrame(() => {
        scrollToDemandasCard();
      });
    },
    [scrollToDemandasCard],
  );

  const scrollRightColumnToTopIfNeeded = useCallback(() => {
    const rightColumn = rightColumnRef.current;
    if (!rightColumn) return;

    const scrollContainer = getScrollContainer();
    const topOffset = 16;

    const relativeTop = (() => {
      const rightRect = rightColumn.getBoundingClientRect();
      if (!scrollContainer) return rightRect.top;
      const containerRect = scrollContainer.getBoundingClientRect();
      return rightRect.top - containerRect.top;
    })();

    const isAlreadyNearTop = relativeTop >= 0 && relativeTop <= 28;
    if (isAlreadyNearTop) return;

    const targetTop = (() => {
      const rightRect = rightColumn.getBoundingClientRect();
      if (!scrollContainer) return window.scrollY + rightRect.top - topOffset;
      const containerRect = scrollContainer.getBoundingClientRect();
      return scrollContainer.scrollTop + (rightRect.top - containerRect.top) - topOffset;
    })();

    animateScrollTo(targetTop);
  }, [animateScrollTo, getScrollContainer]);

  const handleMetaCardClick = useCallback(
    (metaId: number) => {
      setSelectedMetaId(metaId);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollRightColumnToTopIfNeeded();
        });
      });
    },
    [scrollRightColumnToTopIfNeeded],
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DASHBOARD_MAP_RETURN_CONTEXT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DashboardMapReturnContext;
      pendingMetaIdRef.current = parsed.selectedMetaId;
      pendingProdutoIdRef.current = parsed.selectedProdutoId;
      pendingScrollYRef.current = parsed.scrollY;
      restoredScrollRef.current = false;
      sessionStorage.removeItem(DASHBOARD_MAP_RETURN_CONTEXT_KEY);
    } catch {
      // ignora contexto inválido
    }
  }, []);
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
    if (pendingMetaIdRef.current != null && metas.some((m) => m.id === pendingMetaIdRef.current)) {
      setSelectedMetaId(pendingMetaIdRef.current);
      pendingMetaIdRef.current = null;
      return;
    }
    if (selectedMetaId == null) {
      const firstMetaId = metas[0]?.id ?? null;
      setSelectedMetaId(firstMetaId);
    }
  }, [metas, selectedMetaId]);

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
    if (pendingProdutoIdRef.current != null && produtos.some((p) => p.id === pendingProdutoIdRef.current)) {
      setSelectedProdutoId(pendingProdutoIdRef.current);
      pendingProdutoIdRef.current = null;
      return;
    }
    if (selectedProdutoId == null || !produtos.some((p) => p.id === selectedProdutoId)) {
      const firstProdutoId = produtos[0]?.id ?? null;
      setSelectedProdutoId(firstProdutoId);
    }
  }, [produtos, selectedProdutoId]);

  useEffect(() => {
    if (restoredScrollRef.current || pendingScrollYRef.current == null) return;
    if (selectedProdutoId == null) return;
    const raf = window.requestAnimationFrame(() => {
      const scrollContainer = getScrollContainer();
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: pendingScrollYRef.current ?? 0, behavior: 'auto' });
      } else {
        window.scrollTo({ top: pendingScrollYRef.current ?? 0, behavior: 'auto' });
      }
      pendingScrollYRef.current = null;
      restoredScrollRef.current = true;
    });
    return () => window.cancelAnimationFrame(raf);
  }, [getScrollContainer, selectedProdutoId]);

  useEffect(() => {
    const scrollContainer = getScrollContainer();
    const target: HTMLElement | Window = scrollContainer ?? window;
    const onScroll = () => {
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
      setShowGoToTop(scrollTop > 10);
    };
    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [getScrollContainer]);

  useEffect(
    () => () => {
      if (scrollAnimationFrameRef.current) {
        window.cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    },
    [],
  );

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
    <div ref={pageRootRef} className="space-y-6">
     

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
                    onClick={() => handleMetaCardClick(meta.id)}
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
            ref={rightColumnRef}
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
                        onClick={() => handleProdutoRowClick(produto.id)}
                        aria-selected={produto.id === selectedProdutoId}
                      >
                        <td className={`text-sm px-2 py-2 font-semibold ${produto.id === selectedProdutoId ? 'border-l-4 border-primary' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            {produto.id === selectedProdutoId && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            <span>{produto.codigo}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 max-w-[280px]">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[navy] transition hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                  aria-label={t('dashboard.map.productDescriptionInfo')}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Info className="h-4 w-4" strokeWidth={2.25} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[min(420px,80vw)] break-words text-sm">
                                <ProductDescriptionTooltipBody
                                  raw={produto.descricao}
                                  emptyLabel={t('dashboard.map.noProductDescription')}
                                />
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="min-w-0 flex-1 truncate">{produto.nome}</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[420px] break-words">{produto.nome}</TooltipContent>
                            </Tooltip>
                          </div>
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

            <motion.div ref={demandasCardRef} variants={mapCardVariants} className="will-change-[filter,opacity]">
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
                        const execucaoSituacao = (demanda.execucao?.situacao ?? '')
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .toLowerCase();
                        const isExecucaoAtrasada = execucaoSituacao.includes('atras');
                        return (
                          <tr key={demanda.id} className="border-b">
                            <td className="px-1 py-2 font-semibold">
                              <span className="relative inline-flex">
                                {isExecucaoAtrasada && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="absolute -right-2 -top-1.5 inline-flex cursor-pointer">
                                        <Star className="h-3 w-3 fill-red-600 text-red-600" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">
                                      {t(
                                        'dashboard.map.delayedDemandTooltip',
                                        'Demanda em atraso de execução',
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <span>{demanda.codigo}</span>
                              </span>
                            </td>
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
                                          const contextToRestore: DashboardMapReturnContext = {
                                            selectedMetaId,
                                            selectedProdutoId,
                                            scrollY: getScrollContainer()?.scrollTop ?? window.scrollY,
                                          };
                                          sessionStorage.setItem(
                                            DASHBOARD_MAP_RETURN_CONTEXT_KEY,
                                            JSON.stringify(contextToRestore),
                                          );
                                          const returnTo = `${location.pathname}${location.search}`;
                                          navigate(
                                            `/execucao-demandas/${demanda.id}/gantt?returnTo=${encodeURIComponent(returnTo)}`,
                                          );
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
      {showGoToTop && (
        <button
          type="button"
          onClick={() => {
            const scrollContainer = getScrollContainer();
            if (scrollContainer) {
              scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          aria-label={t('common.backToTop', 'Voltar ao topo')}
          className="fixed bottom-6 right-6 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border text-muted-foreground shadow-md transition hover:text-foreground"
          style={{ backgroundColor: '#ebeaea' }}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
