import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import type { DemandaExecucaoDTO } from '../types';

function toDateOnly(iso: string): string {
  return String(iso).split('T')[0] || iso;
}

function parseLocalDate(str: string): Date | undefined {
  const [y, m, d] = str.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

const STATUS_OPTIONS = ['PLANEJADA', 'EM_ANDAMENTO', 'BLOQUEADA', 'CONCLUIDA'];

interface ExecucaoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execucao: DemandaExecucaoDTO;
  onSubmit: (data: {
    dataInicioPlanejada: string;
    dataFimPlanejada: string;
    dataInicioReal?: string;
    dataFimReal?: string;
    status: string;
    percentualProgresso: number;
  }) => Promise<void>;
  saving: boolean;
}

export function ExecucaoFormModal({ open, onOpenChange, execucao, onSubmit, saving }: ExecucaoFormModalProps) {
  const { t } = useTranslation();

  const getDefaultValues = () => ({
    dataInicioPlanejada: toDateOnly(execucao.dataInicioPlanejada),
    dataFimPlanejada: toDateOnly(execucao.dataFimPlanejada),
    dataInicioReal: execucao.dataInicioReal ? toDateOnly(execucao.dataInicioReal) : '',
    dataFimReal: execucao.dataFimReal ? toDateOnly(execucao.dataFimReal) : '',
    status: execucao.status || 'PLANEJADA',
    percentualProgresso: Number(execucao.percentualProgresso) || 0,
  });

  const [form, setForm] = useState(getDefaultValues());

  useEffect(() => {
    if (open && execucao.id) setForm(getDefaultValues());
  }, [open, execucao.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      dataInicioPlanejada: form.dataInicioPlanejada,
      dataFimPlanejada: form.dataFimPlanejada,
      dataInicioReal: form.dataInicioReal || undefined,
      dataFimReal: form.dataFimReal || undefined,
      status: form.status,
      percentualProgresso: form.percentualProgresso,
    });
  };

  const dateInicioPlanejada = parseLocalDate(form.dataInicioPlanejada);
  const dateFimPlanejada = parseLocalDate(form.dataFimPlanejada);
  const dateInicioReal = form.dataInicioReal ? parseLocalDate(form.dataInicioReal) : undefined;
  const dateFimReal = form.dataFimReal ? parseLocalDate(form.dataFimReal) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('execucao.editExecucao', 'Editar execução')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('execucao.dataInicioPlanejada', 'Início planejado')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !dateInicioPlanejada && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateInicioPlanejada ? format(dateInicioPlanejada, 'dd/MM/yyyy', { locale: ptBR }) : t('common.select')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateInicioPlanejada}
                    onSelect={(d) => d && setForm((p) => ({ ...p, dataInicioPlanejada: format(d, 'yyyy-MM-dd') }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t('execucao.dataFimPlanejada', 'Fim planejado')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !dateFimPlanejada && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFimPlanejada ? format(dateFimPlanejada, 'dd/MM/yyyy', { locale: ptBR }) : t('common.select')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFimPlanejada}
                    onSelect={(d) => d && setForm((p) => ({ ...p, dataFimPlanejada: format(d, 'yyyy-MM-dd') }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('execucao.dataInicioReal', 'Início real')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !dateInicioReal && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateInicioReal ? format(dateInicioReal, 'dd/MM/yyyy', { locale: ptBR }) : t('common.optional')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateInicioReal}
                    onSelect={(d) => setForm((p) => ({ ...p, dataInicioReal: d ? format(d, 'yyyy-MM-dd') : '' }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t('execucao.dataFimReal', 'Fim real')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !dateFimReal && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFimReal ? format(dateFimReal, 'dd/MM/yyyy', { locale: ptBR }) : t('common.optional')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFimReal}
                    onSelect={(d) => setForm((p) => ({ ...p, dataFimReal: d ? format(d, 'yyyy-MM-dd') : '' }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('execucao.status', 'Status')}</Label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {t(`execucao.execucaoStatus.${s}`, s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="percentual">{t('execucao.percentualProgresso', 'Progresso (%)')}</Label>
              <Input
                id="percentual"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.percentualProgresso}
                onChange={(e) => setForm((p) => ({ ...p, percentualProgresso: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
