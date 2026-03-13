import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, UserCircle, Calendar, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { cn } from '@/lib/utils';
import { profissionalSchema, type ProfissionalFormData } from '@/lib/validations';
import { useApi } from '@/hooks/useApi';
import { profissionalService } from '@/services/profissionalService';
import { perfilService } from '@/services/perfilService';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import type { Profissional, PaginatedResponse, Perfil } from '@/types';

const parseDateOnly = (dateStr: string) => {
  const part = String(dateStr).split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
};

export default function ProfissionaisPage() {
  const { t } = useTranslation();
  const { selectedProject } = useProject();
  const { toast } = useToast();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const { isLoading, error, execute } = useApi<PaginatedResponse<Profissional>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingPerfis, setIsLoadingPerfis] = useState(false);

  const form = useForm<ProfissionalFormData>({
    resolver: zodResolver(profissionalSchema),
    defaultValues: {
      nome: '',
      tipoPessoa: 'F',
      documento: '',
      funcao: '',
      valorHora: 0,
      dataInicioAtividade: new Date(),
      projetoId: 0,
      perfilId: 0,
    },
  });

  const loadPerfis = useCallback(async () => {
    if (!selectedProject) return;
    setIsLoadingPerfis(true);
    try {
      const response = await perfilService.findAll({
        projetoId: selectedProject.id,
        size: 1000,
      });
      setPerfis(response.content);
    } catch (err) {
      console.error('Erro ao carregar perfis:', err);
    } finally {
      setIsLoadingPerfis(false);
    }
  }, [selectedProject]);

  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    await execute(
      () =>
        profissionalService.findAll({
          nome: search || undefined,
          projetoId: selectedProject.id,
          page: currentPage,
          size: pageSize,
          sort: 'nome,asc',
        }),
      {
        onSuccess: (data) => {
          setProfissionais(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      }
    );
  }, [execute, search, selectedProject, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadPerfis();
  }, [loadPerfis]);

  const formatDate = (dateStr: string) =>
    format(parseDateOnly(dateStr) ?? new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleAdd = () => {
    if (!selectedProject) return;
    setSelectedProfissional(null);
    form.reset({
      nome: '',
      tipoPessoa: 'F',
      documento: '',
      funcao: '',
      valorHora: 0,
      dataInicioAtividade: new Date(),
      projetoId: selectedProject.id,
      perfilId: 0,
    });
    setIsFormOpen(true);
  };

  const handleEdit = (profissional: Profissional) => {
    if (!selectedProject) return;
    setSelectedProfissional(profissional);
    form.reset({
      nome: profissional.nome,
      tipoPessoa: profissional.tipoPessoa,
      documento: profissional.documento,
      funcao: profissional.funcao ?? '',
      valorHora: profissional.valorHora,
      dataInicioAtividade: parseDateOnly(profissional.dataInicioAtividade) ?? new Date(),
      projetoId: selectedProject.id,
      perfilId: profissional.perfilId,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (profissional: Profissional) => {
    setSelectedProfissional(profissional);
    setIsDeleteOpen(true);
  };

  const columns: Column<Profissional>[] = useMemo(
    () => [
      { key: 'nome', label: t('professionals.name') },
      {
        key: 'tipoPessoa',
        label: t('professionals.tipoPessoa'),
        render: (p) => (p.tipoPessoa === 'F' ? t('professionals.pessoaFisica') : t('professionals.pessoaJuridica')),
        hideOnMobile: true,
      },
      { key: 'documento', label: t('professionals.document'), hideOnMobile: true },
      {
        key: 'funcao',
        label: t('professionals.funcao'),
        render: (p) => p.funcao ?? '—',
        hideOnMobile: true,
      },
      {
        key: 'valorHora',
        label: t('professionals.valorHora'),
        render: (p) => (p.valorHora != null ? formatCurrency(p.valorHora) : '—'),
        hideOnMobile: true,
      },
      {
        key: 'dataInicioAtividade',
        label: t('professionals.dataInicioAtividade'),
        render: (p) => formatDate(p.dataInicioAtividade),
        hideOnMobile: true,
      },
    ],
    [t]
  );

  const actions: Action<Profissional>[] = useMemo(
    () => [
      { label: t('common.edit'), icon: <Edit className="h-4 w-4" />, onClick: handleEdit },
      {
        label: t('common.delete'),
        icon: <Trash2 className="h-4 w-4" />,
        onClick: handleDelete,
        variant: 'destructive',
        separator: true,
      },
    ],
    [t]
  );

  const onSubmit = async (data: ProfissionalFormData) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const funcaoTrimmed = data.funcao?.trim();
      const payload = {
        nome: data.nome.trim(),
        tipoPessoa: data.tipoPessoa,
        documento: data.documento.trim(),
        valorHora: data.valorHora,
        dataInicioAtividade: data.dataInicioAtividade.toISOString().split('T')[0],
        projetoId: selectedProject.id,
        perfilId: data.perfilId,
      };
      // Update: sempre envia funcao ("" para limpar). Create: só envia se preenchido.
      if (selectedProfissional) {
        (payload as { funcao?: string }).funcao = funcaoTrimmed ?? '';
      } else if (funcaoTrimmed) {
        (payload as { funcao?: string }).funcao = funcaoTrimmed;
      }
      if (selectedProfissional) {
        await profissionalService.update(selectedProfissional.id, payload);
        toast({ title: t('common.success'), description: t('professionals.updatedSuccess') });
      } else {
        await profissionalService.create(payload);
        toast({ title: t('common.success'), description: t('professionals.createdSuccess') });
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProfissional) return;
    setIsDeleting(true);
    try {
      await profissionalService.delete(selectedProfissional.id);
      toast({ title: t('common.success'), description: t('professionals.deletedSuccess') });
      setIsDeleteOpen(false);
      loadData();
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('professionals.deleteError'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('professionals.title')} description={t('professionals.description')} />
        <ErrorState title={t('common.errorTitle')} message={error} onRetry={loadData} retryText={t('common.retry')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('professionals.title')}
        description={t('professionals.description')}
        onAdd={selectedProject ? handleAdd : undefined}
        addLabel={t('professionals.newProfessional')}
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(0);
        }}
        searchPlaceholder={t('professionals.searchPlaceholder')}
        onRefresh={loadData}
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : profissionais.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description={t('professionals.noProfessionals')}
          icon={<Briefcase className="h-6 w-6 text-muted-foreground" />}
          action={selectedProject ? <Button onClick={handleAdd}>{t('professionals.newProfessional')}</Button> : undefined}
        />
      ) : (
        <>
          <DataTable
            data={profissionais}
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
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(0);
            }}
          />
        </>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeaderStandard
            title={selectedProfissional ? t('professionals.editProfessional') : t('professionals.newProfessional')}
            description={selectedProfissional ? t('common.editInformation') : t('common.fillInformation')}
          />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('professionals.name')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('professionals.namePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipoPessoa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('professionals.tipoPessoa')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('professionals.selectTipoPessoa')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="F">{t('professionals.pessoaFisica')}</SelectItem>
                        <SelectItem value="J">{t('professionals.pessoaJuridica')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="documento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('professionals.document')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('professionals.documentPlaceholder')}
                        inputMode="numeric"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="funcao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('professionals.funcao')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('professionals.funcaoPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="perfilId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('professionals.perfil')} *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value ? String(field.value) : ''}
                      disabled={isLoadingPerfis || !selectedProject}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('professionals.selectPerfil')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {perfis.map((perfil) => (
                          <SelectItem key={perfil.id} value={String(perfil.id)}>
                            {perfil.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valorHora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('professionals.valorHora')} (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0,00"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataInicioAtividade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('professionals.dataInicioAtividade')} *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'dd/MM/yyyy') : t('common.select')}
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

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('professionals.deleteConfirm')}</DialogDescription>
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
