import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { recursoService } from '../services/recursoService';
import { profissionalService } from '@/services/profissionalService';
import { useProject } from '@/contexts/ProjectContext';
import type { DemandaExecucaoTarefaDTO, DemandaExecucaoTarefaRecursoDTO } from '../types';
import type { Profissional } from '@/types';
import { RecursoFormModal } from './RecursoFormModal';
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

interface RecursosTabProps {
  demandaExecucaoId: number;
}

export function RecursosTab({ demandaExecucaoId }: RecursosTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const [tarefas, setTarefas] = useState<DemandaExecucaoTarefaDTO[]>([]);
  const [selectedTarefaId, setSelectedTarefaId] = useState<number | null>(null);
  const [recursos, setRecursos] = useState<DemandaExecucaoTarefaRecursoDTO[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loadingTarefas, setLoadingTarefas] = useState(true);
  const [loadingRecursos, setLoadingRecursos] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRecurso, setSelectedRecurso] = useState<DemandaExecucaoTarefaRecursoDTO | null>(null);
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

  const loadRecursos = useCallback(async () => {
    if (!selectedTarefaId) {
      setRecursos([]);
      return;
    }
    setLoadingRecursos(true);
    try {
      const list = await recursoService.listByTarefaId(selectedTarefaId);
      setRecursos(list);
    } catch (e) {
      toast({
        title: t('common.error'),
        description: (e as Error)?.message ?? t('common.errorMessage'),
        variant: 'destructive',
      });
      setRecursos([]);
    } finally {
      setLoadingRecursos(false);
    }
  }, [selectedTarefaId, toast, t]);

  const loadProfissionais = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const res = await profissionalService.findAll({ projetoId: selectedProject.id, size: 500 });
      setProfissionais(res.content);
    } catch (e) {
      setProfissionais([]);
    }
  }, [selectedProject]);

  useEffect(() => {
    loadTarefas();
  }, [loadTarefas]);

  useEffect(() => {
    if (selectedTarefaId) loadRecursos();
    else setRecursos([]);
  }, [selectedTarefaId, loadRecursos]);

  useEffect(() => {
    if (formOpen) loadProfissionais();
  }, [formOpen, loadProfissionais]);

  const handleAdd = () => {
    if (!selectedTarefaId) return;
    setSelectedRecurso(null);
    setFormOpen(true);
  };

  const handleEdit = (row: DemandaExecucaoTarefaRecursoDTO) => {
    setSelectedRecurso(row);
    setFormOpen(true);
  };

  const handleDelete = (row: DemandaExecucaoTarefaRecursoDTO) => {
    setSelectedRecurso(row);
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (payload: { profissionalId: number; horasPlanejadas: number }) => {
    if (!selectedTarefaId) return;
    setSaving(true);
    try {
      if (selectedRecurso) {
        await recursoService.update(selectedRecurso.id, {
          profissionalId: payload.profissionalId,
          horasPlanejadas: payload.horasPlanejadas,
        });
        toast({ title: t('common.success'), description: t('execucao.resourceUpdated', 'Recurso atualizado.') });
      } else {
        await recursoService.create({
          demandaExecucaoTarefaId: selectedTarefaId,
          profissionalId: payload.profissionalId,
          horasPlanejadas: payload.horasPlanejadas,
        });
        toast({ title: t('common.success'), description: t('execucao.resourceAdded', 'Recurso adicionado.') });
      }
      setFormOpen(false);
      loadRecursos();
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
    if (!selectedRecurso) return;
    setDeleting(true);
    try {
      await recursoService.delete(selectedRecurso.id);
      toast({ title: t('common.success'), description: t('execucao.resourceDeleted', 'Recurso removido.') });
      setDeleteOpen(false);
      setSelectedRecurso(null);
      loadRecursos();
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

  const columns: Column<DemandaExecucaoTarefaRecursoDTO>[] = [
    {
      key: 'profissional',
      label: t('execucao.professional', 'Profissional'),
      render: (r) => r.profissional?.nome ?? r.profissionalId,
      minWidth: '180px',
    },
    {
      key: 'horasPlanejadas',
      label: t('execucao.horasPlanejadas', 'Horas planejadas'),
      render: (r) => Number(r.horasPlanejadas).toFixed(1),
      minWidth: '120px',
    },
  ];

  const actions: Action<DemandaExecucaoTarefaRecursoDTO>[] = [
    { label: t('common.edit'), icon: <Edit className="h-4 w-4" />, onClick: handleEdit },
    {
      label: t('common.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive',
      separator: true,
    },
  ];

  const selectedTarefa = tarefas.find((t) => t.id === selectedTarefaId);

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
        <Button onClick={handleAdd} disabled={!selectedTarefaId} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('execucao.addProfessional', 'Adicionar profissional')}
        </Button>
      </div>

      {!selectedProject && (
        <p className="text-sm text-muted-foreground">{t('execucao.selectProjectForProfessionals', 'Selecione um projeto para listar profissionais.')}</p>
      )}
      {selectedTarefaId && (loadingRecursos ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : (
        <DataTable
          data={recursos}
          columns={columns}
          actions={actions}
          getRowId={(r) => r.id}
          actionsLabel={t('common.actions')}
        />
      ))}

      <RecursoFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        recurso={selectedRecurso}
        profissionais={profissionais}
        onSubmit={handleFormSubmit}
        saving={saving}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRecurso?.profissional?.nome
                ? t('execucao.confirmDeleteResource', 'Remover "{{nome}}" desta tarefa?', { nome: selectedRecurso.profissional.nome })
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
