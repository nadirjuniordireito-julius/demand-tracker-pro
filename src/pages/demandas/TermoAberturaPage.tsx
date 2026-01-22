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
  FilePlus,
  CheckCircle
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { termoAberturaService } from '@/services/termoService';
import { demandaService } from '@/services/demandaService';
import { useAuth } from '@/contexts/AuthContext';
import { termoAberturaSchema, type TermoAberturaFormData } from '@/lib/validations';
import type { TermoAbertura, DemandaTecnica, PaginatedResponse } from '@/types';

export default function TermoAberturaPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [termos, setTermos] = useState<TermoAbertura[]>([]);
  const [demandas, setDemandas] = useState<DemandaTecnica[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<TermoAbertura | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<TermoAbertura>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isLoadingDemandas, setIsLoadingDemandas] = useState(false);

  const form = useForm<TermoAberturaFormData>({
    resolver: zodResolver(termoAberturaSchema),
    defaultValues: {
      demandaTecnicaId: '',
      descricao: '',
    },
  });

  // Carrega demandas para o select
  const loadDemandas = useCallback(async () => {
    setIsLoadingDemandas(true);
    try {
      const response = await demandaService.findAll({ size: 1000 });
      setDemandas(response.content);
    } catch (err) {
      console.error('Erro ao carregar demandas:', err);
    } finally {
      setIsLoadingDemandas(false);
    }
  }, []);

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    await execute(
      () => termoAberturaService.findAll(currentPage, pageSize),
      {
        onSuccess: (data) => {
          setTermos(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      }
    );
  }, [execute, currentPage, pageSize]);

  useEffect(() => {
    loadDemandas();
  }, [loadDemandas]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTermos = useMemo(() => {
    if (!search) return termos;
    return termos.filter((termo) => {
      const demanda = demandas.find(d => d.id === termo.demandaTecnicaId);
      return demanda?.nome.toLowerCase().includes(search.toLowerCase()) ||
             demanda?.codigo.toLowerCase().includes(search.toLowerCase());
    });
  }, [termos, search, demandas]);
  
  const paginatedTermos = filteredTermos;


  const formatDateTime = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getDemandaNome = (demandaId: number) => {
    const demanda = demandas.find(d => d.id === demandaId);
    return demanda ? `${demanda.codigo} - ${demanda.nome}` : '-';
  };

  const handleAdd = () => {
    setSelectedTermo(null);
    form.reset({ demandaTecnicaId: '', descricao: '' });
    setIsFormOpen(true);
  };

  const handleEdit = (termo: TermoAbertura) => {
    setSelectedTermo(termo);
    form.reset({
      demandaTecnicaId: String(termo.demandaTecnicaId),
      descricao: termo.descricao,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (termo: TermoAbertura) => {
    setSelectedTermo(termo);
    setIsDeleteOpen(true);
  };

  const handleSign = async (termo: TermoAbertura) => {
    setIsSigning(true);
    try {
      await termoAberturaService.sign(termo.id);
      loadData();
    } finally {
      setIsSigning(false);
    }
  };

  const onSubmit = async (data: TermoAberturaFormData) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      if (selectedTermo) {
        await termoAberturaService.update(selectedTermo.id, {
          descricao: data.descricao,
        });
      } else {
        await termoAberturaService.create({
          demandaTecnicaId: Number(data.demandaTecnicaId),
          descricao: data.descricao,
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
    if (!selectedTermo) return;
    
    setIsDeleting(true);
    try {
      await termoAberturaService.delete(selectedTermo.id);
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
        <PageHeader title={t('openingTerm.title')} description="Gerencie os termos de abertura das demandas" />
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
        title={t('openingTerm.title')}
        description="Gerencie os termos de abertura das demandas"
        onAdd={handleAdd}
        addLabel={t('openingTerm.newTerm')}
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por demanda..."
        onRefresh={loadData}
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : filteredTermos.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description="Nenhum termo de abertura encontrado"
          icon={<FilePlus className="h-6 w-6 text-muted-foreground" />}
          action={
            <Button onClick={handleAdd}>
              {t('openingTerm.newTerm')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('openingTerm.demand')}</TableHead>
                  <TableHead>{t('openingTerm.openingDate')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('openingTerm.signatureDate')}</TableHead>
                  <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTermos.map((termo) => (
                  <TableRow key={termo.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {getDemandaNome(termo.demandaTecnicaId)}
                    </TableCell>
                    <TableCell>{formatDateTime(termo.dataAbertura)}</TableCell>
                    <TableCell>
                      {termo.dataAssinatura ? (
                        <Badge className="bg-success text-success-foreground">
                          {t('openingTerm.signed')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {t('openingTerm.notSigned')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {termo.dataAssinatura ? formatDateTime(termo.dataAssinatura) : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isSigning}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(termo)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          {!termo.dataAssinatura && (
                            <DropdownMenuItem onClick={() => handleSign(termo)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t('openingTerm.sign')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(termo)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete')}
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTermo ? t('openingTerm.editTerm') : t('openingTerm.newTerm')}
            </DialogTitle>
            <DialogDescription>
              {selectedTermo 
                ? 'Edite as informações do termo abaixo.'
                : 'Preencha as informações para criar um novo termo.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="demandaTecnicaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('openingTerm.demand')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma demanda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingDemandas ? (
                          <SelectItem value="" disabled>Carregando...</SelectItem>
                        ) : (
                          demandas.map((demanda) => (
                            <SelectItem key={demanda.id} value={String(demanda.id)}>
                              {demanda.codigo} - {demanda.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('openingTerm.description')} *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o objetivo e escopo desta demanda..."
                        rows={6}
                        {...field}
                      />
                    </FormControl>
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
            <DialogDescription>
              {t('openingTerm.deleteConfirm')}
            </DialogDescription>
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
