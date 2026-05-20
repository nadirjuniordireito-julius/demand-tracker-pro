import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/common/PageComponents';
import { TableSkeleton } from '@/components/common/LoadingStates';
import { ErrorState } from '@/components/common/LoadingStates';
import { useProject } from '@/contexts/ProjectContext';
import { profissionalService } from '@/services/profissionalService';
import { perfilService } from '@/services/perfilService';
import { profissionalCustoMensalService } from '@/services/profissionalCustoMensalService';
import { useToast } from '@/hooks/use-toast';
import type { Profissional, ProfissionalCustoMensalDTO } from '@/types';

type CustoRow = {
  profissionalId: number;
  profissionalNome: string;
  perfilNome: string;
  custoMensalId: number | null;
  initialCustoTotal: number | null;
  custoTotalInput: string;
};

function parseCurrencyInput(value: string): number | null {
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return null;
  const parsed = Number(digitsOnly) / 100;
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrencyInput(value: string): string {
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return '';
  const amount = Number(digitsOnly) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

async function fetchAllCustosByAnoMes(ano: number, mes: number): Promise<ProfissionalCustoMensalDTO[]> {
  const first = await profissionalCustoMensalService.findAll({
    ano,
    mes,
    page: 0,
    size: 500,
    sort: 'profissionalId,asc',
  });
  console.log('profissionalCustoMensalService.findAll', { ano, mes, page: 0 }, first);
  const all = [...first.content];
  for (let p = 1; p < first.totalPages; p++) {
    const page = await profissionalCustoMensalService.findAll({
      ano,
      mes,
      page: p,
      size: 500,
      sort: 'profissionalId,asc',
    });
    console.log('profissionalCustoMensalService.findAll', { ano, mes, page: p }, page);
    all.push(...page.content);
  }
  return all;
}

export default function ProfissionaisCustosMensaisPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const { toast } = useToast();

  const currentDate = useMemo(() => new Date(), []);
  const [ano, setAno] = useState<number>(currentDate.getFullYear());
  const [mes, setMes] = useState<number>(currentDate.getMonth() + 1);

  const [rows, setRows] = useState<CustoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const yearOptions = useMemo(() => {
    const now = currentDate.getFullYear();
    return Array.from({ length: 11 }, (_, i) => now - 5 + i);
  }, [currentDate]);

  const monthOptions = useMemo(
    () => [
      { value: 1, label: t('common.months.january', 'Janeiro') },
      { value: 2, label: t('common.months.february', 'Fevereiro') },
      { value: 3, label: t('common.months.march', 'Marco') },
      { value: 4, label: t('common.months.april', 'Abril') },
      { value: 5, label: t('common.months.may', 'Maio') },
      { value: 6, label: t('common.months.june', 'Junho') },
      { value: 7, label: t('common.months.july', 'Julho') },
      { value: 8, label: t('common.months.august', 'Agosto') },
      { value: 9, label: t('common.months.september', 'Setembro') },
      { value: 10, label: t('common.months.october', 'Outubro') },
      { value: 11, label: t('common.months.november', 'Novembro') },
      { value: 12, label: t('common.months.december', 'Dezembro') },
    ],
    [t],
  );

  const loadData = useCallback(async () => {
    if (!selectedProject) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [profissionaisPage, custos, perfisPage] = await Promise.all([
        profissionalService.findAll({
          projetoId: selectedProject.id,
          page: 0,
          size: 1000,
          sort: 'nome,asc',
        }),
        fetchAllCustosByAnoMes(ano, mes),
        perfilService.findAll({
          projetoId: selectedProject.id,
          size: 1000,
          sort: 'nome,asc',
        }),
      ]);

      const perfilById = new Map(perfisPage.content.map((perfil) => [perfil.id, perfil.nome]));

      const custosStrictAnoMes = custos.filter((custo) => custo.ano === ano && custo.mes === mes);
      const custoByProfissionalId = new Map<number, ProfissionalCustoMensalDTO>();
      for (const custo of custosStrictAnoMes) {
        custoByProfissionalId.set(custo.profissionalId, custo);
      }

      const mergedRows: CustoRow[] = profissionaisPage.content.map((profissional: Profissional) => {
        const custo = custoByProfissionalId.get(profissional.id);
        return {
          profissionalId: profissional.id,
          profissionalNome: profissional.nome,
          perfilNome: perfilById.get(profissional.perfilId) ?? '—',
          custoMensalId: custo?.id ?? null,
          initialCustoTotal: custo?.custoTotal ?? null,
          custoTotalInput:
            custo?.custoTotal != null
              ? new Intl.NumberFormat('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(custo.custoTotal)
              : '',
        };
      });
     
      setRows(mergedRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorMessage'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [ano, mes, selectedProject, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const changedRows = useMemo(() => {
    return rows.filter((row) => {
      const current = parseCurrencyInput(row.custoTotalInput);
      if (current == null && row.initialCustoTotal == null) return false;
      if (current == null || row.initialCustoTotal == null) return true;
      return Math.abs(current - row.initialCustoTotal) > 0.0001;
    });
  }, [rows]);

  const hasChanges = changedRows.length > 0;

  const handleCustoChange = (profissionalId: number, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.profissionalId === profissionalId
          ? {
              ...row,
              custoTotalInput: formatCurrencyInput(value),
            }
          : row,
      ),
    );
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    const validChangedRows = changedRows.filter((row) => parseCurrencyInput(row.custoTotalInput) != null);
    if (validChangedRows.length !== changedRows.length) {
      toast({
        title: t('common.error'),
        description: t(
          'professionalMonthlyCost.invalidValue',
          'Ha valores invalidos. Corrija antes de gravar.',
        ),
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      for (const row of validChangedRows) {
        const custoTotal = parseCurrencyInput(row.custoTotalInput)!;
        if (row.custoMensalId) {
          await profissionalCustoMensalService.update(row.custoMensalId, { custoTotal });
        } else {
          await profissionalCustoMensalService.create({
            profissionalId: row.profissionalId,
            ano,
            mes,
            custoTotal,
          });
        }
      }
      toast({
        title: t('common.success'),
        description: t(
          'professionalMonthlyCost.saveSuccess',
          'Custos mensais gravados com sucesso.',
        ),
      });
      await loadData();
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('common.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('professionalMonthlyCost.title', 'Custo Mensal por Profissional')}
          description={t(
            'professionalMonthlyCost.description',
            'Defina o custo mensal por colaborador para o periodo selecionado.',
          )}
        />
        <ErrorState title={t('common.errorTitle')} message={error} onRetry={loadData} retryText={t('common.retry')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('professionalMonthlyCost.title', 'Custo Mensal por Profissional')}
        description={t(
          'professionalMonthlyCost.description',
          'Defina o custo mensal por colaborador para o periodo selecionado.',
        )}
      >
        <Button variant="outline" className="gap-2" onClick={() => navigate('/cadastros/profissionais')}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
      </PageHeader>

      {!selectedProject && (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          {t(
            'professionalMonthlyCost.selectProjectFirst',
            'Selecione um projeto para editar os custos mensais dos profissionais.',
          )}
        </div>
      )}

      {selectedProject && (
        <>
          <div className="rounded-md border bg-card p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('common.year', 'Ano')}</Label>
                <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.month', 'Mes')}</Label>
                <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={String(month.value)}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={8} columns={3} />
          ) : (
            <div className="rounded-md border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      <th className="px-3 py-2">{t('professionals.name', 'Nome')}</th>
                      <th className="px-3 py-2">{t('professionals.perfil', 'Perfil')}</th>
                      <th className="px-3 py-2">{t('professionalMonthlyCost.monthlyCost', 'Custo mensal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.profissionalId} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{row.profissionalNome}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.perfilNome}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={row.custoTotalInput}
                            onChange={(e) => handleCustoChange(row.profissionalId, e.target.value)}
                            placeholder={t('professionalMonthlyCost.valuePlaceholder', '0,00')}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  {hasChanges
                    ? t(
                        'professionalMonthlyCost.pendingChanges',
                        '{{count}} alteracao(oes) pendente(s).',
                        { count: changedRows.length },
                      )
                    : t('professionalMonthlyCost.noChanges', 'Nenhuma alteracao pendente.')}
                </div>
                <Button className="gap-2" disabled={!hasChanges || saving} onClick={() => void handleSave()}>
                  <Coins className="h-4 w-4" />
                  {saving ? t('common.saving', 'Salvando...') : t('common.save', 'Gravar')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

