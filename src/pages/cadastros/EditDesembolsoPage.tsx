import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Calendar, CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageHeader, EmptyState } from '@/components/common/PageComponents';
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { cn } from '@/lib/utils';
import { desembolsoSchema, type DesembolsoFormData } from '@/lib/validations';
import { desembolsoService } from '@/services/desembolsoService';
import { useProject } from '@/contexts/ProjectContext';
import type { Desembolso } from '@/types';

const DESEMBOLSOS_NOVO_PATH = '/cadastros/desembolsos/novo';

type LocationState = {
  returnTo?: string;
};

function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith('/') && !value.startsWith('//');
}

const parseDateOnly = (dateStr: string) => {
  const part = String(dateStr).split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
};

export default function EditDesembolsoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { desembolsoId } = useParams<{ desembolsoId: string }>();
  const { selectedProject } = useProject();
  const isCreate = location.pathname === DESEMBOLSOS_NOVO_PATH;
  const [desembolso, setDesembolso] = useState<Desembolso | null>(null);
  const [isLoading, setIsLoading] = useState(!isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<DesembolsoFormData>({
    resolver: zodResolver(desembolsoSchema),
    defaultValues: {
      documento: '',
      valorPrevisto: 0,
      valor: 0,
      dataDesembolso: new Date(),
      dataPrevistaDesembolso: new Date(),
    },
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
    navigate('/cadastros/desembolsos');
  }, [navigate, returnTo]);

  const loadDesembolso = useCallback(async () => {
    const parsedId = Number(desembolsoId);
    if (!parsedId || Number.isNaN(parsedId)) {
      setError(t('common.invalidData'));
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await desembolsoService.findById(parsedId);
      setDesembolso(data);
      form.reset({
        documento: data.documento ?? '',
        valorPrevisto: data.valorPrevisto,
        valor: data.valor,
        dataDesembolso: parseDateOnly(data.dataDesembolso) ?? new Date(data.dataDesembolso),
        dataPrevistaDesembolso:
          parseDateOnly(data.dataPrevistaDesembolso) ?? new Date(data.dataPrevistaDesembolso),
      });
    } catch {
      setError(t('common.errorLoadingData'));
    } finally {
      setIsLoading(false);
    }
  }, [desembolsoId, form, t]);

  useEffect(() => {
    if (isCreate) return;
    void loadDesembolso();
  }, [isCreate, loadDesembolso]);

  const onSubmit = async (data: DesembolsoFormData) => {
    if (isCreate) {
      if (!selectedProject) return;
      setIsSaving(true);
      try {
        await desembolsoService.create({
          documento: data.documento?.trim() || undefined,
          valorPrevisto: data.valorPrevisto,
          valor: data.valor,
          dataDesembolso: data.dataDesembolso.toISOString().split('T')[0],
          dataPrevistaDesembolso: data.dataPrevistaDesembolso.toISOString().split('T')[0],
          projetoId: selectedProject.id,
        });
        handleBack();
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!desembolso) return;
    setIsSaving(true);
    try {
      await desembolsoService.update(desembolso.id, {
        documento: data.documento?.trim() || undefined,
        valorPrevisto: data.valorPrevisto,
        valor: data.valor,
        dataDesembolso: data.dataDesembolso.toISOString().split('T')[0],
        dataPrevistaDesembolso: data.dataPrevistaDesembolso.toISOString().split('T')[0],
        projetoId: desembolso.projetoId,
      });
      handleBack();
    } finally {
      setIsSaving(false);
    }
  };

  if (isCreate && !selectedProject) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('disbursements.new')} description={t('disbursements.description')} />
        <EmptyState
          title={t('projectMeta.selectProjectFirst')}
          description={t('projectMeta.selectProjectDescription')}
          icon={<CircleDollarSign className="h-6 w-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  if (error && !isCreate) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('disbursements.editTitle')} description={t('disbursements.description')} />
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadDesembolso}
          retryText={t('common.retry')}
        />
      </div>
    );
  }

  if (!isCreate && (isLoading || !desembolso)) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('disbursements.editTitle')} description={t('disbursements.description')} />
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const pageTitle = isCreate ? t('disbursements.new') : t('disbursements.editTitle');
  const pageDescription = isCreate ? t('common.fillInformation') : t('common.editInformation');

  return (
    <div className="space-y-6">
      <PageHeader title={pageTitle} description={pageDescription} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="documento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('disbursements.document')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="valorPrevisto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('disbursements.plannedValue')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('disbursements.actualValue')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dataPrevistaDesembolso"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('disbursements.plannedDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            <span>{t('common.selectDate')}</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataDesembolso"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('disbursements.disbursementDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            <span>{t('common.selectDate')}</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleBack} disabled={isSaving}>
              {t('common.cancel')}
            </Button>
            <LoadingButton type="submit" isLoading={isSaving}>
              {t('common.save')}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  );
}
