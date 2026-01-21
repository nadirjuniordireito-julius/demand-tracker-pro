// =====================================================
// Demandas Service
// Serviço de CRUD para entidade DemandaTecnica
// =====================================================

import api from './api';
import type { 
  DemandaTecnica, 
  DemandaTecnicaCreateDTO, 
  DemandaTecnicaUpdateDTO, 
  PaginatedResponse,
  DemandStatus
} from '@/types';

const ENDPOINTS = {
  base: '/demandas',
  byId: (id: number) => `/demandas/${id}`,
};

export interface DemandaFilters {
  codigo?: string;
  nome?: string;
  projetoId?: number;
  status?: DemandStatus;
  page?: number;
  size?: number;
  sort?: string;
}

export const demandaService = {
  /**
   * Lista todas as demandas com paginação e filtros
   */
  async findAll(filters: DemandaFilters = {}): Promise<PaginatedResponse<DemandaTecnica>> {
    const params = new URLSearchParams();
    
    if (filters.codigo) params.append('codigo', filters.codigo);
    if (filters.nome) params.append('nome', filters.nome);
    if (filters.projetoId) params.append('projetoId', String(filters.projetoId));
    if (filters.status) params.append('status', filters.status);
    if (filters.page !== undefined) params.append('page', String(filters.page));
    if (filters.size !== undefined) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<DemandaTecnica>>(`${ENDPOINTS.base}${query}`);
  },

  /**
   * Busca uma demanda por ID
   */
  async findById(id: number): Promise<DemandaTecnica> {
    return api.get<DemandaTecnica>(ENDPOINTS.byId(id));
  },

  /**
   * Cria uma nova demanda
   */
  async create(data: DemandaTecnicaCreateDTO): Promise<DemandaTecnica> {
    return api.post<DemandaTecnica>(ENDPOINTS.base, data);
  },

  /**
   * Atualiza uma demanda existente
   */
  async update(id: number, data: DemandaTecnicaUpdateDTO): Promise<DemandaTecnica> {
    return api.put<DemandaTecnica>(ENDPOINTS.byId(id), data);
  },

  /**
   * Remove uma demanda
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },
};

export default demandaService;
