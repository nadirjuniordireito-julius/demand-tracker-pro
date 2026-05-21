import { demandaService } from '@/services/demandaService';
import { demandaExecucaoService } from './demandaExecucaoService';
import { tarefaService } from './tarefaService';
import { dependenciaService } from './dependenciaService';
import { recursoService } from './recursoService';
import { apontamentoService } from './apontamentoService';
import { compareGanttTarefas } from '../utils/sortGanttTarefas';
import {
  loadProfissionalMesReport,
  type ProfissionalMesReportGroup,
} from '../utils/loadProfissionalMesReport';
import type {
  DemandaExecucaoDTO,
  DemandaExecucaoGanttDTO,
  DemandaExecucaoGanttTarefaDTO,
  DemandaExecucaoTarefaDTO,
  DemandaExecucaoTarefaRecursoDTO,
  DemandaExecucaoTarefaApontamentoProgressoDTO,
} from '../types';

export type { ProfissionalMesReportGroup };

export interface DependenciaReportRow {
  id: number;
  tarefaOrigemSequencia: number | null;
  tarefaOrigemTitulo: string;
  tarefaDestinoSequencia: number | null;
  tarefaDestinoTitulo: string;
}

export interface RecursoReportRow {
  tarefaId: number;
  tarefaSequencia: number | null;
  tarefaTitulo: string;
  profissionalId: number;
  profissionalNome: string;
  perfilNome: string;
  horasPlanejadas: number;
  horasExecutadas: number | null;
}

export interface ApontamentoReportRow {
  tarefaSequencia: number | null;
  tarefaTitulo: string;
  data: string;
  percentual: number;
  comentario: string;
}

export interface ExecucaoDemandaReportMeta {
  generatedAt: string;
  usuarioNome: string;
  usuarioEmail?: string;
}

export interface ExecucaoDemandaReportData {
  execucao: DemandaExecucaoDTO;
  demanda: { codigo?: string; nome?: string } | null;
  gantt: DemandaExecucaoGanttDTO;
  tarefas: DemandaExecucaoTarefaDTO[];
  dependencias: DependenciaReportRow[];
  recursos: RecursoReportRow[];
  profissionalMes: ProfissionalMesReportGroup[];
  apontamentos: ApontamentoReportRow[];
  meta: ExecucaoDemandaReportMeta;
}

export interface ExecucaoReportUsuario {
  nome: string;
  email?: string;
}

function sortExecucaoTarefas(tarefas: DemandaExecucaoTarefaDTO[]): DemandaExecucaoTarefaDTO[] {
  return [...tarefas].sort((a, b) =>
    compareGanttTarefas(
      a as unknown as DemandaExecucaoGanttTarefaDTO,
      b as unknown as DemandaExecucaoGanttTarefaDTO,
    ),
  );
}

export async function loadExecucaoReportData(
  demandaTecnicaId: number,
  usuario: ExecucaoReportUsuario,
): Promise<ExecucaoDemandaReportData> {
  const [execucao, gantt, demandaEntity] = await Promise.all([
    demandaExecucaoService.getByDemandaId(demandaTecnicaId),
    demandaExecucaoService.getGanttByDemandaId(demandaTecnicaId),
    demandaService.findById(demandaTecnicaId).catch(() => null),
  ]);

  if (!execucao) {
    throw new Error('Execução não encontrada para esta demanda.');
  }

  const demanda = demandaEntity
    ? { codigo: demandaEntity.codigo, nome: demandaEntity.nome }
    : { codigo: gantt.demandaTecnicaCodigo, nome: gantt.demandaTecnicaNome };

  const tarefasRaw = await tarefaService.listByExecucaoId(execucao.id);
  const tarefas = sortExecucaoTarefas(tarefasRaw);
  const tituloById = new Map(tarefas.map((t) => [t.id, t.titulo]));
  const sequenciaById = new Map(
    tarefas.map((t) => [t.id, t.sequencia != null ? Number(t.sequencia) : null]),
  );

  const perTask = await Promise.all(
    tarefas.map(async (t) => {
      const [deps, recs, apts] = await Promise.all([
        dependenciaService.listByTarefaDestino(t.id),
        recursoService.listByTarefaId(t.id),
        apontamentoService.listByTarefaId(t.id),
      ]);
      return { tarefa: t, deps, recs, apts };
    }),
  );

  const dependenciasMap = new Map<number, DependenciaReportRow>();
  const recursos: RecursoReportRow[] = [];
  const apontamentos: ApontamentoReportRow[] = [];

  for (const { tarefa, deps, recs, apts } of perTask) {
    for (const d of deps) {
      if (!dependenciasMap.has(d.id)) {
        dependenciasMap.set(d.id, {
          id: d.id,
          tarefaOrigemSequencia: sequenciaById.get(d.tarefaOrigemId) ?? null,
          tarefaOrigemTitulo: tituloById.get(d.tarefaOrigemId) ?? `#${d.tarefaOrigemId}`,
          tarefaDestinoSequencia: sequenciaById.get(d.tarefaDestinoId) ?? null,
          tarefaDestinoTitulo: tituloById.get(d.tarefaDestinoId) ?? tarefa.titulo,
        });
      }
    }

    for (const r of recs) {
      recursos.push(mapRecursoRow(tarefa, r));
    }

    for (const a of apts) {
      apontamentos.push({
        tarefaSequencia: tarefa.sequencia != null ? Number(tarefa.sequencia) : null,
        tarefaTitulo: tarefa.titulo,
        data: a.data,
        percentual: Number(a.percentual) || 0,
        comentario: a.comentario?.trim() || '—',
      });
    }
  }

  apontamentos.sort((a, b) => {
    const dateCmp = String(a.data).localeCompare(String(b.data));
    if (dateCmp !== 0) return dateCmp;
    return a.tarefaTitulo.localeCompare(b.tarefaTitulo);
  });

  const profissionalIds = [...new Set(recursos.map((r) => r.profissionalId))];
  const profissionalMes = await loadProfissionalMesReport(execucao.id, profissionalIds);

  return {
    execucao,
    demanda,
    gantt,
    tarefas,
    dependencias: Array.from(dependenciasMap.values()),
    recursos,
    profissionalMes,
    apontamentos,
    meta: {
      generatedAt: new Date().toLocaleString('pt-BR'),
      usuarioNome: usuario.nome,
      usuarioEmail: usuario.email,
    },
  };
}

function mapRecursoRow(
  tarefa: DemandaExecucaoTarefaDTO,
  r: DemandaExecucaoTarefaRecursoDTO,
): RecursoReportRow {
  return {
    tarefaId: tarefa.id,
    tarefaSequencia: tarefa.sequencia != null ? Number(tarefa.sequencia) : null,
    tarefaTitulo: tarefa.titulo,
    profissionalId: r.profissionalId,
    profissionalNome: r.profissional?.nome ?? `#${r.profissionalId}`,
    perfilNome: r.perfil?.nome ?? '—',
    horasPlanejadas: Number(r.horasPlanejadas) || 0,
    horasExecutadas: r.horasExecutadas != null ? Number(r.horasExecutadas) : null,
  };
}
