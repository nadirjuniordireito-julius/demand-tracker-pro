import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Trash2, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader, SearchFilterBar, EmptyState } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { useApi } from '@/hooks/useApi';
import { templateDemandaService } from '@/services/templateDemandaService';
import { useProject } from '@/contexts/ProjectContext';
import { templateDemandaSchema, type TemplateDemandaFormData } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import type { TemplateDemanda, Projeto } from '@/types';

export default function TemplatesPage() {
  const { t } = useTranslation();
  const { selectedProject } = useProject();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateDemanda[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDemanda | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // API states
  const { isLoading, error, execute } = useApi<TemplateDemanda[]>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const form = useForm<TemplateDemandaFormData & { arquivoDocx?: File }>({
    resolver: zodResolver(templateDemandaSchema),
    defaultValues: { 
      projetoId: selectedProject ? String(selectedProject.id) : '', 
      tipo: undefined, 
      arquivoDocx: undefined 
    }
  });

  // Atualiza o projetoId no form quando o projeto selecionado mudar
  useEffect(() => {
    if (selectedProject) {
      form.setValue('projetoId', String(selectedProject.id));
    }
  }, [selectedProject, form]);

  // Carrega templates
  const loadData = useCallback(async () => {
    await execute(
      () => templateDemandaService.findAll(),
      {
        onSuccess: (data) => {
          // Filtra por busca se houver e pelo projeto selecionado
          let filtered = data;
          
          // Filtra pelo projeto selecionado
          if (selectedProject) {
            filtered = filtered.filter(t => t.projetoId === selectedProject.id);
          }
          
          // Filtra por busca se houver
          if (search) {
            filtered = filtered.filter(t => 
              t.nomeArquivo.toLowerCase().includes(search.toLowerCase())
            );
          }
          setTemplates(filtered);
        },
      }
    );
  }, [execute, search, selectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return t('common.fileSizeZero');
    const k = 1024;
    const sizes = [
      t('common.fileSizeBytes'),
      t('common.fileSizeKB'),
      t('common.fileSizeMB'),
      t('common.fileSizeGB')
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getTipoLabel = (tipo: 'A' | 'P' | 'E') => {
    switch (tipo) {
      case 'A':
        return t('templates.typeA');
      case 'P':
        return t('templates.typeP');
      case 'E':
        return t('templates.typeE');
      default:
        return tipo;
    }
  };

  const handleAdd = () => {
    if (!selectedProject) {
      toast({
        title: t('common.error'),
        description: t('templates.projectRequired'),
        variant: 'destructive',
      });
      return;
    }
    setSelectedTemplate(null);
    setSelectedFile(null);
    form.reset({ 
      projetoId: String(selectedProject.id), 
      tipo: undefined, 
      arquivoDocx: undefined 
    });
    setIsFormOpen(true);
  };

  const handleEdit = (template: TemplateDemanda) => {
    setSelectedTemplate(template);
    setSelectedFile(null);
    form.reset({
      projetoId: String(template.projetoId),
      tipo: template.tipo,
      arquivoDocx: undefined, // Não precisa do arquivo na edição inicial
    });
    setIsFormOpen(true);
  };

  const handleDelete = (template: TemplateDemanda) => {
    setSelectedTemplate(template);
    setIsDeleteOpen(true);
  };

  const handleDownload = async (template: TemplateDemanda) => {
    try {
      const blob = await templateDemandaService.downloadById(template.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.nomeArquivo || `template-${template.id}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('templates.downloadError')),
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Valida se é DOCX
      if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        toast({
          title: t('common.error'),
          description: t('templates.fileMustBeDocx'),
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      form.setValue('arquivoDocx', file);
    }
  };

  // Definição das colunas da tabela
  const columns: Column<TemplateDemanda>[] = useMemo(() => [
    {
      key: 'tipo',
      label: t('templates.type'),
      render: (template) => getTipoLabel(template.tipo),
    },
    {
      key: 'nomeArquivo',
      label: t('templates.fileName'),
    },
    {
      key: 'tamanhoArquivo',
      label: t('templates.fileSize'),
      render: (template) => formatFileSize(template.tamanhoArquivo),
      hideOnMobile: true,
    },
  ], [t]);

  // Definição das ações da tabela
  const actions: Action<TemplateDemanda>[] = useMemo(() => [
    {
      label: t('common.download'),
      icon: <Download className="h-4 w-4" />,
      onClick: handleDownload,
    },
    {
      label: t('common.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
    },
    {
      label: t('common.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive',
      separator: true,
    },
  ], [t, handleDownload, handleEdit, handleDelete]);

  const onSubmit = async (data: TemplateDemandaFormData & { arquivoDocx?: File }) => {
    // Valida se há projeto selecionado
    if (!selectedProject) {
      toast({
        title: t('common.error'),
        description: t('templates.projectRequired'),
        variant: 'destructive',
      });
      return;
    }

    // Validação: arquivo é obrigatório na criação
    if (!selectedTemplate && !selectedFile) {
      toast({
        title: t('common.error'),
        description: t('templates.fileRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedTemplate) {
        // Atualiza template existente (arquivo é opcional)
        await templateDemandaService.update(
          selectedTemplate.id,
          data.tipo,
          selectedFile || undefined
        );
      } else {
        // Cria novo template (arquivo é obrigatório)
        if (!selectedFile) {
          toast({
            title: t('common.error'),
            description: t('templates.fileRequired'),
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }
        // Usa o projeto do contexto, não do formulário
        await templateDemandaService.create(
          selectedProject.id,
          data.tipo,
          selectedFile
        );
      }
      setIsFormOpen(false);
      setSelectedFile(null);
      form.reset();
      loadData();
      toast({
        title: t('common.success'),
        description: selectedTemplate ? t('templates.updatedSuccess') : t('templates.createdSuccess'),
      });
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('templates.saveError')),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTemplate) return;
    
    setIsDeleting(true);
    try {
      await templateDemandaService.delete(selectedTemplate.id);
      setIsDeleteOpen(false);
      loadData();
      toast({
        title: t('common.success'),
        description: t('templates.deletedSuccess'),
      });
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(error, t('templates.deleteError')),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Estado de erro
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('templates.title')} description={t('common.manageTemplates')} />
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
        title={t('templates.title')} 
        description={t('common.manageTemplates')}
        onAdd={handleAdd} 
        addLabel={t('templates.newTemplate')} 
      />
      
      <SearchFilterBar 
        searchValue={search} 
        onSearchChange={(v) => setSearch(v)} 
        searchPlaceholder={t('templates.searchPlaceholder')} 
        onRefresh={loadData} 
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={3} />
      ) : templates.length === 0 ? (
        <EmptyState 
          title={t('common.noResults')} 
          description={t('templates.noTemplatesFound')} 
          icon={<FileText className="h-6 w-6 text-muted-foreground" />} 
          action={<Button onClick={handleAdd}>{t('templates.newTemplate')}</Button>} 
        />
      ) : (
        <DataTable
          data={templates}
          columns={columns}
          actions={actions}
          actionsLabel={t('common.actions')}
        />
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeaderStandard
            title={selectedTemplate ? t('templates.editTemplate') : t('templates.newTemplate')}
            description={selectedTemplate ? t('common.editTemplate') : t('common.fillTemplate')}
          />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField 
                control={form.control} 
                name="tipo" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('templates.type')} *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value as 'A' | 'P' | 'E')} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('templates.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">{t('templates.typeA')}</SelectItem>
                        <SelectItem value="P">{t('templates.typeP')}</SelectItem>
                        <SelectItem value="E">{t('templates.typeE')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} 
              />

              <FormField 
                control={form.control} 
                name="arquivoDocx" 
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>
                      {t('templates.file')} {!selectedTemplate && '*'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        disabled={isSaving}
                        className="cursor-pointer"
                        {...field}
                      />
                    </FormControl>
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{selectedFile.name}</span>
                        <span className="text-xs">({formatFileSize(selectedFile.size)})</span>
                      </div>
                    )}
                    {selectedTemplate && !selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        {t('templates.currentFile')}: {selectedTemplate.nomeArquivo} ({formatFileSize(selectedTemplate.tamanhoArquivo)})
                      </p>
                    )}
                    {!selectedTemplate && !selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        {t('templates.noFileSelected')}
                      </p>
                    )}
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
            <DialogDescription>{t('templates.deleteConfirm')}</DialogDescription>
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
