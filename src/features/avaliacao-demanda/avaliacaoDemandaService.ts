/**
 * Serviço de Avaliação de Qualidade da Demanda Técnica
 */

import api, { ApiError } from '@/services/api';
import type {
  DemandaAvaliacaoRequest,
  DemandaAvaliacaoResponse,
  DemandaAvaliacaoKpis,
  DemandaAvaliacaoAnalytics,
} from './types';

const byDemanda = (demandaId: number) => `/demandas/${demandaId}/avaliacao`;

export const avaliacaoDemandaService = {
  /** Cria avaliação (POST) */
  create(demandaId: number, data: DemandaAvaliacaoRequest): Promise<DemandaAvaliacaoResponse> {
    return api.post<DemandaAvaliacaoResponse>(byDemanda(demandaId), data);
  },

  /** Obtém avaliação (GET) */
  async get(demandaId: number): Promise<DemandaAvaliacaoResponse | null> {
    try {
      return await api.get<DemandaAvaliacaoResponse>(byDemanda(demandaId), { allow404: false, silent: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  /** Atualiza avaliação (PUT) */
  update(demandaId: number, data: DemandaAvaliacaoRequest): Promise<DemandaAvaliacaoResponse> {
    return api.put<DemandaAvaliacaoResponse>(byDemanda(demandaId), data);
  },

  /** KPIs da avaliação da demanda */
  getKpis(demandaId: number): Promise<DemandaAvaliacaoKpis> {
    return api.get<DemandaAvaliacaoKpis>(`${byDemanda(demandaId)}/kpis`);
  },

  /** Analytics da avaliação da demanda */
  getAnalytics(demandaId: number): Promise<DemandaAvaliacaoAnalytics> {
    return api.get<DemandaAvaliacaoAnalytics>(`${byDemanda(demandaId)}/analytics`);
  },
};
