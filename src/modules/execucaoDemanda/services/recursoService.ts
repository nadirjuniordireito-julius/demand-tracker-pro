import api from '@/services/api';
import type {
  DemandaExecucaoTarefaRecursoDTO,
  DemandaExecucaoTarefaRecursoCreateDTO,
  DemandaExecucaoTarefaRecursoUpdateDTO,
} from '../types';

const BASE = '/demandas-execucao-tarefas-recursos';

export const recursoService = {
  async listByTarefaId(tarefaId: number) {
    return api.get<DemandaExecucaoTarefaRecursoDTO[]>(`${BASE}/tarefa/${tarefaId}`);
  },

  async getById(id: number): Promise<DemandaExecucaoTarefaRecursoDTO> {
    return api.get<DemandaExecucaoTarefaRecursoDTO>(`${BASE}/${id}`);
  },

  async create(data: DemandaExecucaoTarefaRecursoCreateDTO): Promise<DemandaExecucaoTarefaRecursoDTO> {
    return api.post<DemandaExecucaoTarefaRecursoDTO>(BASE, data);
  },

  async update(id: number, data: DemandaExecucaoTarefaRecursoUpdateDTO): Promise<DemandaExecucaoTarefaRecursoDTO> {
    return api.put<DemandaExecucaoTarefaRecursoDTO>(`${BASE}/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`${BASE}/${id}`);
  },
};
