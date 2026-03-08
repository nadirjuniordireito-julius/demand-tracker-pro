// =====================================================
// API Configuration
// Configuração base para integração com backend Java
// =====================================================

import { constants } from 'node:crypto';
import type { z } from 'zod';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const AUTH_TOKEN_STORAGE_KEY = 'auth_token';

/**
 * Token de autenticação: em memória + sessionStorage para sobreviver ao F5.
 * sessionStorage é limpo ao fechar a aba (para trocar para localStorage, use getItem/setItem de localStorage).
 */
let authToken: string | null = (() => {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();

export const setAuthToken = (token: string | null): void => {
  authToken = token;
  try {
    if (token) {
      sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch (_) {
    // storage indisponível (ex.: modo privado)
  }
};

export const getAuthToken = (): string | null => {
  return authToken;
};

/** Lê o token direto do sessionStorage (para restaurar no init após F5, sem depender da ordem de carga dos módulos). */
export const getStoredAuthToken = (): string | null => {
  try {

    const stored = sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    if (stored) {
      setAuthToken(stored); // coloca no axios header
    }

   //  return sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

// Headers padrão para requisições
const getHeaders = (): HeadersInit => {

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
};

// Classe de erro customizada para API
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  timestamp?: string;
  /** Quando true, 404 é "não encontrado" esperado (ex: busca sem resultado) e não deve exibir toast */
  allow404?: boolean;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string>,
    timestamp?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.timestamp = timestamp;
  }
}

// Função para extrair mensagem de erro da resposta
async function extractErrorFromResponse(response: Response): Promise<ApiError> {
  const status = response.status;
  let errorMessage = 'Erro na requisição';
  let errors: Record<string, string> | undefined;
  let timestamp: string | undefined;

  try {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      
      // Tenta diferentes formatos de resposta de erro do backend
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : errorData.error.message || errorMessage;
      } else if (errorData.title) {
        errorMessage = errorData.title;
      }
      
      // Tenta extrair mensagem de erro mais específica se houver detalhes
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
      
      errors = errorData.errors;
      timestamp = errorData.timestamp;
    } else {
      // Tenta ler como texto se não for JSON
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    }
  } catch (parseError) {
    if (import.meta.env.DEV) {
      console.warn('Erro ao parsear resposta de erro:', parseError);
    }
  }

  // Detecta e traduz erros de constraint de chave estrangeira
  if (errorMessage && typeof errorMessage === 'string') {
    const lowerMessage = errorMessage.toLowerCase();
    
    // Erro de constraint de chave estrangeira (não pode excluir porque está sendo usado)
    if (lowerMessage.includes('viola restrição de chave estrangeira') || 
        lowerMessage.includes('violates foreign key constraint') ||
        lowerMessage.includes('ainda é referenciada') ||
        lowerMessage.includes('still referenced') ||
        lowerMessage.includes('chave estrangeira') ||
        lowerMessage.includes('foreign key') ||
        lowerMessage.includes('é referenciada pela tabela') ||
        lowerMessage.includes('referenced by table')) {
      errorMessage = 'Este registro não pode ser excluído pois está sendo utilizado em outras partes do sistema.';
    }
    // Erro de constraint única (duplicado)
    else if (lowerMessage.includes('viola restrição única') || 
             lowerMessage.includes('violates unique constraint') ||
             lowerMessage.includes('duplicate key') ||
             lowerMessage.includes('unique constraint')) {
      errorMessage = 'Já existe um registro com estes dados. Verifique as informações.';
    }
    // Remove mensagens muito técnicas do início (erros 500 com mensagens longas)
    else if ((errorMessage.startsWith('Erro interno do servidor:') || 
              errorMessage.startsWith('could not execute')) && 
             errorMessage.length > 100) {
      // Tenta extrair uma mensagem mais amigável
      if (lowerMessage.includes('viola restrição') || 
          lowerMessage.includes('constraint') ||
          lowerMessage.includes('referenciada')) {
        errorMessage = 'Este registro não pode ser excluído pois está sendo utilizado em outras partes do sistema.';
      } else {
        errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
      }
    }
  }

  // Mensagens padrão baseadas no status HTTP
  if (!errorMessage || errorMessage === 'Erro na requisição') {
    switch (status) {
      case 400:
        errorMessage = 'Dados inválidos. Verifique as informações enviadas.';
        break;
      case 401:
        errorMessage = 'Não autorizado. Faça login novamente.';
        break;
      case 403:
        errorMessage = 'Acesso negado. Você não tem permissão para esta ação.';
        break;
      case 404:
        errorMessage = 'Recurso não encontrado.';
        break;
      case 409:
        errorMessage = 'Conflito. Este registro não pode ser processado.';
        break;
      case 422:
        errorMessage = 'Dados inválidos. Verifique os campos obrigatórios.';
        break;
      case 500:
        errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
        break;
      case 503:
        errorMessage = 'Serviço temporariamente indisponível. Tente novamente mais tarde.';
        break;
      default:
        errorMessage = `Erro na requisição (${status}). Tente novamente.`;
    }
  }

  return new ApiError(errorMessage, status, errors, timestamp);
}

export const silentRefresh = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) return false;


    if (res.status === 204) {
      return false;
    }
    /*
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      // 204 ou body vazio: mantém o token atual (ex.: restaurado do sessionStorage no F5)
      return true;
    }
      */

    const data = await res.json().catch(() => null);
    const newToken = data?.accessToken ?? data?.token ?? data?.access_token;
    if (newToken) {
      setAuthToken(newToken);
    }
    // Se não veio token no body, não limpa: evita perder sessão no F5; o loop 401 é evitado pelo _no401Retry no request()
    return true;
  } catch (err) {
    console.error('Silent refresh failed', err);
    return false;
  }
};
// Função para mostrar toast de erro (importada dinamicamente para evitar dependência circular)
let showErrorToastFn: ((error: ApiError) => void) | null = null;

export const setErrorToastHandler = (handler: (error: ApiError) => void) => {
  showErrorToastFn = handler;
};

// Flag para rastrear se o erro está sendo tratado por useApi (para evitar toast duplicado)
let isHandledByHook = false;

export const setErrorHandledByHook = (handled: boolean) => {
  isHandledByHook = handled;
};

/** Opções extras para request (silent, allow404, schema Zod para validar resposta) */
export type RequestOptions = RequestInit & {
  credentials?: RequestCredentials;
  silent?: boolean;
  allow404?: boolean;
  allow500?: boolean;
  schema?: z.ZodTypeAny;
  /** Uso interno: evita loop infinito 401 → refresh → 401 */
  _no401Retry?: boolean;
};
// Função genérica para fazer requisições
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { credentials, _no401Retry, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...fetchOptions,
    credentials: 'include', // <<<<<< ENVIA O COOKIE refresh_token
    headers: {
      ...getHeaders(),
      ...fetchOptions.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // Tratamento de erro de autenticação: só tenta refresh uma vez para não entrar em loop
    if (response.status === 401 && authToken && !_no401Retry) {
      const refreshed = await silentRefresh();
      if (refreshed) {
        return request<T>(endpoint, { ...options, _no401Retry: true });
      }
      setAuthToken(null);
      window.location.href = '/login';
      throw new ApiError('Sessão expirada. Faça login novamente.', 401);
    }
    if (response.status === 401) {
      setAuthToken(null);
      window.location.href = '/login';
      throw new ApiError('Sessão expirada. Faça login novamente.', 401);
    }

    // Tratamento de erros HTTP
    if (!response.ok) {
      const apiError = await extractErrorFromResponse(response);
      // if (credentials && response.status === 404) apiError.allow404 = true;

      if (response.status === 404 && !options.allow404 && options.silent) {
        return null as T;
      }

      if (!credentials && import.meta.env.DEV) {
        console.error(
          `[API Error] ${apiError.status} ${endpoint}:`,
          apiError.message,
          apiError.errors ? `| details: ${JSON.stringify(apiError.errors)}` : ''
        );
      }
      
      // Mostra toast automaticamente apenas se não estiver sendo tratado por hook
      // e não estiver em modo silencioso.
      // Não exibe toast para 401 quando não há token (usuário já está na tela de login).
      if (!credentials && !isHandledByHook && showErrorToastFn && !(response.status === 401 && !authToken)) {
        showErrorToastFn(apiError);
      }
      
      throw apiError;
    }

    // Retorna vazio para respostas 204
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    // Se já for um ApiError, apenas relança
    if (error instanceof ApiError) {
      const isUnauthorizedOnLoginPage = error.status === 401 && !authToken;
      if (!isHandledByHook && showErrorToastFn && !error.message.includes('Sessão expirada') && !error.allow404 && !isUnauthorizedOnLoginPage) {
        showErrorToastFn(error);
      }
      throw error;
    }
    
    // Tratamento de erros de rede
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (!credentials && import.meta.env.DEV) {
        console.error('Network Error:', error);
      }
      const networkError = new ApiError(
        'Erro de conexão. Verifique sua internet e tente novamente.',
        0
      );
      if (!credentials && !isHandledByHook && showErrorToastFn) {
        showErrorToastFn(networkError);
      }
      throw networkError;
    }
    
    if (!credentials && import.meta.env.DEV) {
      console.error('API Error:', error);
    }
    const genericError = new ApiError(
      error instanceof Error ? error.message : 'Ocorreu um erro inesperado. Tente novamente.',
      0
    );
    if (!credentials && !isHandledByHook && showErrorToastFn) {
      showErrorToastFn(genericError);
    }
    throw genericError;
  }
}

// Métodos HTTP
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * Upload multipart (POST ou PUT) usando o mesmo token e tratamento de 401 do api.
 * Não define Content-Type para o browser definir boundary.
 */
export async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { method, headers, body: formData });

  if (response.status === 401) {
    setAuthToken(null);
    window.location.href = '/login';
    throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  }
  if (!response.ok) {
    throw await extractErrorFromResponse(response.clone());
  }
  if (response.status === 204) return {} as T;
  return response.json();
}

/**
 * Download de blob usando o mesmo token e tratamento de 401 do api.
 */
export async function downloadBlob(endpoint: string): Promise<Blob> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { method: 'GET', headers });

  if (response.status === 401) {
    setAuthToken(null);
    window.location.href = '/login';
    throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  }
  if (!response.ok) {
    throw await extractErrorFromResponse(response.clone());
  }
  return response.blob();
}

export default api;
