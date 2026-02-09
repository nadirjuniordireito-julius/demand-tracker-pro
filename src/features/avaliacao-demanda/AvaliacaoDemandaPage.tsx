/**
 * Página de Avaliação de Qualidade da Demanda Técnica
 * Formulário em abas (steps): Prazo & Custo, Qualidade, Maturidade, Riscos, Equipe, Impacto, Lições
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { LabeledCard } from '@/components/common/LabeledCard';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { demandaService } from '@/services/demandaService';
import { projetoMetaService } from '@/services/projetoMetaService';
import { avaliacaoDemandaService } from './avaliacaoDemandaService';
import { avaliacaoDemandaDocService } from './avaliacaoDemandaDocService';
import { ApiError } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { avaliacaoDemandaSchema, type AvaliacaoDemandaFormData } from './avaliacaoSchema';
import { avaliacaoDemandaDefaultValues, formToRequest, textosFromAvaliacaoResponse } from './defaults';
import type { DemandaTecnica, ProjetoMeta } from '@/types';
import type { DemandaAvaliacaoResponse, TipoRisco } from './types';
import {
  generateAvaliacaoDemandaPdfBlob,
  type AvaliacaoDemandaPdfData,
  type AvaliacaoPdfContext,
  type AvaliacaoPdfSection,
} from './avaliacaoDemandaPdf';
import { Printer } from 'lucide-react';

const ESCALA_OPCOES = [1, 2, 3, 4, 5];
const TIPO_RISCO_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: 'FALHA_REQUISITOS', labelKey: 'avaliacaoDemanda.riscoFalhaRequisitos' },
  { value: 'MUDANCA_ESCOPO', labelKey: 'avaliacaoDemanda.riscoMudancaEscopo' },
  { value: 'COMUNICACAO', labelKey: 'avaliacaoDemanda.riscoComunicacao' },
  { value: 'TERCEIROS', labelKey: 'avaliacaoDemanda.riscoTerceiros' },
  { value: 'FALTA_RECURSOS', labelKey: 'avaliacaoDemanda.riscoFaltaRecursos' },
  { value: 'FALTA_COMPETENCIA', labelKey: 'avaliacaoDemanda.riscoFaltaCompetencia' },
  { value: 'INFRAESTRUTURA', labelKey: 'avaliacaoDemanda.riscoInfraestrutura' },
  { value: 'GOVERNANCA', labelKey: 'avaliacaoDemanda.riscoGovernanca' },
  { value: 'OUTROS', labelKey: 'avaliacaoDemanda.riscoOutros' },
];

const QUALIDADE_LABEL_KEYS: Record<string, string> = {
  atendimentoRequisitos: 'avaliacaoDemanda.labelAtendimentoRequisitos',
  estabilidade: 'avaliacaoDemanda.labelEstabilidade',
  retrabalho: 'avaliacaoDemanda.labelRetrabalho',
  satisfacaoUsuario: 'avaliacaoDemanda.labelSatisfacaoUsuario',
  clarezaRequisitos: 'avaliacaoDemanda.labelClarezaRequisitos',
};
const MATURIDADE_LABEL_KEYS: Record<string, string> = {
  qualidadePlanejamento: 'avaliacaoDemanda.labelQualidadePlanejamento',
  aderenciaCronograma: 'avaliacaoDemanda.labelAderenciaCronograma',
  comunicacao: 'avaliacaoDemanda.labelComunicacao',
};
const LICOES_LABEL_KEYS: Record<string, string> = {
  causaAtraso: 'avaliacaoDemanda.labelCausaAtraso',
  causaCusto: 'avaliacaoDemanda.labelCausaCusto',
  gargalo: 'avaliacaoDemanda.labelGargalo',
  impactoEquipe: 'avaliacaoDemanda.labelImpactoEquipe',
  correcoes: 'avaliacaoDemanda.labelCorrecoes',
  licoesPositivas: 'avaliacaoDemanda.labelLicoesPositivas',
  licoesNegativas: 'avaliacaoDemanda.labelLicoesNegativas',
  melhorias: 'avaliacaoDemanda.labelMelhorias',
};

export default function AvaliacaoDemandaPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const demandaId = searchParams.get('demandaId') ? Number(searchParams.get('demandaId')) : null;

  const [demanda, setDemanda] = useState<DemandaTecnica | null>(null);
  const [existingAvaliacao, setExistingAvaliacao] = useState<DemandaAvaliacaoResponse | null>(null);
  const [isLoadingDemanda, setIsLoadingDemanda] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const form = useForm<AvaliacaoDemandaFormData>({
    resolver: zodResolver(avaliacaoDemandaSchema),
    defaultValues: avaliacaoDemandaDefaultValues,
  });

  function buildPdfData(meta: ProjetoMeta | null | undefined, overrideContext?: Partial<AvaliacaoPdfContext>): AvaliacaoDemandaPdfData {
    const values = form.getValues();
    const projeto = demanda!.projeto;
    const produto = demanda!.metaProduto;
    const labels = {
      reportTitle: t('avaliacaoDemanda.pdfReportTitle'),
      reportSubtitle: t('avaliacaoDemanda.pdfReportSubtitle'),
      contextTitle: t('avaliacaoDemanda.pdfContextTitle'),
      labelProjeto: t('avaliacaoDemanda.pdfLabelProjeto'),
      labelMetaCodeName: t('avaliacaoDemanda.pdfLabelMetaCodeName'),
      labelProdutoCodeName: t('avaliacaoDemanda.pdfLabelProdutoCodeName'),
      labelDemandaCodeName: t('avaliacaoDemanda.pdfLabelDemandaCodeName'),
      labelDataHoraPreenchimento: t('avaliacaoDemanda.pdfLabelDataHoraPreenchimento'),
      labelPreenchidoPor: t('avaliacaoDemanda.pdfLabelPreenchidoPor'),
    };
    const context: AvaliacaoPdfContext = {
      projetoNome: projeto?.nome ?? '—',
      metaCodigo: meta?.codigo ?? '',
      metaNome: meta?.nome ?? '—',
      produtoCodigo: produto?.codigo ?? '',
      produtoNome: produto?.nome ?? '—',
      demandaCodigo: demanda!.codigo,
      demandaNome: demanda!.nome,
      dataHoraPreenchimento: existingAvaliacao?.dataHoraPreenchimento,
      usuarioNome: user?.nome,
      ...overrideContext,
    };
    const simNao = (v: boolean) => (v ? t('common.yes') : t('common.no'));
    const reutilizacaoLabel = (r: string) => {
      if (r === 'BAIXA') return t('avaliacaoDemanda.reutilizacaoBaixa');
      if (r === 'MEDIA') return t('avaliacaoDemanda.reutilizacaoMedia');
      if (r === 'ALTA') return t('avaliacaoDemanda.reutilizacaoAlta');
      return r;
    };
    const riscosLabels = (values.riscos ?? []).map(
      (r) => TIPO_RISCO_OPTIONS.find((o) => o.value === r)?.labelKey ?? r
    ).map((key) => t(key));
    const sections: AvaliacaoPdfSection[] = [
      {
        sectionTitle: t('avaliacaoDemanda.stepPrazoCusto'),
        rows: [
          { label: t('avaliacaoDemanda.labelAtraso'), value: simNao(values.atraso) },
          { label: t('avaliacaoDemanda.labelImpactoAtraso'), value: String(values.impactoAtraso) },
          { label: t('avaliacaoDemanda.labelDesvioPrazo'), value: `${values.desvioPrazoPercentual}%` },
          { label: t('avaliacaoDemanda.labelDesvioCusto'), value: `${values.desvioCustoPercentual}%` },
          { label: t('avaliacaoDemanda.labelImpactoFinanceiro'), value: String(values.impactoFinanceiro) },
        ],
      },
      {
        sectionTitle: t('avaliacaoDemanda.stepQualidade'),
        rows: [
          { label: t(QUALIDADE_LABEL_KEYS.atendimentoRequisitos), value: String(values.atendimentoRequisitos) },
          { label: t(QUALIDADE_LABEL_KEYS.estabilidade), value: String(values.estabilidade) },
          { label: t(QUALIDADE_LABEL_KEYS.retrabalho), value: String(values.retrabalho) },
          { label: t(QUALIDADE_LABEL_KEYS.satisfacaoUsuario), value: String(values.satisfacaoUsuario) },
          { label: t(QUALIDADE_LABEL_KEYS.clarezaRequisitos), value: String(values.clarezaRequisitos) },
        ],
      },
      {
        sectionTitle: t('avaliacaoDemanda.stepMaturidade'),
        rows: [
          { label: t(MATURIDADE_LABEL_KEYS.qualidadePlanejamento), value: String(values.qualidadePlanejamento) },
          { label: t(MATURIDADE_LABEL_KEYS.aderenciaCronograma), value: String(values.aderenciaCronograma) },
          { label: t(MATURIDADE_LABEL_KEYS.comunicacao), value: String(values.comunicacao) },
        ],
      },
      {
        sectionTitle: t('avaliacaoDemanda.stepRiscos'),
        rows: [
          { label: t('avaliacaoDemanda.labelRiscosIdentificados'), value: riscosLabels.length ? riscosLabels.join(', ') : '—' },
        ],
      },
      {
        sectionTitle: t('avaliacaoDemanda.stepEquipe'),
        rows: [
          { label: t('avaliacaoDemanda.labelCapacidadeEquipe'), value: String(values.capacidadeEquipe) },
          { label: t('avaliacaoDemanda.labelDisponibilidadeEquipe'), value: String(values.disponibilidadeEquipe) },
          { label: t('avaliacaoDemanda.labelPossuiBackupCritico'), value: simNao(values.possuiBackupCritico) },
          { label: t('avaliacaoDemanda.labelRotatividadeImpactou'), value: simNao(values.rotatividadeImpactou) },
        ],
      },
      {
        sectionTitle: t('avaliacaoDemanda.stepImpacto'),
        rows: [
          { label: t('avaliacaoDemanda.labelValorPercebido'), value: String(values.valorPercebido) },
          { label: t('avaliacaoDemanda.labelAlinhamentoMeta'), value: String(values.alinhamentoMeta) },
          { label: t('avaliacaoDemanda.labelReutilizacao'), value: reutilizacaoLabel(values.reutilizacao) },
          { label: t('avaliacaoDemanda.labelAvaliacaoGeral'), value: String(values.avaliacaoGeral) },
          { label: t('avaliacaoDemanda.labelRepetiriaModelo'), value: simNao(values.repetiriaModelo) },
        ],
      },
      {
        sectionTitle: t('avaliacaoDemanda.stepLicoes'),
        rows: [
          ...(values.atraso ? [{ label: t(LICOES_LABEL_KEYS.causaAtraso), value: values.textos?.causaAtraso || '—' }] : []),
          { label: t(LICOES_LABEL_KEYS.causaCusto), value: values.textos?.causaCusto || '—' },
          { label: t(LICOES_LABEL_KEYS.gargalo), value: values.textos?.gargalo || '—' },
          { label: t(LICOES_LABEL_KEYS.impactoEquipe), value: values.textos?.impactoEquipe || '—' },
          { label: t(LICOES_LABEL_KEYS.correcoes), value: values.textos?.correcoes || '—' },
          { label: t(LICOES_LABEL_KEYS.licoesPositivas), value: values.textos?.licoesPositivas || '—' },
          { label: t(LICOES_LABEL_KEYS.licoesNegativas), value: values.textos?.licoesNegativas || '—' },
          { label: t(LICOES_LABEL_KEYS.melhorias), value: values.textos?.melhorias || '—' },
        ],
      },
    ];
    return { labels, context, sections };
  }

  useEffect(() => {
    if (!demandaId) {
      setIsLoadingDemanda(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [demandaRes, avaliacaoRes] = await Promise.all([
          demandaService.findById(demandaId),
          avaliacaoDemandaService.get(demandaId),
        ]);
        if (!cancelled) {
          setDemanda(demandaRes);
          if (avaliacaoRes) {
            setExistingAvaliacao(avaliacaoRes);
            const semAtraso = !avaliacaoRes.atraso;
            form.reset({
              atraso: avaliacaoRes.atraso,
              impactoAtraso: semAtraso ? 0 : avaliacaoRes.impactoAtraso,
              desvioPrazoPercentual: semAtraso ? 0 : avaliacaoRes.desvioPrazoPercentual,
              desvioCustoPercentual: avaliacaoRes.desvioCustoPercentual,
              impactoFinanceiro: avaliacaoRes.impactoFinanceiro,
              atendimentoRequisitos: avaliacaoRes.atendimentoRequisitos,
              estabilidade: avaliacaoRes.estabilidade,
              retrabalho: avaliacaoRes.retrabalho,
              satisfacaoUsuario: avaliacaoRes.satisfacaoUsuario,
              clarezaRequisitos: avaliacaoRes.clarezaRequisitos,
              qualidadePlanejamento: avaliacaoRes.qualidadePlanejamento,
              aderenciaCronograma: avaliacaoRes.aderenciaCronograma,
              comunicacao: avaliacaoRes.comunicacao,
              capacidadeEquipe: avaliacaoRes.capacidadeEquipe,
              disponibilidadeEquipe: avaliacaoRes.disponibilidadeEquipe,
              possuiBackupCritico: avaliacaoRes.possuiBackupCritico,
              rotatividadeImpactou: avaliacaoRes.rotatividadeImpactou,
              valorPercebido: avaliacaoRes.valorPercebido,
              alinhamentoMeta: avaliacaoRes.alinhamentoMeta,
              reutilizacao: avaliacaoRes.reutilizacao,
              avaliacaoGeral: avaliacaoRes.avaliacaoGeral,
              repetiriaModelo: avaliacaoRes.repetiriaModelo,
              riscos: avaliacaoRes.riscos ?? [],
              textos: textosFromAvaliacaoResponse(avaliacaoRes as Record<string, unknown>),
            });
          }
        }
      } catch {
        if (!cancelled) setDemanda(null);
      } finally {
        if (!cancelled) setIsLoadingDemanda(false);
      }
    })();
    return () => { cancelled = true; };
  }, [demandaId, form]);

  const onSubmit = async (data: AvaliacaoDemandaFormData) => {
    if (!demandaId || !demanda) return;
    setIsSaving(true);
    try {
      const payload = {
        ...formToRequest(data),
        ...(user?.id != null && { usuarioId: user.id }),
      };
      let saved: DemandaAvaliacaoResponse;
      if (existingAvaliacao) {
        saved = await avaliacaoDemandaService.update(demandaId, payload);
      } else {
        saved = await avaliacaoDemandaService.create(demandaId, payload);
      }
      setExistingAvaliacao(saved);
      toast({
        title: t('common.success'),
        description: t('avaliacaoDemanda.saveSuccess'),
        variant: 'success',
      });
      // Gera o PDF da avaliação e grava no backend (DemandaAvaliacaoDoc)
      (async () => {
        try {
          let meta: ProjetoMeta | null | undefined = demanda.metaProduto?.projetoMeta ?? (demanda.metaProduto as { meta?: ProjetoMeta })?.meta;
          if (!meta && demanda.metaProduto?.projetoMetaId != null) {
            try {
              meta = await projetoMetaService.findById(demanda.metaProduto.projetoMetaId);
            } catch {
              meta = undefined;
            }
          }
          const pdfData = buildPdfData(meta, {
            dataHoraPreenchimento: saved?.dataHoraPreenchimento,
            usuarioNome: user?.nome,
          });
          const blob = await generateAvaliacaoDemandaPdfBlob(pdfData);
          const file = new File([blob], `avaliacao-${demanda.codigo || demandaId}.pdf`, { type: 'application/pdf' });
          const hasDoc = await avaliacaoDemandaDocService.exists(demandaId);
          if (hasDoc) {
            await avaliacaoDemandaDocService.update(demandaId, file);
          } else {
            await avaliacaoDemandaDocService.upload(demandaId, file);
          }
        } catch (docErr) {
          if (import.meta.env.DEV) console.error('Erro ao gravar PDF da avaliação:', docErr);
          toast({
            title: t('common.error'),
            description: t('avaliacaoDemanda.pdfUploadError'),
            variant: 'destructive',
          });
        }
      })();
    } catch (err) {
      if (err instanceof ApiError) {
        const isBusinessError = err.status === 400 || err.status === 422;
        if (isBusinessError) {
          const backendMessage = (err.message || '').trim();
          const validationMessages =
            err.errors && Object.keys(err.errors).length > 0
              ? Object.values(err.errors).filter(Boolean)
              : [];
          const description =
            backendMessage ||
            (validationMessages.length > 0 ? validationMessages.join(' ') : null) ||
            t('avaliacaoDemanda.domainErrorNotEligible');
          toast({
            title: t('common.error'),
            description,
            variant: 'destructive',
          });
          if (err.errors) {
            for (const [field, message] of Object.entries(err.errors)) {
              if (message) form.setError(field as Parameters<typeof form.setError>[0], { type: 'server', message });
            }
          }
          return;
        }
      }
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  if (!demandaId) {
    return (
      <div className="space-y-6 p-6">
        <ErrorState
          message={t('validation.demandRequired')}
          onRetry={() => navigate('/demandas')}
        />
        <Button variant="outline" onClick={() => navigate('/demandas')}>{t('common.back')}</Button>
      </div>
    );
  }

  if (isLoadingDemanda) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingButton className="pointer-events-none">{t('common.loading')}</LoadingButton>
      </div>
    );
  }

  if (!demanda) {
    return (
      <div className="space-y-6 p-6">
        <ErrorState message={t('common.errorMessage')} onRetry={() => window.location.reload()} />
        <Button variant="outline" onClick={() => navigate('/demandas')}>{t('common.back')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-normal tracking-tight">
            {t('avaliacaoDemanda.avaliacaoLabel')}
          </h1>
          <p className="text-sm font-light text-muted-foreground">
            {existingAvaliacao ? t('common.editInformation') : t('common.fillInformation')}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">{t('avaliacaoDemanda.demandLabel')}</p>
            <p className="text-sm font-normal">{demanda.codigo} — {demanda.nome}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setPdfPreviewOpen(true)}
            title={t('avaliacaoDemanda.printPdfTitle')}
            aria-label={t('avaliacaoDemanda.printPdfTitle')}
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <PdfPreviewDialog
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        title={t('avaliacaoDemanda.pdfPreviewTitle')}
        description={t('avaliacaoDemanda.pdfPreviewDescription')}
        fetchPdf={() => avaliacaoDemandaDocService.download(demandaId!)}
        loadingLabel={t('avaliacaoDemanda.pdfLoading')}
        errorMessage={t('avaliacaoDemanda.pdfNotAvailable')}
        downloadFileName={`avaliacao-${demanda.codigo || demanda.id}.pdf`}
        closeLabel={t('common.close')}
        downloadLabel={t('common.download')}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="prazo" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-1">
                  <TabsTrigger value="prazo" className="text-xs">{t('avaliacaoDemanda.stepPrazoCusto')}</TabsTrigger>
                  <TabsTrigger value="qualidade">{t('avaliacaoDemanda.stepQualidade')}</TabsTrigger>
                  <TabsTrigger value="maturidade">{t('avaliacaoDemanda.stepMaturidade')}</TabsTrigger>
                  <TabsTrigger value="riscos">{t('avaliacaoDemanda.stepRiscos')}</TabsTrigger>
                  <TabsTrigger value="equipe">{t('avaliacaoDemanda.stepEquipe')}</TabsTrigger>
                  <TabsTrigger value="impacto">{t('avaliacaoDemanda.stepImpacto')}</TabsTrigger>
                  <TabsTrigger value="licoes">{t('avaliacaoDemanda.stepLicoes')}</TabsTrigger>
                </TabsList>

                <TabsContent value="prazo" className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LabeledCard title={t('avaliacaoDemanda.cardPrazo')} contentClassName="space-y-4">
                      <FormField control={form.control} name="atraso" render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <FormLabel>{t('avaliacaoDemanda.labelAtraso')}</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (!checked) {
                                  form.setValue('impactoAtraso', 0);
                                  form.setValue('desvioPrazoPercentual', 0);
                                  form.setValue('textos.causaAtraso', '');
                                }
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )} />
                      {form.watch('atraso') && (
                        <>
                          <FormField control={form.control} name="impactoAtraso" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('avaliacaoDemanda.labelImpactoAtraso')}</FormLabel>
                              <FormControl>
                                <RadioGroup value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} className="flex gap-4">
                                  {ESCALA_OPCOES.map((n) => (
                                    <div key={n} className="flex items-center space-x-2">
                                      <RadioGroupItem value={String(n)} id={`impactoAtraso-${n}`} />
                                      <label htmlFor={`impactoAtraso-${n}`}>{n}</label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="desvioPrazoPercentual" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('avaliacaoDemanda.labelDesvioPrazo')}</FormLabel>
                              <FormControl><Input type="number" min={0} max={100} {...field} onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </>
                      )}
                    </LabeledCard>
                    <LabeledCard title={t('avaliacaoDemanda.cardCusto')} contentClassName="space-y-4">
                      <FormField control={form.control} name="desvioCustoPercentual" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('avaliacaoDemanda.labelDesvioCusto')}</FormLabel>
                          <FormControl><Input type="number" min={0} max={100} {...field} onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="impactoFinanceiro" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('avaliacaoDemanda.labelImpactoFinanceiro')}</FormLabel>
                          <FormControl>
                            <RadioGroup value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} className="flex gap-4">
                              {ESCALA_OPCOES.map((n) => (
                                <div key={n} className="flex items-center space-x-2">
                                  <RadioGroupItem value={String(n)} id={`impactoFin-${n}`} />
                                  <label htmlFor={`impactoFin-${n}`}>{n}</label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </LabeledCard>
                  </div>
                </TabsContent>

                <TabsContent value="qualidade" className="space-y-4 pt-4">
                  {['atendimentoRequisitos', 'estabilidade', 'retrabalho', 'satisfacaoUsuario', 'clarezaRequisitos'].map((name) => (
                    <FormField key={name} control={form.control} name={name as keyof AvaliacaoDemandaFormData} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t(QUALIDADE_LABEL_KEYS[name])}</FormLabel>
                        <FormControl>
                          <RadioGroup value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} className="flex gap-4">
                            {ESCALA_OPCOES.map((n) => (
                              <div key={n} className="flex items-center space-x-2">
                                <RadioGroupItem value={String(n)} id={`${name}-${n}`} />
                                <label htmlFor={`${name}-${n}`}>{n}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </TabsContent>

                <TabsContent value="maturidade" className="space-y-4 pt-4">
                  {['qualidadePlanejamento', 'aderenciaCronograma', 'comunicacao'].map((name) => (
                    <FormField key={name} control={form.control} name={name as keyof AvaliacaoDemandaFormData} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t(MATURIDADE_LABEL_KEYS[name])}</FormLabel>
                        <FormControl>
                          <RadioGroup value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} className="flex gap-4">
                            {ESCALA_OPCOES.map((n) => (
                              <div key={n} className="flex items-center space-x-2">
                                <RadioGroupItem value={String(n)} id={`${name}-${n}`} />
                                <label htmlFor={`${name}-${n}`}>{n}</label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </TabsContent>

                <TabsContent value="riscos" className="space-y-4 pt-4">
                  <FormField control={form.control} name="riscos" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('avaliacaoDemanda.labelRiscosIdentificados')}</FormLabel>
                      <FormControl>
                        <div className="grid gap-2">
                          {TIPO_RISCO_OPTIONS.map((opt) => (
                            <div key={opt.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={opt.value}
                                checked={field.value.includes(opt.value as TipoRisco)}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? ([...field.value, opt.value] as TipoRisco[])
                                    : field.value.filter((r) => r !== opt.value);
                                  field.onChange(next);
                                }}
                              />
                              <label htmlFor={opt.value} className="text-sm">{t(opt.labelKey)}</label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="equipe" className="space-y-4 pt-4">
                  <FormField control={form.control} name="capacidadeEquipe" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('avaliacaoDemanda.labelCapacidadeEquipe')}</FormLabel>
                      <FormControl>
                        <RadioGroup value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} className="flex gap-4">
                          {ESCALA_OPCOES.map((n) => (
                            <div key={n} className="flex items-center space-x-2">
                              <RadioGroupItem value={String(n)} id={`cap-${n}`} />
                              <label htmlFor={`cap-${n}`}>{n}</label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="disponibilidadeEquipe" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('avaliacaoDemanda.labelDisponibilidadeEquipe')}</FormLabel>
                      <FormControl>
                        <RadioGroup value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} className="flex gap-4">
                          {ESCALA_OPCOES.map((n) => (
                            <div key={n} className="flex items-center space-x-2">
                              <RadioGroupItem value={String(n)} id={`disp-${n}`} />
                              <label htmlFor={`disp-${n}`}>{n}</label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="possuiBackupCritico" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <FormLabel>{t('avaliacaoDemanda.labelPossuiBackupCritico')}</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rotatividadeImpactou" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <FormLabel>{t('avaliacaoDemanda.labelRotatividadeImpactou')}</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="impacto" className="space-y-4 pt-4">
                  <FormField control={form.control} name="valorPercebido" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('avaliacaoDemanda.labelValorPercebido')}</FormLabel>
                      <FormControl>
                        <RadioGroup value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} className="flex gap-4">
                          {ESCALA_OPCOES.map((n) => (
                            <div key={n} className="flex items-center space-x-2">
                              <RadioGroupItem value={String(n)} id={`valor-${n}`} />
                              <label htmlFor={`valor-${n}`}>{n}</label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="alinhamentoMeta" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('avaliacaoDemanda.labelAlinhamentoMeta')}</FormLabel>
                      <FormControl>
                        <RadioGroup value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} className="flex gap-4">
                          {ESCALA_OPCOES.map((n) => (
                            <div key={n} className="flex items-center space-x-2">
                              <RadioGroupItem value={String(n)} id={`alinh-${n}`} />
                              <label htmlFor={`alinh-${n}`}>{n}</label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reutilizacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('avaliacaoDemanda.labelReutilizacao')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BAIXA">{t('avaliacaoDemanda.reutilizacaoBaixa')}</SelectItem>
                          <SelectItem value="MEDIA">{t('avaliacaoDemanda.reutilizacaoMedia')}</SelectItem>
                          <SelectItem value="ALTA">{t('avaliacaoDemanda.reutilizacaoAlta')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="avaliacaoGeral" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('avaliacaoDemanda.labelAvaliacaoGeral')}</FormLabel>
                      <FormControl>
                        <RadioGroup value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} className="flex gap-4">
                          {ESCALA_OPCOES.map((n) => (
                            <div key={n} className="flex items-center space-x-2">
                              <RadioGroupItem value={String(n)} id={`geral-${n}`} />
                              <label htmlFor={`geral-${n}`}>{n}</label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="repetiriaModelo" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <FormLabel>{t('avaliacaoDemanda.labelRepetiriaModelo')}</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </TabsContent>

                <TabsContent value="licoes" className="space-y-4 pt-4">
                  {(['causaAtraso', 'causaCusto', 'gargalo', 'impactoEquipe', 'correcoes', 'licoesPositivas', 'licoesNegativas', 'melhorias'] as const)
                    .filter((key) => key !== 'causaAtraso' || form.watch('atraso'))
                    .map((key) => (
                      <FormField key={key} control={form.control} name={`textos.${key}`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t(LICOES_LABEL_KEYS[key])}</FormLabel>
                          <FormControl><Textarea rows={3} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => navigate('/demandas')}>
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
