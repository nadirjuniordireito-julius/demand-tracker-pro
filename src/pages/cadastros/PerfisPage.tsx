import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, UserCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { cn } from '@/lib/utils';
import { perfilSchema, type PerfilFormData } from '@/lib/validations';
import { useApi } from '@/hooks/useApi';
import { perfilService } from '@/services/perfilService';
import { projetoService } from '@/services/projetoService';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import type { Perfil, PaginatedResponse } from '@/types';

export default function PerfisPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState<Perfil | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<Perfil>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { nome: '', termoInicial: undefined, termoFinal: undefined, valor: 0 }
  });

  // Carrega dados iniciais - filtra apenas perfis do projeto selecionado
  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    const requestedPage = currentPage;
    // Backend espera página 1-based (1 = primeira, 2 = segunda)
    const pageParam = requestedPage + 1;
    await execute(
      () => perfilService.findAll({ 
        nome: search || undefined,
        projetoId: selectedProject.id,
        page: pageParam,
        size: pageSize 
      }),
      {
        onSuccess: (data) => {
          setPerfis(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      }
    );
  }, [execute, search, currentPage, pageSize, selectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paginatedPerfis = perfis;

  // Mesmo parse da ProjetosPage: evita deslocamento de timezone (ISO sem hora = UTC meia-noite)
  const parseDateOnly = (dateStr: string) => {
    const part = String(dateStr).split('T')[0];
    const [y, m, d] = part.split('-').map(Number);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
    return new Date(y, m - 1, d);
  };

  const formatDate = (dateStr: string) => format(parseDateOnly(dateStr) ?? new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAdd = async () => {
    if (!selectedProject) return;
    setSelectedPerfil(null);
    // Busca o registro do projeto na API para usar exatamente as constantes termoInicial e termoFinal da tabela Projeto
    let termoInicial: Date | undefined;
    let termoFinal: Date | undefined;
    try {
      const projeto = await projetoService.findById(selectedProject.id);
      // Backend pode retornar camelCase (termoInicial) ou snake_case (termo_inicial)
      const raw = projeto as unknown as Record<string, unknown>;
      const ti = raw.termoInicial ?? raw.termo_inicial;
      const tf = raw.termoFinal ?? raw.termo_final;
      if (ti) termoInicial = parseDateOnly(String(ti));
      if (tf) termoFinal = parseDateOnly(String(tf));
    } catch {
      // Fallback: contexto (evitar datas de outro projeto ou desatualizadas)
      const ti = selectedProject.termoInicial;
      const tf = selectedProject.termoFinal;
      if (ti) termoInicial = parseDateOnly(ti);
      if (tf) termoFinal = parseDateOnly(tf);
    }
    form.reset({ nome: '', termoInicial: termoInicial ?? undefined, termoFinal: termoFinal ?? undefined, valor: 0 });
    setIsFormOpen(true);
  };

  const handleEdit = (perfil: Perfil) => {
    setSelectedPerfil(perfil);
    // No modo de edição, mantém as datas originais do perfil
    form.reset({
      nome: perfil.nome,
      termoInicial: new Date(perfil.termoInicial),
      termoFinal: new Date(perfil.termoFinal),
      valor: perfil.valor
    });
    setIsFormOpen(true);
  };

  const handleDelete = (perfil: Perfil) => {
    setSelectedPerfil(perfil);
    setIsDeleteOpen(true);
  };

  // Definição das colunas da tabela
  const columns: Column<Perfil>[] = useMemo(() => [
    {
      key: 'nome',
      label: t('profiles.name'),
    },
    {
      key: 'valor',
      label: t('planningTerm.hourlyRate'),
      render: (perfil) => perfil.valor ? formatCurrency(perfil.valor) : '-',
      hideOnMobile: true,
    },
    {
      key: 'termoInicial',
      label: t('profiles.startDate'),
      render: (perfil) => formatDate(perfil.termoInicial),
      hideOnMobile: true,
    },
    {
      key: 'termoFinal',
      label: t('profiles.endDate'),
      render: (perfil) => formatDate(perfil.termoFinal),
      hideOnMobile: true,
    },
  ], [t]);

  // Definição das ações da tabela
  const actions: Action<Perfil>[] = useMemo(() => [
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
  ], [t, handleEdit, handleDelete]);

  const onSubmit = async (data: PerfilFormData) => {
    if (!user || !selectedProject) return;
    
    setIsSaving(true);
    try {
      if (selectedPerfil) {
        await perfilService.update(selectedPerfil.id, {
          nome: data.nome,
          termoInicial: data.termoInicial.toISOString().split('T')[0],
          termoFinal: data.termoFinal.toISOString().split('T')[0],
          valor: data.valor,
          projetoId: selectedProject.id,
        });
      } else {
        await perfilService.create({
          nome: data.nome,
          termoInicial: data.termoInicial.toISOString().split('T')[0],
          termoFinal: data.termoFinal.toISOString().split('T')[0],
          valor: data.valor,
          usuarioId: user.id,
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
    if (!selectedPerfil) return;
    
    setIsDeleting(true);
    try {
      await perfilService.delete(selectedPerfil.id);
      setIsDeleteOpen(false);
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  // Estado de erro
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('profiles.title')} description={t('common.manageProfiles')} />
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
        title={t('profiles.title')} 
          description={t('common.manageProfiles')}
        onAdd={handleAdd} 
        addLabel={t('profiles.newProfile')} 
      />
      
      <SearchFilterBar 
        searchValue={search} 
        onSearchChange={(v) => { setSearch(v); setCurrentPage(0); }} 
        searchPlaceholder={t('common.searchByName')} 
        onRefresh={loadData} 
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : paginatedPerfis.length === 0 ? (
        <EmptyState 
          title={t('common.noResults')} 
          description={t('common.noProfilesFound')} 
          icon={<UserCircle className="h-6 w-6 text-muted-foreground" />} 
          action={<Button onClick={handleAdd}>{t('profiles.newProfile')}</Button>} 
        />
      ) : (
        <>
          <DataTable
            data={paginatedPerfis}
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
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeaderStandard
            title={selectedPerfil ? t('profiles.editProfile') : t('profiles.newProfile')}
            description={selectedPerfil ? t('common.editProfile') : t('common.fillProfile')}
          />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField 
                control={form.control} 
                name="nome" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profiles.name')} *</FormLabel>
                    <FormControl><Input placeholder={t('common.profileNamePlaceholder')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <FormField 
                control={form.control} 
                name="valor" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('planningTerm.hourlyRate')} (R$) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0.01"
                        placeholder={t('common.currencyValuePlaceholder')} 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
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
                      <FormLabel>{t('profiles.startDate')} *</FormLabel>
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
                      <FormLabel>{t('profiles.endDate')} *</FormLabel>
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
            <DialogDescription>{t('profiles.deleteConfirm')}</DialogDescription>
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
    </div>
  );
}
