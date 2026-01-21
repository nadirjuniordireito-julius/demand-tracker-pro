// =====================================================
// Dashboard Service
// Serviço para dados do dashboard
// =====================================================

import api from './api';
import type { 
  DashboardStats, 
  DemandaPorProjeto, 
  DemandaPorStatus 
} from '@/types';

const ENDPOINTS = {
  stats: '/dashboard/stats',
  demandsByProject: '/dashboard/demandas-por-projeto',
  demandsByStatus: '/dashboard/demandas-por-status',
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
};

export default dashboardService;
