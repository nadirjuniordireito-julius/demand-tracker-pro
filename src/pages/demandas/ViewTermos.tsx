import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';

import {
  termoAberturaDocService,
  termoEncerramentoDocService,
  termoPlanejamentoDocService,
} from '@/services/termoDocService';

/**
 * Zoom inicial (escala absoluta no {@link Viewer}).
 * O botão “diminuir zoom” do `@react-pdf-viewer/zoom` salta entre níveis fixos (0,1 … 0,7, 0,8 …).
 * Com escala inicial 0,72, dois “zoom out” equivalem a: 0,72 → 0,7 → 0,6.
 */
const TRIPLE_PANEL_DEFAULT_SCALE = 0.6;

type PanelState = {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'noId';
  url: string | null;
};

const initialPanel = (): PanelState => ({ status: 'idle', url: null });

export interface ViewTermosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idTermoAbertura: number;
  idTermoPlanejamento: number;
  idTermoEncerramento: number;
}

function revokePanelUrl(panel: PanelState) {
  if (panel.url) URL.revokeObjectURL(panel.url);
}

function TermoPdfColumn({
  title,
  panel,
}: {
  title: string;
  panel: PanelState;
}) {
  const { t } = useTranslation();
  /** Não usar useMemo: `toolbarPlugin()` registra hooks e deve rodar no topo do render. */
  const toolbarPluginInstance = toolbarPlugin();
  const { Toolbar } = toolbarPluginInstance;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-md border bg-muted/30">
      <div className="shrink-0 border-b px-2 py-1.5 text-center text-xs font-medium text-muted-foreground sm:text-sm">
        {title}
      </div>
      {panel.status === 'loading' || panel.status === 'idle' ? (
        <div className="flex min-h-[50vh] flex-1 items-center justify-center px-2 text-center text-sm text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : panel.status === 'noId' ? (
        <div className="flex min-h-[50vh] flex-1 items-center justify-center px-2 text-center text-sm text-muted-foreground">
          {t('viewTermos.noTermId')}
        </div>
      ) : panel.status === 'error' ? (
        <div className="flex min-h-[50vh] flex-1 items-center justify-center px-2 text-center text-sm text-muted-foreground">
          {t('viewTermos.loadError')}
        </div>
      ) : panel.url ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b bg-background/80 px-1 py-1">
            <Toolbar>
              {(props) => (
                <div className="flex w-full items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1">
                    <props.ZoomOut />
                    <props.ZoomIn />
                  </div>
                  <props.Download />
                </div>
              )}
            </Toolbar>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <Viewer
              fileUrl={panel.url}
              plugins={[toolbarPluginInstance]}
              defaultScale={TRIPLE_PANEL_DEFAULT_SCALE}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ViewTermos({
  open,
  onOpenChange,
  idTermoAbertura,
  idTermoPlanejamento,
  idTermoEncerramento,
}: ViewTermosProps) {
  const { t } = useTranslation();
  const [abertura, setAbertura] = useState<PanelState>(initialPanel);
  const [planejamento, setPlanejamento] = useState<PanelState>(initialPanel);
  const [encerramento, setEncerramento] = useState<PanelState>(initialPanel);

  useEffect(() => {
    if (!open) {
      setAbertura((prev) => {
        revokePanelUrl(prev);
        return initialPanel();
      });
      setPlanejamento((prev) => {
        revokePanelUrl(prev);
        return initialPanel();
      });
      setEncerramento((prev) => {
        revokePanelUrl(prev);
        return initialPanel();
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const createdUrls: string[] = [];

    setAbertura((prev) => {
      revokePanelUrl(prev);
      return { status: 'loading', url: null };
    });
    setPlanejamento((prev) => {
      revokePanelUrl(prev);
      return { status: 'loading', url: null };
    });
    setEncerramento((prev) => {
      revokePanelUrl(prev);
      return { status: 'loading', url: null };
    });

    const loadOne = async (
      id: number,
      setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
      download: () => Promise<Blob>,
    ) => {
      if (id <= 0) {
        if (!cancelled) setPanel({ status: 'noId', url: null });
        return;
      }
      try {
        const blob = await download();
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        createdUrls.push(objectUrl);
        setPanel({ status: 'ready', url: objectUrl });
      } catch {
        if (!cancelled) setPanel({ status: 'error', url: null });
      }
    };

    void Promise.all([
      loadOne(idTermoAbertura, setAbertura, () =>
        termoAberturaDocService.downloadByTermoAberturaId(idTermoAbertura),
      ),
      loadOne(idTermoPlanejamento, setPlanejamento, () =>
        termoPlanejamentoDocService.downloadByTermoPlanejamentoId(idTermoPlanejamento),
      ),
      loadOne(idTermoEncerramento, setEncerramento, () =>
        termoEncerramentoDocService.downloadByTermoEncerramentoId(idTermoEncerramento),
      ),
    ]);

    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [open, idTermoAbertura, idTermoPlanejamento, idTermoEncerramento]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent
        className="flex max-h-[92vh] max-w-[98vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[98vw]"
        aria-describedby={undefined}
      >
        <DialogHeader className="relative shrink-0 space-y-0 border-b px-4 py-3 pr-14 text-left">
          <DialogTitle className="text-base font-medium">{t('viewTermos.title')}</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-sm"
            aria-label={t('common.close')}
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Worker workerUrl={workerSrc}>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-3 sm:grid-cols-3 sm:gap-6 sm:px-4 sm:py-3">
            <TermoPdfColumn title={t('nav.openingTerm')} panel={abertura} />
            <TermoPdfColumn title={t('nav.planningTerm')} panel={planejamento} />
            <TermoPdfColumn title={t('nav.closingTerm')} panel={encerramento} />
          </div>
        </Worker>
      </DialogContent>
    </Dialog>
  );
}
