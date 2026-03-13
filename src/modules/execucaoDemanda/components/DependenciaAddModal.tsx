import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DemandaExecucaoTarefaDTO } from '../types';

interface DependenciaAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefas: DemandaExecucaoTarefaDTO[];
  selectedTarefaTitulo?: string;
  onSubmit: (tarefaOrigemId: number) => Promise<void>;
  saving: boolean;
}

export function DependenciaAddModal({
  open,
  onOpenChange,
  tarefas,
  selectedTarefaTitulo,
  onSubmit,
  saving,
}: DependenciaAddModalProps) {
  const { t } = useTranslation();
  const [tarefaOrigemId, setTarefaOrigemId] = useState<number>(0);

  useEffect(() => {
    if (open) setTarefaOrigemId(tarefas[0]?.id ?? 0);
  }, [open, tarefas]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarefaOrigemId) return;
    onSubmit(tarefaOrigemId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('execucao.addDependencia', 'Adicionar dependência')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedTarefaTitulo && (
            <p className="text-sm text-muted-foreground">
              {t('execucao.addDependenciaHint', 'A tarefa "{{titulo}}" dependerá da tarefa escolhida (que deverá ser concluída antes).', { titulo: selectedTarefaTitulo })}
            </p>
          )}
          <div className="space-y-2">
            <Label>{t('execucao.dependsOnTask', 'Depende da tarefa')}</Label>
            <Select
              value={tarefaOrigemId ? String(tarefaOrigemId) : ''}
              onValueChange={(v) => setTarefaOrigemId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {tarefas.map((ta) => (
                  <SelectItem key={ta.id} value={String(ta.id)}>
                    {ta.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !tarefaOrigemId}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
