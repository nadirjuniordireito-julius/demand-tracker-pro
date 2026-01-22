import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Edit, Trash2, MoreHorizontal, FileText, Eye, FilePlus, FileCheck, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageHeader, SearchFilterBar, EmptyState, FilterSelect, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { useApi } from '@/hooks/useApi';
import { demandaService } from '@/services/demandaService';
import { projetoService } from '@/services/projetoService';
import { useAuth } from '@/contexts/AuthContext';
import { demandaSchema, type DemandaFormData } from '@/lib/validations';
import type { DemandaTecnica, DemandStatus, Projeto, PaginatedResponse } from '@/types';

const getStatusBadge = (status: DemandStatus, t: (key: string) => string) => {
  const config: Record<DemandStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    opened: { label: t('demands.opened'), variant: 'outline' },
    inPlanning: { label: t('demands.inPlanning'), variant: 'secondary' },
    inExecution: { label: t('demands.inExecution'), variant: 'default' },
    closed: { label: t('demands.closed'), variant: 'default' }
  };
  return (
    <Badge 
      variant={config[status].variant} 
      className={status === 'closed' ? 'bg-success text-success-foreground' : status === 'inExecution' ? 'bg-info text-info-foreground' : ''}
    >
      {config[status].label}
    </Badge>
  );
};

export default function DemandasPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [demandas, setDemandas] = useState<DemandaTecnica[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDemanda, setSelectedDemanda] = useState<DemandaTecnica | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<DemandaTecnica>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingProjetos, setIsLoadingProjetos] = useState(false);

  const form = useForm<DemandaFormData>({
    resolver: zodResolver(demandaSchema),
    defaultValues: { codigo: '', nome: '', projetoId: '' }
  });

  // Carrega projetos para o select
  const loadProjetos = useCallback(async () => {
    setIsLoadingProjetos(true);
    try {
      const response = await projetoService.findAll({ size: 1000 });
      setProjetos(response.content);
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
    } finally {
      setIsLoadingProjetos(false);
    }
  }, []);

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    await execute(
      () => demandaService.findAll({ 
        nome: search || undefined,
        codigo: search || undefined,
        status: statusFilter !== 'all' ? statusFilter as DemandStatus : undefined,
        page: currentPage, 
        size: pageSize 
      }),
      {
        onSuccess: (data) => {
          setDemandas(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      }
    );
  }, [execute, search, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    loadProjetos();
  }, [loadProjetos]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paginatedDemandas = demandas;

  const formatDateTime = (dateStr: string) => format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const getProjetoNome = (projetoId: number) => projetos.find(p => p.id === projetoId)?.nome || '-';

  const handleAdd = () => {
    setSelectedDemanda(null);
    form.reset({ codigo: '', nome: '', projetoId: '' });
    setIsFormOpen(true);
  };

  const handleEdit = (demanda: DemandaTecnica) => {
    setSelectedDemanda(demanda);
    form.reset({
      codigo: demanda.codigo,
      nome: demanda.nome,
      projetoId: String(demanda.projetoId)
    });
    setIsFormOpen(true);
  };

  const handleDelete = (demanda: DemandaTecnica) => {
    setSelectedDemanda(demanda);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (data: DemandaFormData) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      if (selectedDemanda) {
        await demandaService.update(selectedDemanda.id, {
          codigo: data.codigo,
          nome: data.nome,
          projetoId: Number(data.projetoId),
        });
      } else {
        await demandaService.create({
          codigo: data.codigo,
          nome: data.nome,
          projetoId: Number(data.projetoId),
          usuarioId: user.id,
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
    if (!selectedDemanda) return;
    
    setIsDeleting(true);
    try {
      await demandaService.delete(selectedDemanda.id);
      setIsDeleteOpen(false);
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  const statusOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'opened', label: t('demands.opened') },
    { value: 'inPlanning', label: t('demands.inPlanning') },
    { value: 'inExecution', label: t('demands.inExecution') },
    { value: 'closed', label: t('demands.closed') }
  ];

  // Estado de erro
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('demands.title')} description="Gerencie as demandas técnicas do sistema" />
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
        title={t('demands.title')} 
        description="Gerencie as demandas técnicas do sistema" 
        onAdd={handleAdd} 
        addLabel={t('demands.newDemand')} 
      />
      
      <SearchFilterBar 
        searchValue={search} 
        onSearchChange={(v) => { setSearch(v); setCurrentPage(0); }} 
        searchPlaceholder="Buscar por código ou nome..." 
        onRefresh={loadData}
      >
        <FilterSelect 
          value={statusFilter} 
          onValueChange={(v) => { setStatusFilter(v); setCurrentPage(0); }} 
          placeholder={t('common.status')} 
          options={statusOptions} 
        />
      </SearchFilterBar>

      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : paginatedDemandas.length === 0 ? (
        <EmptyState 
          title={t('common.noResults')} 
          description="Nenhuma demanda encontrada" 
          icon={<FileText className="h-6 w-6 text-muted-foreground" />} 
          action={<Button onClick={handleAdd}>{t('demands.newDemand')}</Button>} 
        />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('demands.code')}</TableHead>
                  <TableHead>{t('demands.name')}</TableHead>
                  <TableHead>{t('demands.project')}</TableHead>
                  <TableHead>{t('demands.openingDate')}</TableHead>
                  <TableHead>{t('demands.status')}</TableHead>
                  <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDemandas.map((demanda) => (
                  <TableRow key={demanda.id}>
                    <TableCell className="font-medium">{demanda.codigo}</TableCell>
                    <TableCell>{demanda.nome}</TableCell>
                    <TableCell>{getProjetoNome(demanda.projetoId)}</TableCell>
                    <TableCell>{formatDateTime(demanda.dataAbertura)}</TableCell>
                    <TableCell>{getStatusBadge(demanda.status!, t)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/demandas/${demanda.id}`}>
                              <Eye className="h-4 w-4 mr-2" />{t('common.view')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(demanda)}>
                            <Edit className="h-4 w-4 mr-2" />{t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to={`/demandas/termo-abertura?demandaId=${demanda.id}`}>
                              <FilePlus className="h-4 w-4 mr-2" />{t('nav.openingTerm')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/demandas/termo-planejamento?demandaId=${demanda.id}`}>
                              <FileCheck className="h-4 w-4 mr-2" />{t('nav.planningTerm')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/demandas/termo-encerramento?demandaId=${demanda.id}`}>
                              <FileX className="h-4 w-4 mr-2" />{t('nav.closingTerm')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(demanda)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />{t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
            <DialogTitle>{selectedDemanda ? t('demands.editDemand') : t('demands.newDemand')}</DialogTitle>
            <DialogDescription>
              {selectedDemanda ? 'Edite as informações da demanda.' : 'Preencha as informações para criar uma nova demanda.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField 
                control={form.control} 
                name="codigo" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('demands.code')} *</FormLabel>
                    <FormControl><Input placeholder="DEM-2024-XXX" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <FormField 
                control={form.control} 
                name="nome" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('demands.name')} *</FormLabel>
                    <FormControl><Input placeholder="Nome da demanda" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <FormField 
                control={form.control} 
                name="projetoId" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('demands.project')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um projeto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingProjetos ? (
                          <SelectItem value="" disabled>Carregando...</SelectItem>
                        ) : (
                          projetos.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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
            <DialogDescription>{t('demands.deleteConfirm')}</DialogDescription>
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
