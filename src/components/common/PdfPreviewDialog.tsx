import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

import { Worker, Viewer } from '@react-pdf-viewer/core';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';
import {
  PdfSignaturePositionDialog,
  type AssinarEletronicaTipo,
} from './PdfSignaturePositionDialog';

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

  /** Footer customizado */
  customFooter?: React.ReactNode;

  /** Abre o fluxo de posicionamento/assinatura visual (modal separada). */
  onRequestSignature?: (args: { pdfBlob: Blob }) => void;
  /** Se informado, o modal de assinatura usa assinatura eletrônica (hash + backend). */
  assinarEletronica?: { tipo: AssinarEletronicaTipo; docId: number; userId: number };
  /** Chamado após assinatura eletrônica concluída. */
  onAssinaturaConcluida?: () => void;
  /** Renderiza o botão de assinar na toolbar (por padrão, nenhum botão é exibido). */
  renderSignButton?: (args: {
    pdfBlob: Blob | null;
    openSignatureDialog: () => void;
  }) => React.ReactNode;
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
  closeLabel,
  downloadLabel,
  onError,
  customFooter,
  onRequestSignature,
  assinarEletronica,
  onAssinaturaConcluida,
  renderSignButton,
}: PdfPreviewDialogProps) {

  const [isSigningMode, setIsSigningMode] = useState(false);
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const fetchPdfRef = useRef(fetchPdf);
  fetchPdfRef.current = fetchPdf;

  const toolbarPluginInstance = toolbarPlugin();
  const { Toolbar } = toolbarPluginInstance;
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      if (url) URL.revokeObjectURL(url);
      setUrl(null);
      setPdfBlob(null);
      setFetchError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(false);

    fetchPdfRef.current()
      .then((blob) => {
        if (cancelled) return;
        setPdfBlob(blob);
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
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
    setPdfBlob(null);
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

  // TODO: Fluxo de assinatura visual agora acontece em um modal separado.
  // Este componente fica responsável apenas por pré-visualizar o PDF
  // e expor o botão \"Assinar\" na toolbar."

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-[90vw] max-w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex-1 overflow-auto flex flex-col">
          {/* Toolbar básica (zoom) + botão Assinar (abre modal de posicionamento) */}
          {url && (
            <div className="border-b px-4 py-2">
              <Toolbar>
                {(props) => {
                  const { ZoomIn, ZoomOut, Download } = props;

                  const openSignatureDialog = () => {
                    if (!pdfBlob) return;
                    if (onRequestSignature) {
                      onRequestSignature({ pdfBlob });
                    }
                    setSignatureDialogOpen(true);
                  };

                  return (
                    <div className="flex items-center gap-2">
                      <ZoomOut />
                      <ZoomIn />
                      <Download />

                      {renderSignButton &&
                        renderSignButton({ pdfBlob, openSignatureDialog })}
                    </div>
                  );
                }}
              </Toolbar>
            </div>
          )}

          {/* 🔥 Viewer */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  {loadingLabel ?? t('common.loading')}
                </p>
              </div>
            ) : fetchError ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  {errorMessage ?? t('common.error')}
                </p>
              </div>
            ) : url ? (
              <Worker workerUrl={workerSrc}>
                <Viewer fileUrl={url} plugins={[toolbarPluginInstance]} />
              </Worker>
            ) : null}
          </div>
        </div>

        {customFooter ? (
          <DialogFooter className="px-6 py-4 border-t">
            {customFooter}
          </DialogFooter>
        ) : (
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              {closeLabel ?? t('common.close')}
            </Button>

            {downloadFileName && url && (
              <Button onClick={handleDownload}>
                <FileDown className="h-4 w-4 mr-2" />
                {downloadLabel ?? t('common.download')}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>

      {/* Modal separada para posicionar visualmente a assinatura */}
      <PdfSignaturePositionDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        pdfBlob={pdfBlob}
        signPdf={undefined}
        onSigned={(signed) => {
          if (url) URL.revokeObjectURL(url);
          const objectUrl = URL.createObjectURL(signed);
          setUrl(objectUrl);
          setPdfBlob(signed);
        }}
        assinarEletronica={assinarEletronica}
        onAssinaturaConcluida={onAssinaturaConcluida}
      />
    </Dialog>
  );
}