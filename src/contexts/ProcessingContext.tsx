import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { ProcessingOverlay } from '@/components/common/ProcessingOverlay';

interface ProcessingContextType {
  /** Exibe o overlay bloqueante */
  showProcessing: (message?: string) => void;
  /** Oculta o overlay */
  hideProcessing: () => void;
  /** Executa uma função assíncrona com overlay visível durante a execução */
  withProcessing: <T>(fn: () => Promise<T>, message?: string) => Promise<T>;
}

const ProcessingContext = createContext<ProcessingContextType | null>(null);

interface ProcessingProviderProps {
  children: ReactNode;
}

export function ProcessingProvider({ children }: ProcessingProviderProps) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const showProcessing = useCallback((msg?: string) => {
    setMessage(msg);
    setVisible(true);
  }, []);

  const hideProcessing = useCallback(() => {
    setVisible(false);
    setMessage(undefined);
  }, []);

  const withProcessing = useCallback(
    async <T,>(fn: () => Promise<T>, msg?: string): Promise<T> => {
      showProcessing(msg);
      try {
        const result = await fn();
        return result;
      } finally {
        hideProcessing();
      }
    },
    [showProcessing, hideProcessing]
  );

  return (
    <ProcessingContext.Provider value={{ showProcessing, hideProcessing, withProcessing }}>
      {children}
      <ProcessingOverlay visible={visible} message={message} />
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const ctx = useContext(ProcessingContext);
  if (!ctx) {
    throw new Error('useProcessing must be used within ProcessingProvider');
  }
  return ctx;
}
