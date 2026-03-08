// =====================================================
// Desembolso Service
// Serviço de CRUD para entidade Desembolso
// =====================================================

import api from './api';
import { desembolsoSchema, paginatedDesembolsoSchema } from '@/lib/schemas';
import type {
  Desembolso,
  DesembolsoCreateDTO,
  DesembolsoUpdateDTO,
  PaginatedResponse,
} from '@/types';

const ENDPOINTS = {
  base: '/desembolsos',
  byId: (id: number) => `/desembolsos/${id}`,
};

export interface DesembolsoFilters {
  projetoId: number;
  documento?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const desembolsoService = {
  /**
   * Lista desembolsos de um projeto com paginação e filtros
   */
  async findAll(filters: DesembolsoFilters): Promise<PaginatedResponse<Desembolso>> {
    const params = new URLSearchParams();

    params.append('projetoId', String(filters.projetoId));
    if (filters.documento) params.append('documento', filters.documento);
    if (filters.page !== undefined) params.append('page', String(filters.page));
    if (filters.size !== undefined) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<Desembolso>>(
      `${ENDPOINTS.base}${query}`,
      { schema: paginatedDesembolsoSchema },
    );
  },

  /**
   * Busca um desembolso por ID
   */
  async findById(id: number): Promise<Desembolso> {
    return api.get<Desembolso>(ENDPOINTS.byId(id), { schema: desembolsoSchema });
  },

  /**
   * Cria um novo desembolso
   */
  async create(data: DesembolsoCreateDTO): Promise<Desembolso> {
    return api.post<Desembolso>(ENDPOINTS.base, data);
  },

  /**
   * Atualiza um desembolso existente
   */
  async update(id: number, data: DesembolsoUpdateDTO): Promise<Desembolso> {
    return api.put<Desembolso>(ENDPOINTS.byId(id), data);
  },

  /**
   * Remove um desembolso
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },
};

export default desembolsoService;

