/**
 * Tipos do módulo Execução de Demanda Técnica.
 * Baseados nos DTOs do backend (execucao.txt).
 */

export type TarefaStatus = 'PLANEJADA' | 'EM_ANDAMENTO' | 'BLOQUEADA' | 'CONCLUIDA';

export interface UsuarioExecucaoDTO {
  id: number;
  nome: string;
  email?: string;
}

export interface DemandaExecucaoDTO {
  id: number;
  demandaTecnicaId: number;
  usuarioId: number | null;
  usuario: UsuarioExecucaoDTO | null;
  dataInicioPlanejada: string;
  dataFimPlanejada: string;
  dataInicioReal: string | null;
  dataFimReal: string | null;
  status: string;
  /** "Atrasada" ou "Normal" — derivado de datas planejadas/reais, progresso e tarefas. */
  situacao: string;
  percentualProgresso: number;
  dataCriacaoExecucao?: string;
  tarefas?: DemandaExecucaoTarefaDTO[];
}

export interface DemandaExecucaoPerfilCheckDTO {
  perfilId: number;
  perfilNome: string;
  horasPlanejadasTermo: number;
  horasPlanejadasExecucao: number;
}

export interface DemandaExecucaoCreateDTO {
  demandaTecnicaId: number;
  usuarioId?: number;
  dataInicioPlanejada: string;
  dataFimPlanejada: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  status: string;
  situacao: string;
  percentualProgresso: number;
}

export interface DemandaExecucaoUpdateDTO {
  usuarioId?: number;
  dataInicioPlanejada?: string;
  dataFimPlanejada?: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  status?: string;
  percentualProgresso?: number;
}

// --- Gantt (resposta GET gantt/demanda/{id}) ---

export interface DemandaExecucaoGanttRecursoDTO {
  id: number;
  profissionalId: number;
  nome: string;
  perfilId?: number | null;
  perfilNome?: string | null;
  horasPlanejadas: number;
  horasExecutadas?: number | null;
}

export interface DemandaExecucaoGanttTarefaDTO {
  id: number;
  titulo: string;
  descricao?: string | null;
  status: string;
  prioridade: string;
  dataInicioPlanejada: string;
  dataFimPlanejada: string;
  dataInicioReal?: string | null;
  dataFimReal?: string | null;
  percentualProgresso: number;
  estimativaHoras: number;
  predecessorIds: number[];
  sequencia: number;
  recursos: DemandaExecucaoGanttRecursoDTO[];
}

export interface DemandaExecucaoGanttDTO {
  demandaTecnicaId: number;
  demandaTecnicaCodigo: string;
  demandaTecnicaNome: string;
  demandaExecucaoId: number;
  dataInicioPlanejada: string;
  dataFimPlanejada: string;
  dataInicioReal: string | null;
  dataFimReal: string | null;
  status: string;
  percentualProgresso: number;
  tarefas: DemandaExecucaoGanttTarefaDTO[];
}

// --- Tarefas ---

export interface DemandaExecucaoTarefaDTO {
  id: number;
  demandaExecucaoId: number;
  titulo: string;
  descricao?: string | null;
  status: TarefaStatus;
  prioridade: string;
  dataInicioPlanejada: string;
  dataFimPlanejada: string;
  dataInicioReal?: string | null;
  dataFimReal?: string | null;
  percentualProgresso: number;
  estimativaHoras: number;
  sequencia: number;
  recursos?: DemandaExecucaoTarefaRecursoDTO[];
  apontamentos?: DemandaExecucaoTarefaApontamentoProgressoDTO[];
}

export interface DemandaExecucaoTarefaCreateDTO {
  demandaExecucaoId: number;
  titulo: string;
  descricao?: string;
  status: TarefaStatus;
  prioridade: string;
  dataInicioPlanejada: string;
  dataFimPlanejada: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  percentualProgresso: number;
  estimativaHoras: number;
  sequencia: number;
}

export interface DemandaExecucaoTarefaUpdateDTO {
  titulo?: string;
  descricao?: string;
  status?: TarefaStatus;
  prioridade?: string;
  dataInicioPlanejada?: string;
  dataFimPlanejada?: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  percentualProgresso?: number;
  estimativaHoras?: number;
  sequencia: number;
}

// --- Dependências entre tarefas ---
// tarefaDestino depende de tarefaOrigem (origem deve concluir antes do destino)
export interface DemandaExecucaoTarefaDependenciaDTO {
  id: number;
  tarefaOrigemId: number;
  tarefaDestinoId: number;
}

// --- Recursos (profissionais por tarefa) ---

export interface ProfissionalRecursoDTO {
  id: number;
  nome: string;
}

export interface PerfilRecursoDTO {
  id: number;
  nome: string;
}

export interface DemandaExecucaoTarefaRecursoDTO {
  id: number;
  demandaExecucaoTarefaId: number;
  profissionalId: number;
  profissional: ProfissionalRecursoDTO;
  perfilId?: number | null;
  perfil?: PerfilRecursoDTO | null;
  horasPlanejadas: number;
  horasExecutadas?: number | null;
}

export interface DemandaExecucaoTarefaRecursoCreateDTO {
  demandaExecucaoTarefaId: number;
  profissionalId: number;
  perfilId?: number;
  horasPlanejadas: number;
  horasExecutadas?: number;
}

export interface DemandaExecucaoTarefaRecursoUpdateDTO {
  profissionalId?: number;
  perfilId?: number;
  horasPlanejadas?: number;
  horasExecutadas?: number;
}

// --- Apontamentos de progresso ---

export interface DemandaExecucaoTarefaApontamentoProgressoDTO {
  id: number;
  demandaExecucaoTarefaId: number;
  data: string;
  percentual: number;
  comentario: string;
}

export interface DemandaExecucaoTarefaApontamentoProgressoCreateDTO {
  demandaExecucaoTarefaId: number;
  data: string;
  percentual: number;
  comentario: string;
}

export interface DemandaExecucaoTarefaApontamentoProgressoUpdateDTO {
  data?: string;
  percentual?: number;
  comentario?: string;
}
