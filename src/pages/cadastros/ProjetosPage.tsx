import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Edit, 
  Trash2, 
  FolderKanban,
  Calendar,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { projetoSchema, type ProjetoFormData } from '@/lib/validations';
import { projetoService } from '@/services/projetoService';
import { useAuth } from '@/contexts/AuthContext';
import { useProcessing } from '@/contexts/ProcessingContext';
import { ProjectDocumentsModal } from '@/components/project/ProjectDocumentsModal';
import type { Projeto, PaginatedResponse } from '@/types';

export default function ProjetosPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { withProcessing } = useProcessing();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [selectedProjetoForDocs, setSelectedProjetoForDocs] = useState<Projeto | null>(null);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<Projeto>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<ProjetoFormData>({
    resolver: zodResolver(projetoSchema),
    defaultValues: { nome: '', codTed: '', termoInicial: undefined, termoFinal: undefined, dataEfetivaInicio: undefined },
  });

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    const requestedPage = currentPage;
    await execute(
      () => projetoService.findAll({ 
        nome: search || undefined,
        page: requestedPage + 1, // Backend espera 1-based
        size: pageSize 
      }),
      {
        onSuccess: (data) => {
          setProjetos(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      }
    );
  }, [execute, search, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paginatedProjetos = projetos;

  // Evita deslocamento de timezone: "2025-01-15" sem hora é interpretado como UTC meia-noite,
  // o que em fusos como Brasil (UTC-3) exibe o dia anterior. Parse como data local.
  const parseDateOnly = (dateStr: string) => {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const formatDate = (dateStr: string) => format(parseDateOnly(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const handleAdd = () => {
    setSelectedProjeto(null);
    form.reset({ nome: '', codTed: '', termoInicial: undefined, termoFinal: undefined, dataEfetivaInicio: undefined });
    setIsFormOpen(true);
  };

  const handleEdit = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    form.reset({
      nome: projeto.nome,
      codTed: projeto.codTed,
      termoInicial: parseDateOnly(projeto.termoInicial),
      termoFinal: parseDateOnly(projeto.termoFinal),
      dataEfetivaInicio: projeto.dataEfetivaInicio ? parseDateOnly(projeto.dataEfetivaInicio) : undefined,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    setIsDeleteOpen(true);
  };

  // Definição das colunas da tabela
  const columns: Column<Projeto>[] = useMemo(() => [
    {
      key: 'nome',
      label: t('projects.name'),
    },
    {
      key: 'codTed',
      label: t('projects.codeTed'),
      hideOnMobile: true,
    },
    {
      key: 'termoInicial',
      label: t('projects.startDate'),
      render: (projeto) => formatDate(projeto.termoInicial),
      hideOnMobile: true,
    },
    {
      key: 'termoFinal',
      label: t('projects.endDate'),
      render: (projeto) => formatDate(projeto.termoFinal),
      hideOnMobile: true,
    },
    {
      key: 'dataEfetivaInicio',
      label: t('projects.effectiveStartDate'),
      render: (projeto) => projeto.dataEfetivaInicio ? formatDate(projeto.dataEfetivaInicio) : '—',
      hideOnMobile: true,
    },
  ], [t]);

  const handleDocuments = (projeto: Projeto) => {
    setSelectedProjetoForDocs(projeto);
    setDocumentsModalOpen(true);
  };

  // Definição das ações da tabela
  const actions: Action<Projeto>[] = useMemo(() => [
    {
      label: t('common.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
    },
    {
      label: t('projects.documents.label'),
      icon: <FileText className="h-4 w-4" />,
      onClick: handleDocuments,
    },
    {
      label: t('common.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive',
      separator: true,
    },
  ], [t, handleEdit, handleDelete, handleDocuments]);

  const onSubmit = async (data: ProjetoFormData) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await withProcessing(async () => {
        const payload = {
          nome: data.nome,
          codTed: data.codTed,
          termoInicial: data.termoInicial.toISOString().split('T')[0],
          termoFinal: data.termoFinal.toISOString().split('T')[0],
          ...(data.dataEfetivaInicio && {
            dataEfetivaInicio: data.dataEfetivaInicio.toISOString().split('T')[0],
          }),
        };
        if (selectedProjeto) {
          await projetoService.update(selectedProjeto.id, payload);
        } else {
          await projetoService.create({
            ...payload,
            usuarioId: user.id,
          });
        }
        setIsFormOpen(false);
        form.reset();
        await loadData();
      }, t('common.saving'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProjeto) return;
    
    setIsDeleting(true);
    try {
      await withProcessing(async () => {
        await projetoService.delete(selectedProjeto!.id);
        setIsDeleteOpen(false);
        await loadData();
      }, t('common.deleting'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Estado de erro
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('projects.title')} description={t('common.manageProjects')} />
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
        title={t('projects.title')} 
        description={t('common.manageProjects')} 
        onAdd={handleAdd} 
        addLabel={t('projects.newProject')} 
      />
      
      <SearchFilterBar 
        searchValue={search} 
        onSearchChange={(v) => { setSearch(v); setCurrentPage(0); }} 
        searchPlaceholder={t('common.searchByNameOrCode')} 
        onRefresh={loadData} 
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : paginatedProjetos.length === 0 ? (
        <EmptyState 
          title={t('common.noResults')} 
          description={t('common.noProjectsFound')} 
          icon={<FolderKanban className="h-6 w-6 text-muted-foreground" />} 
          action={<Button onClick={handleAdd}>{t('projects.newProject')}</Button>} 
        />
      ) : (
        <>
          <DataTable
            data={paginatedProjetos}
            columns={columns}
            actions={actions}
            actionsLabel={t('common.actions')}
          />
          <TablePagination 
            currentPage={currentPage + 1} 
            totalPages={totalPages} 
            pageSize={pageSize} 
            totalItems={totalElements} 
            onPageChange={(p) => setCurrentPage(p - 1)} 
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(0); }} 
          />
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedProjeto ? t('projects.editProject') : t('projects.newProject')}</DialogTitle>
            <DialogDescription>
              {selectedProjeto ? t('common.editProject') : t('common.fillProject')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField 
                control={form.control} 
                name="nome" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projects.name')} *</FormLabel>
                    <FormControl><Input placeholder={t('common.projectNamePlaceholder')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <FormField 
                control={form.control} 
                name="codTed" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projects.codeTed')} *</FormLabel>
                    <FormControl><Input placeholder={t('common.tedCodePlaceholder')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  control={form.control} 
                  name="termoInicial" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('projects.startDate')} *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button 
                              variant="outline" 
                              className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "dd/MM/yyyy") : t('common.select')}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent 
                            mode="single" 
                            selected={field.value} 
                            onSelect={field.onChange} 
                            defaultMonth={field.value ?? new Date()}
                            initialFocus 
                            className="pointer-events-auto" 
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={form.control} 
                  name="termoFinal" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('projects.endDate')} *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button 
                              variant="outline" 
                              className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "dd/MM/yyyy") : t('common.select')}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent 
                            mode="single" 
                            selected={field.value} 
                            onSelect={field.onChange} 
                            defaultMonth={field.value ?? new Date()}
                            initialFocus 
                            className="pointer-events-auto" 
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </div>
              <FormField 
                control={form.control} 
                name="dataEfetivaInicio" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projects.effectiveStartDate')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button 
                            variant="outline" 
                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd/MM/yyyy") : t('common.select')}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent 
                          mode="single" 
                          selected={field.value ?? undefined} 
                          onSelect={field.onChange} 
                          defaultMonth={field.value ?? new Date()}
                          initialFocus 
                          className="pointer-events-auto" 
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                  {t('common.cancel')}
                </Button>
                <LoadingButton type="submit" isLoading={isSaving} loadingText={t('common.saving')}>
                  {t('common.save')}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('projects.deleteConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
              {t('common.cancel')}
            </Button>
            <LoadingButton 
              variant="destructive" 
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              loadingText={t('common.deleting')}
            >
              {t('common.delete')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documents Modal */}
      <ProjectDocumentsModal
        open={documentsModalOpen}
        onOpenChange={setDocumentsModalOpen}
        projeto={selectedProjetoForDocs}
      />
    </div>
  );
}
