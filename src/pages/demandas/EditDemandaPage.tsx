import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { PageHeader } from '@/components/common/PageComponents';
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { demandaService, projetoMetaService, metaProdutoService } from '@/services';
import { demandaSchema, type DemandaFormData } from '@/lib/validations';
import { canEditDemanda } from '@/lib/demandaStatus';
import type { DemandaTecnica, MetaProduto, ProjetoMeta } from '@/types';

type LocationState = {
  returnTo?: string;
};

function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith('/') && !value.startsWith('//');
}

export default function EditDemandaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { demandaId } = useParams<{ demandaId: string }>();
  const [demanda, setDemanda] = useState<DemandaTecnica | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metasProdutos, setMetasProdutos] = useState<{ meta: ProjetoMeta; produtos: MetaProduto[] }[]>([]);
  const [isLoadingProdutos, setIsLoadingProdutos] = useState(false);

  const form = useForm<DemandaFormData>({
    resolver: zodResolver(demandaSchema),
    defaultValues: { codigo: '', nome: '', projetoId: '', descricao: '', metaProdutoId: '' },
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
    navigate('/demandas');
  }, [navigate, returnTo]);

  const loadDemanda = useCallback(async () => {
    const parsedId = Number(demandaId);
    if (!parsedId || Number.isNaN(parsedId)) {
      setError(t('common.invalidData'));
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await demandaService.findById(parsedId);
      setDemanda(data);
      form.reset({
        codigo: data.codigo,
        nome: data.nome,
        projetoId: String(data.projetoId),
        descricao: data.descricao || '',
        metaProdutoId: data.metaProdutoId ? String(data.metaProdutoId) : '',
      });
    } catch {
      setError(t('common.errorLoadingData'));
    } finally {
      setIsLoading(false);
    }
  }, [demandaId, form, t]);

  const loadMetasProdutos = useCallback(async (projetoId: number) => {
    setIsLoadingProdutos(true);
    try {
      const metas = await projetoMetaService.findByProjeto(projetoId);
      const metasOrdenadas = [...metas].sort((a, b) => a.codigo.localeCompare(b.codigo));

      const grupos = await Promise.all(
        metasOrdenadas.map(async (meta) => {
          const produtos = await metaProdutoService.findByProjetoMeta(meta.id);
          const produtosOrdenados = [...produtos].sort((a, b) => a.codigo.localeCompare(b.codigo));
          return { meta, produtos: produtosOrdenados };
        })
      );

      setMetasProdutos(grupos.filter((g) => g.produtos.length > 0));
    } catch {
      setMetasProdutos([]);
    } finally {
      setIsLoadingProdutos(false);
    }
  }, []);

  useEffect(() => {
    void loadDemanda();
  }, [loadDemanda]);

  useEffect(() => {
    if (demanda?.projetoId) {
      void loadMetasProdutos(demanda.projetoId);
    }
  }, [demanda?.projetoId, loadMetasProdutos]);

  const onSubmit = async (data: DemandaFormData) => {
    if (!demanda) return;

    setIsSaving(true);
    try {
      await demandaService.update(demanda.id, {
        codigo: data.codigo,
        nome: data.nome,
        projetoId: demanda.projetoId,
        descricao: data.descricao,
        metaProdutoId: data.metaProdutoId ? Number(data.metaProdutoId) : null,
      });
      handleBack();
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('demands.editDemand')} />
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadDemanda}
          retryText={t('common.retry')}
        />
      </div>
    );
  }

  if (isLoading || !demanda) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('demands.editDemand')} />
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('demands.editDemand')} description={t('common.editDemand')} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('demands.code')}</FormLabel>
                  <FormControl>
                    <Input disabled placeholder={t('common.demandCodePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('demands.name')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('common.demandNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metaProdutoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('demands.product')}</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={field.value || ''}
                      onChange={field.onChange}
                    >
                      <option value="">{t('demands.selectProductPlaceholder')}</option>
                      {metasProdutos.map((grupo) => (
                        <optgroup key={grupo.meta.id} label={`${grupo.meta.codigo} - ${grupo.meta.nome}`}>
                          {grupo.produtos.map((produto) => (
                            <option key={produto.id} value={String(produto.id)}>
                              {produto.codigo} - {produto.nome}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </FormControl>
                  {isLoadingProdutos && (
                    <p className="text-xs text-muted-foreground mt-1">{t('demands.loadingProducts')}</p>
                  )}
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
                <FormLabel>{t('openingTerm.description')}</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder={t('common.descriptionPlaceholder')}
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
            <LoadingButton
              type="submit"
              isLoading={isSaving}
              loadingText={t('common.saving')}
              disabled={!canEditDemanda(demanda.status ?? demanda.situacao)}
            >
              {t('common.save')}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  );
}
