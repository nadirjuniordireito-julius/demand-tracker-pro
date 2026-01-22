// =====================================================
// useApi Hook - Gerenciamento de estados de loading e erro
// =====================================================

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
        
        if (showErrorToast) {
          toast({
            title: 'Erro',
            description: errorMessage,
            variant: 'destructive',
          });
        }
        
        opts?.onError?.(errorMessage);
        return null;
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
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    if ('errors' in error && typeof (error as { errors: unknown }).errors === 'object') {
      const errors = (error as { errors: Record<string, string> }).errors;
      return Object.values(errors).join(', ');
    }
  }
  
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export default useApi;
