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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageHeader, EmptyState } from '@/components/common/PageComponents';
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { cn } from '@/lib/utils';
import { perfilSchema, type PerfilFormData } from '@/lib/validations';
import { perfilService } from '@/services/perfilService';
import { projetoService } from '@/services/projetoService';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { UserCircle } from 'lucide-react';
import type { Perfil } from '@/types';

const PERFIS_NOVO_PATH = '/cadastros/perfis/novo';

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

export default function EditPerfilPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { perfilId } = useParams<{ perfilId: string }>();
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const isCreate = location.pathname === PERFIS_NOVO_PATH;
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isLoading, setIsLoading] = useState(!isCreate ? true : !!selectedProject);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { nome: '', termoInicial: undefined, termoFinal: undefined, valor: 0 },
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
    navigate('/cadastros/perfis');
  }, [navigate, returnTo]);

  const loadPerfil = useCallback(async () => {
    const parsedId = Number(perfilId);
    if (!parsedId || Number.isNaN(parsedId)) {
      setError(t('common.invalidData'));
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await perfilService.findById(parsedId);
      setPerfil(data);
      form.reset({
        nome: data.nome,
        termoInicial: parseDateOnly(data.termoInicial),
        termoFinal: parseDateOnly(data.termoFinal),
        valor: data.valor,
      });
    } catch {
      setError(t('common.errorLoadingData'));
    } finally {
      setIsLoading(false);
    }
  }, [perfilId, form, t]);

  useEffect(() => {
    if (isCreate) return;
    void loadPerfil();
  }, [isCreate, loadPerfil]);

  useEffect(() => {
    if (!isCreate || !selectedProject) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      let termoInicial: Date | undefined;
      let termoFinal: Date | undefined;
      try {
        const projeto = await projetoService.findById(selectedProject.id);
        const raw = projeto as unknown as Record<string, unknown>;
        const ti = raw.termoInicial ?? raw.termo_inicial;
        const tf = raw.termoFinal ?? raw.termo_final;
        if (ti) termoInicial = parseDateOnly(String(ti));
        if (tf) termoFinal = parseDateOnly(String(tf));
      } catch {
        const ti = selectedProject.termoInicial;
        const tf = selectedProject.termoFinal;
        if (ti) termoInicial = parseDateOnly(ti);
        if (tf) termoFinal = parseDateOnly(tf);
      }
      if (!cancelled) {
        form.reset({
          nome: '',
          termoInicial: termoInicial ?? undefined,
          termoFinal: termoFinal ?? undefined,
          valor: 0,
        });
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCreate, selectedProject?.id, form, selectedProject]);

  const onSubmit = async (data: PerfilFormData) => {
    if (isCreate) {
      if (!user || !selectedProject) return;
      setIsSaving(true);
      try {
        await perfilService.create({
          nome: data.nome,
          termoInicial: data.termoInicial.toISOString().split('T')[0],
          termoFinal: data.termoFinal.toISOString().split('T')[0],
          valor: data.valor,
          usuarioId: user.id,
          projetoId: selectedProject.id,
        });
        handleBack();
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!perfil) return;

    setIsSaving(true);
    try {
      await perfilService.update(perfil.id, {
        nome: data.nome,
        termoInicial: data.termoInicial.toISOString().split('T')[0],
        termoFinal: data.termoFinal.toISOString().split('T')[0],
        valor: data.valor,
        projetoId: perfil.projetoId,
      });
      handleBack();
    } finally {
      setIsSaving(false);
    }
  };

  if (isCreate && !selectedProject) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('profiles.newProfile')} />
        <EmptyState
          title={t('projectMeta.selectProjectFirst')}
          description={t('projectMeta.selectProjectDescription')}
          icon={<UserCircle className="h-6 w-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  if (error && !isCreate) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('profiles.editProfile')} />
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadPerfil}
          retryText={t('common.retry')}
        />
      </div>
    );
  }

  if (!isCreate && (isLoading || !perfil)) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('profiles.editProfile')} />
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isCreate && isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('profiles.newProfile')} />
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const pageTitle = isCreate ? t('profiles.newProfile') : t('profiles.editProfile');
  const pageDescription = isCreate ? t('common.fillProfile') : t('common.editProfile');

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
                <FormLabel>{t('profiles.name')} *</FormLabel>
                <FormControl><Input placeholder={t('common.profileNamePlaceholder')} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('planningTerm.hourlyRate')} (R$) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={t('common.currencyValuePlaceholder')}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                    value={field.value || ''}
                  />
                </FormControl>
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
                  <FormLabel>{t('profiles.startDate')} *</FormLabel>
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
                  <FormLabel>{t('profiles.endDate')} *</FormLabel>
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
