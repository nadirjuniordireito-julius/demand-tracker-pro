import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Edit,
  CalendarClock,
  PlayCircle,
  Ban,
  CheckCircle2,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState } from '@/components/common/LoadingStates';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useApi } from '@/hooks/useApi';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { demandaService } from '@/services/demandaService';
import { demandaExecucaoService } from '../services/demandaExecucaoService';
import { useProject } from '@/contexts/ProjectContext';
import type { DemandaTecnica, PaginatedResponse } from '@/types';

/** Largura do container abaixo da qual Descrição some e Status fica só com ícone. */
const TABLE_COMPACT_MAX_WIDTH = 1100;
const SEARCH_DEBOUNCE_MS = 400;

const EXECUCAO_STATUS_CONFIG: Record<
  string,
  { icon: typeof CalendarClock; badgeClass: string }
> = {
  PLANEJADA: {
    icon: CalendarClock,
    badgeClass: 'border-transparent bg-muted text-muted-foreground',
  },
  EM_ANDAMENTO: {
    icon: PlayCircle,
    badgeClass: 'border-transparent bg-info text-info-foreground',
  },
  BLOQUEADA: {
    icon: Ban,
    badgeClass: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  CONCLUIDA: {
    icon: CheckCircle2,
    badgeClass: 'border-transparent bg-success text-success-foreground',
  },
};

function ExecucaoStatusBadge({
  status,
  t,
  compact,
}: {
  status: string | null | undefined;
  t: TFunction;
  compact: boolean;
}) {
  const label = status
    ? t(`execucao.execucaoStatus.${status}`, status)
    : '—';

  const config = status
    ? (EXECUCAO_STATUS_CONFIG[status] ?? { icon: Minus, badgeClass: '' })
    : { icon: Minus, badgeClass: 'text-muted-foreground' };
  const Icon = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'whitespace-nowrap font-normal',
        compact ? 'gap-0 px-2' : 'gap-1.5',
        !status && 'text-muted-foreground',
        config.badgeClass,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {compact ? <span className="sr-only">{label}</span> : label}
    </Badge>
  );

  if (!compact) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">{badge}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-sm">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function ExecucaoDemandasListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [demandas, setDemandas] = useState<DemandaTecnica[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [execucaoStatusByDemandaId, setExecucaoStatusByDemandaId] = useState<Record<number, string | null>>({});
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [tableContainerRef, tableContainerSize] = useResizeObserver<HTMLDivElement>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const keepSearchFocusRef = useRef(false);
  const isCompact =
    tableContainerSize.width > 0 && tableContainerSize.width < TABLE_COMPACT_MAX_WIDTH;

  const { isLoading, error, execute } = useApi<PaginatedResponse<DemandaTecnica>>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadExecucaoStatuses = useCallback(async (demandaIds: number[]) => {
    if (demandaIds.length === 0) {
      setExecucaoStatusByDemandaId({});
      return;
    }
    const entries = await Promise.all(
      demandaIds.map(async (demandaId) => {
        const execucao = await demandaExecucaoService.getByDemandaId(demandaId);
        return [demandaId, execucao?.status ?? null] as const;
      })
    );
    setExecucaoStatusByDemandaId(Object.fromEntries(entries));
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    const requestedPage = currentPage;
    const shouldRestoreFocus = keepSearchFocusRef.current;
    await execute(
      () =>
        demandaService.findAll({
          status: 'E',
          projetoId: selectedProject.id,
          codigo: debouncedSearch.trim() || undefined,
          page: requestedPage + 1,
          size: pageSize,
          sort: 'codigo,asc',
        }),
      {
        onSuccess: (data) => {
          setDemandas(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
          setHasLoadedOnce(true);
          void loadExecucaoStatuses(data.content.map((d) => d.id));
        },
      }
    );
    if (shouldRestoreFocus) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      });
      keepSearchFocusRef.current = false;
    }
  }, [execute, selectedProject, currentPage, pageSize, debouncedSearch, loadExecucaoStatuses]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchChange = useCallback((value: string) => {
    keepSearchFocusRef.current = true;
    setSearch(value);
  }, []);

  const handleRefresh = useCallback(() => {
    keepSearchFocusRef.current = document.activeElement === searchInputRef.current;
    void loadData();
  }, [loadData]);

  const columns: Column<DemandaTecnica>[] = useMemo(() => {
    const cols: Column<DemandaTecnica>[] = [
      {
        key: 'acoes',
        label: t('common.actions'),
        minWidth: '70px',
        className: 'text-center',
        render: (row) => (
          <div className="flex justify-center">
            <Button
              variant="link"
              className="h-auto p-0 text-[navy]"
              onClick={() => navigate(`/execucao-demandas/${row.id}`)}
              aria-label={t('execucao.manageExecution', 'Gerenciar Execução')}
              title={t('execucao.manageExecution', 'Gerenciar Execução')}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
      {
        key: 'produto',
        label: t('projectProducts.title', 'Prod'),
        minWidth: '40px',
        render: (row) => row.metaProduto?.codigo ?? '—',
      },
      {
        key: 'codigo',
        label: t('common.demandCodeLabel', 'Demanda'),
        minWidth: '100px',
        render: (row) => <span className="font-bold text-[navy]">{row.codigo}</span>,
      },
      {
        key: 'nome',
        label: t('demands.name', 'Nome'),
        minWidth: '200px',
        render: (row) => <TruncatedTextCell value={row.nome} />,
      },
    ];

    if (!isCompact) {
      cols.push({
        key: 'descricao',
        label: t('execucao.description', 'Descrição'),
        minWidth: '200px',
        render: (row) => <TruncatedTextCell value={row.descricao || row.nome} />,
      });
    }

    cols.push({
      key: 'execucaoStatus',
      label: t('execucao.status', 'Status'),
      minWidth: isCompact ? '72px' : '140px',
      render: (row) => (
        <ExecucaoStatusBadge
          status={execucaoStatusByDemandaId[row.id]}
          t={t}
          compact={isCompact}
        />
      ),
    });

    return cols;
  }, [t, navigate, isCompact, execucaoStatusByDemandaId]);

  if (!selectedProject) {
    return (
      <EmptyState
        title={t('execucao.selectProject', 'Selecione um projeto')}
        description={t('execucao.selectProjectDescription', 'Selecione um projeto no menu para listar as demandas em execução.')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('execucao.title')}
      />

      {hasLoadedOnce && (
        <SearchFilterBar
          searchValue={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder={t('demands.searchByCode')}
          onRefresh={handleRefresh}
          inputRef={searchInputRef}
        />
      )}

      {error && <ErrorState title={t('common.errorTitle')} message={error} onRetry={handleRefresh} />}
      {!error && isLoading && <TableSkeleton rows={5} columns={isCompact ? 5 : 6} />}
      {!error && !isLoading && demandas.length === 0 && (
        <EmptyState
          title={t('common.noResults')}
          description={t('execucao.noResults')}
          icon={<FileText className="h-6 w-6 text-muted-foreground" />}
        />
      )}
      {!error && !isLoading && demandas.length > 0 && (
        <>
          <div ref={tableContainerRef} className="w-full min-w-0">
            <DataTable
              data={demandas}
              columns={columns}
              getRowId={(row) => row.id}
            />
          </div>
          <TablePagination
            currentPage={currentPage + 1}
            totalPages={totalPages}
            totalItems={totalElements}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p - 1)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(0);
            }}
          />
        </>
      )}
    </div>
  );
}

const TEXT_PREVIEW_MAX = 40;

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

function TruncatedTextCell({ value }: { value: string | null | undefined }) {
  const full = value ? stripHtml(value) : '';
  if (!full) return <>{'—'}</>;

  const preview = full.length > TEXT_PREVIEW_MAX ? `${full.slice(0, TEXT_PREVIEW_MAX)}...` : full;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default">{preview}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[min(420px,80vw)] whitespace-pre-wrap break-words text-sm">
        {full}
      </TooltipContent>
    </Tooltip>
  );
}
