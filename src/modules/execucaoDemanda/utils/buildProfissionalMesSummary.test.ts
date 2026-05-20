import { describe, it, expect } from 'vitest';
import {
  allocateHoursByMonth,
  buildProfissionalMesSummary,
  countDaysInMonthOverlap,
  HOURS_PER_DAY,
} from './buildProfissionalMesSummary';
import type { DemandaExecucaoTarefaDTO } from '../types';

function d(y: number, m: number, day: number): Date {
  return new Date(y, m - 1, day);
}

describe('countDaysInMonthOverlap', () => {
  it('counts 4 days for 27/04/2026–30/04/2026 in April', () => {
    const start = d(2026, 4, 27);
    const end = d(2026, 4, 30);
    expect(countDaysInMonthOverlap(start, end, 2026, 3)).toBe(4);
  });
});

describe('allocateHoursByMonth', () => {
  it('uses full horasExecutadas when start and end are in the same month', () => {
    const slices = allocateHoursByMonth(40, d(2026, 3, 16), d(2026, 3, 20));
    expect(slices).toEqual([{ mes: 3, ano: 2026, horas: 40 }]);
  });

  it('allocates 32h in April and 13h in May for 27/04–08/05 with 45h total', () => {
    const slices = allocateHoursByMonth(45, d(2026, 4, 27), d(2026, 5, 8));
    expect(slices).toHaveLength(2);
    expect(slices[0]).toEqual({ mes: 4, ano: 2026, horas: 4 * HOURS_PER_DAY });
    expect(slices[1]).toEqual({ mes: 5, ano: 2026, horas: 13 });
    expect(slices.reduce((acc, s) => acc + s.horas, 0)).toBe(45);
  });

  it('puts remainder in the last month for Apr–May with 160h', () => {
    const start = d(2026, 4, 13);
    const end = d(2026, 5, 8);
    const aprilDays = countDaysInMonthOverlap(start, end, 2026, 3);
    const slices = allocateHoursByMonth(160, start, end);
    expect(slices).toEqual([
      { mes: 4, ano: 2026, horas: aprilDays * HOURS_PER_DAY },
      { mes: 5, ano: 2026, horas: 160 - aprilDays * HOURS_PER_DAY },
    ]);
    expect(slices.reduce((s, x) => s + x.horas, 0)).toBe(160);
  });
});

describe('buildProfissionalMesSummary', () => {
  const tarefaCrossMonth: DemandaExecucaoTarefaDTO = {
    id: 1,
    demandaExecucaoId: 1,
    titulo: 'Tarefa teste',
    status: 'EM_ANDAMENTO',
    prioridade: 'MEDIA',
    dataInicioPlanejada: '2026-04-27',
    dataFimPlanejada: '2026-05-08',
    dataInicioReal: '2026-04-27',
    dataFimReal: '2026-05-08',
    percentualProgresso: 50,
    estimativaHoras: 45,
    sequencia: 1,
  };

  it('aggregates two slices for same professional', () => {
    const rows = buildProfissionalMesSummary([tarefaCrossMonth], [
      {
        tarefaId: 1,
        profissionalId: 10,
        profissionalNome: 'Ana',
        horasExecutadas: 45,
      },
    ]);
    expect(rows).toHaveLength(2);
    const abril = rows.find((r) => r.mes === 4);
    const maio = rows.find((r) => r.mes === 5);
    expect(abril?.horasExecutadas).toBe(32);
    expect(maio?.horasExecutadas).toBe(13);
    expect(abril?.profissionalNome).toBe('Ana');
  });

  it('sums hours for same professional and month across resources', () => {
    const tarefa2: DemandaExecucaoTarefaDTO = {
      ...tarefaCrossMonth,
      id: 2,
      sequencia: 2,
      dataInicioReal: '2026-04-27',
      dataFimReal: '2026-04-30',
      dataInicioPlanejada: '2026-04-27',
      dataFimPlanejada: '2026-04-30',
    };
    const rows = buildProfissionalMesSummary([tarefaCrossMonth, tarefa2], [
      {
        tarefaId: 1,
        profissionalId: 10,
        profissionalNome: 'Ana',
        horasExecutadas: 45,
      },
      {
        tarefaId: 2,
        profissionalId: 10,
        profissionalNome: 'Ana',
        horasExecutadas: 16,
      },
    ]);
    const abril = rows.find((r) => r.mes === 4 && r.ano === 2026);
    expect(abril?.horasExecutadas).toBe(48);
  });
});

describe('Nicholas scenario (320h across 4 tasks)', () => {
  const mk = (
    id: number,
    seq: number,
    titulo: string,
    ini: string,
    fim: string,
    horas: number,
  ): { tarefa: DemandaExecucaoTarefaDTO; horas: number } => ({
    tarefa: {
      id,
      demandaExecucaoId: 1,
      titulo,
      status: 'CONCLUIDA',
      prioridade: 'MEDIA',
      dataInicioPlanejada: ini,
      dataFimPlanejada: fim,
      dataInicioReal: ini,
      dataFimReal: fim,
      percentualProgresso: 100,
      estimativaHoras: horas,
      sequencia: seq,
    },
    horas,
  });

  const items = [
    mk(1, 1, 'Fase de Discovery e Alinhamento', '2026-03-16', '2026-03-20', 40),
    mk(3, 3, 'Validação de protótipos e fluxo', '2026-04-06', '2026-04-14', 40),
    mk(5, 5, 'Desenvolvimento front-end', '2026-03-30', '2026-04-10', 80),
    mk(8, 8, 'Vinculação com APIs', '2026-04-13', '2026-05-08', 160),
  ];

  const tarefas = items.map((i) => i.tarefa);
  const recursos = items.map((i) => ({
    tarefaId: i.tarefa.id,
    profissionalId: 99,
    profissionalNome: 'Nicholas Antunes de Andrade',
    horasExecutadas: i.horas,
  }));

  it('sums all task hours to 320', () => {
    const rows = buildProfissionalMesSummary(tarefas, recursos);
    const total = rows.reduce((s, r) => s + r.horasExecutadas, 0);

    expect(items.reduce((s, i) => s + i.horas, 0)).toBe(320);
    expect(total).toBe(320);
    expect(rows.find((r) => r.mes === 3)?.horasExecutadas).toBe(56);
    expect(rows.find((r) => r.mes === 4)?.horasExecutadas).toBe(248);
    expect(rows.find((r) => r.mes === 5)?.horasExecutadas).toBe(16);
  });
});
