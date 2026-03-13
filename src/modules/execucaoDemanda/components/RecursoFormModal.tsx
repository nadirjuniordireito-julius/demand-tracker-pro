import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DemandaExecucaoTarefaRecursoDTO } from '../types';
import type { Profissional } from '@/types';

interface RecursoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurso: DemandaExecucaoTarefaRecursoDTO | null;
  profissionais: Profissional[];
  onSubmit: (data: { profissionalId: number; horasPlanejadas: number }) => Promise<void>;
  saving: boolean;
}

export function RecursoFormModal({ open, onOpenChange, recurso, profissionais, onSubmit, saving }: RecursoFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!recurso;

  const [profissionalId, setProfissionalId] = useState<number>(0);
  const [horasPlanejadas, setHorasPlanejadas] = useState<number>(0);

  useEffect(() => {
    if (open) {
      if (recurso) {
        setProfissionalId(recurso.profissionalId);
        setHorasPlanejadas(Number(recurso.horasPlanejadas) || 0);
      } else {
        setProfissionalId(profissionais[0]?.id ?? 0);
        setHorasPlanejadas(0);
      }
    }
  }, [open, recurso, profissionais]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profissionalId) return;
    onSubmit({ profissionalId, horasPlanejadas });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('execucao.editResource', 'Editar recurso') : t('execucao.addProfessional', 'Adicionar profissional')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('execucao.professional', 'Profissional')}</Label>
            <Select
              value={profissionalId ? String(profissionalId) : ''}
              onValueChange={(v) => setProfissionalId(Number(v))}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit && <p className="text-xs text-muted-foreground">{t('execucao.cannotChangeProfessional', 'Não é possível alterar o profissional ao editar.')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="horas">{t('execucao.horasPlanejadas', 'Horas planejadas')}</Label>
            <Input
              id="horas"
              type="number"
              min={0}
              step={0.5}
              value={horasPlanejadas}
              onChange={(e) => setHorasPlanejadas(Number(e.target.value) || 0)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || (!isEdit && !profissionalId)}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
