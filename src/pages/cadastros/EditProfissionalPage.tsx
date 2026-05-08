import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Briefcase, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageHeader, EmptyState } from '@/components/common/PageComponents';
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { cn } from '@/lib/utils';
import { profissionalSchema, type ProfissionalFormData } from '@/lib/validations';
import { profissionalService } from '@/services/profissionalService';
import { perfilService } from '@/services/perfilService';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import type { Perfil, Profissional } from '@/types';

const PROFISSIONAIS_NOVO_PATH = '/cadastros/profissionais/novo';

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

export default function EditProfissionalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { profissionalId } = useParams<{ profissionalId: string }>();
  const { selectedProject } = useProject();
  const { toast } = useToast();
  const isCreate = location.pathname === PROFISSIONAIS_NOVO_PATH;
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [isLoading, setIsLoading] = useState(!isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPerfis, setIsLoadingPerfis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfissionalFormData>({
    resolver: zodResolver(profissionalSchema),
    defaultValues: {
      nome: '',
      tipoPessoa: 'F',
      documento: '',
      funcao: '',
      valorHora: 0,
      custoTotalMensal: 0,
      dataInicioAtividade: new Date(),
      projetoId: 0,
      perfilId: 0,
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
    navigate('/cadastros/profissionais');
  }, [navigate, returnTo]);

  const loadPerfis = useCallback(async (projetoId: number) => {
    setIsLoadingPerfis(true);
    try {
      const response = await perfilService.findAll({
        projetoId,
        size: 1000,
      });
      setPerfis(response.content);
    } catch (err) {
      console.error('Erro ao carregar perfis:', err);
      setPerfis([]);
    } finally {
      setIsLoadingPerfis(false);
    }
  }, []);

  const loadProfissional = useCallback(async () => {
    const parsedId = Number(profissionalId);
    if (!parsedId || Number.isNaN(parsedId)) {
      setError(t('common.invalidData'));
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await profissionalService.findById(parsedId);
      setProfissional(data);
      form.reset({
        nome: data.nome,
        tipoPessoa: data.tipoPessoa,
        documento: data.documento,
        funcao: data.funcao ?? '',
        valorHora: data.valorHora,
        custoTotalMensal: data.custoTotalMensal,
        dataInicioAtividade: parseDateOnly(data.dataInicioAtividade) ?? new Date(),
        projetoId: data.projetoId,
        perfilId: data.perfilId,
      });
      await loadPerfis(data.projetoId);
    } catch {
      setError(t('common.errorLoadingData'));
    } finally {
      setIsLoading(false);
    }
  }, [profissionalId, form, loadPerfis, t]);

  useEffect(() => {
    if (isCreate) return;
    void loadProfissional();
  }, [isCreate, loadProfissional]);

  useEffect(() => {
    if (!isCreate || !selectedProject) return;
    form.reset({
      nome: '',
      tipoPessoa: 'F',
      documento: '',
      funcao: '',
      valorHora: 0,
      custoTotalMensal: 0,
      dataInicioAtividade: new Date(),
      projetoId: selectedProject.id,
      perfilId: 0,
    });
    void loadPerfis(selectedProject.id);
  }, [isCreate, selectedProject?.id, form, loadPerfis, selectedProject]);

  const onSubmit = async (data: ProfissionalFormData) => {
    if (isCreate) {
      if (!selectedProject) return;
      setIsSaving(true);
      try {
        const funcaoTrimmed = data.funcao?.trim();
        const payload: Parameters<typeof profissionalService.create>[0] = {
          nome: data.nome.trim(),
          tipoPessoa: data.tipoPessoa,
          documento: data.documento.trim(),
          valorHora: data.valorHora,
          custoTotalMensal: data.custoTotalMensal,
          dataInicioAtividade: data.dataInicioAtividade.toISOString().split('T')[0],
          projetoId: selectedProject.id,
          perfilId: data.perfilId,
        };
        if (funcaoTrimmed) payload.funcao = funcaoTrimmed;
        await profissionalService.create(payload);
        toast({ title: t('common.success'), description: t('professionals.createdSuccess') });
        handleBack();
      } catch (err: unknown) {
        toast({
          title: t('common.error'),
          description: err instanceof Error ? err.message : t('common.error'),
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!profissional) return;

    setIsSaving(true);
    try {
      const funcaoTrimmed = data.funcao?.trim();
      const payload = {
        nome: data.nome.trim(),
        tipoPessoa: data.tipoPessoa,
        documento: data.documento.trim(),
        funcao: funcaoTrimmed ?? '',
        valorHora: data.valorHora,
        custoTotalMensal: data.custoTotalMensal,
        dataInicioAtividade: data.dataInicioAtividade.toISOString().split('T')[0],
        projetoId: profissional.projetoId,
        perfilId: data.perfilId,
      };
      await profissionalService.update(profissional.id, payload);
      toast({ title: t('common.success'), description: t('professionals.updatedSuccess') });
      handleBack();
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isCreate && !selectedProject) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('professionals.newProfessional')} description={t('professionals.description')} />
        <EmptyState
          title={t('projectMeta.selectProjectFirst')}
          description={t('projectMeta.selectProjectDescription')}
          icon={<Briefcase className="h-6 w-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  if (error && !isCreate) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('professionals.editProfessional')} description={t('professionals.description')} />
        <ErrorState title={t('common.errorTitle')} message={error} onRetry={loadProfissional} retryText={t('common.retry')} />
      </div>
    );
  }

  if (!isCreate && (isLoading || !profissional)) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('professionals.editProfessional')} description={t('professionals.description')} />
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const pageTitle = isCreate ? t('professionals.newProfessional') : t('professionals.editProfessional');
  const pageDescription = isCreate ? t('common.fillInformation') : t('common.editInformation');

  return (
    <div className="space-y-6">
      <PageHeader title={pageTitle} description={pageDescription} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Linha 1: Nome | Tipo de Pessoa | Documento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('professionals.name')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('professionals.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipoPessoa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('professionals.tipoPessoa')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('professionals.selectTipoPessoa')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="F">{t('professionals.pessoaFisica')}</SelectItem>
                      <SelectItem value="J">{t('professionals.pessoaJuridica')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="documento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('professionals.document')} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('professionals.documentPlaceholder')}
                      inputMode="numeric"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Linha 2: Data início | Perfil | Função */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="dataInicioAtividade"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('professionals.dataInicioAtividade')} *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'dd/MM/yyyy') : t('common.select')}
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
              name="perfilId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('professionals.perfil')} *</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value ? String(field.value) : ''}
                    disabled={isLoadingPerfis}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('professionals.selectPerfil')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {perfis.map((perfil) => (
                        <SelectItem key={perfil.id} value={String(perfil.id)}>
                          {perfil.nome}
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
              name="funcao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('professionals.funcao')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('professionals.funcaoPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Linha 3: Valor hora | Custo total mensal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="valorHora"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('professionals.valorHora')} (R$) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="custoTotalMensal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('professionals.custoTotalMensal')} (R$) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                    />
                  </FormControl>
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
