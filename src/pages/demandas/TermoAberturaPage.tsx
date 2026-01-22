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
import { termoAberturaSchema, type TermoAberturaFormData } from '@/lib/validations';
import type { TermoAbertura } from '@/types';

// Mock data
const mockTermos: TermoAbertura[] = [
  { 
    id: 1, 
    demandaTecnicaId: 1,
    descricao: 'Este termo formaliza a abertura da demanda para desenvolvimento do módulo de relatórios gerenciais.',
    dataAbertura: '2024-01-20T10:30:00',
    usuarioId: 1,
    dataAssinatura: '2024-01-21T14:00:00',
  },
  { 
    id: 2, 
    demandaTecnicaId: 2,
    descricao: 'Termo de abertura para integração com sistema externo de gestão financeira.',
    dataAbertura: '2024-02-15T14:00:00',
    usuarioId: 2,
    dataAssinatura: null,
  },
];

const mockDemandas = [
  { id: 1, codigo: 'DEM-2024-001', nome: 'Desenvolvimento do Módulo de Relatórios' },
  { id: 2, codigo: 'DEM-2024-002', nome: 'Integração com Sistema Externo' },
  { id: 3, codigo: 'DEM-2024-003', nome: 'Implementação de Dashboard' },
  { id: 4, codigo: 'DEM-2024-004', nome: 'Migração de Dados' },
];

// Simula delay de API
const simulateApiCall = <T,>(data: T, delay = 800): Promise<T> => 
  new Promise((resolve) => setTimeout(() => resolve(data), delay));

export default function TermoAberturaPage() {
  const { t } = useTranslation();
  const [termos, setTermos] = useState<TermoAbertura[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<TermoAbertura | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // API states
  const { isLoading, error, execute } = useApi<TermoAbertura[]>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const form = useForm<TermoAberturaFormData>({
    resolver: zodResolver(termoAberturaSchema),
    defaultValues: {
      demandaTecnicaId: '',
      descricao: '',
    },
  });

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    await execute(
      () => simulateApiCall(mockTermos),
      {
        onSuccess: (data) => setTermos(data),
      }
    );
  }, [execute]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTermos = useMemo(() => {
    return termos.filter((termo) => {
      const demanda = mockDemandas.find(d => d.id === termo.demandaTecnicaId);
      return demanda?.nome.toLowerCase().includes(search.toLowerCase()) ||
             demanda?.codigo.toLowerCase().includes(search.toLowerCase());
    });
  }, [termos, search]);

  const totalPages = Math.ceil(filteredTermos.length / pageSize);
  
  const paginatedTermos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTermos.slice(start, start + pageSize);
  }, [filteredTermos, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const formatDateTime = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getDemandaNome = (demandaId: number) => {
    const demanda = mockDemandas.find(d => d.id === demandaId);
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
      await simulateApiCall(null, 800);
      setTermos(termos.map(t => 
        t.id === termo.id 
          ? { ...t, dataAssinatura: new Date().toISOString() }
          : t
      ));
    } finally {
      setIsSigning(false);
    }
  };

  const onSubmit = async (data: TermoAberturaFormData) => {
    setIsSaving(true);
    try {
      await simulateApiCall(null, 1000);
      
      if (selectedTermo) {
        setTermos(termos.map(t => 
          t.id === selectedTermo.id 
            ? { 
                ...t, 
                demandaTecnicaId: Number(data.demandaTecnicaId),
                descricao: data.descricao,
              }
            : t
        ));
      } else {
        const newTermo: TermoAbertura = {
          id: Math.max(...termos.map(t => t.id), 0) + 1,
          demandaTecnicaId: Number(data.demandaTecnicaId),
          descricao: data.descricao,
          dataAbertura: new Date().toISOString(),
          usuarioId: 1,
          dataAssinatura: null,
        };
        setTermos([...termos, newTermo]);
      }
      setIsFormOpen(false);
      form.reset();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTermo) return;
    
    setIsDeleting(true);
    try {
      await simulateApiCall(null, 800);
      setTermos(termos.filter(t => t.id !== selectedTermo.id));
      setIsDeleteOpen(false);
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
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredTermos.length}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
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
                        {mockDemandas.map((demanda) => (
                          <SelectItem key={demanda.id} value={String(demanda.id)}>
                            {demanda.codigo} - {demanda.nome}
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
