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
import { Worker, Viewer, type RenderPageProps } from '@react-pdf-viewer/core';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import {
  termoAberturaDocService,
  termoPlanejamentoDocService,
  termoEncerramentoDocService,
} from '@/services/termoDocService';
import { CenteredOverlayMessage } from '@/components/common/CenteredOverlayMessage';

import '@react-pdf-viewer/core/lib/styles/index.css';

export type AssinarEletronicaTipo = 'encerramento' | 'planejamento' | 'abertura';

export interface PdfSignaturePositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título do modal (ex.: "Posicionar assinatura") */
  title?: string;
  /** Texto auxiliar no topo explicando o que fazer. */
  description?: React.ReactNode;
  /** Blob do PDF a ser assinado. */
  pdfBlob: Blob | null;
  /** Função que envia o PDF e a posição da assinatura para o backend e retorna o PDF assinado. */
  signPdf?: (payload: {
    pdfBlob: Blob;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }) => Promise<Blob>;
  /** Callback chamado quando o backend retorna o PDF assinado. */
  onSigned?: (signedPdf: Blob) => void;
  /** Se informado, o botão do footer dispara assinatura eletrônica (hash + backend) em vez de signPdf. */
  assinarEletronica?: { tipo: AssinarEletronicaTipo; docId: number; userId: number };
  /** Chamado após assinatura eletrônica concluída com sucesso (ex.: recarregar lista). */
  onAssinaturaConcluida?: () => void;
}

type SignatureRect = {
  pageIndex: number;
  pageNumber: number;
  centerXRel: number;
  centerYRel: number;
  x: number;
  y: number;
  width: number;
  height: number;
  // Coordenadas na tela para desenhar o retângulo de preview
  screenX: number;
  screenY: number;
};

async function gerarHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function PdfSignaturePositionDialog({
  open,
  onOpenChange,
  title,
  description,
  pdfBlob,
  signPdf,
  onSigned,
  assinarEletronica,
  onAssinaturaConcluida,
}: PdfSignaturePositionDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [signatureRect, setSignatureRect] = useState<SignatureRect | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isShowSignature, setIsShowSignature] = useState(false);
  const [isPositionLocked, setIsPositionLocked] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const pdfBlobRef = useRef<Blob | null>(null);
  const boxWidth = 200;
  const boxHeight = 90;

  pdfBlobRef.current = pdfBlob;

  useEffect(() => {
    if (!open) {
      if (url) {
        URL.revokeObjectURL(url);
        setUrl(null);
      }
      setSignatureRect(null);
      setIsSigning(false);
      setIsPositionLocked(false);
      setShowSuccessOverlay(false);
      return;
    }

    if (!pdfBlob) return;

    const objectUrl = URL.createObjectURL(pdfBlob);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [open, pdfBlob]);

  const handleClose = () => {
    if (url) {
      URL.revokeObjectURL(url);
      setUrl(null);
    }
    setSignatureRect(null);
    setIsSigning(false);
    setIsPositionLocked(false);
    setShowSuccessOverlay(false);
    onOpenChange(false);
  };

  const handlePageMouseMove = (e: React.MouseEvent<HTMLDivElement>, props: RenderPageProps) => {
    if (isPositionLocked) return;
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const renderedWidth = rect.width;
    const renderedHeight = rect.height;
    if (renderedWidth <= 0 || renderedHeight <= 0) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerXRel = mouseX / renderedWidth;
    const centerYRel = mouseY / renderedHeight;

    // As coordenadas de desenho no backend usam o
    // sistema de pontos do PDF (A4 ≈ 595x842 pt).
    const pdfWidthPts = 595; // largura em pontos
    const pdfHeightPts = 842; // altura em pontos

    const pdfX = centerXRel * pdfWidthPts;
    const pdfY = pdfHeightPts - centerYRel * pdfHeightPts;

    const pagina = props.pageIndex + 1;

    const nextRect: SignatureRect = {
      pageIndex: props.pageIndex,
      pageNumber: pagina, // props.pageIndex + 1,
      centerXRel,
      centerYRel,
      x: pdfX,
      y: pdfY,
      width: boxWidth,
      height: boxHeight,
      screenX: e.clientX,
      screenY: e.clientY,
    };

    setSignatureRect(nextRect);
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, props: RenderPageProps) => {
    if (isPositionLocked) {
      setIsPositionLocked(false);
      return;
    }
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const renderedWidth = rect.width;
    const renderedHeight = rect.height;
    if (renderedWidth <= 0 || renderedHeight <= 0) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerXRel = mouseX / renderedWidth;
    const centerYRel = mouseY / renderedHeight;

    const pdfWidthPts = 595;
    const pdfHeightPts = 842;

    const pdfX = centerXRel * pdfWidthPts;
    const pdfY = pdfHeightPts - centerYRel * pdfHeightPts;

    const nextRect: SignatureRect = {
      pageIndex: props.pageIndex,
      pageNumber: props.pageIndex + 1,
      centerXRel,
      centerYRel,
      x: pdfX,
      y: pdfY,
      width: boxWidth,
      height: boxHeight,
      screenX: e.clientX,
      screenY: e.clientY,
    };
    setSignatureRect(nextRect);
    setIsPositionLocked(true);
  };

  const handlePageMouseLeave = (pageIndex: number) => {
    if (!isPositionLocked) {
      setSignatureRect((current) =>
        current && current.pageIndex === pageIndex ? null : current
      );
    }
  };

  const handleConfirm = async () => {
    const blob = pdfBlobRef.current;
    if (!blob) return;

    try {
      setIsSigning(true);

      if (assinarEletronica) {
        const hashPdf = await gerarHash(blob);
        const { tipo, docId, userId } = assinarEletronica;
        if (tipo === 'encerramento') {
          await termoEncerramentoDocService.assinar(
            docId,
            hashPdf,
            userId,
            signatureRect.pageNumber,
            signatureRect.x,
            signatureRect.y,
            signatureRect.width,
            signatureRect.height
          );
        } else if (tipo === 'planejamento') {
          await termoPlanejamentoDocService.assinar(
            docId,
            hashPdf,
            userId,
            signatureRect.pageNumber,
            signatureRect.x,
            signatureRect.y,
            signatureRect.width,
            signatureRect.height
          );
        } else if (tipo === 'abertura' && signatureRect) {
          await termoAberturaDocService.assinar(
            docId,
            hashPdf,
            userId,
            signatureRect.pageNumber,
            signatureRect.x,
            signatureRect.y,
            signatureRect.width,
            signatureRect.height
          );
        }
        toast({
          title: t('common.success'),
          description: t('common.documentSignedSuccessfully'),
        });
        // Mostra overlay de sucesso; fechamento e refresh serão feitos no botão OK
        setShowSuccessOverlay(true);
        setIsSigning(false);
        return;
      }

      if (signPdf && signatureRect) {
        const signed = await signPdf({
          pdfBlob: blob,
          page: signatureRect.pageNumber,
          x: signatureRect.x,
          y: signatureRect.y,
          width: signatureRect.width,
          height: signatureRect.height,
        });
        onSigned?.(signed);
        handleClose();
      }
    } catch (err) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('common.error')),
        variant: 'destructive',
      });
      setIsSigning(false);
    }
  };

  const renderPage = (props: RenderPageProps) => {
    
    
    const { canvasLayer, annotationLayer, textLayer } = props;
    setIsShowSignature(signatureRect != null && signatureRect.pageIndex === props.pageIndex);
    const boxWidth = signatureRect?.width ?? 180;
    const boxHeight = signatureRect?.height ?? 60;

    const leftPercent = isShowSignature
      ? `${(signatureRect!.centerXRel * 100).toFixed(2)}%`
      : '50%';
    const topPercent = isShowSignature
      ? `${(signatureRect!.centerYRel * 100).toFixed(2)}%`
      : '50%';

    return (
      <>
       
        <div
          style={{ cursor: 'crosshair' }}
          onMouseMove={(e) => handlePageMouseMove(e, props)}
          onMouseLeave={() => handlePageMouseLeave(props.pageIndex)}
        >
          {canvasLayer.children}
          {annotationLayer.children}
          {textLayer.children}
          {/* Overlay para capturar mouse: canvas do PDF recebe os eventos; esta div fica por cima e chama handlePageMouseMove */}
          <div
            style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', zIndex: 10 }}
            onMouseMove={(e) => handlePageMouseMove(e, props)}
            onMouseLeave={() => handlePageMouseLeave(props.pageIndex)}
            onClick={(e) => handlePageClick(e, props)}
          />

          {isShowSignature && (
            <div
              style={{
                position: 'absolute',
                left: `calc(${leftPercent} - ${boxWidth / 2}px)`,
                top: `calc(${topPercent} - ${boxHeight / 2}px)`,
                width: boxWidth,
                height: boxHeight,
                borderRadius: 4,
                border: '2px solid #2563eb',
                backgroundColor: 'rgba(37,99,235,0.08)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                padding: 6,
                pointerEvents: 'none',
              }}
            >
              <span className="text-[11px] font-medium text-[#1e3a8a]">
                {t('pdf.signaturePreviewLabel', 'Sua assinatura')}
              </span>
              <span className="mt-1 text-[10px] text-[#1f2937]">
                {t(
                  'pdf.signaturePreviewHint',
                  'Clique onde deseja inserir a assinatura.'
                )}
              </span>
            </div>
          )}
        </div>

      </>
    );
  };

  const effectiveTitle =
    title ?? t('pdf.signatureDialogTitle', 'Posicionar assinatura no documento');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Enquanto o overlay de sucesso estiver aberto,
        // ignora tentativas de fechar por clique fora ou ESC.
        if (!next && showSuccessOverlay) {
          return;
        }
        if (next) {
          onOpenChange(true);
        } else {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[90vw] max-w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{effectiveTitle}</DialogTitle>
          <DialogDescription>
            {description ??
              t(
                'pdf.signatureDialogDescription',
                'Arraste o retângulo "Sua assinatura" até o local desejado no documento.'
              )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {url ? (
            <Worker workerUrl={workerSrc}>
              <Viewer fileUrl={url} renderPage={renderPage} />
            </Worker>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>

          <Button
            type="button"
            disabled={
              isSigning ||
              (assinarEletronica ? !pdfBlob : !signatureRect)
            }
            onClick={handleConfirm}
          >
            {isSigning
              ? t('pdf.signingLoading', 'Assinando...')
              : t('pdf.signAndFinish', 'Assine o documento')}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Overlay de sucesso bloqueante */}
      <CenteredOverlayMessage
        open={showSuccessOverlay}
        title={t('common.success')}
        description={t('common.documentSignedSuccessfully')}
        confirmLabel={t('common.ok', 'OK')}
        onConfirm={() => {
          setShowSuccessOverlay(false);
          onAssinaturaConcluida?.();
          handleClose();
        }}
      />
    </Dialog>
  );
}

