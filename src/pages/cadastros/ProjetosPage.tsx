import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Edit, 
  Trash2, 
  MoreHorizontal,
  FolderKanban,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { projetoSchema, type ProjetoFormData } from '@/lib/validations';
import { projetoService } from '@/services/projetoService';
import { useAuth } from '@/contexts/AuthContext';
import type { Projeto, PaginatedResponse } from '@/types';

export default function ProjetosPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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
    defaultValues: { nome: '', codTed: '', termoInicial: undefined, termoFinal: undefined },
  });

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    await execute(
      () => projetoService.findAll({ 
        nome: search || undefined,
        page: currentPage, 
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

  const formatDate = (dateStr: string) => format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const handleAdd = () => {
    setSelectedProjeto(null);
    form.reset({ nome: '', codTed: '', termoInicial: undefined, termoFinal: undefined });
    setIsFormOpen(true);
  };

  const handleEdit = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    form.reset({
      nome: projeto.nome,
      codTed: projeto.codTed,
      termoInicial: new Date(projeto.termoInicial),
      termoFinal: new Date(projeto.termoFinal)
    });
    setIsFormOpen(true);
  };

  const handleDelete = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (data: ProjetoFormData) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      if (selectedProjeto) {
        await projetoService.update(selectedProjeto.id, {
          nome: data.nome,
          codTed: data.codTed,
          termoInicial: data.termoInicial.toISOString().split('T')[0],
          termoFinal: data.termoFinal.toISOString().split('T')[0],
        });
      } else {
        await projetoService.create({
          nome: data.nome,
          codTed: data.codTed,
          termoInicial: data.termoInicial.toISOString().split('T')[0],
          termoFinal: data.termoFinal.toISOString().split('T')[0],
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
    if (!selectedProjeto) return;
    
    setIsDeleting(true);
    try {
      await projetoService.delete(selectedProjeto.id);
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
        <PageHeader title={t('projects.title')} description="Gerencie os projetos do sistema" />
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
        description="Gerencie os projetos do sistema" 
        onAdd={handleAdd} 
        addLabel={t('projects.newProject')} 
      />
      
      <SearchFilterBar 
        searchValue={search} 
        onSearchChange={(v) => { setSearch(v); setCurrentPage(0); }} 
        searchPlaceholder="Buscar por nome ou código..." 
        onRefresh={loadData} 
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : paginatedProjetos.length === 0 ? (
        <EmptyState 
          title={t('common.noResults')} 
          description="Nenhum projeto encontrado" 
          icon={<FolderKanban className="h-6 w-6 text-muted-foreground" />} 
          action={<Button onClick={handleAdd}>{t('projects.newProject')}</Button>} 
        />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('projects.name')}</TableHead>
                  <TableHead>{t('projects.codeTed')}</TableHead>
                  <TableHead>{t('projects.startDate')}</TableHead>
                  <TableHead>{t('projects.endDate')}</TableHead>
                  <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProjetos.map((projeto) => (
                  <TableRow key={projeto.id}>
                    <TableCell className="font-medium">{projeto.nome}</TableCell>
                    <TableCell>{projeto.codTed}</TableCell>
                    <TableCell>{formatDate(projeto.termoInicial)}</TableCell>
                    <TableCell>{formatDate(projeto.termoFinal)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(projeto)}>
                            <Edit className="h-4 w-4 mr-2" />{t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(projeto)} className="text-destructive">
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
            <DialogTitle>{selectedProjeto ? t('projects.editProject') : t('projects.newProject')}</DialogTitle>
            <DialogDescription>
              {selectedProjeto ? 'Edite as informações do projeto.' : 'Preencha as informações para criar um novo projeto.'}
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
                    <FormControl><Input placeholder="Nome do projeto" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="TED-2024-XXX" {...field} /></FormControl>
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
                      <FormLabel>{t('projects.endDate')} *</FormLabel>
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
    </div>
  );
}
