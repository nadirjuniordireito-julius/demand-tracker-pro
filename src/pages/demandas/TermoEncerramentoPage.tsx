import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Plus,
  Upload,
  FileText,
  Trash2,
  Eye,
  FileDown,
  Calendar,
  AlertTriangle,
  Paperclip,
  ChevronDown,
  MoreHorizontal,
  UserCircle,
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
import { TermoEncerramentoAnexosModal } from '@/components/termo/TermoEncerramentoAnexosModal';
import { CustoProfissionaisModal, type CustoProfissionalItem } from '@/components/termo/CustoProfissionaisModal';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { termoEncerramentoService, termoPlanejamentoService } from '@/services/termoService';
import { termoEncerramentoDocService, termoPlanejamentoDocService } from '@/services/termoDocService';
import { demandaService } from '@/services/demandaService';
import { perfilService } from '@/services/perfilService';
import { profissionalService } from '@/services/profissionalService';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { termoEncerramentoSchema, type TermoEncerramentoFormData } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import { canCreateTermoEncerramento, canUploadTermoEncerramento, canDeleteTermoEncerramento, canSaveTermoEncerramento, canDeleteDocTermoEncerramento, normalizeDemandaStatus } from '@/lib/demandaStatus';
import type { TermoEncerramento, TermoEncerramentoCusto, DemandaTecnica, Perfil, Profissional, TermoEncerramentoDocResponseDTO } from '@/types';

interface CustoForm {
  perfilId: string;
  qtdeHora: string;
  valorHora: string;
  profissionais: CustoProfissionalItem[];
}

export default function TermoEncerramentoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const [demanda, setDemanda] = useState<DemandaTecnica | null>(null);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<TermoEncerramento | null>(null);
  const [custos, setCustos] = useState<CustoForm[]>([]);
  const [custoProfissionaisModalIndex, setCustoProfissionaisModalIndex] = useState<number | null>(null);
  /** Custos do termo de planejamento (perfilId -> qtdeHora) para exibir "Qtde prevista" no modal de profissionais. */
  const [planejamentoCustosPorPerfil, setPlanejamentoCustosPorPerfil] = useState<Map<number, number>>(new Map());
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
  const [documento, setDocumento] = useState<TermoEncerramentoDocResponseDTO | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [isDeleteDocOpen, setIsDeleteDocOpen] = useState(false);
  const [isViewDocOpen, setIsViewDocOpen] = useState(false);
  const [isViewGeneratedPdfOpen, setIsViewGeneratedPdfOpen] = useState(false);
  const [isAnexosOpen, setIsAnexosOpen] = useState(false);
  const { toast } = useToast();

  // Evita deslocamento de timezone: "2025-01-15" sem hora é interpretado como UTC meia-noite
  const parseDateOnly = (dateStr: string) => {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const form = useForm<TermoEncerramentoFormData>({
    resolver: zodResolver(termoEncerramentoSchema),
    defaultValues: {
      demandaTecnicaId: '',
      dataTermo: new Date(),
      dataInicioExecucao: undefined as Date | undefined,
      dataFimExecucao: undefined as Date | undefined,
      resultadoEntregue: '',
    },
  });

  // Carrega perfis e profissionais do projeto selecionado
  const loadPerfis = useCallback(async () => {
    if (!selectedProject) return;
    setIsLoadingPerfis(true);
    try {
      const [perfisRes, profisRes] = await Promise.all([
        perfilService.findAll({ projetoId: selectedProject.id, size: 1000 }),
        profissionalService.findAll({ projetoId: selectedProject.id, size: 1000 }),
      ]);
      setPerfis(perfisRes.content);
      setProfissionais(profisRes.content);
    } catch (err) {
      console.error('Erro ao carregar perfis/profissionais:', err);
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
      const termoExistente = await termoEncerramentoService.findByDemandaId(Number(demandaId));
      
      if (termoExistente) {
        // Se existe, carrega os dados
        setSelectedTermo(termoExistente);
        const resultadoEntregueVal = termoExistente.resultadoEntregue?.trim() || '';
        form.reset({
          demandaTecnicaId: String(termoExistente.demandaTecnicaId),
          dataTermo: termoExistente.dataTermo ? parseDateOnly(termoExistente.dataTermo) : new Date(),
          dataInicioExecucao: termoExistente.dataInicioExecucao ? parseDateOnly(termoExistente.dataInicioExecucao) : undefined,
          dataFimExecucao: termoExistente.dataFimExecucao ? parseDateOnly(termoExistente.dataFimExecucao) : undefined,
          resultadoEntregue: resultadoEntregueVal,
        });
        setCustos((termoExistente.custos || []).map((c) => {
          const rawC = c as unknown as Record<string, unknown>;
          const profisList = (c.profissionais || []) as unknown as Record<string, unknown>[];
          return {
            perfilId: String(rawC.perfilId ?? rawC.perfil_id ?? ''),
            qtdeHora: String(rawC.qtdeHora ?? rawC.qtde_hora ?? ''),
            valorHora: String(rawC.valorHora ?? rawC.valor_hora ?? ''),
            profissionais: profisList.map((p) => {
              const prof = p.profissional as { id?: number } | undefined;
              const id = p.profissionalId ?? p.profissional_id ?? prof?.id;
              return {
                profissionalId: String(id ?? ''),
                qtdeHora: String(p.qtdeHora ?? p.qtde_hora ?? ''),
                valorHora: String(p.valorHora ?? p.valor_hora ?? ''),
              };
            }),
          };
        }));
        // Se Resultado Entregue estiver vazio, sugere o Resultado Esperado do Termo de Planejamento; guarda custos do planejamento para o modal de profissionais
        try {
          const termoPlanejamento = await termoPlanejamentoService.findByDemandaId(Number(demandaId));
          if (termoPlanejamento?.custos?.length) {
            setPlanejamentoCustosPorPerfil(new Map(termoPlanejamento.custos.map((c) => [c.perfilId, c.qtdeHora])));
          } else {
            setPlanejamentoCustosPorPerfil(new Map());
          }
          if (!resultadoEntregueVal && termoPlanejamento?.resultadoEsperado?.trim()) {
            form.setValue('resultadoEntregue', termoPlanejamento.resultadoEsperado.trim());
          }
        } catch {
          setPlanejamentoCustosPorPerfil(new Map());
        }
        // Busca documento se existir
        setIsLoadingDoc(true);
        try {
          const doc = await termoEncerramentoDocService.findByTermoEncerramentoId(termoExistente.id);
          setDocumento(doc);
        } catch {
          setDocumento(null);
        } finally {
          setIsLoadingDoc(false);
        }
      } else {
        // Se não existe, busca o Termo de Planejamento para copiar os custos
        setSelectedTermo(null);
        setDocumento(null);
        form.reset({
          demandaTecnicaId: String(demandaId),
          dataTermo: new Date(),
          dataInicioExecucao: undefined,
          dataFimExecucao: undefined,
          resultadoEntregue: '',
        });
        
        // Busca o Termo de Planejamento para copiar custos e datas de início/fim (só para registro novo)
        try {
          const termoPlanejamento = await termoPlanejamentoService.findByDemandaId(Number(demandaId));
          
          if (termoPlanejamento) {
            if (termoPlanejamento.custos && termoPlanejamento.custos.length > 0) {
              setPlanejamentoCustosPorPerfil(new Map(termoPlanejamento.custos.map((c) => [c.perfilId, c.qtdeHora])));
              // Copia os custos do Termo de Planejamento (profissionais ficam vazios; usuário compõe na aba Custos)
              setCustos(termoPlanejamento.custos.map(c => ({
                perfilId: String(c.perfilId),
                qtdeHora: String(c.qtdeHora),
                valorHora: String(c.valorHora),
                profissionais: [],
              })));
              toast({
                title: t('common.success'),
                description: t('closingTerm.costsCopiedFromPlanning'),
              });
            } else {
              setPlanejamentoCustosPorPerfil(new Map());
              setCustos([]);
            }
            // Aproveita datas de início e fim de execução do Termo de Planejamento
            if (termoPlanejamento.dataInicioExecucao) {
              form.setValue('dataInicioExecucao', parseDateOnly(termoPlanejamento.dataInicioExecucao));
            }
            if (termoPlanejamento.dataFimExecucao) {
              form.setValue('dataFimExecucao', parseDateOnly(termoPlanejamento.dataFimExecucao));
            }
            // Sugestão de preenchimento: Resultado Entregue com o Resultado Esperado do planejamento
            if (termoPlanejamento.resultadoEsperado?.trim()) {
              form.setValue('resultadoEntregue', termoPlanejamento.resultadoEsperado.trim());
            }
          } else {
            setCustos([]);
          }
        } catch (err) {
          console.warn('Erro ao buscar termo de planejamento para copiar custos:', err);
          setPlanejamentoCustosPorPerfil(new Map());
          setCustos([]);
        }
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
    setCustos([...custos, { perfilId: '', qtdeHora: '', valorHora: '', profissionais: [] }]);
  };

  const handleRemoveCusto = (index: number) => {
    setCustos(custos.filter((_, i) => i !== index));
    const newErrors = { ...custoErrors };
    delete newErrors[index];
    setCustoErrors(newErrors);
    if (custoProfissionaisModalIndex === index) setCustoProfissionaisModalIndex(null);
    else if (custoProfissionaisModalIndex != null && custoProfissionaisModalIndex > index) setCustoProfissionaisModalIndex(custoProfissionaisModalIndex - 1);
  };

  const handleConfirmCustoProfissionais = (index: number, items: CustoProfissionalItem[]) => {
    const totalHoras = items.reduce((acc, i) => acc + (Number(i.qtdeHora) || 0), 0);
    setCustos(prev =>
      prev.map((c, i) =>
        i === index ? { ...c, profissionais: items, qtdeHora: totalHoras.toFixed(2) } : c
      )
    );
    setCustoProfissionaisModalIndex(null);
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
      if (!custo.perfilId) {
        errors[index] = t('common.fillAllCostFields');
        return;
      }
      const validProfis = (custo.profissionais || []).filter(
        (p) => p.profissionalId && Number(p.qtdeHora) > 0 && Number(p.valorHora) > 0
      );
      if (validProfis.length === 0) {
        errors[index] = t('closingTerm.costProfessionals.noProfessionals');
      } else if (Number(custo.valorHora) <= 0) {
        errors[index] = t('common.valuesMustBePositive');
      }
    });
    setCustoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (data: TermoEncerramentoFormData) => {
    if (!validateCustos() || !user) return;

    // Regra: salvar só se status E ou F
    if (!canSaveTermoEncerramento(demanda?.status ?? demanda?.situacao)) {
      toast({
        title: t('common.error'),
        description: t('closingTerm.statusRestrictionSave'),
        variant: 'destructive',
      });
      return;
    }

    // Regra: criar só se status E; editar se status F
    if (!selectedTermo && !canCreateTermoEncerramento(demanda?.status ?? demanda?.situacao)) {
      toast({
        title: t('common.error'),
        description: t('closingTerm.statusRestrictionCreate'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const custosFormatted = custos
        .filter(
          (c) =>
            c.perfilId &&
            c.valorHora &&
            (c.profissionais?.length ?? 0) > 0 &&
            (c.profissionais ?? []).some(
              (p) => p.profissionalId && Number(p.qtdeHora) > 0 && Number(p.valorHora) > 0
            )
        )
        .map((c) => {
          const profis = (c.profissionais ?? []).filter(
            (p) => p.profissionalId && Number(p.qtdeHora) > 0 && Number(p.valorHora) > 0
          );
          const qtdeHora = profis.reduce((acc, p) => acc + Number(p.qtdeHora), 0);
          return {
            perfilId: Number(c.perfilId),
            qtdeHora,
            valorHora: Number(c.valorHora),
            profissionais: profis.map((p) => ({
              profissionalId: Number(p.profissionalId),
              qtdeHora: Number(p.qtdeHora),
              valorHora: Number(p.valorHora),
            })),
          };
        });

      const dataTermoStr = data.dataTermo.toISOString().split('T')[0];
      const dataInicioExecucaoStr = data.dataInicioExecucao?.toISOString().split('T')[0];
      const dataFimExecucaoStr = data.dataFimExecucao?.toISOString().split('T')[0];

      let termoSalvo: TermoEncerramento;

      if (selectedTermo) {
        termoSalvo = await termoEncerramentoService.update(selectedTermo.id, {
          resultadoEntregue: data.resultadoEntregue,
          dataTermo: dataTermoStr,
          dataInicioExecucao: dataInicioExecucaoStr,
          dataFimExecucao: dataFimExecucaoStr,
          custos: custosFormatted,
        });
      } else {
        termoSalvo = await termoEncerramentoService.create({
          demandaTecnicaId: Number(data.demandaTecnicaId),
          resultadoEntregue: data.resultadoEntregue,
          dataTermo: dataTermoStr,
          dataInicioExecucao: dataInicioExecucaoStr,
          dataFimExecucao: dataFimExecucaoStr,
          usuarioId: user.id,
          custos: custosFormatted,
        });
        // Regra: ao criar Termo de Encerramento, demanda passa para status F
        await demandaService.update(Number(data.demandaTecnicaId), { status: 'F' });
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
        const doc = await termoEncerramentoDocService.findByTermoEncerramentoId(termoSalvo.id);
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
          ? t('closingTerm.updatedSuccess')
          : t('closingTerm.createdSuccess'),
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
    if (selectedTermo && canDeleteTermoEncerramento(demanda?.status)) {
      setIsDeleteOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTermo) return;
    
    setIsDeleting(true);
    try {
      await termoEncerramentoService.delete(selectedTermo.id);
      // Regra: ao excluir Termo de Encerramento, demanda volta para status E
      if (demanda) {
        await demandaService.update(demanda.id, { status: 'E' });
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
    if (!canUploadTermoEncerramento(demanda?.status)) {
      toast({
        title: t('common.error'),
        description: t('closingTerm.statusRestrictionUpload'),
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
      let docResponse: TermoEncerramentoDocResponseDTO;
      
      // Verifica se já existe documento
      const docExists = await termoEncerramentoDocService.exists(selectedTermo.id);
      
      if (docExists && documento) {
        // Atualiza documento existente
        docResponse = await termoEncerramentoDocService.update(documento.id, selectedFile);
      } else {
        // Cria novo documento
        docResponse = await termoEncerramentoDocService.upload(selectedTermo.id, selectedFile);
      }

      setDocumento(docResponse);
      setIsUploadOpen(false);
      setSelectedFile(null);
      
      // Regra: ao fazer upload do documento assinado, demanda passa para status G
      if (demanda) {
        await demandaService.update(demanda.id, { status: 'G' });
        const demandaAtualizada = await demandaService.findById(demanda.id);
        setDemanda(demandaAtualizada);
      }
      
      // Recarrega o termo para atualizar a data de assinatura se houver
      if (selectedTermo) {
        const termoAtualizado = await termoEncerramentoService.findById(selectedTermo.id);
        setSelectedTermo(termoAtualizado);
      }

      toast({
        title: t('common.success'),
        description: t('closingTerm.uploadSuccess'),
      });
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('closingTerm.uploadError')),
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
        description: t('closingTerm.generatePdfError'),
        variant: 'destructive',
      });
      return;
    }
    setIsViewGeneratedPdfOpen(true);
  };

  const handleDeleteDocument = () => {
    if (documento && canDeleteDocTermoEncerramento(demanda?.status ?? demanda?.situacao)) {
      setIsDeleteDocOpen(true);
    }
  };

  const handleConfirmDeleteDocument = async () => {
    if (!documento || !selectedTermo) return;
    if (!canDeleteDocTermoEncerramento(demanda?.status ?? demanda?.situacao)) return;

    setIsDeletingDoc(true);
    try {
      await termoEncerramentoDocService.delete(documento.id);
      
      // Limpa o documento do estado
      setDocumento(null);
      setIsDeleteDocOpen(false);
      
      // Recarrega o termo para atualizar a data de assinatura (deve estar null agora)
      const termoAtualizado = await termoEncerramentoService.findById(selectedTermo.id);
      setSelectedTermo(termoAtualizado);
      
      toast({
        title: t('common.success'),
        description: t('closingTerm.documentDeletedSuccess'),
      });
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('closingTerm.documentDeleteError')),
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
            title={selectedTermo ? t('closingTerm.editTerm') : t('closingTerm.newTerm')}
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
                            <TableHead>{t('common.demandDescriptionLabel')}</TableHead>
                            <TableHead>{t('common.metaCodeLabel')}</TableHead>
                            <TableHead>{t('common.productCodeLabel')}</TableHead>
                            <TableHead>{t('common.productTotalPlannedLabel')}</TableHead>
                            <TableHead>{t('common.productTotalExecutedLabel')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>{demanda.codigo}</TableCell>
                            <TableCell>{demanda.nome}</TableCell>
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

              <Tabs defaultValue="datas" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="datas">{t('closingTerm.datesTab')}</TabsTrigger>
                  <TabsTrigger value="resultado">{t('closingTerm.resultTab')}</TabsTrigger>
                  <TabsTrigger value="custos">{t('closingTerm.costsTab')}</TabsTrigger>
                </TabsList>

                {/* Aba: Datas */}
                <TabsContent value="datas" className="mt-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="dataTermo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('closingTerm.termDate')} *</FormLabel>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dataInicioExecucao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('closingTerm.executionStartDate')}</FormLabel>
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
                          <FormLabel>{t('closingTerm.executionEndDate')}</FormLabel>
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
                </TabsContent>

                {/* Aba: Resultado Entregue */}
                <TabsContent value="resultado" className="mt-4">
                  <FormField
                    control={form.control}
                    name="resultadoEntregue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('closingTerm.deliveredResult')} *</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder={t('common.deliveredResultPlaceholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Aba: Custos Realizados - 4 colunas (Perfil, Horas, Valor/Hora read-only, Total read-only) + total geral */}
                <TabsContent value="custos" className="mt-4 space-y-4">
                  {demanda?.metaProduto != null && typeof demanda.metaProduto.quantidade === 'number' && typeof demanda.metaProduto.valorUnitario === 'number' && (() => {
                    const totalPlanned = demanda.metaProduto!.quantidade * demanda.metaProduto!.valorUnitario;
                    const totalExecuted = typeof demanda.totalExecutadoProduto === 'number' ? demanda.totalExecutadoProduto : 0;
                    const totalFormCosts = custos.reduce((acc, c) => {
                      const horas = (c.profissionais ?? []).reduce((s, p) => s + (Number(p.qtdeHora) || 0), 0);
                      return acc + horas * (Number(c.valorHora) || 0);
                    }, 0);
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
                        <CardTitle className="text-base">{t('closingTerm.costs')}</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddCusto}>
                          <Plus className="h-4 w-4 mr-1" />
                          {t('closingTerm.addCost')}
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
                            <div className="flex-1 grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 2.5rem 5rem 7rem 7rem' }}>
                              <span className="text-xs font-medium text-muted-foreground">{t('closingTerm.profile')}</span>
                              <span className="text-xs font-medium text-muted-foreground w-10 flex justify-center" aria-hidden="true">&nbsp;</span>
                              <span className="text-xs font-medium text-muted-foreground">{t('closingTerm.hours')}</span>
                              <span className="text-xs font-medium text-muted-foreground">{t('closingTerm.hourlyRate')}</span>
                              <span className="text-xs font-medium text-muted-foreground">{t('closingTerm.lineTotal')}</span>
                            </div>
                            <div className="w-8 shrink-0" aria-hidden />
                          </div>
                          {custos.map((custo, index) => {
                            const profis = custo.profissionais ?? [];
                            const horas = profis.reduce((acc, p) => acc + (Number(p.qtdeHora) || 0), 0);
                            const valorHoraPerfil = Number(custo.valorHora) || 0;
                            const totalLinha = horas * valorHoraPerfil;
                            return (
                              <div key={'id' in custo && (custo as { id?: number }).id != null ? String((custo as { id: number }).id) : `custo-${index}`} className="space-y-1">
                                <div className="flex items-center gap-2 py-1.5 px-2 bg-muted/50 rounded-md">
                                  <div className="flex-1 grid gap-2 items-center min-w-0" style={{ gridTemplateColumns: '1fr 2.5rem 5rem 7rem 7rem' }}>
                                    <Select
                                      value={custo.perfilId}
                                      onValueChange={(value) => handleCustoChange(index, 'perfilId', value)}
                                    >
                                      <SelectTrigger className="h-8 justify-start text-left min-w-0">
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
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 shrink-0 justify-self-center"
                                          onClick={() => setCustoProfissionaisModalIndex(index)}
                                          disabled={!custo.perfilId}
                                          aria-label={t('closingTerm.costProfessionals.composeProfessionalsTooltip')}
                                        >
                                          <UserCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        {t('closingTerm.costProfessionals.composeProfessionalsTooltip')}
                                      </TooltipContent>
                                    </Tooltip>
                                    <div className="flex items-center h-8 px-3 rounded-md border border-input bg-muted/30 text-sm tabular-nums">
                                      {horas > 0 ? horas.toFixed(2) : '—'}
                                    </div>
                                    <div className="flex items-center h-8 px-3 rounded-md border border-input bg-muted/30 text-sm text-muted-foreground">
                                      {custo.valorHora ? formatCurrency(Number(custo.valorHora)) : '—'}
                                    </div>
                                    <div className="flex items-center h-8 px-3 rounded-md border border-input bg-muted/30 text-sm font-medium">
                                      {totalLinha > 0 ? formatCurrency(totalLinha) : '—'}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveCusto(index)}
                                    disabled={normalizeDemandaStatus(demanda?.status ?? demanda?.situacao) !== 'E'}
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
                            <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: '1fr 2.5rem 5rem 7rem 7rem' }}>
                              <span className="col-span-3" />
                              <span className="text-xs font-medium text-muted-foreground">{t('closingTerm.totalCost')}</span>
                              <span className="text-sm">
                                {formatCurrency(
                                  custos.reduce((acc, c) => {
                                    const horas = (c.profissionais ?? []).reduce((s, p) => s + (Number(p.qtdeHora) || 0), 0);
                                    return acc + horas * (Number(c.valorHora) || 0);
                                  }, 0)
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
                        ? `${t('closingTerm.signatureDate')}: ${new Date(documento.dataAssinatura).toLocaleDateString('pt-BR')}`
                        : t('closingTerm.notSigned')}
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
                      title={t('closingTerm.viewDocument')}
                      aria-label={t('closingTerm.viewDocument')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteDocument}
                      disabled={isDeletingDoc || isSaving || isDeleting || !canDeleteDocTermoEncerramento(demanda?.status ?? demanda?.situacao)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title={t('closingTerm.deleteDocument')}
                      aria-label={t('closingTerm.deleteDocument')}
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
                          {t('closingTerm.documentAndAttachments')}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[220px]">
                        <DropdownMenuItem
                          onClick={handleGeneratePdf}
                          disabled={!canUploadTermoEncerramento(demanda?.status)}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          {t('closingTerm.generatePdf')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleOpenUpload}
                          disabled={!canUploadTermoEncerramento(demanda?.status)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {documento ? t('closingTerm.replaceDocument') : t('closingTerm.uploadDocument')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsAnexosOpen(true)}>
                          <Paperclip className="h-4 w-4 mr-2" />
                          {t('closingTerm.attachments.title')}
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
                      disabled={isSaving || isDeleting || !canDeleteTermoEncerramento(demanda?.status)}
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
                      disabled={isDeleting || !canSaveTermoEncerramento(demanda?.status ?? demanda?.situacao)}
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

      {/* Upload Document Dialog - fecha apenas pelos botões */}
      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          if (open) setIsUploadOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('closingTerm.uploadDocumentTitle')}</DialogTitle>
            <DialogDescription>
              {t('closingTerm.uploadDocumentDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="pdf-upload" className="text-sm font-medium">
                {t('closingTerm.selectFile')}
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
                  {t('closingTerm.noFileSelected')}
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
            <DialogTitle>{t('closingTerm.deleteDocumentConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('closingTerm.deleteDocumentConfirm')}
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
        title={t('closingTerm.viewDocumentTitle')}
        description={documento?.nomeArquivo}
        fetchPdf={() => termoEncerramentoDocService.downloadById(documento!.id)}
        loadingLabel={t('common.loading')}
        errorMessage={t('closingTerm.documentViewError')}
        closeLabel={t('common.close')}
        onError={(err: unknown) =>
          toast({
            title: t('common.error'),
            description: getErrorMessage(err, t('closingTerm.documentViewError')),
            variant: 'destructive',
          })
        }
      />

      <PdfPreviewDialog
        open={isViewGeneratedPdfOpen}
        onOpenChange={(open) => {
          setIsViewGeneratedPdfOpen(open);
          if (!open && selectedTermo) {
            termoEncerramentoDocService
              .findByTermoEncerramentoId(selectedTermo.id)
              .then(setDocumento)
              .catch(() => setDocumento(null));
          }
        }}
        title={t('planningTerm.viewGeneratedPdfTitle')}
        description={t('planningTerm.viewGeneratedPdfDescription')}
        fetchPdf={() =>
          termoEncerramentoService.gerarTermoAssinatura(
            selectedTermo!.id,
            selectedProject!.id,
            'E',
            { logoUfla }
          )
        }
        loadingLabel={t('planningTerm.generatingPdf')}
        errorMessage={t('planningTerm.generatePdfError')}
        downloadFileName={selectedTermo ? `termo-encerramento-${selectedTermo.id}.pdf` : undefined}
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

      <TermoEncerramentoAnexosModal
        open={isAnexosOpen}
        onOpenChange={setIsAnexosOpen}
        termoEncerramentoId={selectedTermo?.id ?? null}
        demandaStatus={demanda?.status ?? demanda?.situacao}
        usuarioId={user?.id}
      />

      {custoProfissionaisModalIndex != null && custos[custoProfissionaisModalIndex] && (
        <CustoProfissionaisModal
          key={custoProfissionaisModalIndex}
          open={true}
          onOpenChange={(open) => !open && setCustoProfissionaisModalIndex(null)}
          perfilNome={
            custos[custoProfissionaisModalIndex]?.perfilId
              ? perfis.find((p) => p.id === Number(custos[custoProfissionaisModalIndex].perfilId))?.nome ?? '—'
              : '—'
          }
          qtdePrevistaHoras={
            custos[custoProfissionaisModalIndex]?.perfilId
              ? planejamentoCustosPorPerfil.get(Number(custos[custoProfissionaisModalIndex].perfilId)) ?? undefined
              : undefined
          }
          profissionais={profissionais}
          initialItems={custos[custoProfissionaisModalIndex].profissionais ?? []}
          onConfirm={(items) => handleConfirmCustoProfissionais(custoProfissionaisModalIndex, items)}
          disabled={
            normalizeDemandaStatus(demanda?.status ?? demanda?.situacao) !== 'E' &&
            normalizeDemandaStatus(demanda?.status ?? demanda?.situacao) !== 'F'
          }
        />
      )}
    </div>
  );
}
