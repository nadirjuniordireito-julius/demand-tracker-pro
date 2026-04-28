import api from './api';
import type {
  PaginatedResponse,
  ProfissionalCustoMensalCreateDTO,
  ProfissionalCustoMensalDTO,
  ProfissionalCustoMensalUpdateDTO,
} from '@/types';

const ENDPOINTS = {
  base: '/profissionais-custos-mensais',
  byId: (id: number) => `/profissionais-custos-mensais/${id}`,
};

export interface ProfissionalCustoMensalFilters {
  profissionalId?: number;
  ano?: number;
  mes?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export const profissionalCustoMensalService = {
  async findAll(
    filters: ProfissionalCustoMensalFilters = {},
  ): Promise<PaginatedResponse<ProfissionalCustoMensalDTO>> {
    const params = new URLSearchParams();
    if (filters.profissionalId != null) params.append('profissionalId', String(filters.profissionalId));
    if (filters.ano != null) params.append('ano', String(filters.ano));
    if (filters.mes != null) params.append('mes', String(filters.mes));
    if (filters.page != null) params.append('page', String(filters.page));
    if (filters.size != null) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<ProfissionalCustoMensalDTO>>(`${ENDPOINTS.base}${query}`);
  },

  async findById(id: number): Promise<ProfissionalCustoMensalDTO> {
    return api.get<ProfissionalCustoMensalDTO>(ENDPOINTS.byId(id));
  },

  async create(data: ProfissionalCustoMensalCreateDTO): Promise<ProfissionalCustoMensalDTO> {
    return api.post<ProfissionalCustoMensalDTO>(ENDPOINTS.base, data);
  },

  async update(id: number, data: ProfissionalCustoMensalUpdateDTO): Promise<ProfissionalCustoMensalDTO> {
    return api.put<ProfissionalCustoMensalDTO>(ENDPOINTS.byId(id), data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },
};

export default profissionalCustoMensalService;

