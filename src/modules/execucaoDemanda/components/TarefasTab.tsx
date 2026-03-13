import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageComponents';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { TableSkeleton } from '@/components/common/LoadingStates';
import { useToast } from '@/hooks/use-toast';
import { tarefaService } from '../services/tarefaService';
import type { DemandaExecucaoTarefaDTO, TarefaStatus } from '../types';
import { TarefaFormModal } from './TarefaFormModal';
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

const STATUS_OPTIONS: TarefaStatus[] = ['PLANEJADA', 'EM_ANDAMENTO', 'BLOQUEADA', 'CONCLUIDA'];

function toDateOnly(iso: string): string {
  return String(iso).split('T')[0] || iso;
}

/** Parsea "YYYY-MM-DD" como data local (evita dia a menos por UTC). */
function parseLocalDate(dateStr: string): Date {
  const part = toDateOnly(dateStr);
  const [y, m, d] = part.split('-').map(Number);
  return new Date(y, m - 1, d);
}

interface TarefasTabProps {
  demandaExecucaoId: number;
  onRefresh?: () => void;
}

export function TarefasTab({ demandaExecucaoId, onRefresh }: TarefasTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tarefas, setTarefas] = useState<DemandaExecucaoTarefaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<DemandaExecucaoTarefaDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTarefas = useCallback(async () => {
    setLoading(true);
    try {
      const list = await tarefaService.listByExecucaoId(demandaExecucaoId);
      setTarefas(list);
    } catch (e) {
      toast({
        title: t('common.error'),
        description: (e as Error)?.message ?? t('common.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [demandaExecucaoId, toast, t]);

  useEffect(() => {
    loadTarefas();
  }, [loadTarefas]);

  const formatDate = (dateStr: string) =>
    format(parseLocalDate(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const handleAdd = () => {
    setSelected(null);
    setFormOpen(true);
  };

  const handleEdit = (row: DemandaExecucaoTarefaDTO) => {
    setSelected(row);
    setFormOpen(true);
  };

  const handleDelete = (row: DemandaExecucaoTarefaDTO) => {
    setSelected(row);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (payload: {
    titulo: string;
    descricao?: string;
    status: TarefaStatus;
    prioridade: string;
    dataInicioPlanejada: string;
    dataFimPlanejada: string;
    dataInicioReal?: string;
    dataFimReal?: string;
    percentualProgresso: number;
    estimativaHoras: number;
  }) => {
    setSaving(true);
    try {
      const dataInicio = toDateOnly(payload.dataInicioPlanejada);
      const dataFim = toDateOnly(payload.dataFimPlanejada);
      const dataInicioReal = payload.dataInicioReal ? toDateOnly(payload.dataInicioReal) : undefined;
      const dataFimReal = payload.dataFimReal ? toDateOnly(payload.dataFimReal) : undefined;
      if (selected) {
        await tarefaService.update(selected.id, {
          titulo: payload.titulo,
          descricao: payload.descricao,
          status: payload.status,
          prioridade: payload.prioridade,
          dataInicioPlanejada: dataInicio,
          dataFimPlanejada: dataFim,
          dataInicioReal,
          dataFimReal,
          percentualProgresso: payload.percentualProgresso,
          estimativaHoras: payload.estimativaHoras,
        });
        toast({ title: t('common.success'), description: t('execucao.taskUpdated', 'Tarefa atualizada.') });
      } else {
        await tarefaService.create({
          demandaExecucaoId,
          titulo: payload.titulo,
          descricao: payload.descricao,
          status: payload.status,
          prioridade: payload.prioridade,
          dataInicioPlanejada: dataInicio,
          dataFimPlanejada: dataFim,
          dataInicioReal,
          dataFimReal,
          percentualProgresso: payload.percentualProgresso,
          estimativaHoras: payload.estimativaHoras,
        });
        toast({ title: t('common.success'), description: t('execucao.taskCreated', 'Tarefa criada.') });
      }
      setFormOpen(false);
      loadTarefas();
      onRefresh?.();
    } catch (e) {
      toast({
        title: t('common.error'),
        description: (e as Error)?.message ?? t('common.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await tarefaService.delete(selected.id);
      toast({ title: t('common.success'), description: t('execucao.taskDeleted', 'Tarefa excluída.') });
      setDeleteOpen(false);
      setSelected(null);
      loadTarefas();
      onRefresh?.();
    } catch (e) {
      toast({
        title: t('common.error'),
        description: (e as Error)?.message ?? t('common.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<DemandaExecucaoTarefaDTO>[] = [
    { key: 'titulo', label: t('execucao.taskTitle', 'Título'), minWidth: '180px' },
    { key: 'status', label: t('execucao.taskStatus', 'Status'), minWidth: '120px' },
    { key: 'prioridade', label: t('execucao.priority', 'Prioridade'), minWidth: '80px' },
    {
      key: 'dataInicioPlanejada',
      label: t('execucao.dataInicioPlanejada', 'Início planejado'),
      render: (r) => formatDate(toDateOnly(r.dataInicioPlanejada)),
      minWidth: '110px',
    },
    {
      key: 'dataFimPlanejada',
      label: t('execucao.dataFimPlanejada', 'Fim planejado'),
      render: (r) => formatDate(toDateOnly(r.dataFimPlanejada)),
      minWidth: '110px',
    },
    {
      key: 'percentualProgresso',
      label: t('execucao.percentualProgresso', 'Progresso (%)'),
      render: (r) => `${Number(r.percentualProgresso).toFixed(0)}%`,
      minWidth: '90px',
    },
    {
      key: 'estimativaHoras',
      label: t('execucao.estimativaHoras', 'Est. horas'),
      render: (r) => Number(r.estimativaHoras).toFixed(1),
      minWidth: '80px',
    },
  ];

  const actions: Action<DemandaExecucaoTarefaDTO>[] = [
    { label: t('common.edit'), icon: <Edit className="h-4 w-4" />, onClick: handleEdit },
    {
      label: t('common.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive',
      separator: true,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={''}
        onAdd={handleAdd}
        addLabel={t('execucao.newTask', 'Nova tarefa')}
      />
      {loading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : (
        <DataTable
          data={tarefas}
          columns={columns}
          actions={actions}
          getRowId={(r) => r.id}
          actionsLabel={t('common.actions')}
        />
      )}
      <TarefaFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        tarefa={selected}
        onSubmit={handleFormSubmit}
        saving={saving}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selected?.titulo
                ? t('execucao.confirmDeleteTask', 'Excluir a tarefa "{{titulo}}"?', { titulo: selected.titulo })
                : t('common.confirmDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
