import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation, useNavigate } from 'react-router-dom';
import { Edit, Trash2, CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { useApi } from '@/hooks/useApi';
import { desembolsoService } from '@/services/desembolsoService';
import { useProject } from '@/contexts/ProjectContext';
import type { Desembolso, PaginatedResponse } from '@/types';

type DesembolsosListMemory = {
  search: string;
  currentPage: number;
  pageSize: number;
};

let desembolsosListMemory: DesembolsosListMemory | null = null;

export default function DesembolsosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProject } = useProject();
  const initialListState = desembolsosListMemory ?? {
    search: '',
    currentPage: 0,
    pageSize: 5,
  };
  const [desembolsos, setDesembolsos] = useState<Desembolso[]>([]);
  const [search, setSearch] = useState(initialListState.search);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDesembolso, setSelectedDesembolso] = useState<Desembolso | null>(null);
  const [currentPage, setCurrentPage] = useState(initialListState.currentPage);
  const [pageSize, setPageSize] = useState(initialListState.pageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const { isLoading, error, execute } = useApi<PaginatedResponse<Desembolso>>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const parseDateOnly = (dateStr: string) => {
    const part = String(dateStr).split('T')[0];
    const [y, m, d] = part.split('-').map(Number);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
    return new Date(y, m - 1, d);
  };

  const formatDate = (dateStr: string) =>
    format(parseDateOnly(dateStr) ?? new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const loadData = useCallback(async () => {
    if (!selectedProject) {
      setDesembolsos([]);
      setTotalPages(0);
      setTotalElements(0);
      return;
    }
    const requestedPage = currentPage;
    await execute(
      () =>
        desembolsoService.findAll({
          projetoId: selectedProject.id,
          documento: search || undefined,
          page: requestedPage,
          size: pageSize,
          sort: 'dataDesembolso,desc',
        }),
      {
        onSuccess: (data) => {
          setDesembolsos(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      },
    );
  }, [execute, search, currentPage, pageSize, selectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    desembolsosListMemory = {
      search,
      currentPage,
      pageSize,
    };
  }, [search, currentPage, pageSize]);

  const handleAdd = () => {
    if (!selectedProject) return;
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/cadastros/desembolsos/novo?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleEdit = (item: Desembolso) => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/cadastros/desembolsos/${item.id}/editar?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleDelete = (item: Desembolso) => {
    setSelectedDesembolso(item);
    setIsDeleteOpen(true);
  };

  const columns: Column<Desembolso>[] = useMemo(
    () => [
      {
        key: 'documento',
        label: t('disbursements.document'),
        render: (d) => d.documento || '—',
      },
      {
        key: 'valorPrevisto',
        label: t('disbursements.plannedValue'),
        render: (d) => formatCurrency(d.valorPrevisto),
        hideOnMobile: true,
      },
      {
        key: 'valor',
        label: t('disbursements.actualValue'),
        render: (d) => formatCurrency(d.valor),
        hideOnMobile: true,
      },
      {
        key: 'dataPrevistaDesembolso',
        label: t('disbursements.plannedDate'),
        render: (d) => formatDate(d.dataPrevistaDesembolso),
        hideOnMobile: true,
      },
      {
        key: 'dataDesembolso',
        label: t('disbursements.disbursementDate'),
        render: (d) => formatDate(d.dataDesembolso),
        hideOnMobile: false,
      },
    ],
    [t],
  );

  const actions: Action<Desembolso>[] = useMemo(
    () => [
      {
        label: t('common.edit'),
        icon: <Edit className="h-4 w-4" />,
        onClick: handleEdit,
      },
      {
        label: t('common.delete'),
        icon: <Trash2 className="h-4 w-4" />,
        onClick: handleDelete,
        variant: 'destructive',
        separator: true,
      },
    ],
    [t],
  );

  const handleConfirmDelete = async () => {
    if (!selectedDesembolso) return;
    setIsDeleting(true);
    try {
      await desembolsoService.delete(selectedDesembolso.id);
      setIsDeleteOpen(false);
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('disbursements.title')}
          description={t('disbursements.description')}
        />
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadData}
          retryText={t('common.retry')}
        />
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('disbursements.title')}
          description={t('disbursements.description')}
        />
        <EmptyState
          title={t('projectMeta.selectProjectFirst')}
          description={t('projectMeta.selectProjectDescription')}
          icon={<CircleDollarSign className="h-6 w-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  const paginatedDesembolsos = desembolsos;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('disbursements.title')}
        description={t('disbursements.description')}
        onAdd={handleAdd}
        addLabel={t('disbursements.new')}
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(0);
        }}
        searchPlaceholder={t('disbursements.searchPlaceholder')}
        onRefresh={loadData}
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : paginatedDesembolsos.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description={t('disbursements.noResults')}
          icon={<CircleDollarSign className="h-6 w-6 text-muted-foreground" />}
          action={<Button onClick={handleAdd}>{t('disbursements.new')}</Button>}
        />
      ) : (
        <>
          <DataTable<Desembolso> data={paginatedDesembolsos} columns={columns} actions={actions} />
          <TablePagination
            currentPage={currentPage + 1}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalElements}
            onPageChange={(p) => setCurrentPage(p - 1)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(0);
            }}
          />
        </>
      )}

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeaderStandard
            title={t('common.deleteConfirmTitle')}
            description={t('common.deleteConfirmDescription')}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </Button>
            <LoadingButton
              type="button"
              variant="destructive"
              isLoading={isDeleting}
              onClick={handleConfirmDelete}
            >
              {t('common.delete')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

