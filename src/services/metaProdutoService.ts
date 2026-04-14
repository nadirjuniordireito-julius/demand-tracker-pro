// =====================================================
// MetaProduto Service
// Serviço de CRUD para entidade MetaProduto
// =====================================================

import api from './api';
import type { 
  MetaProduto, 
  MetaProdutoCreateDTO, 
  MetaProdutoUpdateDTO, 
  PaginatedResponse,
  ProdutoEvolucaoTrimestralDTO,
} from '@/types';

const ENDPOINTS = {
  base: '/meta-produtos',
  byId: (id: number) => `/meta-produtos/${id}`,
  byProjetoMeta: (projetoMetaId: number) => `/meta-produtos/projeto-meta/${projetoMetaId}`,
  evolucaoTrimestral: (id: number) => `/meta-produtos/${id}/evolucao-trimestral`,
};

export interface MetaProdutoFilters {
  nome?: string;
  projetoMetaId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export const metaProdutoService = {
  /**
   * Lista todos os produtos com paginação e filtros
   */
  async findAll(filters: MetaProdutoFilters = {}): Promise<PaginatedResponse<MetaProduto>> {
    const params = new URLSearchParams();
    
    if (filters.nome) params.append('nome', filters.nome);
    if (filters.projetoMetaId) params.append('projetoMetaId', String(filters.projetoMetaId));
    if (filters.page !== undefined) params.append('page', String(filters.page));
    if (filters.size !== undefined) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<MetaProduto>>(`${ENDPOINTS.base}${query}`);
  },

  /**
   * Busca um produto por ID
   */
  async findById(id: number): Promise<MetaProduto> {
    return api.get<MetaProduto>(ENDPOINTS.byId(id));
  },

  /**
   * Busca produtos por projeto meta
   * Usa findAll com filtro projetoMetaId (endpoint que existe no backend)
   */
  async findByProjetoMeta(projetoMetaId: number): Promise<MetaProduto[]> {
    try {
      const response = await this.findAll({ 
        projetoMetaId, 
        page: 0, 
        size: 1000
      });
      return response.content;
    } catch (error) {
      console.warn('Erro ao buscar produtos do projeto meta:', error);
      return [];
    }
  },

  /**
   * Cria um novo produto
   */
  async create(data: MetaProdutoCreateDTO): Promise<MetaProduto> {
    return api.post<MetaProduto>(ENDPOINTS.base, data);
  },

  /**
   * Atualiza um produto existente
   */
  async update(id: number, data: MetaProdutoUpdateDTO): Promise<MetaProduto> {
    return api.put<MetaProduto>(ENDPOINTS.byId(id), data);
  },

  /**
   * Remove um produto
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },

  async getEvolucaoTrimestral(id: number): Promise<ProdutoEvolucaoTrimestralDTO> {
    return api.get<ProdutoEvolucaoTrimestralDTO>(ENDPOINTS.evolucaoTrimestral(id));
  },
};

export default metaProdutoService;
