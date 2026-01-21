// =====================================================
// Auth Service
// Serviço de autenticação para integração com backend Java
// =====================================================

import api, { setAuthToken, getAuthToken } from './api';
import type { AuthResponse, LoginRequest, Usuario } from '@/types';

const AUTH_ENDPOINTS = {
  login: '/auth/login',
  logout: '/auth/logout',
  me: '/auth/me',
  refresh: '/auth/refresh',
};

export const authService = {
  /**
   * Realiza login do usuário
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(AUTH_ENDPOINTS.login, credentials);
    setAuthToken(response.token);
    return response;
  },

  /**
   * Realiza logout do usuário
   */
  async logout(): Promise<void> {
    try {
      await api.post(AUTH_ENDPOINTS.logout);
    } finally {
      setAuthToken(null);
    }
  },

  /**
   * Obtém dados do usuário logado
   */
  async getCurrentUser(): Promise<Usuario> {
    return api.get<Usuario>(AUTH_ENDPOINTS.me);
  },

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  /**
   * Obtém o token atual
   */
  getToken(): string | null {
    return getAuthToken();
  },
};

export default authService;
