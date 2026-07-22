import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BarChart3, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageComponents';
import { getStatusBadge } from '@/components/common/statusBadge';
import { ErrorState, TableSkeleton } from '@/components/common/LoadingStates';
import { useProject } from '@/contexts/ProjectContext';
import { profissionalService } from '@/services/profissionalService';
import { formatCurrency, parseDateOnly } from '@/lib/formatters';
import type { Profissional } from '@/types';
import type {
  ProfissionalAnaliseResumidaDTO,
  ProfissionalDemandaTecnicaDTO,
  ProfissionalDemandaTecnicaResumoMensalDTO,
} from '@/modules/execucaoDemanda/types';

const WHERE_IS_COL_SPAN = 8;

function formatMesAno(ano: number, mes: number, locale: string): string {
  return new Date(ano, mes - 1, 1).toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric',
  });
}

function formatHoras(value: number, locale: string): string {
  return Number(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AnaliseProfissionaisPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { selectedProject } = useProject();

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalId, setProfissionalId] = useState<string>('');
  const [analytics, setAnalytics] = useState<ProfissionalAnaliseResumidaDTO[]>([]);
  const [demandasTecnicas, setDemandasTecnicas] = useState<ProfissionalDemandaTecnicaDTO[]>([]);
  const [resumoMensal, setResumoMensal] = useState<ProfissionalDemandaTecnicaResumoMensalDTO[]>([]);
  const [whereIsLoaded, setWhereIsLoaded] = useState(false);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingDemandas, setLoadingDemandas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whereIsError, setWhereIsError] = useState<string | null>(null);
  const [expandedDtIds, setExpandedDtIds] = useState<Set<number>>(new Set());

  const monthLabel = useCallback(
    (mes: number) => new Date(2000, mes - 1, 1).toLocaleDateString(i18n.language, { month: 'long' }),
    [i18n.language],
  );

  const formatDateOnly = useCallback(
    (dateStr: string) => {
      const d = parseDateOnly(dateStr);
      if (!d) return '—';
      return d.toLocaleDateString(i18n.language);
    },
    [i18n.language],
  );

  const loadProfessionals = useCallback(async () => {
    if (!selectedProject?.id) {
      setProfissionais([]);
      setProfissionalId('');
      setLoadingProfessionals(false);
      return;
    }
    setLoadingProfessionals(true);
    setError(null);
    try {
      const page = await profissionalService.findAll({
        projetoId: selectedProject.id,
        page: 0,
        size: 1000,
        sort: 'nome,asc',
      });
      setProfissionais(page.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorMessage'));
    } finally {
      setLoadingProfessionals(false);
    }
  }, [selectedProject?.id, t]);

  useEffect(() => {
    void loadProfessionals();
  }, [loadProfessionals]);

  const handleProfissionalChange = (value: string) => {
    setProfissionalId(value);
    setAnalytics([]);
    setDemandasTecnicas([]);
    setResumoMensal([]);
    setWhereIsLoaded(false);
    setWhereIsError(null);
    setExpandedDtIds(new Set());
  };

  const handleConsultar = async () => {
    if (!profissionalId) return;
    setLoadingAnalytics(true);
    setError(null);
    try {
      const data = await profissionalService.getAnaliseResumida(Number(profissionalId));
      const filtered = data.filter((row) => (Number(row.horasExecutadas) || 0) > 0);
      filtered.sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));
      setAnalytics(filtered);
    } catch (err) {
      setAnalytics([]);
      setError(err instanceof Error ? err.message : t('common.errorMessage'));
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleWhereIs = async () => {
    if (!profissionalId) return;
    setLoadingDemandas(true);
    setWhereIsError(null);
    setExpandedDtIds(new Set());
    try {
      const data = await profissionalService.getDemandasTecnicas(Number(profissionalId));
      setDemandasTecnicas(data.demandasTecnicas ?? []);
      setResumoMensal(data.resumoMensal ?? []);
      setWhereIsLoaded(true);
    } catch (err) {
      setDemandasTecnicas([]);
      setResumoMensal([]);
      setWhereIsLoaded(true);
      setWhereIsError(err instanceof Error ? err.message : t('common.errorMessage'));
    } finally {
      setLoadingDemandas(false);
    }
  };

  const toggleDtExpanded = (demandaTecnicaId: number) => {
    setExpandedDtIds((prev) => {
      const next = new Set(prev);
      if (next.has(demandaTecnicaId)) next.delete(demandaTecnicaId);
      else next.add(demandaTecnicaId);
      return next;
    });
  };

  const profissionalSelecionado = useMemo(
    () => profissionais.find((p) => p.id === Number(profissionalId)) ?? null,
    [profissionais, profissionalId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('professionalAnalysis.title')}
        description={t('professionalAnalysis.description')}
      >
        <Button variant="outline" className="gap-2" onClick={() => navigate('/cadastros/profissionais')}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <span className="inline-flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('professionalAnalysis.filters')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] space-y-2">
            <Label>{t('nav.professionals')}</Label>
            <Select
              value={profissionalId}
              onValueChange={handleProfissionalChange}
              disabled={loadingProfessionals || profissionais.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('professionalAnalysis.selectProfessional')} />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={() => void handleConsultar()}
            disabled={!profissionalId || loadingAnalytics}
          >
            {t('common.search')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void handleWhereIs()}
            disabled={!profissionalId || loadingDemandas}
          >
            <MapPin className="h-4 w-4" />
            Where is?
          </Button>
        </CardContent>
      </Card>

      {loadingProfessionals ? (
        <TableSkeleton rows={6} columns={5} />
      ) : error ? (
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadProfessionals}
          retryText={t('common.retry')}
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t('professionalAnalysis.tableTitle')}
                {profissionalSelecionado ? ` - ${profissionalSelecionado.nome}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAnalytics ? (
                <TableSkeleton rows={6} columns={5} />
              ) : analytics.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('common.noRecordsFound')}</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.year')}</TableHead>
                        <TableHead>{t('common.month')}</TableHead>
                        <TableHead>{t('professionalAnalysis.horasExecutadas')}</TableHead>
                        <TableHead>{t('professionalAnalysis.valorPerfilMes')}</TableHead>
                        <TableHead>{t('professionalAnalysis.valorCustoMes')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.map((row, idx) => (
                        <TableRow key={`${row.ano}-${row.mes}-${idx}`}>
                          <TableCell className="text-xs">{row.ano}</TableCell>
                          <TableCell className="text-xs capitalize">{monthLabel(row.mes)}</TableCell>
                          <TableCell className="text-xs tabular-nums">
                            {Number(row.horasExecutadas).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs tabular-nums">
                            {formatCurrency(Number(row.valorPerfilMes) || 0)}
                          </TableCell>
                          <TableCell className="text-xs tabular-nums">
                            {formatCurrency(Number(row.valorCustoMes) || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {whereIsLoaded && !loadingDemandas && !whereIsError && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t('professionalAnalysis.monthlySummaryTitle')}
                  {profissionalSelecionado ? ` - ${profissionalSelecionado.nome}` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resumoMensal.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('common.noRecordsFound')}</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('common.month')}</TableHead>
                          <TableHead className="text-right">{t('professionalAnalysis.plannedHours')}</TableHead>
                          <TableHead className="text-right">{t('professionalAnalysis.executedHours')}</TableHead>
                          <TableHead className="text-right">{t('professionalAnalysis.profileCost')}</TableHead>
                          <TableHead className="text-right">{t('professionalAnalysis.monthlyCost')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resumoMensal.map((row) => (
                          <TableRow key={`${row.ano}-${row.mes}`}>
                            <TableCell className="text-xs capitalize">
                              {formatMesAno(row.ano, row.mes, i18n.language)}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {formatHoras(row.totalPlanejado, i18n.language)}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {formatHoras(row.totalExecutado, i18n.language)}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {formatCurrency(Number(row.valorCustoPerfil) || 0)}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {formatCurrency(Number(row.valorCustoMensal) || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('professionalAnalysis.whereIsTableTitle')}
                  {profissionalSelecionado ? ` - ${profissionalSelecionado.nome}` : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDemandas ? (
                <TableSkeleton rows={6} columns={5} />
              ) : whereIsError ? (
                <p className="text-sm text-destructive">{whereIsError}</p>
              ) : !whereIsLoaded ? (
                <p className="text-sm text-muted-foreground">{t('professionalAnalysis.selectProfessional')}</p>
              ) : demandasTecnicas.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('common.noRecordsFound')}</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>{t('demands.code')}</TableHead>
                        <TableHead>{t('demands.name')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="text-right">{t('professionalAnalysis.totalHorasPlanejadas')}</TableHead>
                        <TableHead className="text-right">{t('professionalAnalysis.totalHorasExecutadas')}</TableHead>
                        <TableHead className="text-right">{t('professionalAnalysis.totalHorasUteisPeriodo')}</TableHead>
                        <TableHead>{t('professionalAnalysis.executionPeriod')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demandasTecnicas.map((row) => {
                        const isExpanded = expandedDtIds.has(row.demandaTecnicaId);
                        const meses = row.totaisMensais ?? [];
                        return (
                          <Fragment key={row.demandaTecnicaId}>
                            <TableRow>
                              <TableCell className="w-10 px-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-expanded={isExpanded}
                                  aria-label={
                                    isExpanded ? t('common.collapseDetails') : t('common.expandDetails')
                                  }
                                  onClick={() => toggleDtExpanded(row.demandaTecnicaId)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{row.demandaCodigo}</TableCell>
                              <TableCell className="max-w-[240px] truncate text-xs">{row.demandaNome}</TableCell>
                              <TableCell className="text-xs">{getStatusBadge(row.demandaStatus, t)}</TableCell>
                              <TableCell className="text-right text-xs tabular-nums">
                                {formatHoras(row.totalHorasPlanejadas, i18n.language)}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">
                                {formatHoras(row.totalHorasExecutadas, i18n.language)}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">
                                {formatHoras(row.totalHorasUteisPeriodo, i18n.language)}
                              </TableCell>
                              <TableCell className="text-xs tabular-nums">
                                {formatDateOnly(row.dataInicioExecucao)} – {formatDateOnly(row.dataFimExecucao)}
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={WHERE_IS_COL_SPAN} className="bg-muted/30 px-4 py-3">
                                  {meses.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                      {t('professionalAnalysis.noMonthlyBreakdown')}
                                    </p>
                                  ) : (
                                    <div className="max-w-md overflow-x-auto rounded-md border bg-card">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>{t('common.month')}</TableHead>
                                            <TableHead className="text-right">
                                              {t('professionalAnalysis.plannedHours')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                              {t('professionalAnalysis.executedHours')}
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {meses.map((m) => (
                                            <TableRow key={`${m.ano}-${m.mes}`}>
                                              <TableCell className="text-xs capitalize">
                                                {formatMesAno(m.ano, m.mes, i18n.language)}
                                              </TableCell>
                                              <TableCell className="text-right text-xs tabular-nums">
                                                {formatHoras(m.totalPlanejado, i18n.language)}
                                              </TableCell>
                                              <TableCell className="text-right text-xs tabular-nums">
                                                {formatHoras(m.totalExecutado, i18n.language)}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
