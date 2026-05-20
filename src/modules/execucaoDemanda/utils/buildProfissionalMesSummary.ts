import type { DemandaExecucaoTarefaDTO } from '../types';

export const HOURS_PER_DAY = 8;

export type RecursoForMesSummary = {
  tarefaId: number;
  profissionalId: number;
  profissionalNome: string;
  horasExecutadas: number | null;
};

export interface ProfissionalMesReportRow {
  profissionalId: number;
  profissionalNome: string;
  mes: number;
  ano: number;
  mesAno: string;
  horasExecutadas: number;
}

export type MonthHoursSlice = { mes: number; ano: number; horas: number };

function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const part = String(value).split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  if ([y, m, d].some(Number.isNaN)) return null;
  return new Date(y, m - 1, d);
}

/** Período de execução da tarefa: datas reais, com fallback ao planejado. */
export function getTaskExecutionRange(
  tarefa: DemandaExecucaoTarefaDTO,
): { start: Date; end: Date } | null {
  const start =
    parseLocalDate(tarefa.dataInicioReal) ?? parseLocalDate(tarefa.dataInicioPlanejada);
  const end =
    parseLocalDate(tarefa.dataFimReal) ??
    parseLocalDate(tarefa.dataFimPlanejada) ??
    start;
  if (!start || !end) return null;

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (endDay.getTime() < startDay.getTime()) return null;
  return { start: startDay, end: endDay };
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function isSameMonthYear(start: Date, end: Date): boolean {
  return start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
}

/** Dias corridos (inclusive) do intervalo [rangeStart, rangeEnd] no mês civil. */
export function countDaysInMonthOverlap(
  rangeStart: Date,
  rangeEnd: Date,
  year: number,
  month: number,
): number {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const overlapStart = rangeStart > monthStart ? rangeStart : monthStart;
  const overlapEnd = rangeEnd < monthEnd ? rangeEnd : monthEnd;
  if (overlapEnd.getTime() < overlapStart.getTime()) return 0;

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / msPerDay) + 1;
}

/**
 * Mesmo mês/ano: usa horasExecutadas integralmente.
 * Período em vários meses: cada mês (exceto o último) recebe dias × 8h; o último recebe o restante.
 */
export function allocateHoursByMonth(
  horasExecutadas: number,
  start: Date,
  end: Date,
): MonthHoursSlice[] {
  if (horasExecutadas <= 0) return [];

  if (isSameMonthYear(start, end)) {
    return [
      {
        mes: start.getMonth() + 1,
        ano: start.getFullYear(),
        horas: roundHours(horasExecutadas),
      },
    ];
  }

  const result: MonthHoursSlice[] = [];
  let remaining = horasExecutadas;

  let year = start.getFullYear();
  let month = start.getMonth();
  const endYear = end.getFullYear();
  const endMonth = end.getMonth();

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const days = countDaysInMonthOverlap(start, end, year, month);
    if (days > 0) {
      const isLastMonth = year === endYear && month === endMonth;

      if (isLastMonth) {
        result.push({ mes: month + 1, ano: year, horas: roundHours(remaining) });
        remaining = 0;
      } else {
        const horas = roundHours(days * HOURS_PER_DAY);
        result.push({ mes: month + 1, ano: year, horas });
        remaining = roundHours(remaining - horas);
      }
    }

    if (remaining <= 0) break;

    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return result;
}

function formatMesAno(mes: number, ano: number): string {
  return `${String(mes).padStart(2, '0')}/${ano}`;
}

/**
 * Agrega horas executadas por profissional e mês/ano a partir de cada recurso.
 */
export function buildProfissionalMesSummary(
  tarefas: DemandaExecucaoTarefaDTO[],
  recursos: RecursoForMesSummary[],
): ProfissionalMesReportRow[] {
  const tarefaById = new Map(tarefas.map((t) => [t.id, t]));
  const aggregate = new Map<string, ProfissionalMesReportRow>();

  for (const recurso of recursos) {
    const horas = recurso.horasExecutadas ?? 0;
    if (horas <= 0) continue;

    const tarefa = tarefaById.get(recurso.tarefaId);
    if (!tarefa) continue;

    const range = getTaskExecutionRange(tarefa);
    if (!range) continue;

    const slices = allocateHoursByMonth(horas, range.start, range.end);
    for (const slice of slices) {
      const key = `${recurso.profissionalId}|${slice.ano}|${slice.mes}`;
      const existing = aggregate.get(key);
      if (existing) {
        existing.horasExecutadas = roundHours(existing.horasExecutadas + slice.horas);
      } else {
        aggregate.set(key, {
          profissionalId: recurso.profissionalId,
          profissionalNome: recurso.profissionalNome,
          mes: slice.mes,
          ano: slice.ano,
          mesAno: formatMesAno(slice.mes, slice.ano),
          horasExecutadas: slice.horas,
        });
      }
    }
  }

  return Array.from(aggregate.values()).sort((a, b) => {
    const nameCmp = a.profissionalNome.localeCompare(b.profissionalNome);
    if (nameCmp !== 0) return nameCmp;
    if (a.ano !== b.ano) return a.ano - b.ano;
    return a.mes - b.mes;
  });
}
