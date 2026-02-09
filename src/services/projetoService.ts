// =====================================================
// Projetos Service
// Serviço de CRUD para entidade Projeto
// =====================================================

import api from './api';
import { projetoSchema, paginatedProjetoSchema } from '@/lib/schemas';
import type { 
  Projeto, 
  ProjetoCreateDTO, 
  ProjetoUpdateDTO, 
  PaginatedResponse 
} from '@/types';

const ENDPOINTS = {
  base: '/projetos',
  byId: (id: number) => `/projetos/${id}`,
  totais: (id: number) => `/projetos/${id}/totais`,
};

export interface ProjetoFilters {
  nome?: string;
  codTed?: string;
  usuarioId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export const projetoService = {
  /**
   * Lista todos os projetos com paginação e filtros
   */
  async findAll(filters: ProjetoFilters = {}): Promise<PaginatedResponse<Projeto>> {
    const params = new URLSearchParams();
    
    if (filters.nome) params.append('nome', filters.nome);
    if (filters.codTed) params.append('codTed', filters.codTed);
    if (filters.usuarioId) params.append('usuarioId', String(filters.usuarioId));
    if (filters.page !== undefined) params.append('page', String(filters.page));
    if (filters.size !== undefined) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<Projeto>>(`${ENDPOINTS.base}${query}`, { schema: paginatedProjetoSchema });
  },

  /**
   * Busca um projeto por ID
   */
  async findById(id: number): Promise<Projeto> {
    return api.get<Projeto>(ENDPOINTS.byId(id), { schema: projetoSchema });
  },

  /**
   * Busca totais financeiros do projeto (valor total projeto e valor total executado)
   */
  async getTotais(id: number): Promise<{ valorTotalProjeto: number; valorTotalExecutado: number }> {
    return api.get<{ valorTotalProjeto: number; valorTotalExecutado: number }>(ENDPOINTS.totais(id));
  },

  /**
   * Cria um novo projeto
   */
  async create(data: ProjetoCreateDTO): Promise<Projeto> {
    return api.post<Projeto>(ENDPOINTS.base, data);
  },

  /**
   * Atualiza um projeto existente
   */
  async update(id: number, data: ProjetoUpdateDTO): Promise<Projeto> {
    return api.put<Projeto>(ENDPOINTS.byId(id), data);
  },

  /**
   * Remove um projeto
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },

  /**
   * Busca projetos vinculados a um usuário
   * Usa findAll com filtro usuarioId (endpoint que existe no backend)
   */
  async findByUsuario(usuarioId: number): Promise<Projeto[]> {
    try {
      const response = await this.findAll({ 
        usuarioId, 
        page: 0, 
        size: 1000
      });
      return response.content;
    } catch (error) {
      console.warn('Erro ao buscar projetos do usuário:', error);
      return [];
    }
  },
};

export default projetoService;
