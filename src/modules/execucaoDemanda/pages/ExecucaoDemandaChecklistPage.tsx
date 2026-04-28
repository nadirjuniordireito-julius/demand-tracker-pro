import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ListChecks,
  Users,
  CalendarRange,
  Sparkles,
  Loader2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { demandaExecucaoService } from '../services/demandaExecucaoService';
import { tarefaService } from '../services/tarefaService';
import { demandaService } from '@/services/demandaService';
import type {
  DemandaExecucaoDTO,
  DemandaExecucaoPerfilCheckDTO,
  DemandaExecucaoTarefaDTO,
} from '../types';
import type { DemandaTecnica } from '@/types';

type CheckStatus = 'ok' | 'warn' | 'fail' | 'pending' | 'empty';

interface CheckResult {
  status: CheckStatus;
  total: number;
  passed: number;
}

function toDateOnly(isoOrDate: string | null | undefined): string | null {
  if (!isoOrDate) return null;
  const part = String(isoOrDate).split('T')[0];
  return part || null;
}

function parseLocalDate(dateStr: string | null | undefined): Date | null {
  const part = toDateOnly(dateStr);
  if (!part) return null;
  const [y, m, d] = part.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDateBr(dateStr: string | null | undefined): string {
  const dt = parseLocalDate(dateStr);
  if (!dt) return '—';
  return format(dt, 'dd/MM/yyyy', { locale: ptBR });
}

const STATUS_TONE: Record<CheckStatus, {
  ring: string;
  iconWrap: string;
  badge: string;
  bar: string;
}> = {
  ok: {
    ring: 'ring-emerald-200/70 dark:ring-emerald-500/20',
    iconWrap: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    bar: 'bg-emerald-500',
  },
  warn: {
    ring: 'ring-amber-200/70 dark:ring-amber-500/20',
    iconWrap: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
  fail: {
    ring: 'ring-rose-200/70 dark:ring-rose-500/20',
    iconWrap: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    bar: 'bg-rose-500',
  },
  empty: {
    ring: 'ring-slate-200/70 dark:ring-slate-500/20',
    iconWrap: 'bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-300',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
    bar: 'bg-slate-400',
  },
  pending: {
    ring: 'ring-sky-200/70 dark:ring-sky-500/20',
    iconWrap: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    bar: 'bg-sky-500',
  },
};

function StatusIcon({ status, className }: { status: CheckStatus; className?: string }) {
  if (status === 'ok') return <CheckCircle2 className={className} />;
  if (status === 'warn') return <AlertTriangle className={className} />;
  if (status === 'fail') return <XCircle className={className} />;
  if (status === 'pending') return <Loader2 className={cn(className, 'animate-spin')} />;
  return <Sparkles className={className} />;
}

export default function ExecucaoDemandaChecklistPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { demandaTecnicaId } = useParams<{ demandaTecnicaId: string }>();
  const id = demandaTecnicaId ? Number(demandaTecnicaId) : NaN;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [execucao, setExecucao] = useState<DemandaExecucaoDTO | null>(null);
  const [demanda, setDemanda] = useState<DemandaTecnica | null>(null);
  const [tarefas, setTarefas] = useState<DemandaExecucaoTarefaDTO[]>([]);
  const [perfilChecks, setPerfilChecks] = useState<DemandaExecucaoPerfilCheckDTO[]>([]);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate(`/execucao-demandas/${id}`);
  }, [navigate, id]);

  const loadAll = useCallback(async () => {
    if (!id || Number.isNaN(id)) {
      setError(t('execucao.invalidId', 'ID da demanda inválido'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [exec, dem, perfis] = await Promise.all([
        demandaExecucaoService.getByDemandaId(id),
        demandaService.findById(id).catch(() => null),
        demandaExecucaoService.getPerfilCheckByDemandaId(id).catch(() => []),
      ]);
      setExecucao(exec);
      setDemanda(dem);
      setPerfilChecks(perfis ?? []);

      if (exec?.id) {
        try {
          const list = await tarefaService.listByExecucaoId(exec.id);
          setTarefas(list ?? []);
        } catch {
          setTarefas(exec.tarefas ?? []);
        }
      } else {
        setTarefas([]);
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || t('common.errorMessage');
      setError(msg);
      toast({
        title: t('common.error'),
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, t, toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---------------- Check 1: tasks 100% + datas reais ----------------
  const taskEvaluations = useMemo(() => {
    return tarefas.map((tk) => {
      const progress = Math.max(0, Math.min(100, Number(tk.percentualProgresso ?? 0)));
      const plannedStart = parseLocalDate(tk.dataInicioPlanejada);
      const realStart = parseLocalDate(tk.dataInicioReal);
      const realEnd = parseLocalDate(tk.dataFimReal);
      const progressOk = progress >= 100;
      const startFilled = !!realStart;
      const endFilled = !!realEnd;
      const startAfterPlanned = !!(realStart && plannedStart && realStart.getTime() >= plannedStart.getTime());
      const endAfterStart = !!(realStart && realEnd && realEnd.getTime() >= realStart.getTime());
      const ok = progressOk && startFilled && endFilled && startAfterPlanned && endAfterStart;
      return {
        task: tk,
        progress,
        plannedStart,
        realStart,
        realEnd,
        progressOk,
        startFilled,
        endFilled,
        startAfterPlanned,
        endAfterStart,
        ok,
      };
    });
  }, [tarefas]);

  const tasksWithIssues = useMemo(
    () =>
      taskEvaluations
        .filter((ev) => !ev.ok)
        .sort(
          (a, b) =>
            (Number(a.task.sequencia) || 0) - (Number(b.task.sequencia) || 0) ||
            String(a.task.titulo).localeCompare(String(b.task.titulo)),
        ),
    [taskEvaluations],
  );

  const tasksCheck: CheckResult = useMemo(() => {
    if (tarefas.length === 0) {
      return { status: 'empty', total: 0, passed: 0 };
    }
    const passed = tarefas.length - tasksWithIssues.length;
    return {
      status: tasksWithIssues.length === 0 ? 'ok' : 'warn',
      total: tarefas.length,
      passed,
    };
  }, [tarefas.length, tasksWithIssues.length]);

  // ---------------- Check 2: profile allocation ----------------
  const perfilDiffs = useMemo(
    () =>
      (perfilChecks ?? []).map((row) => ({
        ...row,
        diferenca: Number(row.horasPlanejadasTermo) - Number(row.horasPlanejadasExecucao),
      })),
    [perfilChecks],
  );

  const profilesCheck: CheckResult = useMemo(() => {
    if (perfilDiffs.length === 0) {
      return { status: 'empty', total: 0, passed: 0 };
    }
    const passed = perfilDiffs.filter((p) => Math.abs(p.diferenca) <= 0.0001).length;
    return {
      status: passed === perfilDiffs.length ? 'ok' : 'warn',
      total: perfilDiffs.length,
      passed,
    };
  }, [perfilDiffs]);

  // ---------------- Check 3: real dates ----------------
  const dateRules = useMemo(() => {
    if (!execucao) {
      return {
        plannedStart: null as Date | null,
        realStart: null as Date | null,
        realEnd: null as Date | null,
        startFilled: false,
        endFilled: false,
        startAfterPlanned: false,
        endAfterStart: false,
      };
    }
    const plannedStart = parseLocalDate(execucao.dataInicioPlanejada);
    const realStart = parseLocalDate(execucao.dataInicioReal);
    const realEnd = parseLocalDate(execucao.dataFimReal);
    const startFilled = !!realStart;
    const endFilled = !!realEnd;
    const startAfterPlanned = !!(realStart && plannedStart && realStart.getTime() >= plannedStart.getTime());
    const endAfterStart = !!(realStart && realEnd && realEnd.getTime() >= realStart.getTime());
    return { plannedStart, realStart, realEnd, startFilled, endFilled, startAfterPlanned, endAfterStart };
  }, [execucao]);

  const datesCheck: CheckResult = useMemo(() => {
    const rules = [
      dateRules.startFilled,
      dateRules.endFilled,
      dateRules.startAfterPlanned,
      dateRules.endAfterStart,
    ];
    const passed = rules.filter(Boolean).length;
    let status: CheckStatus = 'fail';
    if (passed === rules.length) status = 'ok';
    else if (passed >= 2) status = 'warn';
    return { status, total: rules.length, passed };
  }, [dateRules]);

  // ---------------- Overall progress (Perfis é informativo, não bloqueia) ----------------
  const canClose = useMemo(
    () => tasksCheck.status === 'ok' && datesCheck.status === 'ok',
    [tasksCheck.status, datesCheck.status],
  );

  const overall = useMemo(() => {
    const checks = [tasksCheck, profilesCheck, datesCheck];
    const total = checks.length;
    const passed = checks.filter((c) => c.status === 'ok').length;
    const blockingChecks = [tasksCheck, datesCheck];
    const hasBlockingFail = blockingChecks.some((c) => c.status === 'fail');
    const hasBlockingWarn = blockingChecks.some((c) => c.status === 'warn');
    let status: CheckStatus = 'ok';
    if (hasBlockingFail) status = 'fail';
    else if (hasBlockingWarn) status = 'warn';
    else if (checks.every((c) => c.status === 'empty')) status = 'empty';
    return { total, passed, status, percent: Math.round((passed / total) * 100) };
  }, [tasksCheck, profilesCheck, datesCheck]);

  const handleConfirmEncerrar = useCallback(async () => {
    if (!execucao || !user?.id) return;
    setIsClosing(true);
    try {
      await demandaExecucaoService.encerrar(execucao.id, user.id);
      toast({
        title: t('checklist.encerramentoSuccessTitle', 'Execução encerrada'),
        description: t(
          'checklist.encerramentoSuccessDescription',
          'A execução foi encerrada com sucesso. Atualizando a lista de demandas em execução...',
        ),
      });
      setConfirmCloseOpen(false);
      // Volta para a listagem; o List page recarrega os dados no mount.
      navigate('/execucao-demandas', { replace: true, state: { refresh: Date.now() } });
    } catch (e: unknown) {
      toast({
        title: t('common.error'),
        description: (e as Error)?.message ?? t('common.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setIsClosing(false);
    }
  }, [execucao, user?.id, toast, t, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !execucao) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
        <p className="text-destructive">
          {error || t('execucao.notFound', 'Execução não encontrada.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header with back button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="mt-1 h-9 w-9 shrink-0 rounded-full"
            title={t('common.back')}
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#001f3f' }}>
              {t('checklist.title', 'Checklist de Encerramento')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                'checklist.subtitle',
                'Validações antes de encerrar a execução desta demanda.',
              )}
            </p>
            {(demanda?.codigo || execucao.demandaTecnicaId) && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs">
                <span className="text-muted-foreground">{t('execucao.demandaTecnicaId', 'Demanda')}</span>
                <span className="font-mono font-medium text-foreground">
                  {demanda?.codigo ?? execucao.demandaTecnicaId}
                </span>
                {demanda?.nome && (
                  <span className="hidden max-w-[280px] truncate text-muted-foreground sm:inline">
                    · {demanda.nome}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/40 p-6 shadow-sm"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[auto,1fr,auto] md:items-center">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-2xl ring-1 transition-colors',
                STATUS_TONE[overall.status].iconWrap,
                STATUS_TONE[overall.status].ring,
              )}
            >
              <StatusIcon status={overall.status} className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('checklist.overallStatus', 'Status geral')}
              </p>
              <p className="text-2xl font-semibold leading-tight" style={{ color: '#001f3f' }}>
                {overall.status === 'ok' && t('checklist.overallReady', 'Tudo pronto para encerrar')}
                {overall.status === 'warn' && t('checklist.overallReview', 'Existem pontos para revisar')}
                {overall.status === 'fail' && t('checklist.overallBlocked', 'Pendências críticas')}
                {overall.status === 'empty' && t('checklist.overallEmpty', 'Sem dados para validar')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('checklist.checksCompleted', 'Verificações aprovadas')}</span>
              <span className="font-medium text-foreground">
                {overall.passed} / {overall.total}
              </span>
            </div>
            <Progress
              value={overall.percent}
              className={cn('h-2 [&>div]:transition-all', overall.percent === 100 ? '[&>div]:bg-emerald-500' : '')}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                'checklist.summaryHint',
                'Resolva as pendências sinalizadas antes de encerrar a execução para manter a auditoria consistente.',
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                STATUS_TONE[tasksCheck.status].badge,
              )}
            >
              <ListChecks className="h-3.5 w-3.5" /> {t('checklist.checkTasksShort', 'Tarefas')}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                STATUS_TONE[profilesCheck.status].badge,
              )}
            >
              <Users className="h-3.5 w-3.5" /> {t('checklist.checkProfilesShort', 'Perfis')}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                STATUS_TONE[datesCheck.status].badge,
              )}
            >
              <CalendarRange className="h-3.5 w-3.5" /> {t('checklist.checkDatesShort', 'Datas')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Vertical timeline of checks */}
      <div className="relative">
        <div className="pointer-events-none absolute left-[27px] top-4 bottom-4 hidden w-px bg-gradient-to-b from-border via-border/70 to-transparent md:block" />

        <div className="space-y-4">
          {/* Check 1 - Tasks */}
          <CheckStep
            index={1}
            icon={<ListChecks className="h-5 w-5" />}
            title={t('checklist.checkTasksTitle', 'Tarefas concluídas')}
            description={t(
              'checklist.checkTasksDescription',
              'Verifica se todas as tarefas atingiram 100% de progresso e tiveram suas datas reais preenchidas corretamente.',
            )}
            status={tasksCheck.status}
            metric={
              tasksCheck.total > 0
                ? `${tasksCheck.passed}/${tasksCheck.total}`
                : t('checklist.noData', 'Sem dados')
            }
            statusLabel={
              tasksCheck.status === 'ok'
                ? t('checklist.allTasksDone', 'Todas as tarefas concluídas')
                : tasksCheck.status === 'warn'
                  ? t('checklist.tasksPending', '{{count}} tarefa(s) pendente(s)', {
                      count: tasksWithIssues.length,
                    })
                  : t('checklist.noTasks', 'Nenhuma tarefa cadastrada')
            }
          >
            {tasksCheck.status === 'empty' && (
              <p className="text-sm text-muted-foreground">
                {t(
                  'checklist.tasksEmptyHint',
                  'Cadastre as tarefas previstas para a execução para que esta verificação seja válida.',
                )}
              </p>
            )}
            {tasksCheck.status === 'ok' && (
              <p className="text-sm text-muted-foreground">
                {t(
                  'checklist.tasksOkHint',
                  'Excelente — todas as tarefas estão 100% concluídas e com datas reais consistentes.',
                )}
              </p>
            )}
            {tasksCheck.status === 'warn' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t(
                    'checklist.tasksPendingHint',
                    'As tarefas abaixo apresentam pendências de progresso ou de datas reais:',
                  )}
                </p>
                <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                  {tasksWithIssues.map((ev) => {
                    const tk = ev.task;
                    const issues: { key: string; label: string; tone: 'warn' | 'fail' }[] = [];
                    if (!ev.progressOk) {
                      issues.push({
                        key: 'progress',
                        label: t('checklist.taskIssueProgress', 'Progresso {{percent}}%', { percent: ev.progress }),
                        tone: 'warn',
                      });
                    }
                    if (!ev.startFilled) {
                      issues.push({
                        key: 'startMissing',
                        label: t('checklist.taskIssueStartMissing', 'Início real ausente'),
                        tone: 'fail',
                      });
                    }
                    if (!ev.endFilled) {
                      issues.push({
                        key: 'endMissing',
                        label: t('checklist.taskIssueEndMissing', 'Fim real ausente'),
                        tone: 'fail',
                      });
                    }
                    if (ev.startFilled && !ev.startAfterPlanned) {
                      issues.push({
                        key: 'startBeforePlanned',
                        label: t('checklist.taskIssueStartBeforePlanned', 'Início real anterior ao planejado'),
                        tone: 'fail',
                      });
                    }
                    if (ev.startFilled && ev.endFilled && !ev.endAfterStart) {
                      issues.push({
                        key: 'endBeforeStart',
                        label: t('checklist.taskIssueEndBeforeStart', 'Fim real anterior ao início real'),
                        tone: 'fail',
                      });
                    }
                    return (
                      <li key={tk.id} className="flex items-start gap-3 px-3 py-3">
                        <span className="mt-0.5 inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-background px-2 font-mono text-xs text-muted-foreground ring-1 ring-border/60">
                          {tk.sequencia ?? '—'}
                        </span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="truncate text-sm font-medium text-foreground">{tk.titulo}</p>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={ev.progress}
                              className={cn(
                                'h-1.5 flex-1',
                                ev.progressOk ? '[&>div]:bg-emerald-500' : '[&>div]:bg-amber-500',
                              )}
                            />
                            <span className="w-10 shrink-0 text-right text-xs font-medium text-muted-foreground">
                              {ev.progress}%
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {issues.map((iss) => (
                              <span
                                key={iss.key}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                  iss.tone === 'fail'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
                                )}
                              >
                                {iss.tone === 'fail' ? (
                                  <XCircle className="h-3 w-3" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3" />
                                )}
                                {iss.label}
                              </span>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
                            <span>
                              <span className="font-medium uppercase tracking-wide">
                                {t('execucao.dataInicioPlanejada', 'Início planejado')}:
                              </span>{' '}
                              {formatDateBr(tk.dataInicioPlanejada)}
                            </span>
                            <span>
                              <span className="font-medium uppercase tracking-wide">
                                {t('execucao.dataFimPlanejada', 'Fim planejado')}:
                              </span>{' '}
                              {formatDateBr(tk.dataFimPlanejada)}
                            </span>
                            <span className={cn(!ev.startFilled && 'text-rose-600 dark:text-rose-300')}>
                              <span className="font-medium uppercase tracking-wide">
                                {t('execucao.dataInicioReal', 'Início real')}:
                              </span>{' '}
                              {formatDateBr(tk.dataInicioReal)}
                            </span>
                            <span className={cn(!ev.endFilled && 'text-rose-600 dark:text-rose-300')}>
                              <span className="font-medium uppercase tracking-wide">
                                {t('execucao.dataFimReal', 'Fim real')}:
                              </span>{' '}
                              {formatDateBr(tk.dataFimReal)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CheckStep>

          {/* Check 2 - Profiles */}
          <CheckStep
            index={2}
            icon={<Users className="h-5 w-5" />}
            title={t('checklist.checkProfilesTitle', 'Perfis alocados conforme planejamento')}
            description={t(
              'checklist.checkProfilesDescription',
              'Compara horas por perfil entre o Termo de Planejamento e a execução.',
            )}
            status={profilesCheck.status}
            metric={
              profilesCheck.total > 0
                ? `${profilesCheck.passed}/${profilesCheck.total}`
                : t('checklist.noData', 'Sem dados')
            }
            statusLabel={
              profilesCheck.status === 'ok'
                ? t('checklist.profilesOk', 'Todos os perfis estão equilibrados')
                : profilesCheck.status === 'warn'
                  ? t('checklist.profilesDiff', '{{count}} perfil(is) com divergência', {
                      count: profilesCheck.total - profilesCheck.passed,
                    })
                  : t('checklist.profilesEmpty', 'Sem perfis previstos no termo')
            }
          >
            {profilesCheck.status === 'empty' && (
              <p className="text-sm text-muted-foreground">
                {t(
                  'checklist.profilesEmptyHint',
                  'O Termo de Planejamento ainda não possui perfis previstos para esta demanda.',
                )}
              </p>
            )}
            {profilesCheck.total > 0 && (
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="min-w-full divide-y divide-border/60 text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">{t('execucao.profile', 'Perfil')}</th>
                      <th className="px-3 py-2 text-right font-medium">
                        {t('execucao.horasTermo', 'Horas Termo')}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        {t('execucao.horasExecucao', 'Horas na execução')}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        {t('execucao.difference', 'Diferença')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {perfilDiffs.map((row) => {
                      const ok = Math.abs(row.diferenca) <= 0.0001;
                      return (
                        <tr key={row.perfilId} className="bg-background">
                          <td className="px-3 py-2 font-medium text-foreground">{row.perfilNome}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {Number(row.horasPlanejadasTermo).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {Number(row.horasPlanejadasExecucao).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
                                ok
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
                              )}
                            >
                              {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                              {row.diferenca.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CheckStep>

          {/* Check 3 - Real dates */}
          <CheckStep
            index={3}
            icon={<CalendarRange className="h-5 w-5" />}
            title={t('checklist.checkDatesTitle', 'Datas reais da execução')}
            description={t(
              'checklist.checkDatesDescription',
              'Verifica se as datas reais estão preenchidas e consistentes com o planejamento.',
            )}
            status={datesCheck.status}
            metric={`${datesCheck.passed}/${datesCheck.total}`}
            statusLabel={
              datesCheck.status === 'ok'
                ? t('checklist.datesOk', 'Datas reais consistentes')
                : t('checklist.datesNeedReview', 'Há regras a corrigir')
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DateInfoCell
                label={t('execucao.dataInicioPlanejada', 'Início planejado')}
                value={formatDateBr(execucao.dataInicioPlanejada)}
                muted
              />
              <DateInfoCell
                label={t('execucao.dataFimPlanejada', 'Fim planejado')}
                value={formatDateBr(execucao.dataFimPlanejada)}
                muted
              />
              <DateInfoCell
                label={t('execucao.dataInicioReal', 'Início real')}
                value={formatDateBr(execucao.dataInicioReal)}
                missing={!execucao.dataInicioReal}
              />
              <DateInfoCell
                label={t('execucao.dataFimReal', 'Fim real')}
                value={formatDateBr(execucao.dataFimReal)}
                missing={!execucao.dataFimReal}
              />
            </div>
            <ul className="mt-4 space-y-2">
              <RuleRow
                ok={dateRules.startFilled}
                label={t('checklist.ruleStartFilled', 'Início real preenchido')}
              />
              <RuleRow
                ok={dateRules.endFilled}
                label={t('checklist.ruleEndFilled', 'Fim real preenchido')}
              />
              <RuleRow
                ok={dateRules.startAfterPlanned}
                label={t(
                  'checklist.ruleStartAfterPlanned',
                  'Início real maior ou igual ao início planejado',
                )}
                hint={
                  !dateRules.startAfterPlanned && dateRules.startFilled
                    ? t(
                        'checklist.ruleStartAfterPlannedHint',
                        'Início real ({{real}}) é anterior ao início planejado ({{planejado}}).',
                        {
                          real: formatDateBr(execucao.dataInicioReal),
                          planejado: formatDateBr(execucao.dataInicioPlanejada),
                        },
                      )
                    : undefined
                }
              />
              <RuleRow
                ok={dateRules.endAfterStart}
                label={t(
                  'checklist.ruleEndAfterStart',
                  'Fim real maior ou igual ao início real',
                )}
                hint={
                  !dateRules.endAfterStart && dateRules.startFilled && dateRules.endFilled
                    ? t(
                        'checklist.ruleEndAfterStartHint',
                        'Fim real ({{end}}) é anterior ao início real ({{start}}).',
                        {
                          end: formatDateBr(execucao.dataFimReal),
                          start: formatDateBr(execucao.dataInicioReal),
                        },
                      )
                    : undefined
                }
              />
            </ul>
          </CheckStep>
        </div>
      </div>

      {/* Action footer (Encerrar). Visible somente quando tarefas e datas estão OK.
          Perfis tem efeito apenas informativo conforme regra. */}
      {canClose && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex flex-col items-start gap-2 border-t border-border/60 pt-4"
        >
          <Button
            size="lg"
            onClick={() => setConfirmCloseOpen(true)}
            disabled={isClosing || !user?.id}
            className="gap-2 bg-emerald-600 text-white shadow-sm hover:bg-emerald-600/90 focus-visible:ring-emerald-500"
          >
            {isClosing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {isClosing
              ? t('execucao.closing', 'Encerrando...')
              : t('checklist.encerrarExecucao', 'Encerrar execução')}
          </Button>
          {profilesCheck.status === 'warn' && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t(
                'checklist.profilesNonBlockingHint',
                'Há divergências de perfis sinalizadas acima — informativas, não impedem o encerramento.',
              )}
            </p>
          )}
        </motion.div>
      )}

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('execucao.confirmCloseExecucao', 'Encerrar execução?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'execucao.confirmCloseExecucaoDescription',
                'Esta ação encerrará a execução da demanda. Deseja continuar?',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmEncerrar}
              disabled={isClosing}
              className="bg-emerald-600 text-white hover:bg-emerald-600/90"
            >
              {isClosing
                ? t('execucao.closing', 'Encerrando...')
                : t('execucao.encerrar', 'Encerrar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CheckStepProps {
  index: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  status: CheckStatus;
  metric: string;
  statusLabel: string;
  children?: React.ReactNode;
}

function CheckStep({ index, icon, title, description, status, metric, statusLabel, children }: CheckStepProps) {
  const tone = STATUS_TONE[status];
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="relative pl-0 md:pl-16"
    >
      <div
        className={cn(
          'absolute left-0 top-4 hidden h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-border md:flex',
          tone.iconWrap,
        )}
        aria-hidden
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {icon}
          <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-background bg-background text-[10px] font-semibold text-foreground shadow-sm">
            {index}
          </span>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-colors',
          tone.ring,
          'ring-1',
        )}
      >
        <div className="border-b border-border/40 bg-gradient-to-r from-card via-card to-muted/20 p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl md:hidden',
                tone.iconWrap,
              )}
            >
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                    tone.badge,
                  )}
                >
                  <StatusIcon status={status} className="h-3.5 w-3.5" />
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {metric}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4">{children}</div>
      </div>
    </motion.section>
  );
}

function DateInfoCell({
  label,
  value,
  muted,
  missing,
}: {
  label: string;
  value: string;
  muted?: boolean;
  missing?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2',
        missing ? 'border-rose-200 bg-rose-50/40 dark:border-rose-500/30 dark:bg-rose-500/5' : 'border-border/60 bg-muted/20',
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-sm font-medium',
          muted ? 'text-muted-foreground' : 'text-foreground',
          missing && 'text-rose-600 dark:text-rose-300',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RuleRow({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={cn(
          'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
          ok
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        )}
        aria-hidden
      >
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      </span>
      <div>
        <p className={cn(ok ? 'text-foreground' : 'text-foreground')}>{label}</p>
        {hint && <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-300">{hint}</p>}
      </div>
    </li>
  );
}
