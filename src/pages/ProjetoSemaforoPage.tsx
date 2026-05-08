import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { useProject } from '@/contexts/ProjectContext';
import { projetoService } from '@/services/projetoService';
import type { SemaforoNodeDTO, SemaforoStatus } from '@/types';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type RouteParams = {
  id?: string;
};

const parseDateOnly = (dateStr: string) => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};
const formatDate = (dateStr: string) => format(parseDateOnly(dateStr), 'dd/MM/yyyy', { locale: ptBR });

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const STATUS_COLORS: Record<SemaforoStatus, string> = {
  VERDE: 'bg-emerald-500',
  AMARELO: 'bg-amber-400',
  VERMELHO: 'bg-red-500',
  CINZA: 'bg-gray-400',
};

const STATUS_LABELS_KEY: Record<SemaforoStatus, string> = {
  VERDE: 'projectSemaphore.status.green',
  AMARELO: 'projectSemaphore.status.yellow',
  VERMELHO: 'projectSemaphore.status.red',
  CINZA: 'projectSemaphore.status.gray',
};

interface SemaforoBadgeProps {
  status: SemaforoStatus;
  size?: 'sm' | 'md' | 'lg';
}

function SemaforoBadge({ status, size = 'md' }: SemaforoBadgeProps) {
  const { t } = useTranslation();
  const base = 'rounded-full flex items-center justify-center';

  const sizeClass =
    size === 'lg'
      ? 'w-8 h-8'
      : size === 'sm'
        ? 'w-3 h-3'
        : 'w-4 h-4';

  return (
    <span
      className={`${base} ${sizeClass} ${STATUS_COLORS[status]} shadow-[0_0_0_2px_rgba(255,255,255,0.9)] border border-black/10`}
      aria-label={t(STATUS_LABELS_KEY[status])}
    />
  );
}

interface SemaforoTreeProps {
  root: SemaforoNodeDTO;
}

function nodeKey(node: SemaforoNodeDTO): string {
  return `${node.nivel.toLowerCase()}-${node.id}`;
}

const sortByCodigo = (a: SemaforoNodeDTO, b: SemaforoNodeDTO) =>
  (a.codigo ?? '').localeCompare(b.codigo ?? '', undefined, { numeric: true });

/** Indica se o nó é uma demanda cancelada (status Z). Aceita camelCase e snake_case. */
function isDemandaCancelada(node: SemaforoNodeDTO): boolean {
  if (node.nivel !== 'DEMANDA') return false;
  const raw = node as unknown as Record<string, unknown>;
  const status = raw.statusDemanda ?? raw.status_demanda ?? raw.situacao ?? '';
  return String(status) === 'Z';
}

/** Retorna cópia da árvore excluindo demandas canceladas. */
function filterTreeExcludingCancelledDemandas(root: SemaforoNodeDTO): SemaforoNodeDTO {
  const children = (root.children ?? [])
    .filter((child) => !isDemandaCancelada(child))
    .map((child) => filterTreeExcludingCancelledDemandas(child));
  return { ...root, children };
}

function SemaforoTree({ root }: SemaforoTreeProps) {
  const { t } = useTranslation();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggle = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isExpanded = useCallback(
    (key: string) => expandedKeys.has(key),
    [expandedKeys]
  );

  const renderMetaOrProdutoRow = (node: SemaforoNodeDTO, level: number, key: string) => {
    const expanded = isExpanded(key);
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isMeta = node.nivel === 'META';
    const isProduto = node.nivel === 'PRODUTO';
    const showInlineDetails = isMeta || isProduto;

    const row = (
      <div
        className="flex flex-col min-w-0 flex-1"
        style={{ paddingLeft: level * 20 }}
      >
        <div className="flex items-center gap-1 text-sm font-medium text-foreground">
          <span className="text-muted-foreground text-[11px] uppercase tracking-wide shrink-0">
            {t(`projectSemaphore.level.${node.nivel.toLowerCase()}`)}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">·</span>
          <span className="truncate min-w-0">
            {node.codigo} - {node.nome}
          </span>
        </div>
        {showInlineDetails && (
          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {node.dataInicio && node.dataFim && (
              <span>
                {t('projectSemaphore.period')}: {formatDate(node.dataInicio)} → {formatDate(node.dataFim)}
              </span>
            )}
            {(typeof node.valorTotalPrevisto === 'number' || typeof node.valorTotalExecutado === 'number') && (
              <span className="font-medium text-foreground/90">
                {typeof node.valorTotalPrevisto === 'number' && (
                  <>{t('projectSemaphore.planned')}: {formatCurrency(node.valorTotalPrevisto)}</>
                )}
                {typeof node.valorTotalPrevisto === 'number' && typeof node.valorTotalExecutado === 'number' && ' · '}
                {typeof node.valorTotalExecutado === 'number' && (
                  <>{t('projectSemaphore.executed')}: {formatCurrency(node.valorTotalExecutado)}</>
                )}
              </span>
            )}
            {typeof node.percentualExecutado === 'number' && (
              <span>
                {t('projectSemaphore.executedPercent')}: {node.percentualExecutado.toFixed(2)}%
              </span>
            )}
            {typeof node.qtdDemandas === 'number' && typeof node.qtdDemandasEncerradas === 'number' && (
              <span>
                {t('projectSemaphore.demandsSummary', {
                  total: node.qtdDemandas,
                  closed: node.qtdDemandasEncerradas,
                })}
              </span>
            )}
          </div>
        )}
      </div>
    );

    const tooltipContent = (
      <>
        {node.dataInicio && node.dataFim && (
          <div className="mb-1">
            <span className="font-medium">{t('projectSemaphore.period')}:</span>{' '}
            {formatDate(node.dataInicio)} → {formatDate(node.dataFim)}
          </div>
        )}
        {(typeof node.valorTotalPrevisto === 'number' || typeof node.valorTotalExecutado === 'number') && (
          <div className="mb-1">
            {typeof node.valorTotalPrevisto === 'number' && (
              <div>
                <span className="font-medium">{t('projectSemaphore.planned')}:</span>{' '}
                {formatCurrency(node.valorTotalPrevisto)}
              </div>
            )}
            {typeof node.valorTotalExecutado === 'number' && (
              <div>
                <span className="font-medium">{t('projectSemaphore.executed')}:</span>{' '}
                {formatCurrency(node.valorTotalExecutado)}
              </div>
            )}
          </div>
        )}
        {typeof node.percentualExecutado === 'number' && (
          <div className="mb-1">
            <span className="font-medium">{t('projectSemaphore.executedPercent')}:</span>{' '}
            {node.percentualExecutado.toFixed(2)}%
          </div>
        )}
        {typeof node.qtdDemandas === 'number' && typeof node.qtdDemandasEncerradas === 'number' && (
          <div>
            <span className="font-medium">{t('projectSemaphore.demands')}:</span>{' '}
            {t('projectSemaphore.demandsSummary', {
              total: node.qtdDemandas,
              closed: node.qtdDemandasEncerradas,
            })}
          </div>
        )}
      </>
    );

    return (
      <div key={key} className="border-b border-border/40 last:border-b-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => hasChildren && toggle(key)}
              className="w-full flex items-center gap-3 py-2.5 pr-3 text-left rounded-none hover:bg-muted/50 focus:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              aria-expanded={hasChildren ? expanded : undefined}
              aria-label={hasChildren ? (expanded ? t('projectSemaphore.collapse') : t('projectSemaphore.expand')) : undefined}
            >
              <span className="ml-2 flex items-center justify-center w-5 shrink-0">
                {hasChildren ? (
                  expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <span className="w-4" />
                )}
              </span>
              <SemaforoBadge status={node.status} size="sm" />
              {row}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
        {hasChildren && expanded && (
          <div className="pb-0">
            {[...node.children!].sort(sortByCodigo).map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getDemandaStatusLabel = (node: SemaforoNodeDTO): string => {
    const raw = node as unknown as Record<string, unknown>;
    const code = String(raw.statusDemanda ?? raw.status_demanda ?? raw.situacao ?? '').toUpperCase();
    if (!code) return '—';
    const label = t(`demands.status${code}`);
    return label ?? code;
  };

  const renderDemandaRow = (node: SemaforoNodeDTO, level: number) => {
    const key = nodeKey(node);
    const statusLabel = getDemandaStatusLabel(node);
    return (
      <div
        key={key}
        className="border-b border-border/40 last:border-b-0 bg-muted/30"
        style={{ paddingLeft: 16 + level * 20 }}
      >
        <div className="flex items-start gap-3 py-2.5 pr-3">
          <span className="mt-1.5 shrink-0">
            <SemaforoBadge status={node.status} size="sm" />
          </span>
          <div className="flex flex-col min-w-0 flex-1 gap-1">
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              <span className="text-muted-foreground text-[11px] uppercase tracking-wide shrink-0">
                {t('projectSemaphore.level.demanda')}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">·</span>
              <span className="truncate min-w-0">
                {node.codigo} — [ <span className="font-medium text-emerald-600">{statusLabel}</span> ] — {node.nome}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {typeof node.valorTotalExecutado === 'number' && (
                <span>
                  {t('projectSemaphore.totalExecuted')}:{' '}
                  <span className="font-medium text-foreground/90">{formatCurrency(node.valorTotalExecutado)}</span>
                </span>
              )}
              {typeof node.percentualExecutado === 'number' && (
                <span>
                  {t('projectSemaphore.percentOfProduct')}:{' '}
                  <span className="font-medium text-foreground/90">{node.percentualExecutado.toFixed(2)}%</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNode = (node: SemaforoNodeDTO, level: number): React.ReactNode => {
    const key = nodeKey(node);

    if (node.nivel === 'META' || node.nivel === 'PRODUTO') {
      return renderMetaOrProdutoRow(node, level, key);
    }

    if (node.nivel === 'DEMANDA') {
      return renderDemandaRow(node, level);
    }

    return null;
  };

  const metas = [...(root.children ?? [])].sort(sortByCodigo);
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      {metas.map((node) => renderNode(node, 1))}
    </div>
  );
}

export default function ProjetoSemaforoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<RouteParams>();
  const { selectedProject } = useProject();

  const projectId = useMemo(() => {
    if (params.id) {
      const idNum = Number(params.id);
      if (Number.isFinite(idNum)) return idNum;
    }
    return selectedProject?.id ?? null;
  }, [params.id, selectedProject?.id]);

  const { data, isLoading, error, execute } = useApi<SemaforoNodeDTO | null>(null, {
    showErrorToast: true,
  });

  useEffect(() => {
    if (!projectId) return;
    void execute(() => projetoService.getSemaforo(projectId));
  }, [projectId, execute]);

  useEffect(() => {
    
  }, [data]);

  useEffect(() => {
    if (!selectedProject && !params.id) {
      navigate('/dashboard');
    }
  }, [selectedProject, params.id, navigate]);

  const headerTitle = selectedProject
    ? `${selectedProject.codTed} · ${selectedProject.nome}`
    : data
      ? `${data.codigo} · ${data.nome}`
      : t('projectSemaphore.title');

  const rootStatus: SemaforoStatus | null = (data?.status ?? null) as SemaforoStatus | null;

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {rootStatus && <SemaforoBadge status={rootStatus} size="lg" />}
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-foreground">
              {t('projectSemaphore.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{headerTitle}</p>
          </div>
        </div>
        {data && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(typeof data.valorTotalPrevisto === 'number' || typeof data.valorTotalExecutado === 'number') && (
              <span className="font-medium text-foreground/90">
                {typeof data.valorTotalPrevisto === 'number' && (
                  <>{t('projectSemaphore.planned')}: {formatCurrency(data.valorTotalPrevisto)}</>
                )}
                {typeof data.valorTotalPrevisto === 'number' && typeof data.valorTotalExecutado === 'number' && ' · '}
                {typeof data.valorTotalExecutado === 'number' && (
                  <>{t('projectSemaphore.executed')}: {formatCurrency(data.valorTotalExecutado)}</>
                )}
              </span>
            )}
            {data.dataInicio && data.dataFim && (
              <span>
                <span className="font-medium">{t('projectSemaphore.period')}:</span>{' '}
                {formatDate(data.dataInicio)} &rarr; {formatDate(data.dataFim)}
              </span>
            )}
            {typeof data.percentualExecutado === 'number' && (
              <span>
                <span className="font-medium">{t('projectSemaphore.executedPercent')}:</span>{' '}
                {data.percentualExecutado.toFixed(2)}%
              </span>
            )}
            {typeof data.qtdDemandas === 'number' && typeof data.qtdDemandasEncerradas === 'number' && (
              <span>
                <span className="font-medium">{t('projectSemaphore.demands')}:</span>{' '}
                {t('projectSemaphore.demandsSummary', {
                  total: data.qtdDemandas,
                  closed: data.qtdDemandasEncerradas,
                })}
              </span>
            )}
          </div>
        )}
      </div>

      <Card className="flex-1 p-4">
        {isLoading && (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {t('common.loadingData')}
          </div>
        )}

        {!isLoading && error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && !data && (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {t('projectSemaphore.noData')}
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="border-emerald-500/70 text-emerald-700 bg-emerald-50">
                {t('projectSemaphore.legend.green')}
              </Badge>
              <Badge variant="outline" className="border-amber-500/70 text-amber-700 bg-amber-50">
                {t('projectSemaphore.legend.yellow')}
              </Badge>
              <Badge variant="outline" className="border-red-500/70 text-red-700 bg-red-50">
                {t('projectSemaphore.legend.red')}
              </Badge>
              <Badge variant="outline" className="border-gray-400/70 text-gray-700 bg-gray-50">
                {t('projectSemaphore.legend.gray')}
              </Badge>
            </div>
            <SemaforoTree root={filterTreeExcludingCancelledDemandas(data)} />
          </div>
        )}
      </Card>
    </div>
  );
}

