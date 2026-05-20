import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { useToast } from '@/hooks/use-toast';
import { tarefaService } from '../services/tarefaService';
import { apontamentoService } from '../services/apontamentoService';
import type { DemandaExecucaoTarefaDTO, DemandaExecucaoTarefaApontamentoProgressoDTO } from '../types';
import { ApontamentoFormModal } from './ApontamentoFormModal';
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

function toDateOnly(iso: string): string {
  return String(iso).split('T')[0] || iso;
}

/** Parsea "YYYY-MM-DD" como data local (evita dia a menos por UTC). */
function parseLocalDate(dateStr: string): Date {
  const part = toDateOnly(dateStr);
  const [y, m, d] = part.split('-').map(Number);
  return new Date(y, m - 1, d);
}

interface ApontamentosTabProps {
  demandaExecucaoId: number;
  readOnly?: boolean;
}

export function ApontamentosTab({ demandaExecucaoId, readOnly = false }: ApontamentosTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tarefas, setTarefas] = useState<DemandaExecucaoTarefaDTO[]>([]);
  const [selectedTarefaId, setSelectedTarefaId] = useState<number | null>(null);
  const [apontamentos, setApontamentos] = useState<DemandaExecucaoTarefaApontamentoProgressoDTO[]>([]);
  const [loadingTarefas, setLoadingTarefas] = useState(true);
  const [loadingApontamentos, setLoadingApontamentos] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedApontamento, setSelectedApontamento] = useState<DemandaExecucaoTarefaApontamentoProgressoDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTarefas = useCallback(async () => {
    setLoadingTarefas(true);
    try {
      const list = await tarefaService.listByExecucaoId(demandaExecucaoId);
      setTarefas(list);
      setSelectedTarefaId(list.length > 0 ? list[0].id : null);
    } catch (e) {
      toast({
        title: t('common.error'),
        description: (e as Error)?.message ?? t('common.errorMessage'),
        variant: 'destructive',
      });
    } finally {
      setLoadingTarefas(false);
    }
  }, [demandaExecucaoId, toast, t]);

  const loadApontamentos = useCallback(async () => {
    if (!selectedTarefaId) {
      setApontamentos([]);
      return;
    }
    setLoadingApontamentos(true);
    try {
      const list = await apontamentoService.listByTarefaId(selectedTarefaId);
      setApontamentos(list);
    } catch (e) {
      toast({
        title: t('common.error'),
        description: (e as Error)?.message ?? t('common.errorMessage'),
        variant: 'destructive',
      });
      setApontamentos([]);
    } finally {
      setLoadingApontamentos(false);
    }
  }, [selectedTarefaId, toast, t]);

  useEffect(() => {
    loadTarefas();
  }, [loadTarefas]);

  useEffect(() => {
    if (selectedTarefaId) loadApontamentos();
    else setApontamentos([]);
  }, [selectedTarefaId, loadApontamentos]);

  const handleAdd = () => {
    if (!selectedTarefaId) return;
    setSelectedApontamento(null);
    setFormOpen(true);
  };

  const handleEdit = (row: DemandaExecucaoTarefaApontamentoProgressoDTO) => {
    setSelectedApontamento(row);
    setFormOpen(true);
  };

  const handleDelete = (row: DemandaExecucaoTarefaApontamentoProgressoDTO) => {
    setSelectedApontamento(row);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (payload: { data: string; percentual: number; comentario: string }) => {
    if (!selectedTarefaId) return;
    setSaving(true);
    try {
      const dataStr = payload.data.includes('T') ? payload.data.split('T')[0] : payload.data;
      if (selectedApontamento) {
        await apontamentoService.update(selectedApontamento.id, {
          data: dataStr,
          percentual: payload.percentual,
          comentario: payload.comentario,
        });
        toast({ title: t('common.success'), description: t('execucao.apontamentoUpdated', 'Apontamento atualizado.') });
      } else {
        await apontamentoService.create({
          demandaExecucaoTarefaId: selectedTarefaId,
          data: dataStr,
          percentual: payload.percentual,
          comentario: payload.comentario,
        });
        toast({ title: t('common.success'), description: t('execucao.apontamentoCreated', 'Apontamento criado.') });
      }
      setFormOpen(false);
      loadApontamentos();
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
    if (!selectedApontamento) return;
    setDeleting(true);
    try {
      await apontamentoService.delete(selectedApontamento.id);
      toast({ title: t('common.success'), description: t('execucao.apontamentoDeleted', 'Apontamento excluído.') });
      setDeleteOpen(false);
      setSelectedApontamento(null);
      loadApontamentos();
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

  const formatDate = (dateStr: string) =>
    format(parseLocalDate(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const columns: Column<DemandaExecucaoTarefaApontamentoProgressoDTO>[] = [
    {
      key: 'data',
      label: t('execucao.date', 'Data'),
      render: (r) => formatDate(toDateOnly(r.data)),
      minWidth: '100px',
    },
    {
      key: 'percentual',
      label: t('execucao.percentualProgresso', 'Progresso (%)'),
      render: (r) => `${Number(r.percentual).toFixed(0)}%`,
      minWidth: '100px',
    },
    {
      key: 'comentario',
      label: t('execucao.comment', 'Comentário'),
      render: (r) => (r.comentario ? String(r.comentario).slice(0, 60) + (r.comentario.length > 60 ? '...' : '') : '—'),
      minWidth: '200px',
    },
  ];

  const actions: Action<DemandaExecucaoTarefaApontamentoProgressoDTO>[] = readOnly
    ? []
    : [
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Label>{t('execucao.selectTask', 'Tarefa')}</Label>
          <Select
            value={selectedTarefaId ? String(selectedTarefaId) : ''}
            onValueChange={(v) => setSelectedTarefaId(v ? Number(v) : null)}
            disabled={loadingTarefas || tarefas.length === 0}
          >
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder={t('execucao.selectTaskPlaceholder', 'Selecione uma tarefa')} />
            </SelectTrigger>
            <SelectContent>
              {tarefas.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={readOnly || !selectedTarefaId} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('execucao.newApontamento', 'Novo apontamento')}
        </Button>
      </div>

      {selectedTarefaId && (loadingApontamentos ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : (
        <DataTable
          data={apontamentos}
          columns={columns}
          actions={actions}
          getRowId={(r) => r.id}
          actionsLabel={t('common.actions')}
        />
      ))}

      <ApontamentoFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        apontamento={selectedApontamento}
        onSubmit={handleFormSubmit}
        saving={saving}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('execucao.confirmDeleteApontamento', 'Excluir este apontamento de progresso?')}
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
