import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { ProdutoResumoDTO } from '@/types';
import { ProdutoVidaView } from './ProdutoVidaView';

interface ProdutoVidaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: ProdutoResumoDTO | null;
}

/**
 * Modal reutilizável que exibe a "vida" de um produto a partir do
 * ProdutoResumoDTO. Pode ser invocado a partir de qualquer tela passando o
 * registro como propriedade.
 */
export function ProdutoVidaModal({ open, onOpenChange, produto }: ProdutoVidaModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[92vh] w-[1080px] max-w-[94vw] overflow-hidden p-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{t('produto.vida.title')}</DialogTitle>
        <button
          type="button"
          aria-label={t('common.close')}
          className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md bg-background/95 text-muted-foreground transition hover:text-foreground"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="h-full overflow-y-auto p-6 pt-8">
          {produto ? (
            <ProdutoVidaView produto={produto} stickyHero />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t('produto.vida.noData')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProdutoVidaModal;
