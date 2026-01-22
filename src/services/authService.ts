// =====================================================
// Auth Service
// Serviço de autenticação para integração com backend Java
// =====================================================

import api, { setAuthToken, getAuthToken } from './api';
import type { AuthResponse, LoginRequest, Usuario } from '@/types';

// =====================================================
// MOCK MODE - Remover em produção
// =====================================================
const MOCK_MODE = true;
const MOCK_USER: Usuario = {
  id: 1,
  nome: 'Administrador',
  email: 'admin@empresa.com',
  perfil: 'A',
  status: 'A',
};
const MOCK_CREDENTIALS = {
  email: 'admin@empresa.com',
  password: 'admin123',
};
// =====================================================

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
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simula delay
      if (credentials.username === MOCK_CREDENTIALS.email && credentials.password === MOCK_CREDENTIALS.password) {
        const mockToken = 'mock-jwt-token-' + Date.now();
        setAuthToken(mockToken);
        return { token: mockToken, usuario: MOCK_USER, expiresIn: 3600 };
      }
      throw { message: 'Usuário ou senha inválidos', status: 401 };
    }
    
    const response = await api.post<AuthResponse>(AUTH_ENDPOINTS.login, credentials);
    setAuthToken(response.token);
    return response;
  },

  /**
   * Realiza logout do usuário
   */
  async logout(): Promise<void> {
    if (MOCK_MODE) {
      setAuthToken(null);
      return;
    }
    
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
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (getAuthToken()) {
        return MOCK_USER;
      }
      throw { message: 'Não autenticado', status: 401 };
    }
    
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
