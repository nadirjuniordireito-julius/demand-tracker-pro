import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { tarefaService } from '../services/tarefaService';
import { dependenciaService } from '../services/dependenciaService';
import type { DemandaExecucaoTarefaDTO, DemandaExecucaoTarefaDependenciaDTO } from '../types';
import { DependenciaAddModal } from './DependenciaAddModal';
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

interface DependenciasTabProps {
  demandaExecucaoId: number;
}

export function DependenciasTab({ demandaExecucaoId }: DependenciasTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tarefas, setTarefas] = useState<DemandaExecucaoTarefaDTO[]>([]);
  const [selectedTarefaId, setSelectedTarefaId] = useState<number | null>(null);
  const [dependenciasDestino, setDependenciasDestino] = useState<DemandaExecucaoTarefaDependenciaDTO[]>([]);
  const [dependenciasOrigem, setDependenciasOrigem] = useState<DemandaExecucaoTarefaDependenciaDTO[]>([]);
  const [loadingTarefas, setLoadingTarefas] = useState(true);
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedDep, setSelectedDep] = useState<DemandaExecucaoTarefaDependenciaDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTarefas = useCallback(async () => {
    setLoadingTarefas(true);
    try {
      const list = await tarefaService.listByExecucaoId(demandaExecucaoId);
      setTarefas(list);
      if (list.length > 0 && !selectedTarefaId) setSelectedTarefaId(list[0].id);
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

  const loadDependencias = useCallback(async () => {
    if (!selectedTarefaId) {
      setDependenciasDestino([]);
      setDependenciasOrigem([]);
      return;
    }
    setLoadingDeps(true);
    try {
      const [porDestino, porOrigem] = await Promise.all([
        dependenciaService.listByTarefaDestino(selectedTarefaId),
        dependenciaService.listByTarefaOrigem(selectedTarefaId),
      ]);
      setDependenciasDestino(porDestino);
      setDependenciasOrigem(porOrigem);
    } catch (e) {
      toast({
        title: t('common.error'),
        description: (e as Error)?.message ?? t('common.errorMessage'),
        variant: 'destructive',
      });
      setDependenciasDestino([]);
      setDependenciasOrigem([]);
    } finally {
      setLoadingDeps(false);
    }
  }, [selectedTarefaId, toast, t]);

  useEffect(() => {
    loadTarefas();
  }, [loadTarefas]);

  useEffect(() => {
    if (selectedTarefaId) loadDependencias();
    else {
      setDependenciasDestino([]);
      setDependenciasOrigem([]);
    }
  }, [selectedTarefaId, loadDependencias]);

  const getTitulo = (tarefaId: number) => tarefas.find((t) => t.id === tarefaId)?.titulo ?? `#${tarefaId}`;

  const handleAddDependencia = async (tarefaOrigemId: number) => {
    if (!selectedTarefaId) return;
    if (tarefaOrigemId === selectedTarefaId) {
      toast({
        title: t('common.error'),
        description: t('execucao.dependenciaSameTask', 'A tarefa não pode depender de si mesma.'),
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await dependenciaService.create(tarefaOrigemId, selectedTarefaId);
      toast({ title: t('common.success'), description: t('execucao.dependenciaAdded', 'Dependência adicionada.') });
      setAddOpen(false);
      loadDependencias();
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

  const handleDelete = (dep: DemandaExecucaoTarefaDependenciaDTO) => {
    setSelectedDep(dep);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDep) return;
    setDeleting(true);
    try {
      await dependenciaService.delete(selectedDep.id);
      toast({ title: t('common.success'), description: t('execucao.dependenciaDeleted', 'Dependência removida.') });
      setDeleteOpen(false);
      setSelectedDep(null);
      loadDependencias();
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

  const selectedTarefa = tarefas.find((t) => t.id === selectedTarefaId);
  const tarefasParaOrigem = tarefas.filter((t) => t.id !== selectedTarefaId);
  const jaDependeIds = new Set(dependenciasDestino.map((d) => d.tarefaOrigemId));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label>{t('execucao.selectTask', 'Tarefa')}</Label>
          <Select
            value={selectedTarefaId ? String(selectedTarefaId) : ''}
            onValueChange={(v) => setSelectedTarefaId(v ? Number(v) : null)}
            disabled={loadingTarefas || tarefas.length === 0}
          >
            <SelectTrigger className="w-full sm:w-[320px]">
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
        <Button
          onClick={() => setAddOpen(true)}
          disabled={!selectedTarefaId || tarefasParaOrigem.length === 0}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('execucao.addDependencia', 'Adicionar dependência')}
        </Button>
      </div>

      {!selectedTarefaId && (
        <p className="text-sm text-muted-foreground">{t('execucao.selectTaskToSeeDependencies', 'Selecione uma tarefa para ver e gerenciar dependências.')}</p>
      )}

      {selectedTarefaId && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">{t('execucao.thisTaskDependsOn', 'Esta tarefa depende de')}</h3>
            {loadingDeps ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : dependenciasDestino.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('execucao.noDependencies', 'Nenhuma dependência. Adicione tarefas que devem ser concluídas antes desta.')}</p>
            ) : (
              <ul className="border rounded-lg divide-y divide-border">
                {dependenciasDestino.map((dep) => (
                  <li key={dep.id} className="flex items-center justify-between px-3 py-2">
                    <span>{getTitulo(dep.tarefaOrigemId)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(dep)} aria-label={t('common.delete')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">{t('execucao.tasksThatDependOnThis', 'Tarefas que dependem desta')}</h3>
            {loadingDeps ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : dependenciasOrigem.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('execucao.noTasksDependOnThis', 'Nenhuma tarefa depende desta.')}</p>
            ) : (
              <ul className="border rounded-lg divide-y divide-border">
                {dependenciasOrigem.map((dep) => (
                  <li key={dep.id} className="px-3 py-2">
                    <span>{getTitulo(dep.tarefaDestinoId)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <DependenciaAddModal
        open={addOpen}
        onOpenChange={setAddOpen}
        tarefas={tarefasParaOrigem.filter((t) => !jaDependeIds.has(t.id))}
        selectedTarefaTitulo={selectedTarefa?.titulo}
        onSubmit={handleAddDependencia}
        saving={saving}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('execucao.confirmDeleteDependencia', 'Remover dependência?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDep
                ? t('execucao.confirmDeleteDependenciaDescription', 'A tarefa selecionada deixará de depender de "{{titulo}}".', {
                    titulo: getTitulo(selectedDep.tarefaOrigemId),
                  })
                : t('common.confirmDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
