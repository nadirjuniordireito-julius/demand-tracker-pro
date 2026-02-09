import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface ProcessingOverlayProps {
  visible: boolean;
  message?: string;
}

/**
 * Overlay bloqueante com spinner e mensagem.
 * Impede interação do usuário durante processos demorados.
 */
export function ProcessingOverlay({ visible, message }: ProcessingOverlayProps) {
  const { t } = useTranslation();
  const displayMessage = message ?? t('common.processingPleaseWait');

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex cursor-wait items-center justify-center bg-background/80 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
      role="alert"
    >
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card px-8 py-6 shadow-lg">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm font-normal text-muted-foreground">{displayMessage}</p>
      </div>
    </div>
  );
}
