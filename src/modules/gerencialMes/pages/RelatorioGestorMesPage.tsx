import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BarChart3, Calendar } from 'lucide-react';
import { ApiError } from '@/services/api';
import { setErrorHandledByHook } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { produtoSnapshotMensalService } from '@/modules/gerencialMes/services/produtoSnapshotMensalService';
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProdutoSnapshotRelatorioGestorDTO, ProdutoSnapshotRelatorioGestorItemDTO } from '@/types';

const YEARS = (() => {
  const y = new Date().getFullYear();
  const out: number[] = [];
  for (let i = y - 6; i <= y + 4; i += 1) out.push(i);
  return out;
})();

/** Ordena códigos hierárquicos (ex.: 1.2 antes de 1.10 e 2.1). */
function compareCodigoProduto(a: string, b: string): number {
  const toParts = (codigo: string) =>
    codigo.trim().split('.').map((part) => {
      const n = Number.parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
  const pa = toParts(a);
  const pb = toParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'emerald' | 'amber' | 'rose';
}) {
  const ring =
    tone === 'emerald'
      ? 'ring-emerald-500/20'
      : tone === 'amber'
        ? 'ring-amber-500/20'
        : tone === 'rose'
          ? 'ring-rose-500/20'
          : 'ring-border/60';
  return (
    <div className={cn('rounded-2xl border bg-card p-4 shadow-sm ring-1', ring)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function RelatorioGestorMesPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const now = new Date();
  const [draftAno, setDraftAno] = useState(now.getFullYear());
  const [draftMes, setDraftMes] = useState(now.getMonth() + 1);
  const [appliedAno, setAppliedAno] = useState(now.getFullYear());
  const [appliedMes, setAppliedMes] = useState(now.getMonth() + 1);
  const [relatorio, setRelatorio] = useState<ProdutoSnapshotRelatorioGestorDTO | null>(null);
  const [loadingRel, setLoadingRel] = useState(false);

  const loadRelatorio = useCallback(async () => {
    setLoadingRel(true);
    setRelatorio(null);
    try {
      setErrorHandledByHook(true);
      const data = await produtoSnapshotMensalService.getRelatorioGestor({
        ano: appliedAno,
        mes: appliedMes,
        projetoId: selectedProject?.id,
      });
      setRelatorio(data);
    } catch (e) {
      if (e instanceof ApiError) {
        toast({ variant: 'destructive', title: t('common.error'), description: e.message });
      }
    } finally {
      setErrorHandledByHook(false);
      setLoadingRel(false);
    }
  }, [appliedAno, appliedMes, selectedProject?.id, t, toast]);

  useEffect(() => {
    void loadRelatorio();
  }, [loadRelatorio]);

  const apply = () => {
    setAppliedAno(draftAno);
    setAppliedMes(draftMes);
  };

  const monthYear = useMemo(() => {
    try {
      return new Date(appliedAno, appliedMes - 1, 1).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
    } catch {
      return `${appliedMes}/${appliedAno}`;
    }
  }, [appliedAno, appliedMes, i18n.language]);

  const resumo = relatorio?.resumo;

  const produtosOrdenadosPorCodigo = useMemo(() => {
    if (!relatorio?.produtos.length) return [];
    return [...relatorio.produtos].sort((a, b) =>
      compareCodigoProduto(a.codigoProduto, b.codigoProduto),
    );
  }, [relatorio?.produtos]);

  const rowStatusClass = (s: string) =>
    s === 'V' ? 'text-emerald-700 dark:text-emerald-300' : s === 'A' ? 'text-amber-700 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300';

  const renderProductRow = (p: ProdutoSnapshotRelatorioGestorItemDTO) => (
    <TableRow key={`${p.snapshotId}-${p.metaProdutoId}`}>
      <TableCell className="font-mono text-xs">{p.codigoProduto}</TableCell>
      <TableCell className="max-w-[180px] truncate text-xs">{p.nomeProduto}</TableCell>
      <TableCell className={cn('text-xs font-semibold', rowStatusClass(p.statusProdutoMes))}>
        {t(`gerencialMes.statusMes.${p.statusProdutoMes}`)}
      </TableCell>
      <TableCell className="text-xs">{p.fechado ? t('gerencialMes.closed') : t('gerencialMes.open')}</TableCell>
      <TableCell className="text-right text-xs tabular-nums">{formatPercent(p.percentualExecucao ?? 0)}</TableCell>
      <TableCell className="text-right text-xs tabular-nums">{p.acoesVencidas}</TableCell>
    </TableRow>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">{t('gerencialMes.reportTitle')}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t('gerencialMes.reportSubtitle')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/dashboard">{t('gerencialMes.backDashboard')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            {t('gerencialMes.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>{t('gerencialMes.year')}</Label>
            <Select value={String(draftAno)} onValueChange={(v) => setDraftAno(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('gerencialMes.month')}</Label>
            <Select value={String(draftMes)} onValueChange={(v) => setDraftMes(Number(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {new Date(2000, m - 1, 1).toLocaleDateString(i18n.language, { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={apply}>
            {t('gerencialMes.applyFilter')}
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        <span className="font-medium capitalize text-foreground">{monthYear}</span>
      </p>

      {loadingRel ? (
        <Card className="p-10 text-center text-muted-foreground">{t('common.loadingData')}</Card>
      ) : resumo ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label={t('gerencialMes.kpi.totalProducts')} value={String(resumo.totalProdutos)} />
            <KpiCard label={t('gerencialMes.kpi.green')} value={String(resumo.produtosVerde)} tone="emerald" />
            <KpiCard label={t('gerencialMes.kpi.yellow')} value={String(resumo.produtosAmarelo)} tone="amber" />
            <KpiCard label={t('gerencialMes.kpi.red')} value={String(resumo.produtosVermelho)} tone="rose" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={t('gerencialMes.kpi.consolidatedExec')}
              value={formatPercent(resumo.percentualExecucaoConsolidado)}
            />
            <KpiCard label={t('gerencialMes.kpi.totalBudget')} value={formatCurrency(resumo.somaValorTotalOrcamento)} />
            <KpiCard label={t('gerencialMes.kpi.totalExecuted')} value={formatCurrency(resumo.somaValorTotalExecutado)} />
            <KpiCard
              label={t('gerencialMes.kpi.overdueActions')}
              value={String(resumo.acoesVencidas)}
              sub={t('gerencialMes.kpi.overdueActionsHint')}
              tone="rose"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard label={t('gerencialMes.kpi.actionsTotal')} value={String(resumo.totalAcoes)} />
            <KpiCard label={t('gerencialMes.kpi.actionsOpen')} value={String(resumo.acoesAbertas)} />
            <KpiCard label={t('gerencialMes.kpi.actionsProgress')} value={String(resumo.acoesEmAndamento)} />
            <KpiCard label={t('gerencialMes.kpi.actionsDone')} value={String(resumo.acoesConcluidas)} />
          </div>

          {relatorio && relatorio.produtosCriticos.length > 0 && (
            <Card className="border-rose-200/60 dark:border-rose-900/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-rose-800 dark:text-rose-200">{t('gerencialMes.criticalProducts')}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('dashboard.map.code')}</TableHead>
                      <TableHead>{t('dashboard.map.name')}</TableHead>
                      <TableHead>{t('gerencialMes.statusMonth')}</TableHead>
                      <TableHead>{t('gerencialMes.snapshotState')}</TableHead>
                      <TableHead className="text-right">{t('gerencialMes.executionPercent')}</TableHead>
                      <TableHead className="text-right">{t('gerencialMes.overdueShort')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{relatorio.produtosCriticos.map(renderProductRow)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('gerencialMes.allProductsMonth')}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {relatorio && relatorio.produtos.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('gerencialMes.reportEmpty')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('dashboard.map.code')}</TableHead>
                      <TableHead>{t('dashboard.map.name')}</TableHead>
                      <TableHead>{t('gerencialMes.statusMonth')}</TableHead>
                      <TableHead>{t('gerencialMes.snapshotState')}</TableHead>
                      <TableHead className="text-right">{t('gerencialMes.executionPercent')}</TableHead>
                      <TableHead className="text-right">{t('gerencialMes.overdueShort')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{produtosOrdenadosPorCodigo.map(renderProductRow)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {relatorio && relatorio.acoesVencidas.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('gerencialMes.overdueActionsList')}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('gerencialMes.acaoDesc')}</TableHead>
                      <TableHead>{t('gerencialMes.acaoPrazo')}</TableHead>
                      <TableHead>{t('gerencialMes.acaoStatus')}</TableHead>
                      <TableHead>{t('gerencialMes.acaoImpact')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorio.acoesVencidas.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="max-w-md text-xs">{a.descricao}</TableCell>
                        <TableCell className="tabular-nums text-xs text-destructive">{a.prazo}</TableCell>
                        <TableCell className="text-xs">{t(`gerencialMes.statusAcao.${a.statusAcao}`)}</TableCell>
                        <TableCell className="text-xs">{a.impacto}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
