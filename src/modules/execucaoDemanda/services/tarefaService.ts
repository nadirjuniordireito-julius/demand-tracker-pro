import api from '@/services/api';
import type {
  DemandaExecucaoTarefaDTO,
  DemandaExecucaoTarefaCreateDTO,
  DemandaExecucaoTarefaUpdateDTO,
} from '../types';

const BASE = '/demandas-execucao-tarefas';

export const tarefaService = {
  async listByExecucaoId(demandaExecucaoId: number): Promise<DemandaExecucaoTarefaDTO[]> {
    return api.get<DemandaExecucaoTarefaDTO[]>(`${BASE}/execucao/${demandaExecucaoId}`);
  },

  async getById(id: number): Promise<DemandaExecucaoTarefaDTO> {
    return api.get<DemandaExecucaoTarefaDTO>(`${BASE}/${id}`);
  },

  async create(data: DemandaExecucaoTarefaCreateDTO): Promise<DemandaExecucaoTarefaDTO> {
    return api.post<DemandaExecucaoTarefaDTO>(BASE, data);
  },

  async update(id: number, data: DemandaExecucaoTarefaUpdateDTO): Promise<DemandaExecucaoTarefaDTO> {
    return api.put<DemandaExecucaoTarefaDTO>(`${BASE}/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`${BASE}/${id}`);
  },
};
