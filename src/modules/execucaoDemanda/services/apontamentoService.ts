import api from '@/services/api';
import type {
  DemandaExecucaoTarefaApontamentoProgressoDTO,
  DemandaExecucaoTarefaApontamentoProgressoCreateDTO,
  DemandaExecucaoTarefaApontamentoProgressoUpdateDTO,
} from '../types';

const BASE = '/demandas-execucao-tarefas-apontamentos';

export const apontamentoService = {
  async listByTarefaId(tarefaId: number): Promise<DemandaExecucaoTarefaApontamentoProgressoDTO[]> {
    return api.get<DemandaExecucaoTarefaApontamentoProgressoDTO[]>(`${BASE}/tarefa/${tarefaId}`);
  },

  async getById(id: number): Promise<DemandaExecucaoTarefaApontamentoProgressoDTO> {
    return api.get<DemandaExecucaoTarefaApontamentoProgressoDTO>(`${BASE}/${id}`);
  },

  async create(data: DemandaExecucaoTarefaApontamentoProgressoCreateDTO): Promise<DemandaExecucaoTarefaApontamentoProgressoDTO> {
    return api.post<DemandaExecucaoTarefaApontamentoProgressoDTO>(BASE, data);
  },

  async update(id: number, data: DemandaExecucaoTarefaApontamentoProgressoUpdateDTO): Promise<DemandaExecucaoTarefaApontamentoProgressoDTO> {
    return api.put<DemandaExecucaoTarefaApontamentoProgressoDTO>(`${BASE}/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`${BASE}/${id}`);
  },
};
