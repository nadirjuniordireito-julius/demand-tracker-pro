import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState } from '@/components/common/LoadingStates';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useApi } from '@/hooks/useApi';
import { demandaService } from '@/services/demandaService';
import { useProject } from '@/contexts/ProjectContext';
import type { DemandaTecnica, PaginatedResponse } from '@/types';

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

  const { isLoading, error, execute } = useApi<PaginatedResponse<DemandaTecnica>>(null);

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
        },
      }
    );
  }, [execute, selectedProject, currentPage, pageSize, search]);

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
      key: 'meta',
      label: t('demands.metaCodeLabel', 'Meta'),
      minWidth: '90px',
      render: (row) => row.metaProduto?.projetoMeta?.codigo ?? '—',
    },
    {
      key: 'produto',
      label: t('projectProducts.title', 'Produto'),
      minWidth: '100px',
      render: (row) => row.metaProduto?.codigo ?? '—',
    },
    { key: 'codigo', label: t('demands.code'), minWidth: '100px' },
    {
      key: 'descricao',
      label: t('execucao.description', 'Descrição'),
      minWidth: '200px',
      render: (row) => (row.descricao ? stripHtml(row.descricao).slice(0, 80) + (stripHtml(row.descricao).length > 80 ? '...' : '') : row.nome ?? '—'),
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
      {!error && isLoading && <TableSkeleton rows={5} columns={4} />}
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
