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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import type { DemandaExecucaoTarefaDTO, TarefaStatus } from '../types';

function toDateOnly(iso: string): string {
  return String(iso).split('T')[0] || iso;
}

function parseLocalDate(str: string): Date | undefined {
  const [y, m, d] = str.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

interface TarefaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: DemandaExecucaoTarefaDTO | null;
  onSubmit: (data: {
    titulo: string;
    descricao?: string;
    status: TarefaStatus;
    prioridade: string;
    sequencia: number;
    dataInicioPlanejada: string;
    dataFimPlanejada: string;
    dataInicioReal?: string;
    dataFimReal?: string;
    percentualProgresso: number;
    estimativaHoras: number;
  }) => Promise<void>;
  saving: boolean;
}

const STATUS_OPTIONS: TarefaStatus[] = ['PLANEJADA', 'EM_ANDAMENTO', 'BLOQUEADA', 'CONCLUIDA'];
const PRIORIDADES = ['1', '2', '3', '4', '5'];

export function TarefaFormModal({ open, onOpenChange, tarefa, onSubmit, saving }: TarefaFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!tarefa;

  const getDefaultValues = () => {
    if (tarefa) {
      return {
        titulo: tarefa.titulo,
        descricao: tarefa.descricao ?? '',
        status: tarefa.status as TarefaStatus,
        prioridade: tarefa.prioridade || '3',
        sequencia: Number(tarefa.sequencia) || 1,
        dataInicioPlanejada: toDateOnly(tarefa.dataInicioPlanejada),
        dataFimPlanejada: toDateOnly(tarefa.dataFimPlanejada),
        dataInicioReal: tarefa.dataInicioReal ? toDateOnly(tarefa.dataInicioReal) : '',
        dataFimReal: tarefa.dataFimReal ? toDateOnly(tarefa.dataFimReal) : '',
        percentualProgresso: Number(tarefa.percentualProgresso) || 0,
        estimativaHoras: Number(tarefa.estimativaHoras) || 0,
      };
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      titulo: '',
      descricao: '',
      status: 'PLANEJADA' as TarefaStatus,
      prioridade: '3',
      sequencia: 1,
      dataInicioPlanejada: today,
      dataFimPlanejada: today,
      dataInicioReal: '',
      dataFimReal: '',
      percentualProgresso: 0,
      estimativaHoras: 0,
    };
  };

  const [form, setForm] = useState(getDefaultValues());

  useEffect(() => {
    if (open) setForm(getDefaultValues());
  }, [open, tarefa?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    onSubmit({
      titulo: form.titulo.trim(),
      descricao: form.descricao?.trim() || undefined,
      status: form.status,
      prioridade: form.prioridade,
      sequencia: form.sequencia,
      dataInicioPlanejada: form.dataInicioPlanejada,
      dataFimPlanejada: form.dataFimPlanejada,
      dataInicioReal: form.dataInicioReal || undefined,
      dataFimReal: form.dataFimReal || undefined,
      percentualProgresso: form.percentualProgresso,
      estimativaHoras: form.estimativaHoras,
    });
  };

  const dataInicioDate = parseLocalDate(form.dataInicioPlanejada);
  const dataFimDate = parseLocalDate(form.dataFimPlanejada);
  const dataInicioRealDate = form.dataInicioReal ? parseLocalDate(form.dataInicioReal) : undefined;
  const dataFimRealDate = form.dataFimReal ? parseLocalDate(form.dataFimReal) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('execucao.editTask', 'Editar tarefa') : t('execucao.newTask', 'Nova tarefa')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">{t('execucao.taskTitle', 'Título')} *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
              maxLength={500}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">{t('execucao.description', 'Descrição')}</Label>
            <Input
              id="descricao"
              value={form.descricao}
              onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('execucao.taskStatus', 'Status')}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v as TarefaStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`execucao.taskStatus.${s}`, s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('execucao.priority', 'Prioridade')}</Label>
              <Select
                value={form.prioridade}
                onValueChange={(v) => setForm((p) => ({ ...p, prioridade: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sequencia">{t('execucao.taskSequence', 'Sequência')}</Label>
            <Input
              id="sequencia"
              type="number"
              min={1}
              step={1}
              value={form.sequencia}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  sequencia: Math.max(1, Number(e.target.value) || 1),
                }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('execucao.dataInicioPlanejada', 'Início planejado')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !dataInicioDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicioDate ? format(dataInicioDate, 'dd/MM/yyyy', { locale: ptBR }) : t('common.select')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataInicioDate}
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
                    className={cn('w-full justify-start text-left font-normal', !dataFimDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFimDate ? format(dataFimDate, 'dd/MM/yyyy', { locale: ptBR }) : t('common.select')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataFimDate}
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
                    className={cn('w-full justify-start text-left font-normal', !dataInicioRealDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicioRealDate
                      ? format(dataInicioRealDate, 'dd/MM/yyyy', { locale: ptBR })
                      : t('common.optional')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataInicioRealDate}
                    onSelect={(d) =>
                      setForm((p) => ({ ...p, dataInicioReal: d ? format(d, 'yyyy-MM-dd') : '' }))
                    }
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
                    className={cn('w-full justify-start text-left font-normal', !dataFimRealDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFimRealDate
                      ? format(dataFimRealDate, 'dd/MM/yyyy', { locale: ptBR })
                      : t('common.optional')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataFimRealDate}
                    onSelect={(d) =>
                      setForm((p) => ({ ...p, dataFimReal: d ? format(d, 'yyyy-MM-dd') : '' }))
                    }
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="estimativa">{t('execucao.estimativaHoras', 'Est. horas')}</Label>
              <Input
                id="estimativa"
                type="number"
                min={0}
                step={0.5}
                value={form.estimativaHoras}
                onChange={(e) => setForm((p) => ({ ...p, estimativaHoras: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !form.titulo.trim()}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
