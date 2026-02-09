// =====================================================
// API Error Handler
// Helper para tratamento padronizado de erros da API
// =====================================================

import { ApiError, setErrorToastHandler } from '@/services/api';
import { toast } from '@/hooks/use-toast';

// Configura o handler de toast na API para tratamento centralizado
setErrorToastHandler((error: ApiError) => {
  let errorMessage = error.message;
  
  // Se houver erros de validação, mostra todos
  if (error.errors && Object.keys(error.errors).length > 0) {
    const validationErrors = Object.values(error.errors).filter(Boolean);
    if (validationErrors.length > 0) {
      errorMessage = validationErrors.join(', ');
    }
  }
  
  toast({
    title: 'Erro',
    description: errorMessage,
    variant: 'destructive',
  });
});

/**
 * Extrai mensagem de erro de unknown (sem exibir toast).
 * Use em catch (err: unknown) para tipagem segura.
 */
export function getErrorMessage(error: unknown, defaultMessage = 'Ocorreu um erro.'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    if ('responseText' in error && typeof (error as { responseText: unknown }).responseText === 'string') {
      return (error as { responseText: string }).responseText;
    }
  }
  return defaultMessage;
}

/**
 * Extrai status HTTP de um erro (quando disponível).
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const s = (error as { status: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

/**
 * Trata erros da API e exibe mensagem apropriada ao usuário
 * @param error - Erro capturado
 * @param defaultMessage - Mensagem padrão caso não seja possível extrair do erro
 * @returns Mensagem de erro extraída
 */
export function handleApiError(error: unknown, defaultMessage = 'Ocorreu um erro. Tente novamente.'): string {
  let errorMessage = defaultMessage;

  // Trata ApiError (classe customizada)
  if (error instanceof ApiError) {
    errorMessage = error.message;
    
    // Se houver erros de validação, mostra todos
    if (error.errors && Object.keys(error.errors).length > 0) {
      const validationErrors = Object.values(error.errors).filter(Boolean);
      if (validationErrors.length > 0) {
        errorMessage = validationErrors.join(', ');
      }
    }
    
    if (!error.allow404) {
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
    
    return errorMessage;
  }

  // Trata Error genérico
  if (error instanceof Error) {
    errorMessage = error.message;
    toast({
      title: 'Erro',
      description: errorMessage,
      variant: 'destructive',
    });
    return errorMessage;
  }

  // Trata objetos de erro
  if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      errorMessage = (error as { message: string }).message;
    } else if ('error' in error) {
      const errorValue = (error as { error: unknown }).error;
      if (typeof errorValue === 'string') {
        errorMessage = errorValue;
      }
    }
  }

  // Exibe toast com mensagem de erro
  toast({
    title: 'Erro',
    description: errorMessage,
    variant: 'destructive',
  });

  return errorMessage;
}

/**
 * Wrapper para operações CRUD que trata erros automaticamente
 * @param operation - Função assíncrona a ser executada
 * @param errorMessage - Mensagem de erro customizada (opcional)
 * @returns Resultado da operação ou null em caso de erro
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleApiError(error, errorMessage);
    return null;
  }
}
