// =====================================================
// Usuarios Service
// Serviço de CRUD para entidade Usuario
// =====================================================

import api from './api';
import type { 
  Usuario, 
  UsuarioCreateDTO, 
  UsuarioUpdateDTO, 
  PaginatedResponse 
} from '@/types';

const ENDPOINTS = {
  base: '/usuarios',
  byId: (id: number) => `/usuarios/${id}`,
};

export interface UsuarioFilters {
  nome?: string;
  perfil?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}

type UsuarioWritePayload = {
  email?: string | null;
  username?: string | null;
};

/**
 * O backend usa `username` no login (/auth/login) e pode manter `email` desatualizado
 * se o PUT enviar só um dos campos. Sincroniza ambos com o valor informado no formulário.
 */
function normalizeUsuarioWritePayload<T extends UsuarioWritePayload>(data: T): T {
  if (!Object.prototype.hasOwnProperty.call(data, 'email')) {
    return data;
  }

  const raw = data.email;
  const trimmed = typeof raw === 'string' ? raw.trim() : raw;

  if (trimmed) {
    return { ...data, email: trimmed, username: trimmed };
  }

  if (raw === '' || raw === null) {
    return { ...data, email: null, username: null };
  }

  return data;
}

export const usuarioService = {
  /**
   * Lista todos os usuários com paginação e filtros
   */
  async findAll(filters: UsuarioFilters = {}): Promise<PaginatedResponse<Usuario>> {
    const params = new URLSearchParams();
    
    if (filters.nome) params.append('nome', filters.nome);
    if (filters.perfil) params.append('perfil', filters.perfil);
    if (filters.status) params.append('status', filters.status);
    if (filters.page !== undefined) params.append('page', String(filters.page));
    if (filters.size !== undefined) params.append('size', String(filters.size));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<PaginatedResponse<Usuario>>(`${ENDPOINTS.base}${query}`);
  },

  /**
   * Busca um usuário por ID
   */
  async findById(id: number): Promise<Usuario> {
    return api.get<Usuario>(ENDPOINTS.byId(id));
  },

  /**
   * Cria um novo usuário
   */
  async create(data: UsuarioCreateDTO): Promise<Usuario> {
    return api.post<Usuario>(ENDPOINTS.base, normalizeUsuarioWritePayload(data));
  },

  /**
   * Atualiza um usuário existente
   */
  async update(id: number, data: UsuarioUpdateDTO): Promise<Usuario> {
    return api.put<Usuario>(ENDPOINTS.byId(id), data);
  },

  /**
   * Remove um usuário
   */
  async delete(id: number): Promise<void> {
    return api.delete(ENDPOINTS.byId(id));
  },
};

export default usuarioService;
