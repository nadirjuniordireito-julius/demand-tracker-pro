import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import type { DemandaExecucaoTarefaApontamentoProgressoDTO } from '../types';

function toDateOnly(iso: string): string {
  return String(iso).split('T')[0] || iso;
}

function parseLocalDate(str: string): Date | undefined {
  const [y, m, d] = str.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

interface ApontamentoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apontamento: DemandaExecucaoTarefaApontamentoProgressoDTO | null;
  onSubmit: (data: { data: string; percentual: number; comentario: string }) => Promise<void>;
  saving: boolean;
}

export function ApontamentoFormModal({ open, onOpenChange, apontamento, onSubmit, saving }: ApontamentoFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!apontamento;

  const getDefaultValues = () => {
    if (apontamento) {
      return {
        data: toDateOnly(apontamento.data),
        percentual: Number(apontamento.percentual) || 0,
        comentario: apontamento.comentario ?? '',
      };
    }
    return {
      data: format(new Date(), 'yyyy-MM-dd'),
      percentual: 0,
      comentario: '',
    };
  };

  const [form, setForm] = useState(getDefaultValues());

  useEffect(() => {
    if (open) setForm(getDefaultValues());
  }, [open, apontamento?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.comentario.trim()) return;
    onSubmit({
      data: form.data,
      percentual: form.percentual,
      comentario: form.comentario.trim(),
    });
  };

  const dataDate = parseLocalDate(form.data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('execucao.editApontamento', 'Editar apontamento') : t('execucao.newApontamento', 'Novo apontamento')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('execucao.date', 'Data')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !dataDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataDate ? format(dataDate, 'dd/MM/yyyy', { locale: ptBR }) : t('common.select')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dataDate}
                  onSelect={(d) => d && setForm((p) => ({ ...p, data: format(d, 'yyyy-MM-dd') }))}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="percentual">{t('execucao.percentualProgresso', 'Progresso (%)')}</Label>
            <Input
              id="percentual"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.percentual}
              onChange={(e) => setForm((p) => ({ ...p, percentual: Number(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comentario">{t('execucao.comment', 'Comentário')} *</Label>
            <Input
              id="comentario"
              value={form.comentario}
              onChange={(e) => setForm((p) => ({ ...p, comentario: e.target.value }))}
              maxLength={9000}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !form.comentario.trim()}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
