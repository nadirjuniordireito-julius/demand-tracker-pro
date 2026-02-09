// =====================================================
// useApi Hook - Gerenciamento de estados de loading e erro
// =====================================================

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { setErrorHandledByHook } from '@/services/api';

export interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseApiOptions {
  showErrorToast?: boolean;
  successMessage?: string;
}

export function useApi<T>(initialData: T | null = null, options: UseApiOptions = {}) {
  const { showErrorToast = true } = options;
  const { toast } = useToast();
  
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async <R = T>(
      apiCall: () => Promise<R>,
      opts?: { 
        successMessage?: string;
        onSuccess?: (data: R) => void;
        onError?: (error: string) => void;
      }
    ): Promise<R | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Marca que o erro será tratado por este hook (evita toast duplicado na API)
      setErrorHandledByHook(true);
      
      try {
        const result = await apiCall();
        setState(prev => ({ ...prev, data: result as unknown as T, isLoading: false }));
        
        if (opts?.successMessage || options.successMessage) {
          toast({
            title: 'Sucesso',
            description: opts?.successMessage || options.successMessage,
          });
        }
        
        opts?.onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        const errorMessage = extractErrorMessage(err);
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
        
        const isAllowed404 = err && typeof err === 'object' && 'allow404' in err && (err as { allow404?: boolean }).allow404;
        if (showErrorToast && !isAllowed404) {
          toast({
            title: 'Erro',
            description: errorMessage,
            variant: 'destructive',
          });
        }
        
        opts?.onError?.(errorMessage);
        return null;
      } finally {
        // Reseta a flag após o tratamento
        setErrorHandledByHook(false);
      }
    },
    [toast, showErrorToast, options.successMessage]
  );

  const reset = useCallback(() => {
    setState({ data: initialData, isLoading: false, error: null });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

// Hook para múltiplas requisições em paralelo
export function useApiMultiple() {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const executeAll = useCallback(
    async <T>(
      apiCalls: (() => Promise<T>)[],
      opts?: { showErrors?: boolean }
    ): Promise<(T | null)[]> => {
      setIsLoading(true);
      setErrors([]);
      
      try {
        const results = await Promise.allSettled(apiCalls.map(call => call()));
        
        const processedResults = results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          }
          const errorMsg = extractErrorMessage(result.reason);
          setErrors(prev => [...prev, `Requisição ${index + 1}: ${errorMsg}`]);
          return null;
        });
        
        const failedCount = results.filter(r => r.status === 'rejected').length;
        if (failedCount > 0 && opts?.showErrors !== false) {
          toast({
            title: 'Erro',
            description: `${failedCount} requisição(ões) falharam`,
            variant: 'destructive',
          });
        }
        
        return processedResults;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  return { isLoading, errors, executeAll };
}

// Extrai mensagem de erro de diferentes formatos
function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  
  if (error && typeof error === 'object') {
    // Trata ApiError (classe customizada)
    if (error instanceof Error && 'status' in error) {
      const apiError = error as { message: string; status: number; errors?: Record<string, string> };
      if (apiError.errors && Object.keys(apiError.errors).length > 0) {
        const errorMessages = Object.values(apiError.errors).filter(Boolean);
        if (errorMessages.length > 0) {
          return errorMessages.join(', ');
        }
      }
      return apiError.message || 'Ocorreu um erro na requisição.';
    }
    
    // Trata objetos de erro genéricos
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    
    // Trata erros com campo 'errors'
    if ('errors' in error && typeof (error as { errors: unknown }).errors === 'object') {
      const errors = (error as { errors: Record<string, string> }).errors;
      const errorMessages = Object.values(errors).filter(Boolean);
      if (errorMessages.length > 0) {
        return errorMessages.join(', ');
      }
    }
    
    // Trata erros com campo 'error'
    if ('error' in error) {
      const errorValue = (error as { error: unknown }).error;
      if (typeof errorValue === 'string') {
        return errorValue;
      }
      if (errorValue && typeof errorValue === 'object' && 'message' in errorValue) {
        return String((errorValue as { message: unknown }).message);
      }
    }
  }
  
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export default useApi;
