import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { PageHeader, EmptyState } from '@/components/common/PageComponents';
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { projetoMetaSchema, type ProjetoMetaFormData } from '@/lib/validations';
import { projetoMetaService } from '@/services/projetoMetaService';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import { Target } from 'lucide-react';
import type { ProjetoMeta } from '@/types';

const PROJETO_META_NOVO_PATH = '/cadastros/projeto-meta/novo';

type LocationState = {
  returnTo?: string;
};

function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith('/') && !value.startsWith('//');
}

export default function EditProjetoMetaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { metaId } = useParams<{ metaId: string }>();
  const { selectedProject } = useProject();
  const { toast } = useToast();
  const isCreate = location.pathname === PROJETO_META_NOVO_PATH;
  const [meta, setMeta] = useState<ProjetoMeta | null>(null);
  const [isLoading, setIsLoading] = useState(!isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProjetoMetaFormData>({
    resolver: zodResolver(projetoMetaSchema),
    defaultValues: { codigo: '', nome: '', descricao: '', status: 'A' },
  });

  const returnTo = useMemo(() => {
    const queryReturnTo = new URLSearchParams(location.search).get('returnTo');
    const stateReturnTo = (location.state as LocationState | null)?.returnTo;
    const candidate = queryReturnTo || stateReturnTo;
    return isSafeInternalPath(candidate) ? candidate : null;
  }, [location.search, location.state]);

  const handleBack = useCallback(() => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate('/cadastros/projeto-meta');
  }, [navigate, returnTo]);

  const loadMeta = useCallback(async () => {
    const parsedId = Number(metaId);
    if (!parsedId || Number.isNaN(parsedId)) {
      setError(t('common.invalidData'));
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await projetoMetaService.findById(parsedId);
      setMeta(data);
      form.reset({
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || '',
        status: data.status,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('common.errorLoadingData')));
    } finally {
      setIsLoading(false);
    }
  }, [metaId, form, t]);

  useEffect(() => {
    if (isCreate) return;
    void loadMeta();
  }, [isCreate, loadMeta]);

  const onSubmit = async (data: ProjetoMetaFormData) => {
    if (isCreate) {
      if (!selectedProject) {
        toast({
          title: t('common.error'),
          description: t('projects.selectProject'),
          variant: 'destructive',
        });
        return;
      }
      setIsSaving(true);
      try {
        await projetoMetaService.create({
          projetoId: selectedProject.id,
          codigo: data.codigo,
          nome: data.nome,
          descricao: data.descricao || undefined,
          status: data.status,
        });
        toast({
          title: t('common.success'),
          description: t('projectMeta.createdSuccess'),
        });
        handleBack();
      } catch (err: unknown) {
        toast({
          title: t('common.error'),
          description: getErrorMessage(err, t('common.errorMessage')),
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!meta) return;

    setIsSaving(true);
    try {
      await projetoMetaService.update(meta.id, {
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || undefined,
        status: data.status,
      });
      toast({
        title: t('common.success'),
        description: t('projectMeta.updatedSuccess'),
      });
      handleBack();
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('common.errorMessage')),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isCreate && !selectedProject) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('projectMeta.newMeta')} />
        <EmptyState
          title={t('projectMeta.selectProjectFirst')}
          description={t('projectMeta.selectProjectDescription')}
          icon={<Target className="h-6 w-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  if (error && !isCreate) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('projectMeta.editMeta')} />
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadMeta}
          retryText={t('common.retry')}
        />
      </div>
    );
  }

  if (!isCreate && (isLoading || !meta)) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('projectMeta.editMeta')} />
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const pageTitle = isCreate ? t('projectMeta.newMeta') : t('projectMeta.editMeta');
  const pageDescription = isCreate ? t('common.fillInformation') : t('common.editInformation');

  return (
    <div className="space-y-6">
      <PageHeader title={pageTitle} description={pageDescription} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projectMeta.code')} *</FormLabel>
                  <FormControl><Input placeholder={t('projectMeta.codePlaceholder')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.status')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectStatus')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A">{t('common.active')}</SelectItem>
                      <SelectItem value="I">{t('common.inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projectMeta.name')} *</FormLabel>
                <FormControl><Input placeholder={t('projectMeta.namePlaceholder')} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="descricao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projectMeta.description')}</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder={t('projectMeta.descriptionPlaceholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleBack} disabled={isSaving}>
              {t('common.cancel')}
            </Button>
            <LoadingButton type="submit" isLoading={isSaving} loadingText={t('common.saving')}>
              {t('common.save')}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  );
}
