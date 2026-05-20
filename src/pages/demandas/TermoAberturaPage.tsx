import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { PageHeader } from '@/components/common/PageComponents';
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
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { termoAberturaService } from '@/services/termoService';
import { termoAberturaDocService } from '@/services/termoDocService';
import { demandaService } from '@/services/demandaService';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { termoAberturaSchema, type TermoAberturaFormData } from '@/lib/validations';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import { Upload, FileText, Trash2, Eye, FileDown, Calendar, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import logoUfla from '@/assets/ufla1.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  canCreateTermoAbertura,
  canUploadTermoAbertura,
  canDeleteTermoAbertura,
  canSaveTermoAbertura,
  canDeleteDocTermoAbertura,
  canGenerateTermoAbertura,
} from '@/lib/demandaStatus';
import type { TermoAbertura, DemandaTecnica, TermoAberturaDocResponseDTO } from '@/types';

export default function TermoAberturaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const [demanda, setDemanda] = useState<DemandaTecnica | null>(null);
  const [selectedTermo, setSelectedTermo] = useState<TermoAbertura | null>(null);
  const [isLoadingDemanda, setIsLoadingDemanda] = useState(true);
  const [isLoadingTermo, setIsLoadingTermo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documento, setDocumento] = useState<TermoAberturaDocResponseDTO | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [isDeleteDocOpen, setIsDeleteDocOpen] = useState(false);
  const [isViewDocOpen, setIsViewDocOpen] = useState(false);
  const [isViewGeneratedPdfOpen, setIsViewGeneratedPdfOpen] = useState(false);
  const { toast } = useToast();

  const isSafeInternalPath = (value: string | null): value is string =>
    !!value && value.startsWith('/') && !value.startsWith('//');

  const returnTo = (() => {
    const queryReturnTo = searchParams.get('returnTo');
    return isSafeInternalPath(queryReturnTo) ? queryReturnTo : null;
  })();

  // Evita deslocamento de timezone: "2025-01-15" sem hora é interpretado como UTC meia-noite
  const parseDateOnly = (dateStr: string) => {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const form = useForm<TermoAberturaFormData>({
    resolver: zodResolver(termoAberturaSchema),
    defaultValues: {
      demandaTecnicaId: '',
      dataAbertura: new Date(),
      descricao: '',
    },
  });

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
      const termoExistente = await termoAberturaService.findByDemandaId(Number(demandaId));
      
      if (termoExistente) {
        // Se existe, carrega os dados
        setSelectedTermo(termoExistente);
        form.reset({
          demandaTecnicaId: String(termoExistente.demandaTecnicaId),
          dataAbertura: termoExistente.dataAbertura ? parseDateOnly(termoExistente.dataAbertura) : new Date(),
          descricao: termoExistente.descricao,
        });
        
        // Busca documento se existir
        setIsLoadingDoc(true);
        try {
          const doc = await termoAberturaDocService.findByTermoAberturaId(termoExistente.id);
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
          descricao: demandaData.descricao || '',
        });
      }

    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Erro ao carregar dados:', err);
      setError(getErrorMessage(err, 'Erro ao carregar dados da demanda'));
    } finally {
      setIsLoadingDemanda(false);
      setIsLoadingTermo(false);
    }
  }, [searchParams, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSubmit = async (data: TermoAberturaFormData) => {
    if (!user) return;

    const statusRaw = demanda?.status ?? demanda?.situacao;
    // Demanda nova pode vir sem status do backend: considerar como "em elaboração" (A) e permitir criar o termo
    const isNewDemandWithoutStatus = !!demanda && !selectedTermo && statusRaw == null;
    const allowedToSave = canSaveTermoAbertura(statusRaw) || isNewDemandWithoutStatus;
    const allowedToCreate = canCreateTermoAbertura(statusRaw) || isNewDemandWithoutStatus;

    if (!allowedToSave) {
      toast({
        title: t('common.error'),
        description: t('openingTerm.statusRestrictionSave'),
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTermo && !allowedToCreate) {
      toast({
        title: t('common.error'),
        description: t('openingTerm.statusRestrictionCreate'),
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    try {
      let termoSalvo: TermoAbertura;
      
      const dataAberturaStr = data.dataAbertura.toISOString().split('T')[0];

      if (selectedTermo) {
        termoSalvo = await termoAberturaService.update(selectedTermo.id, {
          descricao: data.descricao,
          dataAbertura: dataAberturaStr,
        });
      } else {
        termoSalvo = await termoAberturaService.create({
          demandaTecnicaId: Number(data.demandaTecnicaId),
          descricao: data.descricao,
          dataAbertura: dataAberturaStr,
          usuarioId: user.id,
        });
        // Regra: ao criar Termo de Abertura, demanda passa para status B
        await demandaService.update(Number(data.demandaTecnicaId), { status: 'B' });
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
        const doc = await termoAberturaDocService.findByTermoAberturaId(termoSalvo.id);
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
          ? t('openingTerm.updatedSuccess')
          : t('openingTerm.createdSuccess'),
      });
    } catch (error) {
      // Erro já é tratado automaticamente pela API (toast será exibido)
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate('/demandas');
  };

  const handleDelete = () => {
    if (selectedTermo && canDeleteTermoAbertura(demanda?.status ?? demanda?.situacao)) {
      setIsDeleteOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTermo) return;
    
    setIsDeleting(true);
    try {
      await termoAberturaService.delete(selectedTermo.id);
      // Regra: ao excluir Termo de Abertura, demanda volta para status A
      if (demanda) {
        await demandaService.update(demanda.id, { status: 'A' });
      }
      setIsDeleteOpen(false);
      handleClose();
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
    if (!canUploadTermoAbertura(demanda?.status ?? demanda?.situacao)) {
      toast({
        title: t('common.error'),
        description: t('openingTerm.statusRestrictionUpload'),
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
      let docResponse: TermoAberturaDocResponseDTO;
      
      // Verifica se já existe documento
      const docExists = await termoAberturaDocService.exists(selectedTermo.id);
      
      if (docExists && documento) {
        // Atualiza documento existente
        docResponse = await termoAberturaDocService.update(documento.id, selectedFile);
      } else {
        // Cria novo documento
        docResponse = await termoAberturaDocService.upload(selectedTermo.id, selectedFile);
      }

      setDocumento(docResponse);
      setIsUploadOpen(false);
      setSelectedFile(null);
      
      // Regra: ao fazer upload do documento assinado, demanda passa para status C
      if (demanda) {
        await demandaService.update(demanda.id, { status: 'C' });
        const demandaAtualizada = await demandaService.findById(demanda.id);
        setDemanda(demandaAtualizada);
      }
      
      // Recarrega o termo para atualizar a data de assinatura se houver
      if (selectedTermo) {
        const termoAtualizado = await termoAberturaService.findById(selectedTermo.id);
        setSelectedTermo(termoAtualizado);
      }

      toast({
        title: t('common.success'),
        description: t('openingTerm.uploadSuccess'),
      });
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('openingTerm.uploadError')),
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
        description: t('openingTerm.generatePdfError'),
        variant: 'destructive',
      });
      return;
    }
    setIsViewGeneratedPdfOpen(true);
  };

  const handleDeleteDocument = () => {
    if (documento && canDeleteDocTermoAbertura(demanda?.status ?? demanda?.situacao)) {
      setIsDeleteDocOpen(true);
    }
  };

  const handleConfirmDeleteDocument = async () => {
    if (!documento || !selectedTermo) return;
    if (!canDeleteDocTermoAbertura(demanda?.status ?? demanda?.situacao)) return;

    setIsDeletingDoc(true);
    try {
      await termoAberturaDocService.delete(documento.id);
      
      // Limpa o documento do estado
      setDocumento(null);
      setIsDeleteDocOpen(false);
      
      // Recarrega o termo para atualizar a data de assinatura (deve estar null agora)
      const termoAtualizado = await termoAberturaService.findById(selectedTermo.id);
      setSelectedTermo(termoAtualizado);
      
      toast({
        title: t('common.success'),
        description: t('openingTerm.documentDeletedSuccess'),
      });
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('openingTerm.documentDeleteError')),
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
      <PageHeader
        title={selectedTermo ? t('openingTerm.editTerm') : t('openingTerm.newTerm')}
        description={selectedTermo ? t('common.editTerm') : t('common.fillTerm')}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               
                <FormField
                  control={form.control}
                  name="demandaTecnicaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('openingTerm.demand')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.selectDemand')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {demanda && (
                            <SelectItem value={String(demanda.id)}>
                              {demanda.codigo} - {demanda.nome}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataAbertura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('openingTerm.openingDate')} *</FormLabel>
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
              </div>

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('openingTerm.description')} *</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder={t('common.openingTermDescriptionPlaceholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Documento anexado - indicador visual */}
              {selectedTermo && documento && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{documento.nomeArquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {documento.dataAssinatura 
                        ? `${t('openingTerm.signatureDate')}: ${new Date(documento.dataAssinatura).toLocaleDateString('pt-BR')}`
                        : t('openingTerm.notSigned')}
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
                      title={t('openingTerm.viewDocument')}
                      aria-label={t('openingTerm.viewDocument')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteDocument}
                      disabled={isDeletingDoc || isSaving || isDeleting || !canDeleteDocTermoAbertura(demanda?.status ?? demanda?.situacao)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title={t('openingTerm.deleteDocument')}
                      aria-label={t('openingTerm.deleteDocument')}
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
                          {t('openingTerm.documentAndAttachments')}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[220px]">
                        <DropdownMenuItem
                          onClick={handleGeneratePdf}
                          disabled={!canGenerateTermoAbertura(demanda?.status ?? demanda?.situacao)}
                          title={
                            !canGenerateTermoAbertura(demanda?.status ?? demanda?.situacao)
                              ? t('openingTerm.statusRestrictionGenerate')
                              : undefined
                          }
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          {t('openingTerm.generatePdf')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleOpenUpload}
                          disabled={!canUploadTermoAbertura(demanda?.status ?? demanda?.situacao)}
                          title={
                            !canUploadTermoAbertura(demanda?.status ?? demanda?.situacao)
                              ? t('openingTerm.statusRestrictionUpload')
                              : undefined
                          }
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {documento ? t('openingTerm.replaceDocument') : t('openingTerm.uploadDocument')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {selectedTermo && canDeleteTermoAbertura(demanda?.status ?? demanda?.situacao) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleDelete}
                      disabled={isSaving || isDeleting || !canDeleteTermoAbertura(demanda?.status ?? demanda?.situacao)}
                      title={
                        !canDeleteTermoAbertura(demanda?.status ?? demanda?.situacao)
                          ? t('openingTerm.statusRestrictionDelete')
                          : undefined
                      }
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
                  {canSaveTermoAbertura(demanda?.status ?? demanda?.situacao) || (!!demanda && !selectedTermo && demanda?.status == null && demanda?.situacao == null) ? (
                    <LoadingButton
                      type="submit"
                      isLoading={isSaving}
                      loadingText={t('common.saving')}
                      disabled={isDeleting || !(canSaveTermoAbertura(demanda?.status ?? demanda?.situacao) || (!!demanda && !selectedTermo && demanda?.status == null && demanda?.situacao == null))}
                    >
                      {t('common.save')}
                    </LoadingButton>
                  ) : null}
                </div>
              </DialogFooter>
        </form>
      </Form>

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

      {/* Upload Document Dialog - fecha apenas pelos botões */}
      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          if (open) setIsUploadOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('openingTerm.uploadDocumentTitle')}</DialogTitle>
            <DialogDescription>
              {t('openingTerm.uploadDocumentDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="pdf-upload" className="text-sm font-medium">
                {t('openingTerm.selectFile')}
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
                  {t('openingTerm.noFileSelected')}
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
            <DialogTitle>{t('openingTerm.deleteDocumentConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('openingTerm.deleteDocumentConfirm')}
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
        title={t('openingTerm.viewDocumentTitle')}
        description={documento?.nomeArquivo}
        fetchPdf={() => termoAberturaDocService.downloadById(documento!.id)}
        loadingLabel={t('common.loading')}
        errorMessage={t('openingTerm.documentViewError')}
        closeLabel={t('common.close')}
        onError={(err: unknown) =>
          toast({
            title: t('common.error'),
            description: getErrorMessage(err, t('openingTerm.documentViewError')),
            variant: 'destructive',
          })
        }
      />

      <PdfPreviewDialog
        open={isViewGeneratedPdfOpen}
        onOpenChange={(next) => {
          setIsViewGeneratedPdfOpen(next);
          if (!next && selectedTermo) {
            termoAberturaDocService.findByTermoAberturaId(selectedTermo.id).then(setDocumento).catch(() => setDocumento(null));
          }
        }}
        title={t('openingTerm.viewDocumentTitle')}
        
        fetchPdf={() =>
          termoAberturaService.gerarTermoAssinatura(selectedTermo!.id, selectedProject!.id, 'A', {
            logoUfla,
          })
        }
        loadingLabel={t('openingTerm.generatingPdf')}
        errorMessage={t('openingTerm.generatePdfError')}
        downloadFileName={selectedTermo ? `termo-abertura-${selectedTermo.id}.pdf` : undefined}
        closeLabel={t('common.close')}
        downloadLabel={t('common.download')}
        onError={(err: unknown) =>
          toast({
            title: t('common.error'),
            description: getErrorMessage(err, t('openingTerm.generatePdfError')),
            variant: 'destructive',
          })
        }
      />
    </div>
  );
}
