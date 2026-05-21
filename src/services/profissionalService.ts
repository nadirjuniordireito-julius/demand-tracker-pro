// =====================================================
// Profissional Service
// CRUD para entidade Profissional (pessoa física/jurídica por projeto)
// =====================================================

import api from './api';
import {
  profissionalSchema,
  paginatedProfissionalSchema,
  profissionalAnaliseResumidaListSchema,
} from '@/lib/schemas';
import type { ProfissionalAnaliseResumidaDTO } from '@/modules/execucaoDemanda/types';
import type {
  Profissional,
  ProfissionalCreateDTO,
  ProfissionalUpdateDTO,
  PaginatedResponse,
} from '@/types';

const ENDPOINTS = {
  base: '/profissionais',
  byId: (id: number) => `/profissionais/${id}`,
};

export interface ProfissionalFilters {
  nome?: string;
  projetoId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export const profissionalService = {
  /**
   * Lista profissionais com paginação e filtros (page 0-based)
   */
  async findAll(filters: ProfissionalFilters = {}): Promise<PaginatedResponse<Profissional>> {
    const params = new URLSearchParams();
    if (filters.nome) params.append('nome', filters.nome);
    if (filters.projetoId != null) params.append('projetoId', String(filters.projetoId));
    if (filters.page !== undefined) params.append('page', String(filters.page));
    if (filters.size !== undefined) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<Profissional>>(`${ENDPOINTS.base}${query}`, {
      schema: paginatedProfissionalSchema,
    });
  },

  async findById(id: number): Promise<Profissional> {
    return api.get<Profissional>(ENDPOINTS.byId(id), { schema: profissionalSchema });
  },

  async create(data: ProfissionalCreateDTO): Promise<Profissional> {
    return api.post<Profissional>(ENDPOINTS.base, data);
  },

  async update(id: number, data: ProfissionalUpdateDTO): Promise<Profissional> {
    return api.put<Profissional>(ENDPOINTS.byId(id), data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },

  /** GET /api/profissionais/{id}/analise-resumida */
  async getAnaliseResumida(profissionalId: number): Promise<ProfissionalAnaliseResumidaDTO[]> {
    return api.get<ProfissionalAnaliseResumidaDTO[]>(
      `${ENDPOINTS.byId(profissionalId)}/analise-resumida`,
      { schema: profissionalAnaliseResumidaListSchema },
    );
  },

  /** GET /api/profissionais/{id}/analise-resumida?demandaExecucaoId= */
  async getAnaliseResumidaPorExecucao(
    profissionalId: number,
    demandaExecucaoId: number,
  ): Promise<ProfissionalAnaliseResumidaDTO[]> {
    const params = new URLSearchParams({ demandaExecucaoId: String(demandaExecucaoId) });
    return api.get<ProfissionalAnaliseResumidaDTO[]>(
      `${ENDPOINTS.byId(profissionalId)}/analise-resumida?${params}`,
      { schema: profissionalAnaliseResumidaListSchema },
    );
  },
};

export default profissionalService;
