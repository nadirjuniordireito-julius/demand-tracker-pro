import { profissionalService } from '@/services/profissionalService';
import type { ProfissionalAnaliseResumidaDTO } from '../types';

const MONTH_ABBR_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

export function formatPeriodoMesAno(mes: number, ano: number): string {
  const idx = mes - 1;
  const abbr = idx >= 0 && idx < 12 ? MONTH_ABBR_PT[idx] : String(mes).padStart(2, '0');
  return `${abbr}/${ano}`;
}

export interface ProfissionalMesReportMesRow {
  mes: number;
  ano: number;
  mesAno: string;
  horasExecutadas: number;
}

export interface ProfissionalMesReportGroup {
  profissionalId: number;
  profissionalNome: string;
  meses: ProfissionalMesReportMesRow[];
  totalHoras: number;
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function mergeAnaliseRows(groups: Map<number, ProfissionalMesReportGroup>, rows: ProfissionalAnaliseResumidaDTO[]) {
  for (const row of rows) {
    const horas = roundHours(Number(row.horasExecutadas) || 0);
    if (horas <= 0) continue;

    const pid = row.profissional.id;
    const nome = row.profissional.nome?.trim() || `#${pid}`;
    let group = groups.get(pid);
    if (!group) {
      group = {
        profissionalId: pid,
        profissionalNome: nome,
        meses: [],
        totalHoras: 0,
      };
      groups.set(pid, group);
    }

    group.meses.push({
      mes: row.mes,
      ano: row.ano,
      mesAno: formatPeriodoMesAno(row.mes, row.ano),
      horasExecutadas: horas,
    });
  }
}

/**
 * Carrega horas executadas por profissional/mês via analise-resumida para cada profissional da execução.
 */
export async function loadProfissionalMesReport(
  demandaExecucaoId: number,
  profissionalIds: number[],
): Promise<ProfissionalMesReportGroup[]> {
  const uniqueIds = [...new Set(profissionalIds.filter((id) => id > 0))];
  if (uniqueIds.length === 0) return [];

  const responses = await Promise.all(
    uniqueIds.map((id) => profissionalService.getAnaliseResumidaPorExecucao(id, demandaExecucaoId)),
  );

  const groups = new Map<number, ProfissionalMesReportGroup>();
  for (const rows of responses) {
    mergeAnaliseRows(groups, rows);
  }

  const result = Array.from(groups.values()).filter((g) => g.meses.length > 0);
  for (const group of result) {
    group.meses.sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));
    group.totalHoras = roundHours(group.meses.reduce((sum, m) => sum + m.horasExecutadas, 0));
  }

  result.sort((a, b) => a.profissionalNome.localeCompare(b.profissionalNome, 'pt-BR'));
  return result;
}
