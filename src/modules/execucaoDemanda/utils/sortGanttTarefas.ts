import type { DemandaExecucaoGanttTarefaDTO } from '../types';

function parsePlannedStartMs(dateStr: string): number {
  const part = String(dateStr).split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return 0;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export function compareGanttTarefas(
  a: DemandaExecucaoGanttTarefaDTO,
  b: DemandaExecucaoGanttTarefaDTO,
): number {
  const seqDiff = (Number(a.sequencia) || 0) - (Number(b.sequencia) || 0);
  if (seqDiff !== 0) return seqDiff;

  const startDiff =
    parsePlannedStartMs(a.dataInicioPlanejada) - parsePlannedStartMs(b.dataInicioPlanejada);
  if (startDiff !== 0) return startDiff;

  return a.id - b.id;
}

/** Ordena tarefas do Gantt: sequência → início planejado → id (estável). */
export function sortGanttTarefas(
  tarefas: DemandaExecucaoGanttTarefaDTO[],
): DemandaExecucaoGanttTarefaDTO[] {
  return [...tarefas].sort(compareGanttTarefas);
}
