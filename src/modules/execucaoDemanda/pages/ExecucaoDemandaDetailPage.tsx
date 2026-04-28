import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Pencil, Trash2, BarChart3, ClipboardCheck } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { DemandaExecucaoDTO } from '../types';
import type { DemandaTecnica } from '@/types';
import { TarefasTab } from '../components/TarefasTab';
import { RecursosTab } from '@/modules/execucaoDemanda/components/RecursosTab';
import { ApontamentosTab } from '@/modules/execucaoDemanda/components/ApontamentosTab';
import { DependenciasTab } from '@/modules/execucaoDemanda/components/DependenciasTab';
import { ExecucaoFormModal } from '../components/ExecucaoFormModal';

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
  const { toast } = useToast();

  const loadExecucao = useCallback(async () => {
    if (!id || Number.isNaN(id)) {
      setError(t('execucao.invalidId', 'ID da demanda inválido'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let ex = await demandaExecucaoService.getByDemandaId(id);
      if (!ex) {
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
      const dem = await demandaService.findById(id);
      setDemanda(dem);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || t('common.errorMessage');
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
            disabled={!user?.id}
            title={t('execucao.openChecklistTitle', 'Abrir checklist de encerramento')}
          >
            <ClipboardCheck className="h-4 w-4" />
            {t('execucao.encerrar', 'Encerrar')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditExecucaoOpen(true)} className="gap-2">
            <Pencil className="h-4 w-4" />
            {t('common.edit')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteExecucaoOpen(true)} className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
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
          <TarefasTab demandaExecucaoId={execucao.id} onRefresh={loadExecucao} />
        </TabsContent>
        <TabsContent value="dependencias">
          <DependenciasTab demandaExecucaoId={execucao.id} />
        </TabsContent>
        <TabsContent value="recursos">
          <RecursosTab demandaExecucaoId={execucao.id} demandaTecnicaId={id} />
        </TabsContent>
        <TabsContent value="apontamentos">
          <ApontamentosTab demandaExecucaoId={execucao.id} />
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
