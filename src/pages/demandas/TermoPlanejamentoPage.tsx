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
  FileCheck,
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
import { termoPlanejamentoService } from '@/services/termoService';
import { demandaService } from '@/services/demandaService';
import { perfilService } from '@/services/perfilService';
import { useAuth } from '@/contexts/AuthContext';
import { termoPlanejamentoSchema, type TermoPlanejamentoFormData } from '@/lib/validations';
import type { TermoPlanejamento, TermoPlanejamentoCusto, DemandaTecnica, Perfil, PaginatedResponse } from '@/types';

interface CustoForm {
  perfilId: string;
  qtdeHora: string;
  valorHora: string;
}

export default function TermoPlanejamentoPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [termos, setTermos] = useState<TermoPlanejamento[]>([]);
  const [demandas, setDemandas] = useState<DemandaTecnica[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<TermoPlanejamento | null>(null);
  const [custos, setCustos] = useState<CustoForm[]>([]);
  const [custoErrors, setCustoErrors] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<TermoPlanejamento>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isLoadingDemandas, setIsLoadingDemandas] = useState(false);
  const [isLoadingPerfis, setIsLoadingPerfis] = useState(false);

  const form = useForm<TermoPlanejamentoFormData>({
    resolver: zodResolver(termoPlanejamentoSchema),
    defaultValues: {
      demandaTecnicaId: '',
      especificacao: '',
      cronograma: '',
      resultadoEsperado: '',
    },
  });

  // Carrega demandas e perfis para os selects
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

  const loadPerfis = useCallback(async () => {
    setIsLoadingPerfis(true);
    try {
      const response = await perfilService.findAll({ size: 1000 });
      setPerfis(response.content);
    } catch (err) {
      console.error('Erro ao carregar perfis:', err);
    } finally {
      setIsLoadingPerfis(false);
    }
  }, []);

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    await execute(
      () => termoPlanejamentoService.findAll(currentPage, pageSize),
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
    loadPerfis();
  }, [loadDemandas, loadPerfis]);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getDemandaNome = (demandaId: number) => {
    const demanda = demandas.find(d => d.id === demandaId);
    return demanda ? `${demanda.codigo} - ${demanda.nome}` : '-';
  };

  const calcularCustoTotal = (custosList: TermoPlanejamentoCusto[] = []) => {
    return custosList.reduce((total, c) => total + (c.qtdeHora * c.valorHora), 0);
  };

  const handleAdd = () => {
    setSelectedTermo(null);
    form.reset({ demandaTecnicaId: '', especificacao: '', cronograma: '', resultadoEsperado: '' });
    setCustos([]);
    setCustoErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (termo: TermoPlanejamento) => {
    setSelectedTermo(termo);
    form.reset({
      demandaTecnicaId: String(termo.demandaTecnicaId),
      especificacao: termo.especificacao,
      cronograma: termo.cronograma,
      resultadoEsperado: termo.resultadoEsperado,
    });
    setCustos((termo.custos || []).map(c => ({
      perfilId: String(c.perfilId),
      qtdeHora: String(c.qtdeHora),
      valorHora: String(c.valorHora),
    })));
    setCustoErrors({});
    setIsFormOpen(true);
  };

  const handleDelete = (termo: TermoPlanejamento) => {
    setSelectedTermo(termo);
    setIsDeleteOpen(true);
  };

  const handleSign = async (termo: TermoPlanejamento) => {
    setIsSigning(true);
    try {
      await termoPlanejamentoService.sign(termo.id);
      loadData();
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

  const onSubmit = async (data: TermoPlanejamentoFormData) => {
    if (!validateCustos() || !user) return;

    setIsSaving(true);
    try {
      const custosFormatted = custos
        .filter(c => c.perfilId && c.qtdeHora && c.valorHora)
        .map(c => ({
          perfilId: Number(c.perfilId),
          qtdeHora: Number(c.qtdeHora),
          valorHora: Number(c.valorHora),
        }));

      if (selectedTermo) {
        await termoPlanejamentoService.update(selectedTermo.id, {
          especificacao: data.especificacao,
          cronograma: data.cronograma,
          resultadoEsperado: data.resultadoEsperado,
          custos: custosFormatted,
        });
      } else {
        await termoPlanejamentoService.create({
          demandaTecnicaId: Number(data.demandaTecnicaId),
          especificacao: data.especificacao,
          cronograma: data.cronograma,
          resultadoEsperado: data.resultadoEsperado,
          usuarioId: user.id,
          custos: custosFormatted,
        });
      }
      setIsFormOpen(false);
      form.reset();
      setCustos([]);
      loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTermo) return;
    
    setIsDeleting(true);
    try {
      await termoPlanejamentoService.delete(selectedTermo.id);
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
        <PageHeader title={t('planningTerm.title')} description="Gerencie os termos de planejamento das demandas" />
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
        title={t('planningTerm.title')}
        description="Gerencie os termos de planejamento das demandas"
        onAdd={handleAdd}
        addLabel={t('planningTerm.newTerm')}
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
          description="Nenhum termo de planejamento encontrado"
          icon={<FileCheck className="h-6 w-6 text-muted-foreground" />}
          action={
            <Button onClick={handleAdd}>
              {t('planningTerm.newTerm')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('planningTerm.demand')}</TableHead>
                  <TableHead>{t('planningTerm.openingDate')}</TableHead>
                  <TableHead>{t('planningTerm.totalCost')}</TableHead>
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
                    <TableCell>{formatDateTime(termo.dataAbertura)}</TableCell>
                    <TableCell>{formatCurrency(calcularCustoTotal(termo.custos))}</TableCell>
                    <TableCell>
                      {termo.dataAssinatura ? (
                        <Badge className="bg-success text-success-foreground">
                          {t('planningTerm.signed')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {t('planningTerm.notSigned')}
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
                              {t('planningTerm.sign')}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTermo ? t('planningTerm.editTerm') : t('planningTerm.newTerm')}
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
                    <FormLabel>{t('planningTerm.demand')} *</FormLabel>
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
                name="especificacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('planningTerm.specification')} *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Especificação técnica detalhada..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cronograma"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('planningTerm.schedule')} *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Cronograma de execução..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="resultadoEsperado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('planningTerm.expectedResult')} *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Resultado esperado ao final da execução..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custos Planejados */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t('planningTerm.costs')}</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddCusto}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('planningTerm.addCost')}
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
                              <Label className="text-xs">{t('planningTerm.profile')}</Label>
                              <Select 
                                value={custo.perfilId} 
                                onValueChange={(value) => handleCustoChange(index, 'perfilId', value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Perfil" />
                                </SelectTrigger>
                                <SelectContent>
                                  {isLoadingPerfis ? (
                                    <SelectItem value="" disabled>Carregando...</SelectItem>
                                  ) : (
                                    perfis.map((perfil) => (
                                      <SelectItem key={perfil.id} value={String(perfil.id)}>
                                        {perfil.nome}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">{t('planningTerm.hours')}</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={custo.qtdeHora}
                                onChange={(e) => handleCustoChange(index, 'qtdeHora', e.target.value)}
                                placeholder="Horas"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">{t('planningTerm.hourlyRate')}</Label>
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
              {t('planningTerm.deleteConfirm')}
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
