import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

export interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  /** When the dialog opens, this function is called to obtain the PDF blob. */
  fetchPdf: () => Promise<Blob>;
  /** Label shown while loading (e.g. "Carregando..." or "Gerando PDF..."). */
  loadingLabel?: string;
  /** Message shown when fetch fails. */
  errorMessage?: string;
  /** If provided, a Download button is shown and the file is saved with this name. */
  downloadFileName?: string;
  /** Label for the Close button. */
  closeLabel?: string;
  /** Label for the Download button. */
  downloadLabel?: string;
  /** Called when fetch fails (e.g. to show a toast). */
  onError?: (error: unknown) => void;
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  fetchPdf,
  loadingLabel,
  errorMessage,
  downloadFileName,
  closeLabel = 'Fechar',
  downloadLabel = 'Download',
  onError,
}: PdfPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const fetchPdfRef = useRef(fetchPdf);
  fetchPdfRef.current = fetchPdf;

  useEffect(() => {
    if (!open) {
      if (url) {
        URL.revokeObjectURL(url);
        setUrl(null);
      }
      setFetchError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    setUrl(null);

    fetchPdfRef
      .current()
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(true);
        onError?.(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleClose = () => {
    if (url) {
      URL.revokeObjectURL(url);
      setUrl(null);
    }
    setFetchError(false);
    onOpenChange(false);
  };

  const handleDownload = () => {
    if (!url || !downloadFileName) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-[90vw] max-w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          {description != null && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground">{loadingLabel ?? 'Carregando…'}</p>
              </div>
            </div>
          ) : fetchError ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">{errorMessage ?? 'Erro ao carregar o documento.'}</p>
            </div>
          ) : url ? (
            <iframe
              src={url}
              className="w-full h-full border-0"
              title={title}
            />
          ) : null}
        </div>
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            {closeLabel}
          </Button>
          {downloadFileName != null && url != null && (
            <Button variant="default" onClick={handleDownload}>
              <FileDown className="h-4 w-4 mr-2" />
              {downloadLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
