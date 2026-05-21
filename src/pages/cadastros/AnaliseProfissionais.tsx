import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageComponents';
import { ErrorState, TableSkeleton } from '@/components/common/LoadingStates';
import { useProject } from '@/contexts/ProjectContext';
import { profissionalService } from '@/services/profissionalService';
import { formatCurrency } from '@/lib/formatters';
import type { Profissional } from '@/types';
import type { ProfissionalAnaliseResumidaDTO } from '@/modules/execucaoDemanda/types';

export default function AnaliseProfissionaisPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { selectedProject } = useProject();

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalId, setProfissionalId] = useState<string>('');
  const [analytics, setAnalytics] = useState<ProfissionalAnaliseResumidaDTO[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = useCallback(
    (mes: number) => new Date(2000, mes - 1, 1).toLocaleDateString(i18n.language, { month: 'long' }),
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
              onValueChange={setProfissionalId}
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
      )}
    </div>
  );
}
