import api from '@/services/api';
import type { DemandaExecucaoTarefaDependenciaDTO } from '../types';

const BASE = '/demandas-execucao-tarefas-dependencias';

export const dependenciaService = {
  /** Lista dependências em que a tarefa é origem (tarefas que dependem desta). */
  async listByTarefaOrigem(tarefaOrigemId: number): Promise<DemandaExecucaoTarefaDependenciaDTO[]> {
    return api.get<DemandaExecucaoTarefaDependenciaDTO[]>(`${BASE}/tarefa-origem/${tarefaOrigemId}`);
  },

  /** Lista dependências em que a tarefa é destino (esta tarefa depende de). */
  async listByTarefaDestino(tarefaDestinoId: number): Promise<DemandaExecucaoTarefaDependenciaDTO[]> {
    return api.get<DemandaExecucaoTarefaDependenciaDTO[]>(`${BASE}/tarefa-destino/${tarefaDestinoId}`);
  },

  async getById(id: number): Promise<DemandaExecucaoTarefaDependenciaDTO> {
    return api.get<DemandaExecucaoTarefaDependenciaDTO>(`${BASE}/${id}`);
  },

  /** Cria dependência: tarefaDestinoId depende de tarefaOrigemId. 400 se origem === destino. */
  async create(tarefaOrigemId: number, tarefaDestinoId: number): Promise<DemandaExecucaoTarefaDependenciaDTO> {
    return api.post<DemandaExecucaoTarefaDependenciaDTO>(BASE, { tarefaOrigemId, tarefaDestinoId });
  },

  async delete(id: number): Promise<void> {
    return api.delete(`${BASE}/${id}`);
  },
};
