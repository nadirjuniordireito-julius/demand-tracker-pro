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
  FileX,
  CheckCircle,
  Plus,
  X
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { useApi } from '@/hooks/useApi';
import { termoEncerramentoSchema, type TermoEncerramentoFormData } from '@/lib/validations';
import type { TermoEncerramento, TermoEncerramentoCusto } from '@/types';

// Mock data
const mockTermos: (TermoEncerramento & { custos: TermoEncerramentoCusto[] })[] = [
  { 
    id: 1, 
    demandaTecnicaId: 1,
    resultadoEntregue: 'Módulo de relatórios desenvolvido e implantado com sucesso. Todas as funcionalidades especificadas foram entregues.',
    dataTermo: '2024-03-15T16:00:00',
    usuarioId: 1,
    dataAssinatura: '2024-03-16T10:00:00',
    custos: [
      { id: 1, termoEncerramentoId: 1, perfilId: 1, qtdeHora: 150, valorHora: 150 },
      { id: 2, termoEncerramentoId: 1, perfilId: 2, qtdeHora: 300, valorHora: 100 },
    ],
  },
];

const mockDemandas = [
  { id: 1, codigo: 'DEM-2024-001', nome: 'Desenvolvimento do Módulo de Relatórios' },
  { id: 2, codigo: 'DEM-2024-002', nome: 'Integração com Sistema Externo' },
];

const mockPerfis = [
  { id: 1, nome: 'Analista Sênior' },
  { id: 2, nome: 'Desenvolvedor Pleno' },
  { id: 3, nome: 'Gerente de Projetos' },
];

// Simula delay de API
const simulateApiCall = <T,>(data: T, delay = 800): Promise<T> => 
  new Promise((resolve) => setTimeout(() => resolve(data), delay));

interface CustoForm {
  perfilId: string;
  qtdeHora: string;
  valorHora: string;
}

export default function TermoEncerramentoPage() {
  const { t } = useTranslation();
  const [termos, setTermos] = useState<typeof mockTermos>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<typeof mockTermos[0] | null>(null);
  const [custos, setCustos] = useState<CustoForm[]>([]);
  const [custoErrors, setCustoErrors] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // API states
  const { isLoading, error, execute } = useApi<typeof mockTermos>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const form = useForm<TermoEncerramentoFormData>({
    resolver: zodResolver(termoEncerramentoSchema),
    defaultValues: {
      demandaTecnicaId: '',
      resultadoEntregue: '',
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getDemandaNome = (demandaId: number) => {
    const demanda = mockDemandas.find(d => d.id === demandaId);
    return demanda ? `${demanda.codigo} - ${demanda.nome}` : '-';
  };

  const calcularCustoTotal = (custosList: TermoEncerramentoCusto[]) => {
    return custosList.reduce((total, c) => total + (c.qtdeHora * c.valorHora), 0);
  };

  const handleAdd = () => {
    setSelectedTermo(null);
    form.reset({ demandaTecnicaId: '', resultadoEntregue: '' });
    setCustos([]);
    setCustoErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (termo: typeof mockTermos[0]) => {
    setSelectedTermo(termo);
    form.reset({
      demandaTecnicaId: String(termo.demandaTecnicaId),
      resultadoEntregue: termo.resultadoEntregue,
    });
    setCustos(termo.custos.map(c => ({
      perfilId: String(c.perfilId),
      qtdeHora: String(c.qtdeHora),
      valorHora: String(c.valorHora),
    })));
    setCustoErrors({});
    setIsFormOpen(true);
  };

  const handleDelete = (termo: typeof mockTermos[0]) => {
    setSelectedTermo(termo);
    setIsDeleteOpen(true);
  };

  const handleSign = async (termo: typeof mockTermos[0]) => {
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

  const handleAddCusto = () => {
    setCustos([...custos, { perfilId: '', qtdeHora: '', valorHora: '' }]);
  };

  const handleRemoveCusto = (index: number) => {
    setCustos(custos.filter((_, i) => i !== index));
    const newErrors = { ...custoErrors };
    delete newErrors[index];
    setCustoErrors(newErrors);
  };

  const handleCustoChange = (index: number, field: keyof CustoForm, value: string) => {
    setCustos(custos.map((c, i) => 
      i === index ? { ...c, [field]: value } : c
    ));
    if (custoErrors[index]) {
      const newErrors = { ...custoErrors };
      delete newErrors[index];
      setCustoErrors(newErrors);
    }
  };

  const validateCustos = (): boolean => {
    const errors: Record<number, string> = {};
    custos.forEach((custo, index) => {
      if (!custo.perfilId || !custo.qtdeHora || !custo.valorHora) {
        errors[index] = 'Preencha todos os campos do custo';
      } else if (Number(custo.qtdeHora) <= 0 || Number(custo.valorHora) <= 0) {
        errors[index] = 'Valores devem ser maiores que zero';
      }
    });
    setCustoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (data: TermoEncerramentoFormData) => {
    if (!validateCustos()) return;

    setIsSaving(true);
    try {
      await simulateApiCall(null, 1000);
      
      const custosFormatted = custos
        .filter(c => c.perfilId && c.qtdeHora && c.valorHora)
        .map((c, index) => ({
          id: index + 1,
          termoEncerramentoId: selectedTermo?.id || termos.length + 1,
          perfilId: Number(c.perfilId),
          qtdeHora: Number(c.qtdeHora),
          valorHora: Number(c.valorHora),
        }));

      if (selectedTermo) {
        setTermos(termos.map(t => 
          t.id === selectedTermo.id 
            ? { 
                ...t, 
                demandaTecnicaId: Number(data.demandaTecnicaId),
                resultadoEntregue: data.resultadoEntregue,
                custos: custosFormatted,
              }
            : t
        ));
      } else {
        const newTermo = {
          id: Math.max(...termos.map(t => t.id), 0) + 1,
          demandaTecnicaId: Number(data.demandaTecnicaId),
          resultadoEntregue: data.resultadoEntregue,
          dataTermo: new Date().toISOString(),
          usuarioId: 1,
          dataAssinatura: null,
          custos: custosFormatted,
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
        <PageHeader title={t('closingTerm.title')} description="Gerencie os termos de encerramento das demandas" />
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
        title={t('closingTerm.title')}
        description="Gerencie os termos de encerramento das demandas"
        onAdd={handleAdd}
        addLabel={t('closingTerm.newTerm')}
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
          description="Nenhum termo de encerramento encontrado"
          icon={<FileX className="h-6 w-6 text-muted-foreground" />}
          action={
            <Button onClick={handleAdd}>
              {t('closingTerm.newTerm')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('closingTerm.demand')}</TableHead>
                  <TableHead>{t('closingTerm.termDate')}</TableHead>
                  <TableHead>{t('closingTerm.totalCost')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTermos.map((termo) => (
                  <TableRow key={termo.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {getDemandaNome(termo.demandaTecnicaId)}
                    </TableCell>
                    <TableCell>{formatDateTime(termo.dataTermo)}</TableCell>
                    <TableCell>{formatCurrency(calcularCustoTotal(termo.custos))}</TableCell>
                    <TableCell>
                      {termo.dataAssinatura ? (
                        <Badge className="bg-success text-success-foreground">
                          {t('closingTerm.signed')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {t('closingTerm.notSigned')}
                        </Badge>
                      )}
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
                              {t('closingTerm.sign')}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTermo ? t('closingTerm.editTerm') : t('closingTerm.newTerm')}
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
                    <FormLabel>{t('closingTerm.demand')} *</FormLabel>
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
                name="resultadoEntregue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('closingTerm.deliveredResult')} *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva os resultados entregues..."
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custos Realizados */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t('closingTerm.costs')}</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddCusto}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('closingTerm.addCost')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {custos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum custo adicionado
                    </p>
                  ) : (
                    custos.map((custo, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">{t('closingTerm.profile')}</Label>
                              <Select 
                                value={custo.perfilId} 
                                onValueChange={(value) => handleCustoChange(index, 'perfilId', value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Perfil" />
                                </SelectTrigger>
                                <SelectContent>
                                  {mockPerfis.map((perfil) => (
                                    <SelectItem key={perfil.id} value={String(perfil.id)}>
                                      {perfil.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">{t('closingTerm.hours')}</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={custo.qtdeHora}
                                onChange={(e) => handleCustoChange(index, 'qtdeHora', e.target.value)}
                                placeholder="Horas"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">{t('closingTerm.hourlyRate')}</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={custo.valorHora}
                                onChange={(e) => handleCustoChange(index, 'valorHora', e.target.value)}
                                placeholder="R$"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveCusto(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {custoErrors[index] && (
                          <p className="text-xs text-destructive">{custoErrors[index]}</p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              
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
              {t('closingTerm.deleteConfirm')}
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
