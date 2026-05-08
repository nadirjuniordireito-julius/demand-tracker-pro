import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  Info,
  LineChart,
  Lock,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ScrollText,
  Target,
  Trash2,
  Unlock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ApiError } from '@/services/api';
import { setErrorHandledByHook } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatCurrency, formatMonthYearRange, formatPercent } from '@/lib/formatters';
import metaProdutoService from '@/services/metaProdutoService';
import { produtoSnapshotMensalService } from '@/modules/gerencialMes/services/produtoSnapshotMensalService';
import usuarioService from '@/services/usuarioService';
import { demandaService } from '@/services/demandaService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import type {
  GerencialMesProdutoLocationState,
  DemandaProdutoViewDTO,
  ProdutoResumoDTO,
  ProdutoSnapshotAcaoCreateDTO,
  ProdutoSnapshotAcaoDTO,
  ProdutoSnapshotAcaoUpdateDTO,
  ProdutoSnapshotAcaoUpdateStatusDTO,
  ProdutoSnapshotMensalDTO,
  StatusAcaoProduto,
  StatusProdutoMes,
  TipoAcaoProduto,
  Usuario,
  ImpactoAcaoProduto,
} from '@/types';

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isAcaoVencida(acao: ProdutoSnapshotAcaoDTO): boolean {
  if (acao.statusAcao !== 'ABERTA' && acao.statusAcao !== 'EM_ANDAMENTO') return false;
  return acao.prazo < todayYmd();
}

function formatDateByLocale(value: string, locale: string): string {
  const [y, m, d] = value.split('-').map(Number);
  if ([y, m, d].some((n) => Number.isNaN(n))) return value;
  return new Date(y, m - 1, d).toLocaleDateString(locale);
}

const YEARS = (() => {
  const y = new Date().getFullYear();
  const out: number[] = [];
  for (let i = y - 6; i <= y + 4; i += 1) out.push(i);
  return out;
})();

const DEMANDA_STATUS_I18N: Record<string, string> = {
  A: 'demands.statusA',
  B: 'demands.statusB',
  C: 'demands.statusC',
  D: 'demands.statusD',
  E: 'demands.statusE',
  F: 'demands.statusF',
  G: 'demands.statusG',
  Z: 'demands.statusZ',
};

export default function ProdutoGerencialMesPage() {
  const { t, i18n } = useTranslation();
  const { metaProdutoId: metaProdutoIdParam } = useParams<{ metaProdutoId: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const metaProdutoId = Number(metaProdutoIdParam);
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  const state = (location.state ?? {}) as GerencialMesProdutoLocationState;

  const now = new Date();
  const [draftAno, setDraftAno] = useState(now.getFullYear());
  const [draftMes, setDraftMes] = useState(now.getMonth() + 1);
  const [appliedAno, setAppliedAno] = useState(now.getFullYear());
  const [appliedMes, setAppliedMes] = useState(now.getMonth() + 1);
  const [initializedMetaProdutoId, setInitializedMetaProdutoId] = useState<number | null>(null);

  const [resumo, setResumo] = useState<ProdutoResumoDTO | null>(
    state.resumo?.idProduto === Number(metaProdutoIdParam) ? state.resumo : null,
  );
  const [snapshot, setSnapshot] = useState<ProdutoSnapshotMensalDTO | null>(null);
  const [acoes, setAcoes] = useState<ProdutoSnapshotAcaoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAcoes, setLoadingAcoes] = useState(false);
  const [loadingDemandas, setLoadingDemandas] = useState(false);
  const [demandasProduto, setDemandasProduto] = useState<DemandaProdutoViewDTO[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<StatusProdutoMes>('V');
  const [createResumo, setCreateResumo] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [fecharConfirmOpen, setFecharConfirmOpen] = useState(false);
  const [reabrirConfirmOpen, setReabrirConfirmOpen] = useState(false);
  const [deleteSnapshotConfirmOpen, setDeleteSnapshotConfirmOpen] = useState(false);

  const [acaoDialogOpen, setAcaoDialogOpen] = useState(false);
  const [editingAcao, setEditingAcao] = useState<ProdutoSnapshotAcaoDTO | null>(null);
  const [acaoForm, setAcaoForm] = useState<{
    tipoAcao: TipoAcaoProduto;
    descricao: string;
    responsavelId: string;
    responsavelNome: string;
    prazo: string;
    impacto: ImpactoAcaoProduto;
  }>({
    tipoAcao: 'CORRETIVA',
    descricao: '',
    responsavelId: '',
    responsavelNome: '',
    prazo: todayYmd(),
    impacto: 'M',
  });
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAcaoTarget, setStatusAcaoTarget] = useState<ProdutoSnapshotAcaoDTO | null>(null);
  const [statusForm, setStatusForm] = useState<{ statusAcao: StatusAcaoProduto; observacaoStatus: string }>({
    statusAcao: 'EM_ANDAMENTO',
    observacaoStatus: '',
  });

  const [deleteAcaoTarget, setDeleteAcaoTarget] = useState<ProdutoSnapshotAcaoDTO | null>(null);
  const [viewReportPdfOpen, setViewReportPdfOpen] = useState(false);

  const [snapshotEdit, setSnapshotEdit] = useState({
    statusProdutoMes: 'V' as StatusProdutoMes,
    situacao: '',
    resumoAnalitico: '',
  });

  const loadResumoIfNeeded = useCallback(async () => {
    if (resumo && resumo.idProduto === metaProdutoId) return;
    if (!Number.isFinite(metaProdutoId) || metaProdutoId <= 0) return;
    try {
      setErrorHandledByHook(true);
      const meta = await metaProdutoService.findById(metaProdutoId);
      const list = await metaProdutoService.getResumoByMeta(meta.projetoMetaId);
      const found = list.find((r) => r.idProduto === metaProdutoId) ?? null;
      setResumo(found);
    } catch (e) {
      console.warn(e);
      setResumo(null);
    } finally {
      setErrorHandledByHook(false);
    }
  }, [metaProdutoId, resumo]);

  const initializeLatestPeriod = useCallback(async () => {
    if (!Number.isFinite(metaProdutoId) || metaProdutoId <= 0) return;
    try {
      setErrorHandledByHook(true);
      let pageIndex = 0;
      let lastPage = false;
      let best: { ano: number; mes: number } | null = null;
      while (!lastPage) {
        const page = await produtoSnapshotMensalService.findPage({
          metaProdutoId,
          page: pageIndex,
          size: 100,
          sort: 'ano,desc',
        });
        for (const item of page.content) {
          if (
            !best ||
            item.ano > best.ano ||
            (item.ano === best.ano && item.mes > best.mes)
          ) {
            best = { ano: item.ano, mes: item.mes };
          }
        }
        lastPage = page.last || pageIndex >= page.totalPages - 1;
        pageIndex += 1;
      }
      if (best) {
        setDraftAno(best.ano);
        setDraftMes(best.mes);
        setAppliedAno(best.ano);
        setAppliedMes(best.mes);
      } else {
        const current = new Date();
        const currentAno = current.getFullYear();
        const currentMes = current.getMonth() + 1;
        setDraftAno(currentAno);
        setDraftMes(currentMes);
        setAppliedAno(currentAno);
        setAppliedMes(currentMes);
      }
      setInitializedMetaProdutoId(metaProdutoId);
    } catch {
      const current = new Date();
      const currentAno = current.getFullYear();
      const currentMes = current.getMonth() + 1;
      setDraftAno(currentAno);
      setDraftMes(currentMes);
      setAppliedAno(currentAno);
      setAppliedMes(currentMes);
      setInitializedMetaProdutoId(metaProdutoId);
    } finally {
      setErrorHandledByHook(false);
    }
  }, [metaProdutoId]);

  const loadSnapshot = useCallback(async () => {
    if (!Number.isFinite(metaProdutoId) || metaProdutoId <= 0) return;
    setLoading(true);
    setSnapshot(null);
    setAcoes([]);
    setDemandasProduto([]);
    try {
      setErrorHandledByHook(true);
      const page = await produtoSnapshotMensalService.findPage({
        metaProdutoId,
        ano: appliedAno,
        mes: appliedMes,
        page: 0,
        size: 1,
        sort: 'id,desc',
      });
      const first = page.content[0] ?? null;
      setSnapshot(first);
      if (first) {
        setSnapshotEdit({
          statusProdutoMes: first.statusProdutoMes,
          situacao: first.situacao ?? '',
          resumoAnalitico: first.resumoAnalitico ?? '',
        });
        setLoadingAcoes(true);
        try {
          const list = await produtoSnapshotMensalService.listAcoes(first.id);
          setAcoes(list);
        } finally {
          setLoadingAcoes(false);
        }
      }
      setLoadingDemandas(true);
      try {
        const list = await demandaService.listByProdutoView(metaProdutoId);
        setDemandasProduto(list);
      } finally {
        setLoadingDemandas(false);
      }
    } catch (e) {
      if (e instanceof ApiError) {
        toast({ variant: 'destructive', title: t('common.error'), description: e.message });
      }
    } finally {
      setErrorHandledByHook(false);
      setLoading(false);
    }
  }, [appliedAno, appliedMes, metaProdutoId, t, toast]);

  useEffect(() => {
    void loadResumoIfNeeded();
  }, [loadResumoIfNeeded]);

  useEffect(() => {
    setInitializedMetaProdutoId(null);
    void initializeLatestPeriod();
  }, [initializeLatestPeriod]);

  useEffect(() => {
    if (initializedMetaProdutoId !== metaProdutoId) return;
    void loadSnapshot();
  }, [initializedMetaProdutoId, loadSnapshot, metaProdutoId]);

  useEffect(() => {
    if (usuarios.length > 0) return;
    if (!acoes.some((a) => a.responsavelId != null)) return;
    let cancelled = false;
    (async () => {
      try {
        setErrorHandledByHook(true);
        const page = await usuarioService.findAll({ page: 0, size: 300, status: 'A' });
        if (!cancelled) setUsuarios(page.content);
      } catch {
        if (!cancelled) setUsuarios([]);
      } finally {
        setErrorHandledByHook(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [acoes, usuarios.length]);

  const applyFilter = () => {
    setAppliedAno(draftAno);
    setAppliedMes(draftMes);
  };

  const monthLabel = useMemo(() => {
    try {
      return new Date(appliedAno, appliedMes - 1, 1).toLocaleDateString(i18n.language, {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return `${appliedMes}/${appliedAno}`;
    }
  }, [appliedAno, appliedMes, i18n.language]);

  const usuarioNomeById = useMemo(() => {
    return new Map(usuarios.map((u) => [u.id, u.nome]));
  }, [usuarios]);

  const percentResumo = resumo?.percentualExecucao ?? 0;
  const percentSnapshot = snapshot?.percentualExecucao ?? 0;

  const getDemandaStatusLabel = (status?: string) => {
    const key = DEMANDA_STATUS_I18N[status ?? ''] ?? '';
    return key ? t(key) : status || '—';
  };

  const openCreateDialog = () => {
    setCreateStatus('V');
    setCreateResumo('');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setCreateSubmitting(true);
    try {
      setErrorHandledByHook(true);
      const created = await produtoSnapshotMensalService.create({
        metaProdutoId,
        ano: appliedAno,
        mes: appliedMes,
        statusProdutoMes: createStatus,
        resumoAnalitico: createResumo.trim() || undefined,
      });
      setSnapshot(created);
      setSnapshotEdit({
        statusProdutoMes: created.statusProdutoMes,
        situacao: created.situacao ?? '',
        resumoAnalitico: created.resumoAnalitico ?? '',
      });
      setAcoes([]);
      setCreateOpen(false);
      toast({ title: t('gerencialMes.createSuccess') });
    } catch (e) {
      if (e instanceof ApiError) {
        toast({ variant: 'destructive', title: t('common.error'), description: e.message });
      }
    } finally {
      setErrorHandledByHook(false);
      setCreateSubmitting(false);
    }
  };

  const saveSnapshotFields = async () => {
    if (!snapshot || snapshot.fechado) return;
    try {
      setErrorHandledByHook(true);
      const updated = await produtoSnapshotMensalService.update(snapshot.id, {
        statusProdutoMes: snapshotEdit.statusProdutoMes,
        situacao: snapshotEdit.situacao || null,
        resumoAnalitico: snapshotEdit.resumoAnalitico || null,
      });
      setSnapshot(updated);
      toast({ title: t('gerencialMes.saveSuccess') });
    } catch (e) {
      if (e instanceof ApiError) {
        toast({ variant: 'destructive', title: t('common.error'), description: e.message });
      }
    } finally {
      setErrorHandledByHook(false);
    }
  };

  const doFechar = async () => {
    if (!snapshot) return;
    try {
      setErrorHandledByHook(true);
      const updated = await produtoSnapshotMensalService.fechar(snapshot.id);
      setSnapshot(updated);
      setFecharConfirmOpen(false);
      toast({ title: t('gerencialMes.closeSuccess') });
    } catch (e) {
      if (e instanceof ApiError) {
        toast({ variant: 'destructive', title: t('common.error'), description: e.message });
      }
    } finally {
      setErrorHandledByHook(false);
    }
  };

  const doReabrir = async () => {
    if (!snapshot) return;
    try {
      setErrorHandledByHook(true);
      const updated = await produtoSnapshotMensalService.reabrir(snapshot.id);
      setSnapshot(updated);
      setReabrirConfirmOpen(false);
      toast({ title: t('gerencialMes.reopenSuccess') });
    } catch (e) {
      if (e instanceof ApiError) {
        toast({ variant: 'destructive', title: t('common.error'), description: e.message });
      }
    } finally {
      setErrorHandledByHook(false);
    }
  };

  const confirmDeleteSnapshot = async () => {
    if (!snapshot) return;
    try {
      setErrorHandledByHook(true);
      await produtoSnapshotMensalService.delete(snapshot.id);
      setDeleteSnapshotConfirmOpen(false);
      setSnapshot(null);
      setAcoes([]);
      toast({ title: t('common.success') });
    } catch (e) {
      if (e instanceof ApiError) {
        toast({ variant: 'destructive', title: t('common.error'), description: e.message });
      }
    } finally {
      setErrorHandledByHook(false);
    }
  };

  const openAcaoDialog = async (acao: ProdutoSnapshotAcaoDTO | null) => {
    setEditingAcao(acao);
    if (acao) {
      setAcaoForm({
        tipoAcao: acao.tipoAcao,
        descricao: acao.descricao,
        responsavelId: acao.responsavelId != null ? String(acao.responsavelId) : '',
        responsavelNome: acao.responsavelNome ?? '',
        prazo: acao.prazo,
        impacto: acao.impacto,
      });
    } else {
      setAcaoForm({
        tipoAcao: 'CORRETIVA',
        descricao: '',
        responsavelId: '',
        responsavelNome: '',
        prazo: todayYmd(),
        impacto: 'M',
      });
    }
    if (usuarios.length === 0) {
      try {
        setErrorHandledByHook(true);
        const page = await usuarioService.findAll({ page: 0, size: 300, status: 'A' });
        setUsuarios(page.content);
      } catch {
        setUsuarios([]);
      } finally {
        setErrorHandledByHook(false);
      }
    }
    setAcaoDialogOpen(true);
  };

  const submitAcao = async () => {
    if (!snapshot) return;
    const body: ProdutoSnapshotAcaoCreateDTO | ProdutoSnapshotAcaoUpdateDTO = {
      tipoAcao: acaoForm.tipoAcao,
      descricao: acaoForm.descricao.trim(),
      prazo: acaoForm.prazo,
      impacto: acaoForm.impacto,
      responsavelId: acaoForm.responsavelId ? Number(acaoForm.responsavelId) : null,
      responsavelNome: acaoForm.responsavelNome.trim() || undefined,
    };
    if (!body.descricao) {
      toast({ variant: 'destructive', title: t('gerencialMes.acaoDescRequired') });
      return;
    }
    try {
      setErrorHandledByHook(true);
      if (editingAcao) {
        await produtoSnapshotMensalService.updateAcao(snapshot.id, editingAcao.id, body);
        toast({ title: t('gerencialMes.acaoUpdated') });
      } else {
        await produtoSnapshotMensalService.createAcao(snapshot.id, body as ProdutoSnapshotAcaoCreateDTO);
        toast({ title: t('gerencialMes.acaoCreated') });
      }
      setAcaoDialogOpen(false);
      const list = await produtoSnapshotMensalService.listAcoes(snapshot.id);
      setAcoes(list);
    } catch (e) {
      if (e instanceof ApiError) {
        toast({ variant: 'destructive', title: t('common.error'), description: e.message });
      }
    } finally {
      setErrorHandledByHook(false);
    }
  };

  const submitStatusAcao = async () => {
    if (!snapshot || !statusAcaoTarget) return;
    try {
      setErrorHandledByHook(true);
      const dto: ProdutoSnapshotAcaoUpdateStatusDTO = {
        statusAcao: statusForm.statusAcao,
        observacaoStatus: statusForm.observacaoStatus.trim() || undefined,
      };
      await produtoSnapshotMensalService.updateAcaoStatus(snapshot.id, statusAcaoTarget.id, dto);
      setStatusDialogOpen(false);
      const list = await produtoSnapshotMensalService.listAcoes(snapshot.id);
      setAcoes(list);
      toast({ title: t('gerencialMes.acaoStatusUpdated') });
    } catch (e) {
      if (e instanceof ApiError) {
        toast({ variant: 'destructive', title: t('common.error'), description: e.message });
      }
    } finally {
      setErrorHandledByHook(false);
    }
  };

  const confirmDeleteAcao = async () => {
    if (!snapshot || !deleteAcaoTarget) return;
    try {
      setErrorHandledByHook(true);
      await produtoSnapshotMensalService.deleteAcao(snapshot.id, deleteAcaoTarget.id);
      setDeleteAcaoTarget(null);
      const list = await produtoSnapshotMensalService.listAcoes(snapshot.id);
      setAcoes(list);
      toast({ title: t('gerencialMes.acaoDeleted') });
    } catch (e) {
      if (e instanceof ApiError) {
        toast({ variant: 'destructive', title: t('common.error'), description: e.message });
      }
    } finally {
      setErrorHandledByHook(false);
    }
  };

  if (!Number.isFinite(metaProdutoId) || metaProdutoId <= 0) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t('gerencialMes.invalidProduct')}</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to={returnTo}>{t('gerencialMes.back')}</Link>
        </Button>
      </div>
    );
  }

  const statusTone = (s: StatusProdutoMes) =>
    s === 'V'
      ? 'bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 dark:text-emerald-200'
      : s === 'A'
        ? 'bg-amber-500/15 text-amber-900 ring-amber-500/30 dark:text-amber-100'
        : 'bg-rose-500/15 text-rose-900 ring-rose-500/30 dark:text-rose-100';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-12 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground">
          <Link to={returnTo}>
            <ArrowLeft className="h-4 w-4" />
            {t('gerencialMes.back')}
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Camera className="h-4 w-4" />
          {t('gerencialMes.pageTitle')}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-border/80 shadow-sm ring-1 ring-border/40">
          <CardHeader className="border-b bg-muted/20 pb-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold uppercase tracking-wide">{t('nav.goals')}</span>
              <span>{resumo?.codigoMeta ?? snapshot?.metaProduto?.projetoMeta?.codigo ?? '—'}</span>
              <span>·</span>
              <span className="truncate">{resumo?.nomeMeta ?? snapshot?.metaProduto?.projetoMeta?.nome ?? '—'}</span>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-200">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <CardTitle className="text-xl font-semibold leading-tight md:text-2xl">
                      {resumo?.nomeProduto ?? snapshot?.metaProduto?.nome ?? t('gerencialMes.product')}
                    </CardTitle>
                    <Badge className="shrink-0 rounded-md bg-[navy] px-2.5 py-0.5 font-mono text-xs font-bold text-white hover:bg-[navy]">
                      {resumo?.codigoProduto ?? snapshot?.metaProduto?.codigo ?? '—'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('produto.vida.subtitle')}</p>
                </div>
              </div>
              <div className="w-full max-w-[240px] space-y-2 md:shrink-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('produto.vida.executionPercent')}
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">{formatPercent(percentResumo)}</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, percentResumo))} className="h-2" />
                
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-end gap-3">
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
                  <SelectTrigger className="w-[160px]">
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
              <Button type="button" onClick={applyFilter} className="gap-2">
                <Calendar className="h-4 w-4" />
                {t('gerencialMes.applyFilter')}
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={() => void loadSnapshot()} aria-label={t('common.refresh')}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>

            <p className="m-4 text-sm text-muted-foreground">
              {t('gerencialMes.periodLabel')}: <span className="font-medium capitalize text-foreground">{monthLabel}</span>
            </p>

          </CardContent>
        </Card>
      </motion.div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">{t('common.loadingData')}</Card>
      ) : !snapshot ? (
        <Card className="border-dashed p-8 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">{t('gerencialMes.noSnapshotForPeriod')}</p>
          <Button type="button" onClick={openCreateDialog}>
            {t('gerencialMes.registerSnapshotCta')}
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1', statusTone(snapshot.statusProdutoMes))}>
                {t(`gerencialMes.statusMes.${snapshot.statusProdutoMes}`)}
              </Badge>
              {snapshot.fechado ? (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  {t('gerencialMes.closed')}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                  <Unlock className="h-3 w-3" />
                  {t('gerencialMes.open')}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!snapshot.fechado && (
                <Button type="button" variant="secondary" onClick={() => setFecharConfirmOpen(true)} className="gap-1">
                  <Lock className="h-4 w-4" />
                  {t('gerencialMes.closeMonth')}
                </Button>
              )}
              {snapshot.fechado && user?.perfil === 'A' && (
                <Button type="button" variant="outline" onClick={() => setReabrirConfirmOpen(true)} className="gap-1">
                  <Unlock className="h-4 w-4" />
                  {t('gerencialMes.reopenMonth')}
                </Button>
              )}
              {snapshot.fechado && user?.perfil === 'A' && (
                <Button type="button" variant="outline" onClick={() => setViewReportPdfOpen(true)} className="gap-1">
                  <FileSearch className="h-4 w-4" />
                  {t('gerencialMes.reportProdutoMes.viewButton')}
                </Button>
              )}
            </div>
          </div>
          {snapshot.fechado && snapshot.dataFechamento && (
            <p className="text-xs text-muted-foreground">
              {t('gerencialMes.closedAt', {
                date: new Date(snapshot.dataFechamento).toLocaleString(i18n.language),
                user: snapshot.usuarioFechamentoNome ?? '—',
              })}
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <LineChart className="h-4 w-4" />
                    </span>
                    {t('gerencialMes.snapshotMetrics')}
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t('gerencialMes.snapshotMetricsHint')}</p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <MetricMini label={t('gerencialMes.budgeted')} value={formatCurrency(snapshot.valorTotalOrcamento)} />
                <MetricMini label={t('gerencialMes.inExecution')} value={formatCurrency(snapshot.valorTotalEmExecucao)} />
                <MetricMini label={t('gerencialMes.executed')} value={formatCurrency(snapshot.valorTotalExecutado)} />
                <MetricMini label={t('gerencialMes.executionPercent')} value={formatPercent(percentSnapshot)} />
                <MetricMini
                  label={t('gerencialMes.avgPlannedMonthly')}
                  value={formatCurrency(snapshot.valorMediaEntregaPrevistaMensal)}
                />
                <MetricMini label={t('gerencialMes.avgRealMonthly')} value={formatCurrency(snapshot.valorMediaEntregaRealMensal)} />
              </CardContent>
            </Card>
            {resumo && (
              <Card className="ring-1 ring-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                        <FileSearch className="h-4 w-4" />
                      </span>
                      {t('gerencialMes.currentSummary')}
                    </span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t('gerencialMes.currentSummaryHint')}</p>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <MetricMini label={t('gerencialMes.budgeted')} value={formatCurrency(resumo.valorTotalOrcamento)} />
                  <MetricMini label={t('gerencialMes.inExecution')} value={formatCurrency(resumo.valorTotalEmExecucao)} />
                  <MetricMini label={t('gerencialMes.executed')} value={formatCurrency(resumo.valorTotalExecutado)} />
                  <MetricMini label={t('gerencialMes.executionPercent')} value={formatPercent(resumo.percentualExecucao ?? 0)} />
                  <div className="sm:col-span-2 text-xs text-muted-foreground">
                    {formatMonthYearRange(resumo.inicioPrevisaoExecucao, resumo.fimPrevisaoExecucao, t('dashboard.map.dateRangeSeparator'))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {!snapshot.fechado ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                      <ScrollText className="h-4 w-4" />
                    </span>
                    {t('gerencialMes.editSnapshot')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('gerencialMes.statusMonth')}</Label>
                    <Select
                      value={snapshotEdit.statusProdutoMes}
                      onValueChange={(v) => setSnapshotEdit((p) => ({ ...p, statusProdutoMes: v as StatusProdutoMes }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="V">{t('gerencialMes.statusMes.V')}</SelectItem>
                        <SelectItem value="A">{t('gerencialMes.statusMes.A')}</SelectItem>
                        <SelectItem value="R">{t('gerencialMes.statusMes.R')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('gerencialMes.situation')}</Label>
                    <Input
                      value={snapshotEdit.situacao}
                      onChange={(e) => setSnapshotEdit((p) => ({ ...p, situacao: e.target.value }))}
                      
                      maxLength={255}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('gerencialMes.analyticSummary')}</Label>
                  <Textarea
                    value={snapshotEdit.resumoAnalitico}
                    onChange={(e) => setSnapshotEdit((p) => ({ ...p, resumoAnalitico: e.target.value }))}
                    rows={5}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={() => void saveSnapshotFields()}>
                    {t('gerencialMes.saveSnapshot')}
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => setDeleteSnapshotConfirmOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('common.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                      <ScrollText className="h-4 w-4" />
                    </span>
                    {t('gerencialMes.snapshotReadonly')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Badge
                  className={cn(
                    'shrink-0 rounded-md px-2.5 py-0.5 text-xs font-bold ring-1',
                    statusTone(snapshot.statusProdutoMes),
                  )}
                >
                  {snapshot.situacao || '—'}
                </Badge>
                <div className="m-4 border-l-2 border-gray-400">
                  <p className="m-2 whitespace-pre-wrap text-muted-foreground">{snapshot.resumoAnalitico || '—'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  {t('gerencialMes.productDemandsTitle')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDemandas ? (
                <p className="text-sm text-muted-foreground">{t('common.loadingData')}</p>
              ) : demandasProduto.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('gerencialMes.noProductDemands')}</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('gerencialMes.demandaCodigo')}</TableHead>
                        <TableHead>{t('gerencialMes.demandaNome')}</TableHead>
                        <TableHead>{t('gerencialMes.demandaStatus')}</TableHead>
                        <TableHead>{t('gerencialMes.demandaTotalPrevisto')}</TableHead>
                        <TableHead>{t('gerencialMes.demandaTotalExecutado')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demandasProduto.map((demanda) => (
                        <TableRow key={`${demanda.codigo}-${demanda.nome}`}>
                          <TableCell className="whitespace-nowrap text-xs">{demanda.codigo}</TableCell>
                          <TableCell className="max-w-[360px] text-xs">{demanda.nome}</TableCell>
                          <TableCell className="text-xs">{getDemandaStatusLabel(demanda.status)}</TableCell>
                          <TableCell className="text-xs tabular-nums">{formatCurrency(demanda.totalPrevisto)}</TableCell>
                          <TableCell className="text-xs tabular-nums">{formatCurrency(demanda.totalExecutado)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    {t('gerencialMes.actionsTitle')}
                  </span>
                </CardTitle>
                
              </div>
              <Button type="button" size="sm" className="gap-1" onClick={() => void openAcaoDialog(null)}>
                <Plus className="h-4 w-4" />
                {t('gerencialMes.addAction')}
              </Button>
            </CardHeader>
            <CardContent>
              {loadingAcoes ? (
                <p className="text-sm text-muted-foreground">{t('common.loadingData')}</p>
              ) : acoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('gerencialMes.noActions')}</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[112px] text-center">{t('common.actions')}</TableHead>
                        <TableHead>{t('gerencialMes.acaoTipo')}</TableHead>
                        <TableHead>{t('gerencialMes.acaoDesc')}</TableHead>
                        <TableHead>{t('gerencialMes.responsibleUser')}</TableHead>
                        <TableHead>{t('gerencialMes.acaoPrazo')}</TableHead>
                        <TableHead>{t('gerencialMes.acaoImpact')}</TableHead>
                        <TableHead>{t('gerencialMes.acaoStatus')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {acoes.map((a) => (
                        <TableRow key={a.id} className={cn(isAcaoVencida(a) && 'bg-destructive/5')}>
                          <TableCell className="w-[112px] text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => void openAcaoDialog(a)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  setStatusAcaoTarget(a);
                                  setStatusForm({ statusAcao: a.statusAcao, observacaoStatus: a.observacaoStatus ?? '' });
                                  setStatusDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteAcaoTarget(a)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{t(`gerencialMes.tipoAcao.${a.tipoAcao}`)}</TableCell>
                          <TableCell className="max-w-[220px] text-xs">{a.descricao}</TableCell>
                          <TableCell className="text-xs">
                            {a.responsavelId != null ? (usuarioNomeById.get(a.responsavelId) ?? '—') : '—'}
                          </TableCell>
                          <TableCell className="tabular-nums text-xs">{formatDateByLocale(a.prazo, i18n.language)}</TableCell>
                          <TableCell className="text-xs">{t(`gerencialMes.impacto.${a.impacto}`)}</TableCell>
                          <TableCell className="text-xs">
                            <div className="inline-flex items-center gap-1.5">
                              <span>{t(`gerencialMes.statusAcao.${a.statusAcao}`)}</span>
                              {a.observacaoStatus?.trim() ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[navy] transition hover:bg-muted/80"
                                      aria-label={t('gerencialMes.statusNote')}
                                    >
                                      <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[min(420px,80vw)] break-words text-sm">
                                    {a.observacaoStatus}
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('gerencialMes.createDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{t('gerencialMes.createDialogBody')}</p>
            <div className="space-y-2">
              <Label>{t('gerencialMes.statusMonth')}</Label>
              <RadioGroup value={createStatus} onValueChange={(v) => setCreateStatus(v as StatusProdutoMes)} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="V" id="c-v" />
                  <Label htmlFor="c-v">{t('gerencialMes.statusMes.V')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="A" id="c-a" />
                  <Label htmlFor="c-a">{t('gerencialMes.statusMes.A')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="R" id="c-r" />
                  <Label htmlFor="c-r">{t('gerencialMes.statusMes.R')}</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>{t('gerencialMes.analyticSummaryOptional')}</Label>
              <Textarea value={createResumo} onChange={(e) => setCreateResumo(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void submitCreate()} disabled={createSubmitting}>
              {t('gerencialMes.confirmRegister')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={fecharConfirmOpen} onOpenChange={setFecharConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('gerencialMes.closeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('gerencialMes.closeConfirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doFechar()}>{t('gerencialMes.closeMonth')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reabrirConfirmOpen} onOpenChange={setReabrirConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('gerencialMes.reopenConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('gerencialMes.reopenConfirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doReabrir()}>{t('gerencialMes.reopenMonth')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteSnapshotConfirmOpen} onOpenChange={setDeleteSnapshotConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('gerencialMes.deleteAcaoBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteSnapshot()}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={acaoDialogOpen} onOpenChange={setAcaoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAcao ? t('gerencialMes.editAction') : t('gerencialMes.newAction')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>{t('gerencialMes.acaoTipo')}</Label>
              <Select value={acaoForm.tipoAcao} onValueChange={(v) => setAcaoForm((p) => ({ ...p, tipoAcao: v as TipoAcaoProduto }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREVENTIVA">{t('gerencialMes.tipoAcao.PREVENTIVA')}</SelectItem>
                  <SelectItem value="CORRETIVA">{t('gerencialMes.tipoAcao.CORRETIVA')}</SelectItem>
                  <SelectItem value="CONTINGENCIA">{t('gerencialMes.tipoAcao.CONTINGENCIA')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('gerencialMes.acaoDesc')}</Label>
              <Textarea value={acaoForm.descricao} onChange={(e) => setAcaoForm((p) => ({ ...p, descricao: e.target.value }))} rows={3} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('gerencialMes.acaoPrazo')}</Label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={acaoForm.prazo}
                  onChange={(e) => setAcaoForm((p) => ({ ...p, prazo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('gerencialMes.acaoImpact')}</Label>
                <Select value={acaoForm.impacto} onValueChange={(v) => setAcaoForm((p) => ({ ...p, impacto: v as ImpactoAcaoProduto }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B">{t('gerencialMes.impacto.B')}</SelectItem>
                    <SelectItem value="M">{t('gerencialMes.impacto.M')}</SelectItem>
                    <SelectItem value="A">{t('gerencialMes.impacto.A')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('gerencialMes.responsibleUser')}</Label>
              <Select value={acaoForm.responsavelId || '__none'} onValueChange={(v) => setAcaoForm((p) => ({ ...p, responsavelId: v === '__none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('gerencialMes.optional')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t('gerencialMes.none')}</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('gerencialMes.responsibleExternal')}</Label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={acaoForm.responsavelNome}
                onChange={(e) => setAcaoForm((p) => ({ ...p, responsavelNome: e.target.value }))}
                maxLength={255}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcaoDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void submitAcao()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('gerencialMes.updateActionStatus')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t('gerencialMes.acaoStatus')}</Label>
              <Select value={statusForm.statusAcao} onValueChange={(v) => setStatusForm((p) => ({ ...p, statusAcao: v as StatusAcaoProduto }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABERTA">{t('gerencialMes.statusAcao.ABERTA')}</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">{t('gerencialMes.statusAcao.EM_ANDAMENTO')}</SelectItem>
                  <SelectItem value="CONCLUIDA">{t('gerencialMes.statusAcao.CONCLUIDA')}</SelectItem>
                  <SelectItem value="CANCELADA">{t('gerencialMes.statusAcao.CANCELADA')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('gerencialMes.statusNote')}</Label>
              <Textarea value={statusForm.observacaoStatus} onChange={(e) => setStatusForm((p) => ({ ...p, observacaoStatus: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void submitStatusAcao()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAcaoTarget} onOpenChange={(o) => !o && setDeleteAcaoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('gerencialMes.deleteAcaoTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('gerencialMes.deleteAcaoBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void confirmDeleteAcao()}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PdfPreviewDialog
        open={viewReportPdfOpen}
        onOpenChange={setViewReportPdfOpen}
        title={t('gerencialMes.reportProdutoMes.previewTitle')}
        description={snapshot ? `${t('gerencialMes.reportProdutoMes.period')}: ${monthLabel}` : undefined}
        fetchPdf={async () => {
          if (!snapshot) {
            throw new Error(t('gerencialMes.noSnapshotForPeriod'));
          }
          return produtoSnapshotMensalService.gerarReportProdutoMesPdf({
            snapshot,
            resumo,
            acoes,
            demandas: demandasProduto,
            locale: i18n.language,
          });
        }}
        loadingLabel={t('gerencialMes.reportProdutoMes.generating')}
        errorMessage={t('gerencialMes.reportProdutoMes.generateError')}
        downloadFileName={snapshot ? `report-produto-mes-${snapshot.id}.pdf` : undefined}
        closeLabel={t('common.close')}
        downloadLabel={t('common.download')}
        onError={(err: unknown) =>
          toast({
            title: t('common.error'),
            description: err instanceof Error ? err.message : t('gerencialMes.reportProdutoMes.generateError'),
            variant: 'destructive',
          })
        }
      />
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
