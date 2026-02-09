// =====================================================
// Perfis Service
// Serviço de CRUD para entidade Perfil
// =====================================================

import api from './api';
import { perfilSchema, paginatedPerfilSchema } from '@/lib/schemas';
import type { 
  Perfil, 
  PerfilCreateDTO, 
  PerfilUpdateDTO, 
  PaginatedResponse 
} from '@/types';

const ENDPOINTS = {
  base: '/perfis',
  byId: (id: number) => `/perfis/${id}`,
};

export interface PerfilFilters {
  nome?: string;
  projetoId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export const perfilService = {
  /**
   * Lista todos os perfis com paginação e filtros
   */
  async findAll(filters: PerfilFilters = {}): Promise<PaginatedResponse<Perfil>> {
    const params = new URLSearchParams();
    
    if (filters.nome) params.append('nome', filters.nome);
    if (filters.projetoId) params.append('projetoId', String(filters.projetoId));
    if (filters.page !== undefined) params.append('page', String(filters.page));
    if (filters.size !== undefined) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<Perfil>>(`${ENDPOINTS.base}${query}`, { schema: paginatedPerfilSchema });
  },

  /**
   * Busca um perfil por ID
   */
  async findById(id: number): Promise<Perfil> {
    return api.get<Perfil>(ENDPOINTS.byId(id), { schema: perfilSchema });
  },

  /**
   * Cria um novo perfil
   */
  async create(data: PerfilCreateDTO): Promise<Perfil> {
    return api.post<Perfil>(ENDPOINTS.base, data);
  },

  /**
   * Atualiza um perfil existente
   */
  async update(id: number, data: PerfilUpdateDTO): Promise<Perfil> {
    return api.put<Perfil>(ENDPOINTS.byId(id), data);
  },

  /**
   * Remove um perfil
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },
};

export default perfilService;
