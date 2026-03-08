import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, Calendar, CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { cn } from '@/lib/utils';
import { desembolsoSchema, type DesembolsoFormData } from '@/lib/validations';
import { useApi } from '@/hooks/useApi';
import { desembolsoService } from '@/services/desembolsoService';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import type { Desembolso, PaginatedResponse } from '@/types';

export default function DesembolsosPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const [desembolsos, setDesembolsos] = useState<Desembolso[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDesembolso, setSelectedDesembolso] = useState<Desembolso | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const { isLoading, error, execute } = useApi<PaginatedResponse<Desembolso>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<DesembolsoFormData>({
    resolver: zodResolver(desembolsoSchema),
    defaultValues: {
      documento: '',
      valorPrevisto: 0,
      valor: 0,
      dataDesembolso: new Date(),
      dataPrevistaDesembolso: new Date(),
    },
  });

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

  const handleAdd = () => {
    if (!selectedProject) return;
    setSelectedDesembolso(null);
    const today = new Date();
    form.reset({
      documento: '',
      valorPrevisto: 0,
      valor: 0,
      dataDesembolso: today,
      dataPrevistaDesembolso: today,
    });
    setIsFormOpen(true);
  };

  const handleEdit = (item: Desembolso) => {
    setSelectedDesembolso(item);
    form.reset({
      documento: item.documento ?? '',
      valorPrevisto: item.valorPrevisto,
      valor: item.valor,
      dataDesembolso: parseDateOnly(item.dataDesembolso) ?? new Date(item.dataDesembolso),
      dataPrevistaDesembolso:
        parseDateOnly(item.dataPrevistaDesembolso) ?? new Date(item.dataPrevistaDesembolso),
    });
    setIsFormOpen(true);
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

  const onSubmit = async (data: DesembolsoFormData) => {
    if (!user || !selectedProject) return;
    setIsSaving(true);
    try {
      const payloadBase = {
        documento: data.documento?.trim() || undefined,
        valorPrevisto: data.valorPrevisto,
        valor: data.valor,
        dataDesembolso: data.dataDesembolso.toISOString().split('T')[0],
        dataPrevistaDesembolso: data.dataPrevistaDesembolso.toISOString().split('T')[0],
      };

      if (selectedDesembolso) {
        await desembolsoService.update(selectedDesembolso.id, {
          ...payloadBase,
          projetoId: selectedProject.id,
        });
      } else {
        await desembolsoService.create({
          ...payloadBase,
          projetoId: selectedProject.id,
        });
      }

      setIsFormOpen(false);
      form.reset();
      loadData();
    } finally {
      setIsSaving(false);
    }
  };

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

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeaderStandard
            title={
              selectedDesembolso ? t('disbursements.editTitle') : t('disbursements.new')
            }
            description={t('common.fillInformation')}
          />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="documento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('disbursements.document')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valorPrevisto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('disbursements.plannedValue')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? undefined : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('disbursements.actualValue')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? undefined : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dataPrevistaDesembolso"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('disbursements.plannedDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                              ) : (
                                <span>{t('common.selectDate')}</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataDesembolso"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('disbursements.disbursementDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                              ) : (
                                <span>{t('common.selectDate')}</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                >
                  {t('common.cancel')}
                </Button>
                <LoadingButton type="submit" isLoading={isSaving}>
                  {t('common.save')}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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

