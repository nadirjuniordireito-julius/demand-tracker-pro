import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Plus,
  X,
  Upload,
  FileText,
  Trash2,
  Eye,
  FileDown,
  Calendar,
  AlertTriangle,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import logoUfla from '@/assets/ufla1.png';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { termoPlanejamentoService } from '@/services/termoService';
import { termoPlanejamentoDocService } from '@/services/termoDocService';
import { demandaService } from '@/services/demandaService';
import { perfilService } from '@/services/perfilService';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { termoPlanejamentoSchema, type TermoPlanejamentoFormData } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import { canCreateTermoPlanejamento, canUploadTermoPlanejamento, canDeleteTermoPlanejamento, canSaveTermoPlanejamento, canDeleteDocTermoPlanejamento, normalizeDemandaStatus } from '@/lib/demandaStatus';
import type { TermoPlanejamento, TermoPlanejamentoCusto, DemandaTecnica, Perfil, TermoPlanejamentoDocResponseDTO } from '@/types';

interface CustoForm {
  perfilId: string;
  qtdeHora: string;
  valorHora: string;
}

export default function TermoPlanejamentoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const [demanda, setDemanda] = useState<DemandaTecnica | null>(null);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<TermoPlanejamento | null>(null);
  const [custos, setCustos] = useState<CustoForm[]>([]);
  const [custoErrors, setCustoErrors] = useState<Record<number, string>>({});
  const [isLoadingDemanda, setIsLoadingDemanda] = useState(true);
  const [isLoadingTermo, setIsLoadingTermo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoadingPerfis, setIsLoadingPerfis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documento, setDocumento] = useState<TermoPlanejamentoDocResponseDTO | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [isDeleteDocOpen, setIsDeleteDocOpen] = useState(false);
  const [isViewDocOpen, setIsViewDocOpen] = useState(false);
  const [isViewGeneratedPdfOpen, setIsViewGeneratedPdfOpen] = useState(false);
  const { toast } = useToast();

  // Evita deslocamento de timezone: "2025-01-15" sem hora é interpretado como UTC meia-noite
  const parseDateOnly = (dateStr: string) => {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const form = useForm<TermoPlanejamentoFormData>({
    resolver: zodResolver(termoPlanejamentoSchema),
    defaultValues: {
      demandaTecnicaId: '',
      dataAbertura: new Date(),
      especificacao: '',
      cronograma: '',
      dataInicioExecucao: undefined as Date | undefined,
      dataFimExecucao: undefined as Date | undefined,
      resultadoEsperado: '',
    },
  });

  // Carrega perfis do projeto selecionado
  const loadPerfis = useCallback(async () => {
    if (!selectedProject) return;
    
    setIsLoadingPerfis(true);
    try {
      const response = await perfilService.findAll({ 
        projetoId: selectedProject.id,
        size: 1000 
      });
      setPerfis(response.content);
    } catch (err) {
      console.error('Erro ao carregar perfis:', err);
    } finally {
      setIsLoadingPerfis(false);
    }
  }, [selectedProject]);

  // Carrega a demanda e o termo existente
  const loadData = useCallback(async () => {
    const demandaId = searchParams.get('demandaId');
    
    if (!demandaId) {
      setError('Demanda não especificada');
      setIsLoadingDemanda(false);
      setIsLoadingTermo(false);
      return;
    }

    try {
      setIsLoadingDemanda(true);
      setIsLoadingTermo(true);
      setError(null);

      // Carrega a demanda
      const demandaData = await demandaService.findById(Number(demandaId));
      setDemanda(demandaData);
      
      // Pré-preenche o campo de demanda no formulário
      form.setValue('demandaTecnicaId', String(demandaId));

      // Busca termo existente
      const termoExistente = await termoPlanejamentoService.findByDemandaId(Number(demandaId));
      
      if (termoExistente) {
        // Se existe, carrega os dados
        setSelectedTermo(termoExistente);
        form.reset({
          demandaTecnicaId: String(termoExistente.demandaTecnicaId),
          dataAbertura: termoExistente.dataAbertura ? parseDateOnly(termoExistente.dataAbertura) : new Date(),
          especificacao: termoExistente.especificacao,
          cronograma: termoExistente.cronograma,
          dataInicioExecucao: termoExistente.dataInicioExecucao ? parseDateOnly(termoExistente.dataInicioExecucao) : undefined,
          dataFimExecucao: termoExistente.dataFimExecucao ? parseDateOnly(termoExistente.dataFimExecucao) : undefined,
          resultadoEsperado: termoExistente.resultadoEsperado,
        });
        setCustos((termoExistente.custos || []).map(c => ({
          perfilId: String(c.perfilId),
          qtdeHora: String(c.qtdeHora),
          valorHora: String(c.valorHora),
        })));
        
        // Busca documento se existir
        setIsLoadingDoc(true);
        try {
          const doc = await termoPlanejamentoDocService.findByTermoPlanejamentoId(termoExistente.id);
          setDocumento(doc);
        } catch {
          setDocumento(null);
        } finally {
          setIsLoadingDoc(false);
        }
      } else {
        // Se não existe, cria em branco
        setSelectedTermo(null);
        setDocumento(null);
        form.reset({
          demandaTecnicaId: String(demandaId),
          dataAbertura: new Date(),
          especificacao: '',
          cronograma: '',
          dataInicioExecucao: undefined,
          dataFimExecucao: undefined,
          resultadoEsperado: '',
        });
        setCustos([]);
      }

      // Abre o modal automaticamente
      setIsFormOpen(true);
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Erro ao carregar dados:', err);
      setError(getErrorMessage(err, 'Erro ao carregar dados da demanda'));
    } finally {
      setIsLoadingDemanda(false);
      setIsLoadingTermo(false);
    }
  }, [searchParams, form]);

  useEffect(() => {
    loadPerfis();
  }, [loadPerfis]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    const updatedCustos = custos.map((c, i) => {
      if (i === index) {
        const updatedCusto = { ...c, [field]: value };
        
        // Preenche automaticamente o valor/hora quando perfil for selecionado
        if (field === 'perfilId') {
          const perfilId = value;
          
          if (perfilId) {
            const perfil = perfis.find(p => p.id === Number(perfilId));
            
            if (perfil && perfil.valor) {
              // Apenas preenche com o valor do perfil (sem multiplicar por horas)
              updatedCusto.valorHora = perfil.valor.toFixed(2);
            }
          }
        }
        
        return updatedCusto;
      }
      return c;
    });
    
    setCustos(updatedCustos);
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
        errors[index] = t('common.fillAllCostFields');
      } else if (Number(custo.qtdeHora) <= 0 || Number(custo.valorHora) <= 0) {
        errors[index] = t('common.valuesMustBePositive');
      }
    });
    setCustoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (data: TermoPlanejamentoFormData) => {
    if (!validateCustos() || !user) return;

    // Regra: salvar só se status C ou D
    if (!canSaveTermoPlanejamento(demanda?.status ?? demanda?.situacao)) {
      toast({
        title: t('common.error'),
        description: t('planningTerm.statusRestrictionSave'),
        variant: 'destructive',
      });
      return;
    }

    // Regra: criar só se status C; editar se status D
    if (!selectedTermo && !canCreateTermoPlanejamento(demanda?.status ?? demanda?.situacao)) {
      toast({
        title: t('common.error'),
        description: t('planningTerm.statusRestrictionCreate'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const custosFormatted = custos
        .filter(c => c.perfilId && c.qtdeHora && c.valorHora)
        .map(c => ({
          perfilId: Number(c.perfilId),
          qtdeHora: Number(c.qtdeHora),
          valorHora: Number(c.valorHora),
        }));

      const dataAberturaStr = data.dataAbertura.toISOString().split('T')[0];
      const dataInicioExecucaoStr = data.dataInicioExecucao?.toISOString().split('T')[0];
      const dataFimExecucaoStr = data.dataFimExecucao?.toISOString().split('T')[0];

      let termoSalvo: TermoPlanejamento;

      if (selectedTermo) {
        termoSalvo = await termoPlanejamentoService.update(selectedTermo.id, {
          especificacao: data.especificacao,
          cronograma: data.cronograma,
          resultadoEsperado: data.resultadoEsperado,
          dataAbertura: dataAberturaStr,
          dataInicioExecucao: dataInicioExecucaoStr,
          dataFimExecucao: dataFimExecucaoStr,
          custos: custosFormatted,
        });
      } else {
        termoSalvo = await termoPlanejamentoService.create({
          demandaTecnicaId: Number(data.demandaTecnicaId),
          especificacao: data.especificacao,
          cronograma: data.cronograma,
          resultadoEsperado: data.resultadoEsperado,
          dataAbertura: dataAberturaStr,
          dataInicioExecucao: dataInicioExecucaoStr,
          dataFimExecucao: dataFimExecucaoStr,
          usuarioId: user.id,
          custos: custosFormatted,
        });
        // Regra: ao criar Termo de Planejamento, demanda passa para status D
        await demandaService.update(Number(data.demandaTecnicaId), { status: 'D' });
      }
      
      // Atualiza o termo selecionado
      setSelectedTermo(termoSalvo);
      
      // Recarrega demanda para obter status atualizado
      if (demanda) {
        const demandaAtualizada = await demandaService.findById(demanda.id);
        setDemanda(demandaAtualizada);
      }
      
      // Busca documento se existir
      setIsLoadingDoc(true);
      try {
        const doc = await termoPlanejamentoDocService.findByTermoPlanejamentoId(termoSalvo.id);
        setDocumento(doc);
      } catch {
        setDocumento(null);
      } finally {
        setIsLoadingDoc(false);
      }
      
      // Não fecha o modal, apenas mostra sucesso
      toast({
        title: t('common.success'),
        description: selectedTermo 
          ? t('planningTerm.updatedSuccess')
          : t('planningTerm.createdSuccess'),
      });
    } catch (error) {
      // Erro já é tratado automaticamente pela API (toast será exibido)
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsFormOpen(false);
    navigate('/demandas');
  };

  const handleDelete = () => {
    if (selectedTermo && canDeleteTermoPlanejamento(demanda?.status)) {
      setIsDeleteOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTermo) return;
    
    setIsDeleting(true);
    try {
      await termoPlanejamentoService.delete(selectedTermo.id);
      // Regra: ao excluir Termo de Planejamento, demanda volta para status C
      if (demanda) {
        await demandaService.update(demanda.id, { status: 'C' });
      }
      setIsDeleteOpen(false);
      setIsFormOpen(false);
      // Redireciona de volta para a página de demandas
      navigate('/demandas');
    } catch (error) {
      // Erro já é tratado automaticamente pela API (toast será exibido)
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenUpload = () => {
    if (!selectedTermo) {
      toast({
        title: t('common.error'),
        description: 'É necessário salvar o termo antes de fazer upload do documento',
        variant: 'destructive',
      });
      return;
    }
    if (!canUploadTermoPlanejamento(demanda?.status)) {
      toast({
        title: t('common.error'),
        description: t('planningTerm.statusRestrictionUpload'),
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile(null);
    setIsUploadOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Valida se é PDF
      if (file.type !== 'application/pdf') {
        toast({
          title: t('common.error'),
          description: 'O arquivo deve ser um PDF',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedTermo) return;

    setIsUploading(true);
    try {
      let docResponse: TermoPlanejamentoDocResponseDTO;
      
      // Verifica se já existe documento
      const docExists = await termoPlanejamentoDocService.exists(selectedTermo.id);
      
      if (docExists && documento) {
        // Atualiza documento existente
        docResponse = await termoPlanejamentoDocService.update(documento.id, selectedFile);
      } else {
        // Cria novo documento
        docResponse = await termoPlanejamentoDocService.upload(selectedTermo.id, selectedFile);
      }

      setDocumento(docResponse);
      setIsUploadOpen(false);
      setSelectedFile(null);
      
      // Regra: ao fazer upload do documento assinado, demanda passa para status E
      if (demanda) {
        await demandaService.update(demanda.id, { status: 'E' });
        const demandaAtualizada = await demandaService.findById(demanda.id);
        setDemanda(demandaAtualizada);
      }
      
      // Recarrega o termo para atualizar a data de assinatura se houver
      if (selectedTermo) {
        const termoAtualizado = await termoPlanejamentoService.findById(selectedTermo.id);
        setSelectedTermo(termoAtualizado);
      }

      toast({
        title: t('common.success'),
        description: t('planningTerm.uploadSuccess'),
      });
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('planningTerm.uploadError')),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewDocument = () => {
    if (documento) setIsViewDocOpen(true);
  };

  const handleGeneratePdf = () => {
    if (!selectedTermo || !selectedProject || !demanda) {
      toast({
        title: t('common.error'),
        description: t('planningTerm.generatePdfError'),
        variant: 'destructive',
      });
      return;
    }
    setIsViewGeneratedPdfOpen(true);
  };

  const handleDeleteDocument = () => {
    if (documento && canDeleteDocTermoPlanejamento(demanda?.status ?? demanda?.situacao)) {
      setIsDeleteDocOpen(true);
    }
  };

  const handleConfirmDeleteDocument = async () => {
    if (!documento || !selectedTermo) return;
    if (!canDeleteDocTermoPlanejamento(demanda?.status ?? demanda?.situacao)) return;

    setIsDeletingDoc(true);
    try {
      await termoPlanejamentoDocService.delete(documento.id);
      
      // Limpa o documento do estado
      setDocumento(null);
      setIsDeleteDocOpen(false);
      
      // Recarrega o termo para atualizar a data de assinatura (deve estar null agora)
      const termoAtualizado = await termoPlanejamentoService.findById(selectedTermo.id);
      setSelectedTermo(termoAtualizado);
      
      toast({
        title: t('common.success'),
        description: t('planningTerm.documentDeletedSuccess'),
      });
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('planningTerm.documentDeleteError')),
        variant: 'destructive',
      });
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Estado de erro
  if (error && !isLoadingDemanda && !isLoadingTermo) {
    return (
      <div className="space-y-6 p-6">
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadData}
          retryText={t('common.retry')}
        />
        <Button onClick={() => navigate('/demandas')} variant="outline">
          {t('common.back')}
        </Button>
      </div>
    );
  }

  // Estado de carregamento
  if (isLoadingDemanda || isLoadingTermo) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form Dialog - fecha pelo X do header ou botões (regra global no DialogContent) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeaderStandard
            title={selectedTermo ? t('planningTerm.editTerm') : t('planningTerm.newTerm')}
            description={selectedTermo 
              ? t('common.editTerm')
              : t('common.fillTerm')}
          />
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="demandaTecnicaId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input type="hidden" {...field} value={field.value ?? ''} />
                    </FormControl>
                    {demanda && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('common.demandCodeLabel')}</TableHead>
                            
                            <TableHead>{t('common.metaCodeLabel')}</TableHead>
                            <TableHead>{t('common.productCodeLabel')}</TableHead>
                            <TableHead>{t('common.productTotalPlannedLabel')}</TableHead>
                            <TableHead>{t('common.productTotalExecutedLabel')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>{demanda.codigo}</TableCell>
                           
                            <TableCell>{demanda.metaProduto?.projetoMeta?.codigo ?? '—'}</TableCell>
                            <TableCell>{demanda.metaProduto?.codigo ?? '—'}</TableCell>
                            <TableCell>
                              {demanda.metaProduto != null && typeof demanda.metaProduto.quantidade === 'number' && typeof demanda.metaProduto.valorUnitario === 'number'
                                ? formatCurrency(demanda.metaProduto.quantidade * demanda.metaProduto.valorUnitario)
                                : '—'}
                            </TableCell>
                            <TableCell>
                              {typeof demanda.totalExecutadoProduto === 'number'
                                ? formatCurrency(demanda.totalExecutadoProduto)
                                : '—'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataAbertura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('planningTerm.openingDate')} *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
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
                          defaultMonth={field.value ?? new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Abas para organizar os campos */}
              <Tabs defaultValue="especificacao" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="especificacao">{t('planningTerm.specification')}</TabsTrigger>
                  <TabsTrigger value="cronograma">{t('planningTerm.schedule')}</TabsTrigger>
                  <TabsTrigger value="resultado">{t('planningTerm.expectedResult')}</TabsTrigger>
                  <TabsTrigger value="custos">{t('planningTerm.costs')}</TabsTrigger>
                </TabsList>
                
                {/* Aba: Especificação */}
                <TabsContent value="especificacao" className="mt-4">
                  <FormField
                    control={form.control}
                    name="especificacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('planningTerm.specification')} *</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder={t('common.specificationPlaceholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Aba: Cronograma */}
                <TabsContent value="cronograma" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dataInicioExecucao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('planningTerm.executionStartDate')}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "dd/MM/yyyy") : t('common.select')}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value ?? undefined}
                                onSelect={field.onChange}
                                defaultMonth={field.value ?? new Date()}
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
                      name="dataFimExecucao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('planningTerm.executionEndDate')}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "dd/MM/yyyy") : t('common.select')}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value ?? undefined}
                                onSelect={field.onChange}
                                defaultMonth={field.value ?? new Date()}
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
                  <FormField
                    control={form.control}
                    name="cronograma"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('planningTerm.schedule')} *</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder={t('common.schedulePlaceholder')}
                            height="20px"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Aba: Resultado Esperado */}
                <TabsContent value="resultado" className="mt-4">
                  <FormField
                    control={form.control}
                    name="resultadoEsperado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('planningTerm.expectedResult')} *</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder={t('common.expectedResultPlaceholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Aba: Custos */}
                <TabsContent value="custos" className="mt-4 space-y-4">
                  {demanda?.metaProduto != null && typeof demanda.metaProduto.quantidade === 'number' && typeof demanda.metaProduto.valorUnitario === 'number' && (() => {
                    const totalPlanned = demanda.metaProduto!.quantidade * demanda.metaProduto!.valorUnitario;
                    const totalExecuted = typeof demanda.totalExecutadoProduto === 'number' ? demanda.totalExecutadoProduto : 0;
                    const totalFormCosts = custos.reduce((acc, c) => acc + (Number(c.qtdeHora) || 0) * (Number(c.valorHora) || 0), 0);
                    if (totalExecuted + totalFormCosts > totalPlanned) {
                      return (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>{t('common.costExceedsPlannedTitle')}</AlertTitle>
                          <AlertDescription>
                            {t('common.costExceedsPlannedDescription', {
                              formTotal: formatCurrency(totalFormCosts),
                              executedTotal: formatCurrency(totalExecuted),
                              plannedTotal: formatCurrency(totalPlanned),
                            })}
                          </AlertDescription>
                        </Alert>
                      );
                    }
                    return null;
                  })()}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{t('planningTerm.costs')}</CardTitle>
                        <Button type="button" variant="ghost" size="sm" onClick={handleAddCusto}>
                          <Plus className="h-4 w-4 mr-1" />
                          {t('planningTerm.addCost')}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {custos.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t('common.noCostsAdded')}
                        </p>
                      ) : (
                        <>
                          <div className="flex gap-2 pb-1.5 border-b">
                            <div className="flex-1 grid grid-cols-6 gap-2">
                              <span className="col-span-3 text-xs font-medium text-muted-foreground">
                                {t('planningTerm.profile')}
                              </span>
                              <span className="col-span-1 text-xs font-medium text-muted-foreground">
                                {t('planningTerm.hours')}
                              </span>
                              <span className="col-span-1 text-xs font-medium text-muted-foreground">
                                {t('planningTerm.hourlyRate')}
                              </span>
                              <span className="col-span-1 text-xs font-medium text-muted-foreground">
                                {t('planningTerm.lineTotal')}
                              </span>
                            </div>
                            <div className="w-8 shrink-0" aria-hidden />
                          </div>
                          {custos.map((custo, index) => {
                            const horas = Number(custo.qtdeHora) || 0;
                            const valorHora = Number(custo.valorHora) || 0;
                            const totalLinha = horas * valorHora;
                            return (
                              <div key={'id' in custo && custo.id != null ? String(custo.id) : `custo-${index}`} className="space-y-1">
                                <div className="flex items-center gap-2 py-1.5 px-2 bg-muted/50 rounded-md">
                                  <div className="flex-1 grid grid-cols-6 gap-2">
                                    <div className="col-span-3">
                                      <Select
                                        value={custo.perfilId}
                                        onValueChange={(value) => handleCustoChange(index, 'perfilId', value)}
                                      >
                                        <SelectTrigger className="h-8">
                                        <SelectValue placeholder={t('common.selectProfile')} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {isLoadingPerfis ? (
                                          <SelectItem value="" disabled>{t('common.loading')}</SelectItem>
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
                                    <Input
                                      className="col-span-1 h-8"
                                      type="number"
                                      value={custo.qtdeHora}
                                      onChange={(e) => handleCustoChange(index, 'qtdeHora', e.target.value)}
                                      placeholder={t('common.hoursPlaceholder')}
                                    />
                                    <div className="col-span-1 flex items-center h-8 px-3 rounded-md border border-input bg-muted/30 text-sm text-muted-foreground justify-end text-right">
                                      {custo.valorHora ? formatCurrency(Number(custo.valorHora)) : '—'}
                                    </div>
                                    <div className="col-span-1 flex items-center h-8 px-3 rounded-md border border-input bg-muted/30 text-sm font-medium justify-end text-right">
                                      {totalLinha > 0 ? formatCurrency(totalLinha) : '—'}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveCusto(index)}
                                    aria-label={t('common.remove')}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                {custoErrors[index] && (
                                  <p className="text-xs text-destructive">{custoErrors[index]}</p>
                                )}
                              </div>
                            );
                          })}
                          <div className="flex gap-2 pt-2 mt-2 border-t font-medium">
                            <div className="flex-1 grid grid-cols-6 gap-2 items-center">
                              <span className="col-span-3" />
                              <span className="col-span-2 text-xs font-medium text-muted-foreground text-right">
                                {t('planningTerm.totalCost')}
                              </span>
                              <span className="col-span-1 text-sm text-right">
                                {formatCurrency(
                                  custos.reduce(
                                    (acc, c) => acc + (Number(c.qtdeHora) || 0) * (Number(c.valorHora) || 0),
                                    0
                                  )
                                )}
                              </span>
                            </div>
                            <div className="w-8 shrink-0" />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              {/* Documento anexado - indicador visual */}
              {selectedTermo && documento && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{documento.nomeArquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {documento.dataAssinatura 
                        ? `${t('planningTerm.signatureDate')}: ${new Date(documento.dataAssinatura).toLocaleDateString('pt-BR')}`
                        : t('planningTerm.notSigned')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleViewDocument}
                      disabled={isDeletingDoc || isSaving || isDeleting}
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      title={t('planningTerm.viewDocument')}
                      aria-label={t('planningTerm.viewDocument')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteDocument}
                      disabled={isDeletingDoc || isSaving || isDeleting || !canDeleteDocTermoPlanejamento(demanda?.status ?? demanda?.situacao)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title={t('planningTerm.deleteDocument')}
                      aria-label={t('planningTerm.deleteDocument')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  {selectedTermo && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isSaving || isDeleting || isLoadingDoc}
                          className="gap-2"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          {t('planningTerm.documentAndAttachments')}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[220px]">
                        <DropdownMenuItem
                          onClick={handleGeneratePdf}
                          disabled={!selectedProject || !canUploadTermoPlanejamento(demanda?.status)}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          {t('planningTerm.generatePdf')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleOpenUpload}
                          disabled={!canUploadTermoPlanejamento(demanda?.status)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {documento ? t('planningTerm.replaceDocument') : t('planningTerm.uploadDocument')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {selectedTermo && normalizeDemandaStatus(demanda?.status ?? demanda?.situacao) !== 'G' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleDelete}
                      disabled={isSaving || isDeleting || !canDeleteTermoPlanejamento(demanda?.status)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving || isDeleting}>
                    {t('common.cancel')}
                  </Button>
                  {normalizeDemandaStatus(demanda?.status ?? demanda?.situacao) !== 'G' && (
                    <LoadingButton
                      type="submit"
                      isLoading={isSaving}
                      loadingText={t('common.saving')}
                      disabled={isDeleting || !canSaveTermoPlanejamento(demanda?.status ?? demanda?.situacao)}
                    >
                      {t('common.save')}
                    </LoadingButton>
                  )}
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - fecha apenas pelos botões */}
      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (open) setIsDeleteOpen(true);
        }}
      >
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

      {/* Upload Document Dialog - fecha apenas pelos botões */}
      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          if (open) setIsUploadOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('planningTerm.uploadDocumentTitle')}</DialogTitle>
            <DialogDescription>
              {t('planningTerm.uploadDocumentDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="pdf-upload" className="text-sm font-medium">
                {t('planningTerm.selectFile')}
              </label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={isUploading}
                className="cursor-pointer"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-xs">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              )}
              {!selectedFile && (
                <p className="text-sm text-muted-foreground">
                  {t('planningTerm.noFileSelected')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
              {t('common.cancel')}
            </Button>
            <LoadingButton 
              onClick={handleUpload}
              isLoading={isUploading}
              loadingText={t('common.saving')}
              disabled={!selectedFile}
            >
              {t('common.save')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation Dialog - fecha apenas pelos botões */}
      <Dialog
        open={isDeleteDocOpen}
        onOpenChange={(open) => {
          if (open) setIsDeleteDocOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('planningTerm.deleteDocumentConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('planningTerm.deleteDocumentConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDocOpen(false)} disabled={isDeletingDoc}>
              {t('common.cancel')}
            </Button>
            <LoadingButton 
              variant="destructive" 
              onClick={handleConfirmDeleteDocument}
              isLoading={isDeletingDoc}
              loadingText={t('common.deleting')}
            >
              {t('common.delete')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PdfPreviewDialog
        open={isViewDocOpen}
        onOpenChange={setIsViewDocOpen}
        title={t('planningTerm.viewDocumentTitle')}
        description={documento?.nomeArquivo}
        fetchPdf={() => termoPlanejamentoDocService.downloadById(documento!.id)}
        loadingLabel={t('common.loading')}
        errorMessage={t('planningTerm.documentViewError')}
        closeLabel={t('common.close')}
        onError={(err: unknown) =>
          toast({
            title: t('common.error'),
            description: getErrorMessage(err, t('planningTerm.documentViewError')),
            variant: 'destructive',
          })
        }
      />

      <PdfPreviewDialog
        open={isViewGeneratedPdfOpen}
        onOpenChange={(open) => {
          setIsViewGeneratedPdfOpen(open);
          if (!open && selectedTermo) {
            termoPlanejamentoDocService
              .findByTermoPlanejamentoId(selectedTermo.id)
              .then(setDocumento)
              .catch(() => setDocumento(null));
          }
        }}
        title={t('planningTerm.viewGeneratedPdfTitle')}
        description={t('planningTerm.viewGeneratedPdfDescription')}
        fetchPdf={() =>
          termoPlanejamentoService.gerarTermoAssinatura(
            selectedTermo!.id,
            selectedProject!.id,
            'P',
            { logoUfla }
          )
        }
        loadingLabel={t('planningTerm.generatingPdf')}
        errorMessage={t('planningTerm.generatePdfError')}
        downloadFileName={selectedTermo ? `termo-planejamento-${selectedTermo.id}.pdf` : undefined}
        closeLabel={t('common.close')}
        downloadLabel={t('common.download')}
        onError={(err: unknown) =>
          toast({
            title: t('common.error'),
            description: getErrorMessage(err, t('planningTerm.generatePdfError')),
            variant: 'destructive',
          })
        }
      />
    </div>
  );
}
