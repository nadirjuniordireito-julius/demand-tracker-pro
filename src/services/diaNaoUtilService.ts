import api from './api';
import { diaNaoUtilSchema, paginatedDiaNaoUtilSchema } from '@/lib/schemas';
import type {
  DiaNaoUtil,
  DiaNaoUtilCreateDTO,
  DiaNaoUtilUpdateDTO,
  PaginatedResponse,
} from '@/types';

const ENDPOINTS = {
  base: '/dias-nao-uteis',
  byId: (id: number) => `/dias-nao-uteis/${id}`,
};

export interface DiaNaoUtilFilters {
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const diaNaoUtilService = {
  async findAll(filters: DiaNaoUtilFilters = {}): Promise<PaginatedResponse<DiaNaoUtil>> {
    const params = new URLSearchParams();

    if (filters.dataInicio) params.append('dataInicio', filters.dataInicio);
    if (filters.dataFim) params.append('dataFim', filters.dataFim);
    if (filters.page !== undefined) params.append('page', String(filters.page));
    if (filters.size !== undefined) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<DiaNaoUtil>>(`${ENDPOINTS.base}${query}`, {
      schema: paginatedDiaNaoUtilSchema,
    });
  },

  async findById(id: number): Promise<DiaNaoUtil> {
    return api.get<DiaNaoUtil>(ENDPOINTS.byId(id), { schema: diaNaoUtilSchema });
  },

  async create(data: DiaNaoUtilCreateDTO): Promise<DiaNaoUtil> {
    return api.post<DiaNaoUtil>(ENDPOINTS.base, data, { schema: diaNaoUtilSchema });
  },

  async update(id: number, data: DiaNaoUtilUpdateDTO): Promise<DiaNaoUtil> {
    return api.put<DiaNaoUtil>(ENDPOINTS.byId(id), data, { schema: diaNaoUtilSchema });
  },

  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },
};

export default diaNaoUtilService;
