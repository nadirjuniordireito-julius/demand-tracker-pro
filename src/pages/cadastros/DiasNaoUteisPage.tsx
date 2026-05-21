import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, CalendarOff, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PageHeader, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { DiaNaoUtilFormModal } from '@/components/cadastros/DiaNaoUtilFormModal';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import { cn } from '@/lib/utils';
import { diaNaoUtilService } from '@/services/diaNaoUtilService';
import type { DiaNaoUtil, PaginatedResponse } from '@/types';

const currentYear = new Date().getFullYear();

function parseDateOnly(dateStr: string): Date | undefined {
  const part = String(dateStr).split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

function toIsoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

type DiasNaoUteisListMemory = {
  dataInicio: string;
  dataFim: string;
  currentPage: number;
  pageSize: number;
};

let diasNaoUteisListMemory: DiasNaoUteisListMemory | null = null;

export default function DiasNaoUteisPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const initial = diasNaoUteisListMemory ?? {
    dataInicio: `${currentYear}-01-01`,
    dataFim: `${currentYear}-12-31`,
    currentPage: 0,
    pageSize: 10,
  };

  const [items, setItems] = useState<DiaNaoUtil[]>([]);
  const [dataInicio, setDataInicio] = useState(initial.dataInicio);
  const [dataFim, setDataFim] = useState(initial.dataFim);
  const [filterInicioDate, setFilterInicioDate] = useState<Date | undefined>(
    parseDateOnly(initial.dataInicio),
  );
  const [filterFimDate, setFilterFimDate] = useState<Date | undefined>(
    parseDateOnly(initial.dataFim),
  );
  const [currentPage, setCurrentPage] = useState(initial.currentPage);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<DiaNaoUtil | null>(null);

  const { isLoading, error, execute } = useApi<PaginatedResponse<DiaNaoUtil>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateStr: string) =>
    format(parseDateOnly(dateStr) ?? new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const loadData = useCallback(async () => {
    const requestedPage = currentPage;
    await execute(
      () =>
        diaNaoUtilService.findAll({
          dataInicio,
          dataFim,
          page: requestedPage,
          size: pageSize,
          sort: 'data,asc',
        }),
      {
        onSuccess: (data) => {
          setItems(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      },
    );
  }, [execute, dataInicio, dataFim, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    diasNaoUteisListMemory = {
      dataInicio,
      dataFim,
      currentPage,
      pageSize,
    };
  }, [dataInicio, dataFim, currentPage, pageSize]);

  const applyDateFilters = () => {
    if (!filterInicioDate || !filterFimDate) return;
    if (filterFimDate < filterInicioDate) {
      toast({
        title: t('common.error'),
        description: t('diasNaoUteis.invalidDateRange'),
        variant: 'destructive',
      });
      return;
    }
    setDataInicio(toIsoDate(filterInicioDate));
    setDataFim(toIsoDate(filterFimDate));
    setCurrentPage(0);
  };

  const handleAdd = () => {
    setSelected(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row: DiaNaoUtil) => {
    setSelected(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row: DiaNaoUtil) => {
    setSelected(row);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (payload: { data: string; descricao: string }) => {
    setIsSaving(true);
    try {
      if (selected) {
        await diaNaoUtilService.update(selected.id, payload);
        toast({
          title: t('common.success'),
          description: t('diasNaoUteis.updatedSuccess'),
        });
      } else {
        await diaNaoUtilService.create(payload);
        toast({
          title: t('common.success'),
          description: t('diasNaoUteis.createdSuccess'),
        });
      }
      setIsFormOpen(false);
      setSelected(null);
      loadData();
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('diasNaoUteis.saveError')),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selected) return;
    setIsDeleting(true);
    try {
      await diaNaoUtilService.delete(selected.id);
      setIsDeleteOpen(false);
      setSelected(null);
      loadData();
      toast({
        title: t('common.success'),
        description: t('diasNaoUteis.deletedSuccess'),
      });
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('diasNaoUteis.deleteError')),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<DiaNaoUtil>[] = useMemo(
    () => [
      {
        key: 'data',
        label: t('diasNaoUteis.colDate'),
        render: (row) => formatDate(row.data),
        minWidth: '110px',
      },
      {
        key: 'descricao',
        label: t('diasNaoUteis.colDescription'),
        render: (row) => row.descricao,
      },
    ],
    [t],
  );

  const actions: Action<DiaNaoUtil>[] = useMemo(
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

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('diasNaoUteis.title')}
          description={t('diasNaoUteis.description')}
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('diasNaoUteis.title')}
        description={t('diasNaoUteis.description')}
        onAdd={handleAdd}
        addLabel={t('diasNaoUteis.new')}
      />

      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-2">
          <Label>{t('diasNaoUteis.filterStart')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full min-w-[200px] justify-start text-left font-normal',
                  !filterInicioDate && 'text-muted-foreground',
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {filterInicioDate
                  ? format(filterInicioDate, 'dd/MM/yyyy', { locale: ptBR })
                  : t('common.select')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filterInicioDate}
                onSelect={setFilterInicioDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>{t('diasNaoUteis.filterEnd')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full min-w-[200px] justify-start text-left font-normal',
                  !filterFimDate && 'text-muted-foreground',
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {filterFimDate
                  ? format(filterFimDate, 'dd/MM/yyyy', { locale: ptBR })
                  : t('common.select')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filterFimDate}
                onSelect={setFilterFimDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={applyDateFilters}>
            {t('common.filter')}
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={loadData} title={t('common.refresh')}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={2} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description={t('diasNaoUteis.noResults')}
          icon={<CalendarOff className="h-6 w-6 text-muted-foreground" />}
          action={<Button onClick={handleAdd}>{t('diasNaoUteis.new')}</Button>}
        />
      ) : (
        <>
          <DataTable data={items} columns={columns} actions={actions} actionsLabel={t('common.actions')} />
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

      <DiaNaoUtilFormModal
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelected(null);
        }}
        item={selected}
        onSubmit={handleFormSubmit}
        saving={isSaving}
      />

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeaderStandard
            title={t('common.confirmDelete')}
            description={t('diasNaoUteis.deleteConfirm', {
              data: selected ? formatDate(selected.data) : '',
              descricao: selected?.descricao ?? '',
            })}
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
