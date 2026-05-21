import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Pencil, Trash2, BarChart3, ClipboardCheck, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { demandaExecucaoService } from '../services/demandaExecucaoService';
import { demandaService } from '@/services/demandaService';
import { canCreateDemandaExecucao } from '@/lib/demandaStatus';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { DemandaExecucaoDTO } from '../types';
import type { DemandaTecnica } from '@/types';
import { TarefasTab } from '../components/TarefasTab';
import { RecursosTab } from '@/modules/execucaoDemanda/components/RecursosTab';
import { ApontamentosTab } from '@/modules/execucaoDemanda/components/ApontamentosTab';
import { DependenciasTab } from '@/modules/execucaoDemanda/components/DependenciasTab';
import { ExecucaoFormModal } from '../components/ExecucaoFormModal';
import { loadExecucaoReportData } from '../services/execucaoDemandaReportService';
import {
  generateExecucaoDemandaReportPdfBlob,
  type ExecucaoDemandaReportLabels,
} from '@/reports/ExecucaoDemanda/ExecucaoDemandaReport';

function toDateOnly(isoOrDate: string): string {
  const part = String(isoOrDate).split('T')[0];
  if (!part) return isoOrDate;
  return part;
}

/** Parsea "YYYY-MM-DD" como data local (evita dia a menos por UTC). */
function parseLocalDate(dateStr: string): Date {
  const part = toDateOnly(dateStr);
  const [y, m, d] = part.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function ExecucaoDemandaDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { demandaTecnicaId } = useParams<{ demandaTecnicaId: string }>();
  const navigate = useNavigate();
  const id = demandaTecnicaId ? Number(demandaTecnicaId) : NaN;

  const [execucao, setExecucao] = useState<DemandaExecucaoDTO | null>(null);
  const [demanda, setDemanda] = useState<DemandaTecnica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editExecucaoOpen, setEditExecucaoOpen] = useState(false);
  const [savingExecucao, setSavingExecucao] = useState(false);
  const [deleteExecucaoOpen, setDeleteExecucaoOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const { toast } = useToast();

  const reportLabels = useMemo((): ExecucaoDemandaReportLabels => {
    return {
      documentTitle: t('execucao.report.documentTitle'),
      demandSection: t('execucao.report.demandSection'),
      executionSection: t('execucao.report.executionSection'),
      demandCodeName: t('execucao.report.demandCodeName'),
      demandId: t('execucao.report.demandId'),
      executionId: t('execucao.report.executionId'),
      status: t('execucao.status'),
      situacao: t('execucao.report.situacao'),
      progress: t('execucao.percentualProgresso'),
      plannedStart: t('execucao.dataInicioPlanejada'),
      plannedEnd: t('execucao.dataFimPlanejada'),
      realStart: t('execucao.dataInicioReal'),
      realEnd: t('execucao.dataFimReal'),
      createdAt: t('execucao.report.createdAt'),
      responsible: t('execucao.report.responsible'),
      sectionTasks: t('execucao.report.sectionTasks'),
      sectionDependencies: t('execucao.report.sectionDependencies'),
      sectionResources: t('execucao.report.sectionResources'),
      sectionProfissionalMes: t('execucao.report.sectionProfissionalMes'),
      sectionApontamentos: t('execucao.report.sectionApontamentos'),
      sectionGantt: t('execucao.report.sectionGantt'),
      emptySection: t('execucao.report.emptySection'),
      colSeq: t('execucao.report.colSeq'),
      colTitle: t('execucao.report.colTitle'),
      colDescription: t('execucao.report.colDescription'),
      colStatus: t('execucao.taskStatus'),
      colPriority: t('execucao.priority'),
      colProgress: t('execucao.percentualProgresso'),
      colEstimateHours: t('execucao.estimativaHoras'),
      colPlannedStart: t('execucao.dataInicioPlanejada'),
      colPlannedEnd: t('execucao.dataFimPlanejada'),
      colRealStart: t('execucao.dataInicioReal'),
      colRealEnd: t('execucao.dataFimReal'),
      colTaskDest: t('execucao.report.colTaskDest'),
      colTaskOrig: t('execucao.report.colTaskOrig'),
      colTask: t('execucao.report.colTask'),
      colProfessional: t('execucao.professional'),
      colProfile: t('common.profile', 'Perfil'),
      colHoursPlanned: t('execucao.report.colHoursPlanned'),
      colHoursExecuted: t('execucao.report.colHoursExecuted'),
      colMonthYear: t('execucao.report.colMonthYear'),
      colTotal: t('execucao.report.colTotal'),
      colDate: t('execucao.report.colDate'),
      colComment: t('execucao.comment'),
      ganttEmpty: t('execucao.report.ganttEmpty'),
      appName: t('common.appName'),
      appNameDesc: t('common.appNameDesc'),
      generatedBy: (userName, at) =>
        t('execucao.report.generatedBy', { user: userName, at }),
      pageOf: (page, total) => t('execucao.report.pageOf', { page, total }),
      gantt: {
        title: t('execucao.gantt.reportTitle'),
        subtitle: t('execucao.gantt.reportSubtitle'),
        generatedAt: t('execucao.gantt.generatedAt'),
        summaryTitle: t('execucao.gantt.reportSummaryTitle'),
        summaryTotalTasks: t('execucao.gantt.reportSummaryTotalTasks'),
        summaryAverageProgress: t('execucao.gantt.reportSummaryAverageProgress'),
        summaryTotalEstimateHours: t('execucao.gantt.reportSummaryTotalEstimateHours'),
        summaryPlannedRange: t('execucao.gantt.reportSummaryPlannedRange'),
        summaryRealRange: t('execucao.gantt.reportSummaryRealRange'),
        sequence: t('execucao.taskSequence'),
        task: t('execucao.gantt.task'),
        status: t('execucao.taskStatus'),
        priority: t('execucao.priority'),
        progress: t('execucao.percentualProgresso'),
        estimateHours: t('execucao.estimativaHoras'),
        plannedPeriod: t('execucao.gantt.planning'),
        realPeriod: t('execucao.gantt.execution'),
        resources: t('execucao.professional'),
        gantt: t('execucao.gantt.reportGantt'),
        plannedLegend: t('execucao.gantt.reportLegendPlanned'),
        realLegend: t('execucao.gantt.reportLegendReal'),
        notStartedLegend: t('execucao.gantt.reportLegendNotStarted'),
        noResources: t('execucao.noResourcesInTask'),
        pageOf: (page, total) => t('execucao.gantt.reportPageOf', { page, total }),
      },
    };
  }, [t]);

  const loadExecucao = useCallback(async () => {
    if (!id || Number.isNaN(id)) {
      setError(t('execucao.invalidId', 'ID da demanda inválido'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dem = await demandaService.findById(id);
      setDemanda(dem);

      let ex = await demandaExecucaoService.getByDemandaId(id);
      if (!ex) {
        if (!canCreateDemandaExecucao(dem.status ?? dem.situacao)) {
          setError(t('execucao.requiresStatusE'));
          setExecucao(null);
          return;
        }
        const today = format(new Date(), 'yyyy-MM-dd');
        ex = await demandaExecucaoService.create({
          demandaTecnicaId: id,
          dataInicioPlanejada: today,
          dataFimPlanejada: today,
          status: 'PLANEJADA',
          situacao: 'Normal',
          percentualProgresso: 0,
        });
      }
      setExecucao(ex);
    } catch (e: unknown) {
      const msg = getErrorMessage(e, t('common.errorMessage'));
      setError(msg);
      setExecucao(null);
      setDemanda(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadExecucao();
  }, [loadExecucao]);

  const formatDate = (dateStr: string) =>
    format(parseLocalDate(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const handleEditExecucaoSubmit = async (data: {
    dataInicioPlanejada: string;
    dataFimPlanejada: string;
    dataInicioReal?: string;
    dataFimReal?: string;
    status: string;
    percentualProgresso: number;
  }) => {
    if (!execucao) return;
    setSavingExecucao(true);
    try {
      await demandaExecucaoService.update(execucao.id, data);
      toast({ title: t('common.success'), description: t('execucao.execucaoUpdated', 'Execução atualizada.') });
      setEditExecucaoOpen(false);
      loadExecucao();
    } catch (e: unknown) {
      toast({
        title: t('common.error'),
        description: (e as Error)?.message ?? t('common.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setSavingExecucao(false);
    }
  };

  const handleDeleteExecucao = async () => {
    if (!execucao) return;
    setIsDeleting(true);
    try {
      await demandaExecucaoService.delete(execucao.id);
      toast({ title: t('common.success'), description: t('execucao.execucaoDeleted', 'Execução excluída.') });
      setDeleteExecucaoOpen(false);
      navigate('/execucao-demandas');
    } catch (e: unknown) {
      toast({
        title: t('common.error'),
        description: (e as Error)?.message ?? t('common.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChecklist = () => {
    navigate(`/execucao-demandas/${id}/checklist`);
  };

  const handleExportReport = useCallback(async () => {
    if (!id || Number.isNaN(id)) return;

    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) {
      window.alert(t('execucao.report.exportPdfPopupBlocked'));
      return;
    }

    pdfWindow.document.title = t('execucao.report.exportingPdf');
    pdfWindow.document.body.innerHTML = `<div style="font-family: Arial, sans-serif; padding: 16px;">${t(
      'execucao.report.exportingPdf',
    )}</div>`;

    setExportingReport(true);
    try {
      const reportData = await loadExecucaoReportData(id, {
        nome: user?.nome ?? t('common.unknown', 'Desconhecido'),
        email: user?.email,
      });
      const blob = await generateExecucaoDemandaReportPdfBlob(reportData, reportLabels);
      const url = URL.createObjectURL(blob);
      pdfWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      pdfWindow.close();
      console.error('Erro ao exportar relatório da execução:', e);
      toast({
        title: t('common.error'),
        description: getErrorMessage(e, t('execucao.report.exportPdfError')),
        variant: 'destructive',
      });
    } finally {
      setExportingReport(false);
    }
  }, [id, user, t, reportLabels, toast]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !execucao) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/execucao-demandas')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
        <p className="text-destructive">{error || t('execucao.notFound', 'Execução não encontrada.')}</p>
      </div>
    );
  }

  const hasTarefas = Array.isArray(execucao.tarefas) && execucao.tarefas.length > 0;
  const isExecucaoConcluida = execucao.status === 'CONCLUIDA';

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/execucao-demandas')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            className="gap-2"
            disabled={exportingReport}
          >
            <FileDown className="h-4 w-4" />
            {exportingReport ? t('execucao.report.exportingPdf') : t('execucao.report.exportPdf')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/execucao-demandas/${id}/gantt`)}
            className="gap-2"
            disabled={!hasTarefas}
          >
            <BarChart3 className="h-4 w-4" />
            {t('execucao.viewGantt', 'Ver Gantt')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenChecklist}
            className="gap-2"
            disabled={!user?.id || isExecucaoConcluida}
            title={t('execucao.openChecklistTitle', 'Abrir checklist de encerramento')}
          >
            <ClipboardCheck className="h-4 w-4" />
            {t('execucao.encerrar', 'Encerrar')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditExecucaoOpen(true)}
            className="gap-2"
            disabled={isExecucaoConcluida}
          >
            <Pencil className="h-4 w-4" />
            {t('common.edit')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteExecucaoOpen(true)}
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={isExecucaoConcluida}
          >
            <Trash2 className="h-4 w-4" />
            {t('common.delete')}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Coluna esquerda: Demanda, Status, Progresso */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-32 text-xs font-medium uppercase text-muted-foreground">
                {t('execucao.demandaTecnicaId', 'Demanda')}
              </span>
              <span className="font-mono">
                {execucao.demandaTecnicaId}
                {demanda?.codigo && (
                  <span className="ml-2 text-muted-foreground">({demanda.codigo})</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-xs font-medium uppercase text-muted-foreground">
                {t('execucao.status', 'Status')}
              </span>
              <span className="font-bold" style={{ color: '#001f3f' }}>
                {execucao.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-xs font-medium uppercase text-muted-foreground">
                {t('execucao.percentualProgresso', 'Progresso (%)')}
              </span>
              <span>{Number(execucao.percentualProgresso).toFixed(0)}%</span>
            </div>
          </div>

          {/* Coluna direita: Início/Fim planejado */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-40 text-xs font-medium uppercase text-muted-foreground">
                {t('execucao.dataInicioPlanejada', 'Início planejado')}
              </span>
              <span>{formatDate(toDateOnly(execucao.dataInicioPlanejada))}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-40 text-xs font-medium uppercase text-muted-foreground">
                {t('execucao.dataFimPlanejada', 'Fim planejado')}
              </span>
              <span>{formatDate(toDateOnly(execucao.dataFimPlanejada))}</span>
            </div>
            <div className="flex items-center gap-2 border-t border-border/60 pt-2">
              <span className="w-40 text-xs font-medium uppercase text-muted-foreground">
                {t('execucao.situacaoExecucao', 'Situação da execução')}
              </span>
              <span className="font-medium text-foreground">
                {execucao.situacao?.trim() ? execucao.situacao : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="tarefas" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tarefas">{t('execucao.tabTasks', 'Tarefas')}</TabsTrigger>
          <TabsTrigger value="dependencias">{t('execucao.tabDependencies', 'Dependências')}</TabsTrigger>
          <TabsTrigger value="recursos">{t('execucao.tabResources', 'Recursos')}</TabsTrigger>
          <TabsTrigger value="apontamentos">{t('execucao.tabProgress', 'Apontamentos')}</TabsTrigger>
        </TabsList>
        <TabsContent value="tarefas">
          <TarefasTab demandaExecucaoId={execucao.id} onRefresh={loadExecucao} readOnly={isExecucaoConcluida} />
        </TabsContent>
        <TabsContent value="dependencias">
          <DependenciasTab demandaExecucaoId={execucao.id} readOnly={isExecucaoConcluida} />
        </TabsContent>
        <TabsContent value="recursos">
          <RecursosTab demandaExecucaoId={execucao.id} demandaTecnicaId={id} readOnly={isExecucaoConcluida} />
        </TabsContent>
        <TabsContent value="apontamentos">
          <ApontamentosTab demandaExecucaoId={execucao.id} readOnly={isExecucaoConcluida} />
        </TabsContent>
      </Tabs>

      <ExecucaoFormModal
        open={editExecucaoOpen}
        onOpenChange={setEditExecucaoOpen}
        execucao={execucao}
        onSubmit={handleEditExecucaoSubmit}
        saving={savingExecucao}
      />

      <AlertDialog open={deleteExecucaoOpen} onOpenChange={setDeleteExecucaoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('execucao.confirmDeleteExecucao', 'Excluir execução?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('execucao.confirmDeleteExecucaoDescription', 'Esta ação não pode ser desfeita. A execução e todos os dados vinculados (tarefas, recursos, apontamentos) serão removidos.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExecucao}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
