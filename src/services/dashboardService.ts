// =====================================================
// Dashboard Service
// Serviço para dados do dashboard
// =====================================================

import api from './api';
import type { 
  DashboardStats, 
  DemandaPorProjeto, 
  DemandaPorStatus, DemandaTecnicaDTO, Page, Page as PageDTO 
} from '@/types';

const ENDPOINTS = {
  stats: '/dashboard/stats',
  demandsByProject: '/dashboard/demandas-por-projeto',
  demandsByStatus: '/dashboard/demandas-por-status',
  demandasEmFluxoPaginado: (projetoId: number) =>
    `/demandas/projeto/${projetoId}/em-fluxo/paginado`,
};

export const dashboardService = {
  /**
   * Obtém estatísticas gerais do dashboard
   */
  async getStats(): Promise<DashboardStats> {
    return api.get<DashboardStats>(ENDPOINTS.stats);
  },

  /**
   * Obtém demandas agrupadas por projeto
   */
  async getDemandsByProject(): Promise<DemandaPorProjeto[]> {
    return api.get<DemandaPorProjeto[]>(ENDPOINTS.demandsByProject);
  },

  /**
   * Obtém demandas agrupadas por status
   */
  async getDemandsByStatus(): Promise<DemandaPorStatus[]> {
    return api.get<DemandaPorStatus[]>(ENDPOINTS.demandsByStatus);
  },
  
  /**
   * retornar demandas em fluxo (pendentes de assinatura)
   * @param projetoId 
   * @param page 
   * @param size 
   * @param sort 
   * @returns 
   */
  getDemandasEmFluxoPaginado: async (
    projetoId: number,
    page = 0,
    size = 10,
    sort = 'status,asc',
  ): Promise<Page<DemandaTecnicaDTO>> => {
    const query = `?page=${page}&size=${size}&sort=${sort}`;
  
    return api.get<Page<DemandaTecnicaDTO>>(
      `${ENDPOINTS.demandasEmFluxoPaginado(projetoId)}${query}`
    );
  },
  
  

};

export default dashboardService;
