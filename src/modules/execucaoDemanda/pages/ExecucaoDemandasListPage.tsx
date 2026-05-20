import { useState, useCallback, useEffect } from 'react';
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
import { cn } from '@/lib/utils';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState } from '@/components/common/LoadingStates';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useApi } from '@/hooks/useApi';
import { demandaService } from '@/services/demandaService';
import { demandaExecucaoService } from '../services/demandaExecucaoService';
import { useProject } from '@/contexts/ProjectContext';
import type { DemandaTecnica, PaginatedResponse } from '@/types';

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
}: {
  status: string | null | undefined;
  t: TFunction;
}) {
  if (!status) {
    return (
      <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
        <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden />
        —
      </Badge>
    );
  }

  const config = EXECUCAO_STATUS_CONFIG[status] ?? {
    icon: Minus,
    badgeClass: '',
  };
  const Icon = config.icon;
  const label = t(`execucao.execucaoStatus.${status}`, status);

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-normal', config.badgeClass)}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </Badge>
  );
}

export default function ExecucaoDemandasListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [demandas, setDemandas] = useState<DemandaTecnica[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [execucaoStatusByDemandaId, setExecucaoStatusByDemandaId] = useState<Record<number, string | null>>({});

  const { isLoading, error, execute } = useApi<PaginatedResponse<DemandaTecnica>>(null);

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
    await execute(
      () =>
        demandaService.findAll({
          status: 'E',
          projetoId: selectedProject.id,
          codigo: search.trim() || undefined,
          page: requestedPage + 1,
          size: pageSize,
          sort: 'codigo,asc',
        }),
      {
        onSuccess: (data) => {
          setDemandas(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
          void loadExecucaoStatuses(data.content.map((d) => d.id));
        },
      }
    );
  }, [execute, selectedProject, currentPage, pageSize, search, loadExecucaoStatuses]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns: Column<DemandaTecnica>[] = [
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
      label: t('projectProducts.title', 'Produto'),
      minWidth: '100px',
      render: (row) => row.metaProduto?.codigo ?? '—',
    },
    {
      key: 'codigo',
      label: t('common.demandCodeLabel', 'Demanda'),
      minWidth: '100px',
      render: (row) => row.codigo,
    },
    {
      key: 'descricao',
      label: t('execucao.description', 'Descrição'),
      minWidth: '200px',
      render: (row) =>
        row.descricao
          ? stripHtml(row.descricao).slice(0, 80) +
            (stripHtml(row.descricao).length > 80 ? '...' : '')
          : (row.nome ?? '—'),
    },
    {
      key: 'execucaoStatus',
      label: t('execucao.status', 'Status'),
      minWidth: '140px',
      render: (row) => (
        <ExecucaoStatusBadge status={execucaoStatusByDemandaId[row.id]} t={t} />
      ),
    },
  ];

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
      
      { demandas.length <= 0 && (
        <>
        <EmptyState
          title={t('common.noResults')}
          description={t('execucao.noResults')}
          icon={<FileText className="h-6 w-6 text-muted-foreground" />}
        />
        </>
     ) }

      {error && <ErrorState title={t('common.errorTitle')} message={error} onRetry={loadData} />}
      {!error && isLoading && <TableSkeleton rows={5} columns={5} />}
      {!error && !isLoading && demandas.length > 0 && (
        <>
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('demands.searchByCode')}
          onRefresh={loadData}
        />
        <DataTable
            data={demandas}
            columns={columns}
            getRowId={(row) => row.id}
          />
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

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}
