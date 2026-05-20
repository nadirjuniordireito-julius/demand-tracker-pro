import { format } from 'date-fns';
import { enUS, es, ptBR } from 'date-fns/locale';
import type { TFunction } from 'i18next';
import type { DemandaExecucaoTarefaDTO } from '../types';

const DATE_LOCALES: Record<string, typeof ptBR> = {
  pt: ptBR,
  'pt-BR': ptBR,
  en: enUS,
  'en-US': enUS,
  es,
  'es-ES': es,
};

function toDateOnly(iso: string): string {
  return String(iso).split('T')[0] || iso;
}

function parseLocalDate(dateStr: string): Date | null {
  const part = toDateOnly(dateStr);
  const [y, m, d] = part.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatTarefaDate(
  dateStr: string | null | undefined,
  language: string,
): string {
  if (!dateStr) return '—';
  const dt = parseLocalDate(dateStr);
  if (!dt) return '—';
  const locale = DATE_LOCALES[language] ?? DATE_LOCALES[language.split('-')[0]] ?? ptBR;
  return format(dt, 'dd/MM/yyyy', { locale });
}

/** Texto curto para busca / textValue do Select (Radix). */
export function getTarefaSelectTextValue(tarefa: DemandaExecucaoTarefaDTO): string {
  const seq = tarefa.sequencia != null ? String(tarefa.sequencia) : '';
  return seq ? `${seq}. ${tarefa.titulo}` : tarefa.titulo;
}

export function TarefaSelectOptionContent({
  tarefa,
  t,
  language,
}: {
  tarefa: DemandaExecucaoTarefaDTO;
  t: TFunction;
  language: string;
}) {
  const plannedStart = formatTarefaDate(tarefa.dataInicioPlanejada, language);
  const plannedEnd = formatTarefaDate(tarefa.dataFimPlanejada, language);
  const realStart = formatTarefaDate(tarefa.dataInicioReal, language);
  const realEnd = formatTarefaDate(tarefa.dataFimReal, language);

  return (
    <div className="flex flex-col gap-0.5 py-0.5 text-left">
      <span className="font-medium leading-snug">
        {tarefa.sequencia != null ? `${tarefa.sequencia}. ` : ''}
        {tarefa.titulo}
      </span>
      <span className="text-xs text-muted-foreground">
        {t('execucao.taskSelectPlannedRange', {
          start: plannedStart,
          end: plannedEnd,
          defaultValue: 'Prev.: {{start}} – {{end}}',
        })}
      </span>
      <span className="text-xs text-muted-foreground">
        {t('execucao.taskSelectRealRange', {
          start: realStart,
          end: realEnd,
          defaultValue: 'Real: {{start}} – {{end}}',
        })}
      </span>
    </div>
  );
}
