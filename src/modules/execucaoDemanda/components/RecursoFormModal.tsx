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
import type { Perfil, Profissional } from '@/types';

interface RecursoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurso: DemandaExecucaoTarefaRecursoDTO | null;
  profissionais: Profissional[];
  perfis: Perfil[];
  onSubmit: (data: {
    profissionalId: number;
    perfilId?: number;
    horasPlanejadas: number;
    horasExecutadas?: number;
  }) => Promise<void>;
  saving: boolean;
}

export function RecursoFormModal({
  open,
  onOpenChange,
  recurso,
  profissionais,
  perfis,
  onSubmit,
  saving,
}: RecursoFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!recurso;

  const [profissionalId, setProfissionalId] = useState<number>(0);
  const [perfilId, setPerfilId] = useState<number | null>(null);
  const [horasPlanejadas, setHorasPlanejadas] = useState<number>(0);
  const [horasExecutadasInput, setHorasExecutadasInput] = useState<string>('');

  useEffect(() => {
    if (open) {
      if (recurso) {
        setProfissionalId(recurso.profissionalId);
        setPerfilId(recurso.perfilId ?? null);
        setHorasPlanejadas(Number(recurso.horasPlanejadas) || 0);
        setHorasExecutadasInput(
          recurso.horasExecutadas != null ? String(Number(recurso.horasExecutadas)) : '',
        );
      } else {
        const firstProfissional = profissionais[0];
        setProfissionalId(firstProfissional?.id ?? 0);
        setPerfilId(firstProfissional?.perfilId ?? null);
        setHorasPlanejadas(0);
        setHorasExecutadasInput('');
      }
    }
  }, [open, recurso, profissionais]);

  useEffect(() => {
    if (!open || isEdit) return;
    const profissionalSelecionado = profissionais.find((p) => p.id === profissionalId);
    setPerfilId(profissionalSelecionado?.perfilId ?? null);
  }, [open, isEdit, profissionalId, profissionais]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profissionalId) return;
    const horasExecutadasParsed =
      horasExecutadasInput.trim() === '' ? undefined : Number(horasExecutadasInput);
    if (horasExecutadasParsed != null && (!Number.isFinite(horasExecutadasParsed) || horasExecutadasParsed < 0)) {
      return;
    }
    onSubmit({
      profissionalId,
      perfilId: perfilId ?? undefined,
      horasPlanejadas,
      horasExecutadas: horasExecutadasParsed,
    });
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
            <Label>{t('execucao.profile', 'Perfil')}</Label>
            <Select
              value={perfilId ? String(perfilId) : 'none'}
              onValueChange={(v) => setPerfilId(v === 'none' ? null : Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('common.notInformed', 'Não informado')}</SelectItem>
                {perfis.map((perfil) => (
                  <SelectItem key={perfil.id} value={String(perfil.id)}>
                    {perfil.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horasPlanejadas">{t('execucao.horasPlanejadas', 'Horas planejadas')}</Label>
              <Input
                id="horasPlanejadas"
                type="number"
                min={0}
                step={0.5}
                value={horasPlanejadas}
                onChange={(e) => setHorasPlanejadas(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horasExecutadas">{t('execucao.horasExecutadas', 'Horas executadas')}</Label>
              <Input
                id="horasExecutadas"
                type="number"
                min={0}
                step={0.5}
                value={horasExecutadasInput}
                onChange={(e) => setHorasExecutadasInput(e.target.value)}
                placeholder={t('common.optional', 'Opcional')}
              />
            </div>
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
