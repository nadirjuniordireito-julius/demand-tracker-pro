import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PageHeader } from '@/components/common/PageComponents';
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { cn } from '@/lib/utils';
import { projetoSchema, type ProjetoFormData } from '@/lib/validations';
import { projetoService } from '@/services/projetoService';
import { useAuth } from '@/contexts/AuthContext';
import { useProcessing } from '@/contexts/ProcessingContext';
import type { Projeto } from '@/types';

const PROJETOS_NOVO_PATH = '/cadastros/projetos/novo';

type LocationState = {
  returnTo?: string;
};

function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith('/') && !value.startsWith('//');
}

const parseDateOnly = (dateStr: string) => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function EditProjetoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { projetoId } = useParams<{ projetoId: string }>();
  const { user } = useAuth();
  const { withProcessing } = useProcessing();
  const isCreate = location.pathname === PROJETOS_NOVO_PATH;
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [isLoading, setIsLoading] = useState(!isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProjetoFormData>({
    resolver: zodResolver(projetoSchema),
    defaultValues: { nome: '', codTed: '', termoInicial: undefined, termoFinal: undefined, dataEfetivaInicio: undefined },
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
    navigate('/cadastros/projetos');
  }, [navigate, returnTo]);

  const loadProjeto = useCallback(async () => {
    const parsedId = Number(projetoId);
    if (!parsedId || Number.isNaN(parsedId)) {
      setError(t('common.invalidData'));
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await projetoService.findById(parsedId);
      setProjeto(data);
      form.reset({
        nome: data.nome,
        codTed: data.codTed,
        termoInicial: parseDateOnly(data.termoInicial),
        termoFinal: parseDateOnly(data.termoFinal),
        dataEfetivaInicio: data.dataEfetivaInicio ? parseDateOnly(data.dataEfetivaInicio) : undefined,
      });
    } catch {
      setError(t('common.errorLoadingData'));
    } finally {
      setIsLoading(false);
    }
  }, [projetoId, form, t]);

  useEffect(() => {
    if (isCreate) return;
    void loadProjeto();
  }, [isCreate, loadProjeto]);

  const onSubmit = async (data: ProjetoFormData) => {
    if (isCreate) {
      if (!user) return;
      setIsSaving(true);
      try {
        await withProcessing(async () => {
          await projetoService.create({
            nome: data.nome,
            codTed: data.codTed,
            termoInicial: data.termoInicial.toISOString().split('T')[0],
            termoFinal: data.termoFinal.toISOString().split('T')[0],
            ...(data.dataEfetivaInicio && {
              dataEfetivaInicio: data.dataEfetivaInicio.toISOString().split('T')[0],
            }),
            usuarioId: user.id,
          });
        }, t('common.saving'));
        handleBack();
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!projeto) return;

    setIsSaving(true);
    try {
      await withProcessing(async () => {
        await projetoService.update(projeto.id, {
          nome: data.nome,
          codTed: data.codTed,
          termoInicial: data.termoInicial.toISOString().split('T')[0],
          termoFinal: data.termoFinal.toISOString().split('T')[0],
          ...(data.dataEfetivaInicio && {
            dataEfetivaInicio: data.dataEfetivaInicio.toISOString().split('T')[0],
          }),
        });
      }, t('common.saving'));
      handleBack();
    } finally {
      setIsSaving(false);
    }
  };

  if (error && !isCreate) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('projects.editProject')} />
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadProjeto}
          retryText={t('common.retry')}
        />
      </div>
    );
  }

  if (!isCreate && (isLoading || !projeto)) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('projects.editProject')} />
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const pageTitle = isCreate ? t('projects.newProject') : t('projects.editProject');
  const pageDescription = isCreate ? t('common.fillProject') : t('common.editProject');

  return (
    <div className="space-y-6">
      <PageHeader title={pageTitle} description={pageDescription} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projects.name')} *</FormLabel>
                <FormControl><Input placeholder={t('common.projectNamePlaceholder')} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="codTed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projects.codeTed')} *</FormLabel>
                <FormControl><Input placeholder={t('common.tedCodePlaceholder')} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="termoInicial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.startDate')} *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
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
            <FormField
              control={form.control}
              name="termoFinal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.endDate')} *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
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
            name="dataEfetivaInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projects.effectiveStartDate')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
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
