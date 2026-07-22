import api from '@/services/api';
import type {
  DemandaExecucaoDTO,
  DemandaExecucaoCreateDTO,
  DemandaExecucaoUpdateDTO,
  DemandaExecucaoGanttDTO,
  DemandaExecucaoPerfilCheckDTO,
  ExecucaoProfissionalDTO,
} from '../types';

const BASE = '/demandas-execucao';

export const demandaExecucaoService = {
  async getPage(params: { page?: number; size?: number; sort?: string }) {
    const search = new URLSearchParams();
    if (params.page != null) search.set('page', String(params.page));
    if (params.size != null) search.set('size', String(params.size));
    if (params.sort) search.set('sort', params.sort);
    const query = search.toString() ? `?${search.toString()}` : '';
    return api.get<{ content: DemandaExecucaoDTO[]; totalElements: number; totalPages: number }>(`${BASE}${query}`);
  },

  async getById(id: number): Promise<DemandaExecucaoDTO> {
    return api.get<DemandaExecucaoDTO>(`${BASE}/${id}`);
  },

  /**
   * GET /api/demandas-execucao/demanda/{demandaTecnicaId}
   * Retorna 404 se não existir execução para a demanda.
   */
  async getByDemandaId(demandaTecnicaId: number): Promise<DemandaExecucaoDTO | null> {
    return api.get<DemandaExecucaoDTO | null>(`${BASE}/demanda/${demandaTecnicaId}`, {
      allow404: true,
      silent: true,
    });
  },

  async create(data: DemandaExecucaoCreateDTO): Promise<DemandaExecucaoDTO> {
    return api.post<DemandaExecucaoDTO>(BASE, data);
  },

  async update(id: number, data: DemandaExecucaoUpdateDTO): Promise<DemandaExecucaoDTO> {
    return api.put<DemandaExecucaoDTO>(`${BASE}/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`${BASE}/${id}`);
  },

  /**
   * POST /api/demandas-execucao/{id}/encerrar?usuarioId={usuarioId}
   * Encerra a execução da demanda técnica.
   */
  async encerrar(id: number, usuarioId: number): Promise<DemandaExecucaoDTO> {
    const search = new URLSearchParams();
    search.set('usuarioId', String(usuarioId));
    const query = `?${search.toString()}`;
    return api.post<DemandaExecucaoDTO>(`${BASE}/${id}/encerrar${query}`, undefined);
  },

  /**
   * POST /api/demandas-execucao/{id}/reabrir
   * Reabre uma execução previamente encerrada (status CONCLUIDA → EM_ANDAMENTO),
   * trazendo a demanda de volta para status 'E'. O Termo de Encerramento é mantido.
   */
  async reabrir(id: number): Promise<DemandaExecucaoDTO> {
    return api.post<DemandaExecucaoDTO>(`${BASE}/${id}/reabrir`, undefined);
  },

  /**
   * GET /api/demandas-execucao/gantt/demanda/{demandaTecnicaId}
   * Dados da execução e tarefas prontos para exibição em Gantt. 404 se não existir execução.
   */
  async getGanttByDemandaId(demandaTecnicaId: number) {
    return api.get<DemandaExecucaoGanttDTO>(`${BASE}/gantt/demanda/${demandaTecnicaId}`);
  },

  /**
   * GET /api/demandas-execucao/check/perfis/{demandaTecnicaId}
   * Compara horas planejadas por perfil entre termo de planejamento e execução.
   */
  async getPerfilCheckByDemandaId(demandaTecnicaId: number) {
    return api.get<DemandaExecucaoPerfilCheckDTO[]>(`${BASE}/check/perfis/${demandaTecnicaId}`);
  },

  /**
   * GET /api/demandas-execucao/analytics/profissional/{profissionalId}
   * Retorna execução mensal analítica do profissional.
   */
  async getAnalyticsByProfissional(profissionalId: number): Promise<ExecucaoProfissionalDTO[]> {
    return api.get<ExecucaoProfissionalDTO[]>(`${BASE}/analytics/profissional/${profissionalId}`);
  },
};
