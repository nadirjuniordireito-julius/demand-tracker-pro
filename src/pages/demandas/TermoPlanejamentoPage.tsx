import { useState } from 'react';
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
import { PageHeader, SearchFilterBar, EmptyState } from '@/components/common/PageComponents';
import { termoPlanejamentoSchema, type TermoPlanejamentoFormData } from '@/lib/validations';
import type { TermoPlanejamento, TermoPlanejamentoCusto } from '@/types';

// Mock data
const mockTermos: (TermoPlanejamento & { custos: TermoPlanejamentoCusto[] })[] = [
  { 
    id: 1, 
    demandaTecnicaId: 1,
    especificacao: 'Desenvolvimento de módulo de relatórios com exportação para PDF e Excel.',
    cronograma: 'Fase 1: Análise (2 semanas)\nFase 2: Desenvolvimento (4 semanas)\nFase 3: Testes (2 semanas)',
    resultadoEsperado: 'Módulo de relatórios funcional com todas as funcionalidades especificadas.',
    dataAbertura: '2024-01-22T10:30:00',
    usuarioId: 1,
    dataAssinatura: '2024-01-23T14:00:00',
    custos: [
      { id: 1, termoPlanejamentoId: 1, perfilId: 1, qtdeHora: 160, valorHora: 150 },
      { id: 2, termoPlanejamentoId: 1, perfilId: 2, qtdeHora: 320, valorHora: 100 },
    ],
  },
  { 
    id: 2, 
    demandaTecnicaId: 2,
    especificacao: 'Integração via API REST com sistema financeiro externo.',
    cronograma: 'Fase 1: Análise de APIs (1 semana)\nFase 2: Desenvolvimento (3 semanas)\nFase 3: Testes de integração (1 semana)',
    resultadoEsperado: 'Integração funcionando com sincronização bidirecional de dados.',
    dataAbertura: '2024-02-17T14:00:00',
    usuarioId: 2,
    dataAssinatura: null,
    custos: [
      { id: 3, termoPlanejamentoId: 2, perfilId: 1, qtdeHora: 80, valorHora: 150 },
    ],
  },
];

const mockDemandas = [
  { id: 1, codigo: 'DEM-2024-001', nome: 'Desenvolvimento do Módulo de Relatórios' },
  { id: 2, codigo: 'DEM-2024-002', nome: 'Integração com Sistema Externo' },
  { id: 3, codigo: 'DEM-2024-003', nome: 'Implementação de Dashboard' },
];

const mockPerfis = [
  { id: 1, nome: 'Analista Sênior' },
  { id: 2, nome: 'Desenvolvedor Pleno' },
  { id: 3, nome: 'Gerente de Projetos' },
];

interface CustoForm {
  perfilId: string;
  qtdeHora: string;
  valorHora: string;
}

export default function TermoPlanejamentoPage() {
  const { t } = useTranslation();
  const [termos, setTermos] = useState(mockTermos);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<typeof mockTermos[0] | null>(null);
  const [custos, setCustos] = useState<CustoForm[]>([]);
  const [custoErrors, setCustoErrors] = useState<Record<number, string>>({});

  const form = useForm<TermoPlanejamentoFormData>({
    resolver: zodResolver(termoPlanejamentoSchema),
    defaultValues: {
      demandaTecnicaId: '',
      especificacao: '',
      cronograma: '',
      resultadoEsperado: '',
    },
  });

  const filteredTermos = termos.filter((termo) => {
    const demanda = mockDemandas.find(d => d.id === termo.demandaTecnicaId);
    return demanda?.nome.toLowerCase().includes(search.toLowerCase()) ||
           demanda?.codigo.toLowerCase().includes(search.toLowerCase());
  });

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

  const calcularCustoTotal = (custosList: TermoPlanejamentoCusto[]) => {
    return custosList.reduce((total, c) => total + (c.qtdeHora * c.valorHora), 0);
  };

  const handleAdd = () => {
    setSelectedTermo(null);
    form.reset({ demandaTecnicaId: '', especificacao: '', cronograma: '', resultadoEsperado: '' });
    setCustos([]);
    setCustoErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (termo: typeof mockTermos[0]) => {
    setSelectedTermo(termo);
    form.reset({
      demandaTecnicaId: String(termo.demandaTecnicaId),
      especificacao: termo.especificacao,
      cronograma: termo.cronograma,
      resultadoEsperado: termo.resultadoEsperado,
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

  const handleSign = (termo: typeof mockTermos[0]) => {
    setTermos(termos.map(t => 
      t.id === termo.id 
        ? { ...t, dataAssinatura: new Date().toISOString() }
        : t
    ));
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
    // Clear error when user starts typing
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

  const onSubmit = (data: TermoPlanejamentoFormData) => {
    if (!validateCustos()) return;

    const custosFormatted = custos
      .filter(c => c.perfilId && c.qtdeHora && c.valorHora)
      .map((c, index) => ({
        id: index + 1,
        termoPlanejamentoId: selectedTermo?.id || termos.length + 1,
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
              especificacao: data.especificacao,
              cronograma: data.cronograma,
              resultadoEsperado: data.resultadoEsperado,
              custos: custosFormatted,
            }
          : t
      ));
    } else {
      const newTermo = {
        id: Math.max(...termos.map(t => t.id), 0) + 1,
        demandaTecnicaId: Number(data.demandaTecnicaId),
        especificacao: data.especificacao,
        cronograma: data.cronograma,
        resultadoEsperado: data.resultadoEsperado,
        dataAbertura: new Date().toISOString(),
        usuarioId: 1,
        dataAssinatura: null,
        custos: custosFormatted,
      };
      setTermos([...termos, newTermo]);
    }
    setIsFormOpen(false);
    form.reset();
  };

  const handleConfirmDelete = () => {
    if (selectedTermo) {
      setTermos(termos.filter(t => t.id !== selectedTermo.id));
    }
    setIsDeleteOpen(false);
  };

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
        onRefresh={() => {}}
      />

      {filteredTermos.length === 0 ? (
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
              {filteredTermos.map((termo) => (
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
                        <Button variant="ghost" size="icon">
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

              {/* Custos */}
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
                                  {mockPerfis.map((perfil) => (
                                    <SelectItem key={perfil.id} value={String(perfil.id)}>
                                      {perfil.nome}
                                    </SelectItem>
                                  ))}
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
                                min="1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">{t('planningTerm.hourlyRate')}</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={custo.valorHora}
                                onChange={(e) => handleCustoChange(index, 'valorHora', e.target.value)}
                                placeholder="R$ 0,00"
                                min="0.01"
                                step="0.01"
                              />
                            </div>
                          </div>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleRemoveCusto(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {custoErrors[index] && (
                          <p className="text-sm text-destructive px-3">{custoErrors[index]}</p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {t('common.save')}
                </Button>
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
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
