import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, MoreHorizontal, UserCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { cn } from '@/lib/utils';
import { perfilSchema, type PerfilFormData } from '@/lib/validations';
import { useApi } from '@/hooks/useApi';
import { perfilService } from '@/services/perfilService';
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
    defaultValues: { nome: '', termoInicial: undefined, termoFinal: undefined }
  });

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    await execute(
      () => perfilService.findAll({ 
        nome: search || undefined,
        page: currentPage, 
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
  }, [execute, search, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paginatedPerfis = perfis;

  const formatDate = (dateStr: string) => format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const handleAdd = () => {
    if (!selectedProject) {
      // TODO: Mostrar mensagem de erro ou redirecionar para seleção de projeto
      return;
    }
    setSelectedPerfil(null);
    form.reset({ nome: '', termoInicial: undefined, termoFinal: undefined });
    setIsFormOpen(true);
  };

  const handleEdit = (perfil: Perfil) => {
    setSelectedPerfil(perfil);
    form.reset({
      nome: perfil.nome,
      termoInicial: new Date(perfil.termoInicial),
      termoFinal: new Date(perfil.termoFinal)
    });
    setIsFormOpen(true);
  };

  const handleDelete = (perfil: Perfil) => {
    setSelectedPerfil(perfil);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (data: PerfilFormData) => {
    if (!user || !selectedProject) return;
    
    setIsSaving(true);
    try {
      if (selectedPerfil) {
        await perfilService.update(selectedPerfil.id, {
          nome: data.nome,
          termoInicial: data.termoInicial.toISOString().split('T')[0],
          termoFinal: data.termoFinal.toISOString().split('T')[0],
          projetoId: selectedProject.id,
          projeto: selectedProject,
        });
      } else {
        await perfilService.create({
          nome: data.nome,
          termoInicial: data.termoInicial.toISOString().split('T')[0],
          termoFinal: data.termoFinal.toISOString().split('T')[0],
          usuarioId: user.id,
          projetoId: selectedProject.id,
          projeto: selectedProject,
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
        <PageHeader title={t('profiles.title')} description="Gerencie os perfis de custo do sistema" />
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
        description="Gerencie os perfis de custo do sistema" 
        onAdd={handleAdd} 
        addLabel={t('profiles.newProfile')} 
      />
      
      <SearchFilterBar 
        searchValue={search} 
        onSearchChange={(v) => { setSearch(v); setCurrentPage(0); }} 
        searchPlaceholder="Buscar por nome..." 
        onRefresh={loadData} 
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : paginatedPerfis.length === 0 ? (
        <EmptyState 
          title={t('common.noResults')} 
          description="Nenhum perfil encontrado" 
          icon={<UserCircle className="h-6 w-6 text-muted-foreground" />} 
          action={<Button onClick={handleAdd}>{t('profiles.newProfile')}</Button>} 
        />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('profiles.name')}</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>{t('profiles.startDate')}</TableHead>
                  <TableHead>{t('profiles.endDate')}</TableHead>
                  <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPerfis.map((perfil) => (
                  <TableRow key={perfil.id}>
                    <TableCell className="font-medium">{perfil.nome}</TableCell>
                    <TableCell>{perfil.projeto?.nome || '-'}</TableCell>
                    <TableCell>{formatDate(perfil.termoInicial)}</TableCell>
                    <TableCell>{formatDate(perfil.termoFinal)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(perfil)}>
                            <Edit className="h-4 w-4 mr-2" />{t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(perfil)} className="text-destructive">
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
            <DialogTitle>{selectedPerfil ? t('profiles.editProfile') : t('profiles.newProfile')}</DialogTitle>
            <DialogDescription>
              {selectedPerfil ? 'Edite as informações do perfil.' : 'Preencha as informações para criar um novo perfil.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField 
                control={form.control} 
                name="nome" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profiles.name')} *</FormLabel>
                    <FormControl><Input placeholder="Nome do perfil" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              {selectedProject && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Projeto selecionado:</p>
                  <p className="text-sm text-muted-foreground">{selectedProject.nome}</p>
                </div>
              )}
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
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar"}
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
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar"}
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
