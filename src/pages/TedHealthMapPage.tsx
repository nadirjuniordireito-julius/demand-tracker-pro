/**
 * TedHealthMapPage - Pagina principal do TED Health Map
 *
 * Orquestra layout: header, filtros, mapa de bolhas, painel de detalhes.
 * Dados via useTedHealthMapSource (GET /api/ted/{id}/health).
 */

import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { useTedHealthMapSource } from '@/hooks/useTedHealthMapSource';
import { useProject } from '@/contexts/ProjectContext';
import { perfilService } from '@/services/perfilService';
import { metaProdutoService } from '@/services/metaProdutoService';
import { DEMANDA_STATUS } from '@/lib/demandaStatus';
import { projetoService } from '@/services/projetoService';
import { TedHealthMapFilters } from '@/components/tedHealthMap/TedHealthMapFilters';
import { TedHealthMapFinancialSummary } from '@/components/tedHealthMap/TedHealthMapFinancialSummary';
import { TedHealthMapLegend } from '@/components/tedHealthMap/TedHealthMapLegend';
import { TedHealthMapFlyingBubble } from '@/components/tedHealthMap/TedHealthMapFlyingBubble';

const BubbleChart = lazy(() =>
  import('@/components/tedHealthMap/BubbleChart').then((m) => ({ default: m.BubbleChart }))
);
const TedHealthMapDetailPanel = lazy(() =>
  import('@/components/tedHealthMap/TedHealthMapDetailPanel').then((m) => ({ default: m.TedHealthMapDetailPanel }))
);
import { LabeledCard } from '@/components/common/LabeledCard';
import type { BubbleNode } from '@/types/tedHealthMap';
import { tedHasRisk, metaHasRisk, hasCriticalDemand } from '@/lib/tedHealthMapRisk';
import type { TedHealthMapFiltersState } from '@/components/tedHealthMap/TedHealthMapFilters';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

const defaultFilters: TedHealthMapFiltersState = {
  metaId: 'all',
  produtoId: 'all',
  perfilId: 'all',
  status: 'all',
  periodStart: '',
  periodEnd: '',
};

export type ZoomLevel = 'ted' | 'meta' | 'produto';

/** Oculta painel de filtros à esquerda - será trabalhado no futuro */
const SHOW_FILTERS_PANEL = false;

export default function TedHealthMapPage() {
  const { t } = useTranslation();
  const { selectedProject } = useProject();
  const tedId = selectedProject?.id ?? null;
  const { data, loading, error } = useTedHealthMapSource(tedId);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('ted');
  const [selectedMetaId, setSelectedMetaId] = useState<string | null>(null);
  const [selectedProdutoId, setSelectedProdutoId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<BubbleNode | null>(null);
  const [filters, setFilters] = useState<TedHealthMapFiltersState>(defaultFilters);
  const [perfilOptions, setPerfilOptions] = useState<{ value: string; label: string }[]>([]);
  const [allProductsForSelectedMeta, setAllProductsForSelectedMeta] = useState<
    { id: number; codigo: string; nome: string }[] | null
  >(null);
  const [containerRef, containerSize] = useResizeObserver<HTMLDivElement>();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);

  type PendingNav =
    | { type: 'meta'; metaId: string }
    | { type: 'produto'; metaId: string; produtoId: string }
    | { type: 'demanda'; node: BubbleNode };
  const [throwingState, setThrowingState] = useState<{
    node: BubbleNode;
    startPx: { left: number; top: number };
    endPx: { left: number; top: number };
    pendingNav: PendingNav;
  } | null>(null);

  const [financialTotals, setFinancialTotals] = useState<{
    valorTotalProjeto: number;
    valorTotalExecutado: number;
  }>({ valorTotalProjeto: 0, valorTotalExecutado: 0 });

  useEffect(() => {
    if (!selectedProject?.id) {
      setFinancialTotals({ valorTotalProjeto: 0, valorTotalExecutado: 0 });
      return;
    }
    projetoService
      .getTotais(selectedProject.id)
      .then((res) => {
        const v1 = typeof res.valorTotalProjeto === 'number' ? res.valorTotalProjeto : Number(res.valorTotalProjeto) || 0;
        const v2 = typeof res.valorTotalExecutado === 'number' ? res.valorTotalExecutado : Number(res.valorTotalExecutado) || 0;
        setFinancialTotals({ valorTotalProjeto: v1, valorTotalExecutado: v2 });
      })
      .catch(() => setFinancialTotals({ valorTotalProjeto: 0, valorTotalExecutado: 0 }));
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedProject?.id) {
      setPerfilOptions([]);
      return;
    }
    perfilService
      .findAll({ projetoId: selectedProject.id, page: 0, size: 200 })
      .then((res) => setPerfilOptions(res.content.map((p) => ({ value: String(p.id), label: p.nome }))))
      .catch(() => setPerfilOptions([]));
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedMetaId) {
      setAllProductsForSelectedMeta(null);
      return;
    }
    const metaIdNum = Number(selectedMetaId);
    if (!Number.isFinite(metaIdNum)) {
      setAllProductsForSelectedMeta(null);
      return;
    }
    metaProdutoService
      .findByProjetoMeta(metaIdNum)
      .then((list) => setAllProductsForSelectedMeta(list.map((p) => ({ id: p.id, codigo: p.codigo, nome: p.nome }))))
      .catch(() => setAllProductsForSelectedMeta(null));
  }, [selectedMetaId]);
  const chartWidth = Math.max(300, containerSize.width);
  const chartHeight = Math.max(300, containerSize.height);

  const chartData = useMemo((): BubbleNode | null => {
    if (!data) return null;
    if (zoomLevel !== 'meta' || !selectedMetaId || !allProductsForSelectedMeta?.length) {
      return data;
    }
    const metaFromHealth = (data.children ?? []).find((m) => String(m.id) === String(selectedMetaId));
    const healthProducts = metaFromHealth?.children ?? [];
    const mergedChildren: BubbleNode[] = allProductsForSelectedMeta.map((cadastrado) => {
      const fromHealth = healthProducts.find((p) => String(p.id) === String(cadastrado.id));
      if (fromHealth) return fromHealth;
      return {
        id: String(cadastrado.id),
        name: cadastrado.nome,
        codigo: cadastrado.codigo,
        level: 'produto' as const,
        valor: 0,
        children: [],
        raw: undefined,
      } satisfies BubbleNode;
    });
    const childrenWithMetaMerged = (data.children ?? []).map((m) =>
      String(m.id) === String(selectedMetaId) ? { ...m, children: mergedChildren } : m
    );
    return { ...data, children: childrenWithMetaMerged };
  }, [data, zoomLevel, selectedMetaId, allProductsForSelectedMeta]);

  const selectedMeta = useMemo(() => {
    const source = chartData ?? data;
    return (source?.children ?? []).find((m) => String(m.id) === String(selectedMetaId)) ?? null;
  }, [chartData, data?.children, selectedMetaId]);

  const selectedProduto = useMemo(() => {
    if (!selectedMeta) return null;
    return (
      (selectedMeta.children ?? []).find(
        (p) => String(p.id) === String(selectedProdutoId)
      ) ?? null
    );
  }, [selectedMeta, selectedProdutoId]);

  const zoomOut = () => {
    if (zoomLevel === 'produto') {
      setZoomLevel('meta');
      setSelectedProdutoId(null);
      setSelectedNode(null);
    } else if (zoomLevel === 'meta') {
      setZoomLevel('ted');
      setSelectedMetaId(null);
      setSelectedProdutoId(null);
      setSelectedNode(null);
    }
  };

  const applyPendingNav = useCallback((nav: PendingNav) => {
    if (nav.type === 'meta') {
      setZoomLevel('meta');
      setSelectedMetaId(nav.metaId);
      setSelectedProdutoId(null);
      setSelectedNode(null);
    } else if (nav.type === 'produto') {
      setZoomLevel('produto');
      setSelectedMetaId(nav.metaId);
      setSelectedProdutoId(nav.produtoId);
      setSelectedNode(null);
    } else {
      setSelectedNode(nav.node);
    }
  }, []);

  const handleNodeClick = (node: BubbleNode, position?: { x: number; y: number }) => {
    if (node.level === 'meta') {
      if (position && chartContainerRef.current && asideRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        const asideRect = asideRef.current.getBoundingClientRect();
        const r = 50;
        const startPx = {
          left: rect.left + position.x * (rect.width / chartWidth) - r,
          top: rect.top + position.y * (rect.height / chartHeight) - r,
        };
        const endPx = {
          left: asideRect.left + 24 - r,
          top: asideRect.top + 80 - r,
        };
        setThrowingState({
          node,
          startPx,
          endPx,
          pendingNav: { type: 'meta', metaId: node.id },
        });
      } else {
        setZoomLevel('meta');
        setSelectedMetaId(node.id);
        setSelectedProdutoId(null);
        setSelectedNode(null);
      }
    } else if (node.level === 'produto') {
      const fullProduto = (selectedMeta?.children ?? []).find(
        (p) => String(p.id) === String(node.id)
      );
      if (fullProduto && (fullProduto.children ?? []).length > 0) {
        if (position && selectedMetaId && chartContainerRef.current && asideRef.current) {
          const rect = chartContainerRef.current.getBoundingClientRect();
          const asideRect = asideRef.current.getBoundingClientRect();
          const r = 50;
          const startPx = {
            left: rect.left + position.x * (rect.width / chartWidth) - r,
            top: rect.top + position.y * (rect.height / chartHeight) - r,
          };
          const endPx = {
            left: asideRect.left + 24 - r,
            top: asideRect.top + 80 - r,
          };
          setThrowingState({
            node,
            startPx,
            endPx,
            pendingNav: { type: 'produto', metaId: selectedMetaId, produtoId: node.id },
          });
        } else {
          setZoomLevel('produto');
          setSelectedProdutoId(node.id);
          setSelectedNode(null);
        }
      } else {
        setSelectedNode(node);
      }
    } else if (node.level === 'demanda') {
      if (position && chartContainerRef.current && asideRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        const asideRect = asideRef.current.getBoundingClientRect();
        const r = 50;
        const startPx = {
          left: rect.left + position.x * (rect.width / chartWidth) - r,
          top: rect.top + position.y * (rect.height / chartHeight) - r,
        };
        const endPx = {
          left: asideRect.left + 24 - r,
          top: asideRect.top + 80 - r,
        };
        setThrowingState({
          node,
          startPx,
          endPx,
          pendingNav: { type: 'demanda', node },
        });
      } else {
        setSelectedNode(node);
      }
    }
  };


  const metaIdsWithRisk = useMemo(() => {
    const ids = new Set<string>();
    (data?.children ?? []).forEach((m) => {
      if (m.level === 'meta' && metaHasRisk(m)) ids.add(String(m.id));
    });
    return ids;
  }, [data?.children]);

  const produtoIdsWithRisk = useMemo(() => {
    const ids = new Set<string>();
    (data?.children ?? []).forEach((m) => {
      (m.children ?? []).forEach((p) => {
        if (p.level === 'produto' && hasCriticalDemand(p)) ids.add(String(p.id));
      });
    });
    return ids;
  }, [data?.children]);

  const breadcrumb = useMemo(() => {
    const parts: string[] = [];
    if (selectedMeta) parts.push(selectedMeta.name);
    if (selectedProduto) parts.push(selectedProduto.name);
    return parts.join(' > ');
  }, [selectedMeta, selectedProduto]);

  const bubbleCount = useMemo(() => {
    if (!data?.children) return 0;
    if (zoomLevel === 'produto' && selectedMetaId && selectedProdutoId) {
      const meta = data.children.find((m) => String(m.id) === String(selectedMetaId));
      const produto = (meta?.children ?? []).find((p) => String(p.id) === String(selectedProdutoId));
      return (produto?.children ?? []).length;
    }
    if (zoomLevel === 'meta' && selectedMetaId) {
      const meta = data.children.find((m) => String(m.id) === String(selectedMetaId));
      return (meta?.children ?? []).length;
    }
    return data.children.length;
  }, [data?.children, zoomLevel, selectedMetaId, selectedProdutoId]);

  const chartRowMinHeight = useMemo(() => {
    const R = 50;
    const padding = 16;
    const marginExtra = 100;
    const cellSize = R * 2 + padding;
    const breadcrumbAndPadding = 56;
    if (bubbleCount === 0) return breadcrumbAndPadding + 200;
    if (zoomLevel === 'meta' && selectedMetaId) {
      const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(bubbleCount))));
      const rows = Math.ceil(bubbleCount / cols);
      return breadcrumbAndPadding + marginExtra + Math.min(640, rows * cellSize + padding * 2 + marginExtra);
    }
    const packedEstimate = 120 + 2 * R * 2.2 * Math.ceil(Math.sqrt(bubbleCount)) + padding * 2 + marginExtra;
    return breadcrumbAndPadding + Math.min(700, Math.max(320, packedEstimate));
  }, [bubbleCount, zoomLevel, selectedMetaId]);

  const metaOptions = useMemo(
    () =>
      (data?.children ?? []).map((m) => ({ value: String(m.id), label: m.name })),
    [data?.children]
  );

  const produtoOptions = useMemo(() => {
    const produtos: { value: string; label: string }[] = [];
    (data?.children ?? []).forEach((m) => {
      (m.children ?? []).forEach((p) => {
        produtos.push({ value: String(p.id), label: p.name });
      });
    });
    if (allProductsForSelectedMeta) {
      allProductsForSelectedMeta.forEach((p) => {
        if (!produtos.some((o) => o.value === String(p.id)))
          produtos.push({ value: String(p.id), label: p.nome });
      });
    }
    return produtos;
  }, [data?.children, allProductsForSelectedMeta]);

  const statusOptions = [
    { value: DEMANDA_STATUS.A, label: t('demands.statusA') },
    { value: DEMANDA_STATUS.B, label: t('demands.statusB') },
    { value: DEMANDA_STATUS.C, label: t('demands.statusC') },
    { value: DEMANDA_STATUS.D, label: t('demands.statusD') },
    { value: DEMANDA_STATUS.E, label: t('demands.statusE') },
    { value: DEMANDA_STATUS.F, label: t('demands.statusF') },
    { value: DEMANDA_STATUS.G, label: t('demands.statusG') },
    { value: DEMANDA_STATUS.Z, label: t('demands.statusZ') },
  ];

  const filteredData = useMemo(() => {
    if (!data) return null;
    const { metaId, produtoId, perfilId, status } = filters;
    const perfilLabel = perfilId !== 'all' ? perfilOptions.find((o) => o.value === perfilId)?.label : null;

    const statusCodeToLabels: Record<string, string[]> = {
      A: ['A', 'Em elaboração', 'Em elaboracao', 'elaboração', 'elaboracao'],
      B: ['B', 'Em abertura', 'abertura', 'opened'],
      C: ['C', 'Aberta', 'Aberta e assinada', 'aberta'],
      D: ['D', 'Em planejamento', 'planejamento', 'inPlanning'],
      E: ['E', 'Em execução', 'Em execução', 'execução'],
      F: ['F', 'Em encerramento', 'encerramento', 'inExecution'],
      G: ['G', 'Encerrado', 'Encerrado', 'encerrado', 'closed'],
      Z: ['Z', 'Cancelada', 'cancelada'],
    };
    const statusMatches = (nodeStatus: string): boolean => {
      if (status === 'all') return true;
      const s = String(nodeStatus).toLowerCase();
      const codes = statusCodeToLabels[status];
      if (!codes) return s === status.toLowerCase();
      return codes.some((c) => s === c.toLowerCase() || s.includes(c.toLowerCase()));
    };

    const filterDemandas = (demandas: BubbleNode[]): BubbleNode[] => {
      if (!demandas?.length) return [];
      return demandas.filter((d) => {
        if (status !== 'all') {
          const nodeStatus =
            (d.raw as { status?: string })?.status ?? d.status ?? '';
          if (!statusMatches(nodeStatus)) return false;
        }
        if (perfilLabel) {
          const hasPerfil = (d.perfisEnvolvidos ?? []).some(
            (p) => p === perfilLabel || p === perfilId
          );
          if (!hasPerfil) return false;
        }
        return true;
      });
    };

    const filterProdutos = (produtos: BubbleNode[]): BubbleNode[] => {
      if (!produtos?.length) return [];
      return produtos
        .filter((p) => produtoId === 'all' || String(p.id) === produtoId)
        .map((p) => ({
          ...p,
          children: p.children?.length
            ? filterDemandas(p.children)
            : undefined,
        }))
        .filter((p) => !p.children || p.children.length > 0);
    };

    const filterMetas = (metas: BubbleNode[]): BubbleNode[] => {
      if (!metas?.length) return [];
      return metas
        .filter((m) => metaId === 'all' || String(m.id) === metaId)
        .map((m) => ({
          ...m,
          children:
            metaId !== 'all' && produtoId !== 'all'
              ? filterProdutos(m.children ?? [])
              : filterProdutos(m.children ?? []),
        }))
        .filter((m) => !m.children || m.children.length > 0);
    };

    const metas = filterMetas(data.children ?? []);
    return { ...data, children: metas };
  }, [data, filters, perfilOptions]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {SHOW_FILTERS_PANEL && <aside className="w-56 shrink-0" />}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="rounded-lg border bg-card p-4 animate-pulse h-24" />
          <div className="flex-1 rounded-lg border bg-card p-4 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Carregando TED Health Map...</p>
          </div>
        </main>
        <aside className="w-80 shrink-0" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {SHOW_FILTERS_PANEL && <aside className="w-56 shrink-0" />}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </main>
        <aside className="w-80 shrink-0" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {SHOW_FILTERS_PANEL && <aside className="w-56 shrink-0" />}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="rounded-lg border bg-card p-4 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
          </div>
        </main>
        <aside className="w-80 shrink-0" />
      </div>
    );
  }

  const executedValue = data.valor * 0.62;
  const healthPercent = Math.max(0, 100 - (data.desvioPrazoDias ?? 0) * 5);
  const tedRisk = tedHasRisk(data);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] gap-4">
      {SHOW_FILTERS_PANEL && (
        <aside className="w-56 shrink-0 overflow-y-auto">
          <TedHealthMapFilters
            filters={filters}
            onFiltersChange={setFilters}
            metaOptions={metaOptions}
            produtoOptions={produtoOptions}
            perfilOptions={perfilOptions}
            statusOptions={statusOptions}
          />
        </aside>
      )}

      <main className="flex flex-1 flex-col gap-4 min-h-0 min-w-0 overflow-x-hidden">
        <TedHealthMapFinancialSummary
          valorTotalProjeto={financialTotals.valorTotalProjeto}
          valorTotalExecutado={financialTotals.valorTotalExecutado}
          saldoAExecutar={Math.max(0, financialTotals.valorTotalProjeto - financialTotals.valorTotalExecutado)}
        />
        <Suspense
            fallback={
              <div className="flex flex-1 gap-4 items-start min-w-0" style={{ minHeight: chartRowMinHeight }}>
                <div className="flex-1 h-full min-h-[300px] rounded-lg bg-muted/50 animate-pulse" />
                <div className="w-[30rem] shrink-0 h-[200px] rounded-lg bg-muted/50 animate-pulse" />
              </div>
            }
          >
            <div className="flex flex-1 gap-4 items-start min-w-0" style={{ minHeight: chartRowMinHeight }}>
              <LabeledCard
                title={zoomLevel === 'ted' ? t('healthMapDetail.levelMetas') : zoomLevel === 'meta' ? t('healthMapDetail.levelProducts') : t('healthMapDetail.levelDemands')}
                cardClassName="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden"
                contentClassName="flex flex-1 flex-col gap-2 min-h-0 pt-3"
              >
                <div className="flex items-center gap-2 relative z-10 shrink-0 min-w-0 overflow-hidden">
                  {(zoomLevel === 'meta' || zoomLevel === 'produto') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        zoomOut();
                      }}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      title={t('common.back')}
                      aria-label={t('common.back')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground truncate min-w-0" title={breadcrumb}>{breadcrumb}</p>
                </div>
                <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center relative z-0 p-6 pb-2">
                  <div
                    ref={(el) => {
                      containerRef(el);
                      chartContainerRef.current = el;
                    }}
                    className="w-full h-full min-h-0 min-w-0"
                  >
                    <BubbleChart
                      data={chartData ?? data!}
                      width={chartWidth}
                      height={chartHeight}
                      zoomLevel={zoomLevel}
                      selectedMetaId={selectedMetaId}
                      selectedProdutoId={selectedProdutoId}
                      onNodeClick={handleNodeClick}
                      selectedNode={selectedNode}
                      metaIdsWithRisk={metaIdsWithRisk}
                      produtoIdsWithRisk={produtoIdsWithRisk}
                    />
                  </div>
                </div>
                <div className="shrink-0 pt-2 pb-3 px-2 border-t border-border/60">
                  <TedHealthMapLegend compact />
                </div>
              </LabeledCard>

              <aside ref={asideRef} className="w-[30rem] shrink-0 rounded-lg">
                
                <TedHealthMapDetailPanel
                  cardClassName="bg-white dark:bg-gray-800"
                  node={selectedNode ?? selectedProduto ?? selectedMeta}
                  zoomLevel={zoomLevel}
                  productValorPrevisto={
                    selectedNode?.level === 'demanda' && selectedProduto
                      ? (() => {
                          const raw = selectedProduto.raw as unknown as Record<string, unknown> | undefined;
                          const v = raw?.valorTotalPrevisto != null ? Number(raw.valorTotalPrevisto) : Number(selectedProduto.valor);
                          return Number.isFinite(v) ? v : undefined;
                        })()
                      : undefined
                  }
                  parentMetaCode={
                    selectedProduto && selectedMeta
                      ? (selectedMeta.codigo ?? (selectedProduto.raw as unknown as Record<string, unknown> | undefined)?.codigo as string | undefined)
                      : undefined
                  }
                />
              </aside>
            </div>
          </Suspense>

        {throwingState && (
          <TedHealthMapFlyingBubble
            startPx={throwingState.startPx}
            endPx={throwingState.endPx}
            onComplete={() => {
              applyPendingNav(throwingState.pendingNav);
              setThrowingState(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
