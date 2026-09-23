// =====================================================
// ProjetoMeta Service
// Serviço de CRUD para entidade ProjetoMeta
// =====================================================

import api, { downloadBlob } from './api';
import type { 
  ProjetoMeta, 
  ProjetoMetaCreateDTO, 
  ProjetoMetaUpdateDTO, 
  PaginatedResponse 
} from '@/types';

const ENDPOINTS = {
  base: '/projeto-metas',
  byId: (id: number) => `/projeto-metas/${id}`,
  termosDownload: (id: number) => `/projeto-metas/${id}/termos/download`,
};

export interface TermosDownloadFlags {
  abertura?: boolean;
  planejamento?: boolean;
  encerramento?: boolean;
}

export interface ProjetoMetaFilters {
  nome?: string;
  projetoId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export const projetoMetaService = {
  /**
   * Lista todas as metas com paginação e filtros
   */
  async findAll(filters: ProjetoMetaFilters = {}): Promise<PaginatedResponse<ProjetoMeta>> {
    const params = new URLSearchParams();
    
    if (filters.nome) params.append('nome', filters.nome);
    if (filters.projetoId) params.append('projetoId', String(filters.projetoId));
    if (filters.page !== undefined) params.append('page', String(filters.page));
    if (filters.size !== undefined) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<ProjetoMeta>>(`${ENDPOINTS.base}${query}`);
  },

  /**
   * Busca uma meta por ID
   */
  async findById(id: number): Promise<ProjetoMeta> {
    return api.get<ProjetoMeta>(ENDPOINTS.byId(id));
  },

  /**
   * Busca metas por projeto
   * Usa findAll com filtro projetoId (endpoint que existe no backend)
   */
  async findByProjeto(projetoId: number): Promise<ProjetoMeta[]> {
    try {
      const response = await this.findAll({ 
        projetoId, 
        page: 0, 
        size: 1000,
      });
      return response.content;
    } catch (error) {
      console.warn('Erro ao buscar metas do projeto:', error);
      return [];
    }
  },

  /**
   * Cria uma nova meta
   */
  async create(data: ProjetoMetaCreateDTO): Promise<ProjetoMeta> {
    return api.post<ProjetoMeta>(ENDPOINTS.base, data);
  },

  /**
   * Atualiza uma meta existente
   */
  async update(id: number, data: ProjetoMetaUpdateDTO): Promise<ProjetoMeta> {
    return api.put<ProjetoMeta>(ENDPOINTS.byId(id), data);
  },

  /**
   * Remove uma meta
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },

  /**
   * Baixa ZIP com termos (abertura, planejamento, encerramento) das demandas da meta
   */
  async downloadTermosZip(
    id: number,
    flags: TermosDownloadFlags = {},
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.set('abertura', String(flags.abertura === true));
    params.set('planejamento', String(flags.planejamento === true));
    params.set('encerramento', String(flags.encerramento === true));
    return downloadBlob(`${ENDPOINTS.termosDownload(id)}?${params.toString()}`);
  },
};

export default projetoMetaService;
