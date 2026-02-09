// =====================================================
// UsuarioProjeto Service
// Serviços de manutenção de projetos por usuário
// =====================================================

import api from './api';
import type { PaginatedResponse, Projeto, Usuario } from '@/types';

export interface UsuarioProjeto {
  id: number;
  usuarioId: number;
  projetoId: number;
  usuario?: Usuario;
  projeto?: Projeto;
}

export interface UsuarioProjetoCreateDTO {
  usuarioId: number;
  projetoId: number;
}

export interface UsuarioProjetoFilters {
  usuarioId?: number;
  projetoId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

const ENDPOINTS = {
  base: '/usuario-projeto',
  byId: (id: number) => `/usuario-projeto/${id}`,
};

export const usuarioProjetoService = {
  /**
   * Lista vínculos usuário-projeto com filtros opcionais
   */
  async findAll(filters: UsuarioProjetoFilters = {}): Promise<PaginatedResponse<UsuarioProjeto>> {
    const params = new URLSearchParams();

    if (filters.usuarioId) params.append('usuarioId', String(filters.usuarioId));
    if (filters.projetoId) params.append('projetoId', String(filters.projetoId));
    if (filters.page !== undefined) params.append('page', String(filters.page));
    if (filters.size !== undefined) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<UsuarioProjeto>>(`${ENDPOINTS.base}${query}`);
  },

  /**
   * Lista vínculos de um usuário específico (sem paginação, até 1000 registros)
   */
  async findByUsuario(usuarioId: number): Promise<UsuarioProjeto[]> {
    try {
      const response = await this.findAll({
        usuarioId,
        page: 0,
        size: 1000,
      });
      return response.content;
    } catch (error) {
      console.warn('Erro ao buscar projetos do usuário:', error);
      return [];
    }
  },

  /**
   * Cria um novo vínculo usuário-projeto
   */
  async create(data: UsuarioProjetoCreateDTO): Promise<UsuarioProjeto> {
    return api.post<UsuarioProjeto>(ENDPOINTS.base, data);
  },

  /**
   * Remove um vínculo usuário-projeto
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },
};

export default usuarioProjetoService;

