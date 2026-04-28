import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { dashboardService } from '@/services/dashboardService';
import { Page } from '@/types';
import { useProject } from '@/contexts/ProjectContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DemandaTecnica } from '@/types';
import { getStatusBadge } from '@/components/common/statusBadge';
import { Button } from '@/components/ui/button';
import { Eye, Download, Upload, FileSignature } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import { termoAberturaDocService, termoPlanejamentoDocService, termoEncerramentoDocService } from '@/services/termoDocService';
import type { AssinarEletronicaTipo } from '@/components/common/PdfSignaturePositionDialog';
import { formatDateTime } from '@/helpers/formatDate';
import { demandaService } from '@/services/demandaService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type VisualizadorDemandaCardProps = {
  /** Caractere exibido em destaque à esquerda (usa o primeiro caractere não vazio). */
  letter: string;
  title: string;
  subtitle: string;
  description: string;
  statusSlot?: ReactNode;
  actions: ReactNode;
};

function VisualizadorDemandaCard({
  letter,
  title,
  subtitle,
  description,
  statusSlot,
  actions,
}: VisualizadorDemandaCardProps) {
  const trimmed = letter.trim();
  const displayLetter = trimmed ? trimmed[0]!.toUpperCase() : '?';

  return (
    <Card className="card-shadow-bottom-right flex flex-row overflow-hidden rounded-xl border shadow-none">
      <div className="flex w-[min(30%,7.25rem)] min-w-[5.25rem] max-w-[7.25rem] shrink-0 flex-col items-center justify-center self-stretch border-r border-border/50 px-2 py-1.5 sm:px-2.5 sm:py-2">
        <Card className="border-0 bg-transparent shadow-none">
          <div className="relative flex h-[5.35rem] w-[5.35rem] shrink-0 items-center justify-center overflow-hidden rounded-lg sm:h-[5.9rem] sm:w-[5.9rem]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(
                    -48deg,
                    transparent 0px,
                    transparent 6px,
                    rgba(50, 50, 60, 0.035) 6px,
                    rgba(50, 50, 60, 0.035) 7px
                  ),
                  radial-gradient(
                    ellipse 64% 64% at 50% 50%,
                    rgba(88, 88, 100, 0.34) 0%,
                    rgba(102, 102, 114, 0.22) 24%,
                    rgba(118, 118, 130, 0.11) 42%,
                    rgba(150, 150, 162, 0.04) 56%,
                    rgba(200, 200, 210, 0) 72%
                  )
                `,
              }}
            />
            <span className="relative z-[1] select-none text-[calc(5.35rem*0.88)] font-bold leading-none tracking-tight text-foreground/70 sm:text-[calc(5.9rem*0.88)]">
              {displayLetter}
            </span>
          </div>
        </Card>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 px-3 py-2.5 sm:px-3.5 sm:py-3">
        <div className="min-w-0 space-y-1">
          <p className="min-w-0 text-base font-bold leading-snug text-foreground">{title}</p>
          <p className="text-sm leading-normal text-muted-foreground">{subtitle}</p>
          <p className="line-clamp-3 text-sm italic leading-normal text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {statusSlot ? <div className="shrink-0">{statusSlot}</div> : null}
          <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border/40 pt-1.5">{actions}</div>
        </div>
      </div>
    </Card>
  );
}

function getDemandaTermoLetter(demanda: DemandaTecnica): 'A' | 'P' | 'E' {
  if (demanda.status === 'B' && demanda.termoAbertura) return 'A';
  if (demanda.status === 'D' && demanda.termoPlanejamento) return 'P';
  if (demanda.status === 'F' && demanda.termoEncerramento) return 'E';

  // Fallback seguro mantendo a regra de fluxo por status.
  if (demanda.status === 'B') return 'A';
  if (demanda.status === 'D') return 'P';
  return 'E';
}

export default function HomePageVisualizador() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { selectedProject } = useProject();
  const [page, setPage] = useState<Page<DemandaTecnica> | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const projetoId = selectedProject.id; // ou vindo do contexto
  const [selectedDemanda, setSelectedDemanda] = useState<DemandaTecnica | null>(null);
  const [isAssinarEletronicaOpen, setIsAssinarEletronicaOpen] = useState(false);
  const [documentoNome, setDocumentoNome] = useState<string | null>(null);
  const [documentoFetcher, setDocumentoFetcher] = useState<(() => Promise<Blob>) | null>(null);
  const [assinarEletronicaConfig, setAssinarEletronicaConfig] = useState<{
    tipo: AssinarEletronicaTipo;
    docId: number;
    userId: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadConfirmOpen, setIsUploadConfirmOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [pendingUploadDemanda, setPendingUploadDemanda] = useState<DemandaTecnica | null>(null);
/** ajustar o documento para trabalho */
const ajustarDocumentoParaTrabalho = async (demanda: DemandaTecnica): Promise<boolean> => {
  setSelectedDemanda(demanda);
  setDocumentoNome(null);
  setDocumentoFetcher(null);
  setAssinarEletronicaConfig(null);

  if (demanda.status === 'F' && demanda.termoEncerramento) {
    try {
      const doc1 = await termoEncerramentoDocService.findByTermoEncerramentoId(demanda.termoEncerramento.id);
      setDocumentoNome(doc1?.nomeArquivo ?? null);
    } catch {
      setDocumentoNome(null);
    }
    setDocumentoFetcher(() => () => termoEncerramentoDocService.downloadByTermoEncerramentoId(demanda.termoEncerramento.id));
    return true;
  } else if (demanda.status === 'D' && demanda.termoPlanejamento) {
    try {
      const doc2 = await termoPlanejamentoDocService.findByTermoPlanejamentoId(demanda.termoPlanejamento.id);
      setDocumentoNome(doc2?.nomeArquivo ?? null);
    } catch {
      setDocumentoNome(null);
    }
    setDocumentoFetcher(() => () => termoPlanejamentoDocService.downloadByTermoPlanejamentoId(demanda.termoPlanejamento.id));
    return true;
  } else if (demanda.status === 'B' && demanda.termoAbertura) {
    try {
      const doc3 = await termoAberturaDocService.findByTermoAberturaId(demanda.termoAbertura.id);
      setDocumentoNome(doc3?.nomeArquivo ?? null);
    } catch {
      setDocumentoNome(null);
    }
    setDocumentoFetcher(() => () => termoAberturaDocService.downloadByTermoAberturaId(demanda.termoAbertura.id));
    return true;
  } else {
    toast({
      title: t('common.error'),
      description: t('openingTerm.documentViewError'),
      variant: 'destructive',
    });
    return false;
  }
};

const baixarArquivo = (blob: Blob, fileName: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

const getNomeArquivoDownload = (demanda: DemandaTecnica): string => {
  const codigo = demanda.codigo?.trim() || 'DT';
  if (demanda.status === 'B' && demanda.termoAbertura) return `TA-${codigo}.pdf`;
  if (demanda.status === 'D' && demanda.termoPlanejamento) return `TP-${codigo}.pdf`;
  if (demanda.status === 'F' && demanda.termoEncerramento) return `TE-${codigo}.pdf`;

  if (demanda.status === 'B') return `TA-${codigo}.pdf`;
  if (demanda.status === 'D') return `TP-${codigo}.pdf`;
  return `TE-${codigo}.pdf`;
};

type UploadTargetConfig = {
  termoId: number;
  nextStatus: 'C' | 'E' | 'G';
  successI18n: string;
  errorI18n: string;
  findByTermo: (termoId: number) => Promise<{ id: number } | null>;
  upload: (termoId: number, file: File) => Promise<unknown>;
  update: (docId: number, file: File) => Promise<unknown>;
};

const getUploadTargetConfig = (demanda: DemandaTecnica): UploadTargetConfig | null => {
  if (demanda.status === 'B' && demanda.termoAbertura) {
    return {
      termoId: demanda.termoAbertura.id,
      nextStatus: 'C',
      successI18n: 'openingTerm.uploadSuccess',
      errorI18n: 'openingTerm.uploadError',
      findByTermo: async (termoId: number) => {
        const doc = await termoAberturaDocService.findByTermoAberturaId(termoId);
        return doc ? { id: doc.id } : null;
      },
      upload: (termoId, file) => termoAberturaDocService.upload(termoId, file),
      update: (docId, file) => termoAberturaDocService.update(docId, file),
    };
  }

  if (demanda.status === 'D' && demanda.termoPlanejamento) {
    return {
      termoId: demanda.termoPlanejamento.id,
      nextStatus: 'E',
      successI18n: 'planningTerm.uploadSuccess',
      errorI18n: 'planningTerm.uploadError',
      findByTermo: async (termoId: number) => {
        const doc = await termoPlanejamentoDocService.findByTermoPlanejamentoId(termoId);
        return doc ? { id: doc.id } : null;
      },
      upload: (termoId, file) => termoPlanejamentoDocService.upload(termoId, file),
      update: (docId, file) => termoPlanejamentoDocService.update(docId, file),
    };
  }

  if (demanda.status === 'F' && demanda.termoEncerramento) {
    return {
      termoId: demanda.termoEncerramento.id,
      nextStatus: 'G',
      successI18n: 'closingTerm.uploadSuccess',
      errorI18n: 'closingTerm.uploadError',
      findByTermo: async (termoId: number) => {
        const doc = await termoEncerramentoDocService.findByTermoEncerramentoId(termoId);
        return doc ? { id: doc.id } : null;
      },
      upload: (termoId, file) => termoEncerramentoDocService.upload(termoId, file),
      update: (docId, file) => termoEncerramentoDocService.update(docId, file),
    };
  }

  return null;
};

const hasPhysicalTermFile = async (demanda: DemandaTecnica): Promise<boolean> => {
  if (demanda.status === 'B' && demanda.termoAbertura) {
    return termoAberturaDocService.exists(demanda.termoAbertura.id);
  }
  if (demanda.status === 'D' && demanda.termoPlanejamento) {
    return termoPlanejamentoDocService.exists(demanda.termoPlanejamento.id);
  }
  if (demanda.status === 'F' && demanda.termoEncerramento) {
    return termoEncerramentoDocService.exists(demanda.termoEncerramento.id);
  }
  return false;
};

  /**
   * Abre o PDF em modo somente leitura (sem fluxo de assinatura eletrônica).
   */
  const visualizarDocumento = async (demanda: DemandaTecnica) => {
    const ok = await ajustarDocumentoParaTrabalho(demanda);
    if (!ok) return;
    setIsAssinarEletronicaOpen(true);
  };

  /**
   * 
   * @param demanda Abrir o visualizador de PDF com o termo especifico conforme status da demanda e permitir o download.
   */
  const download = async (demanda: DemandaTecnica) => {
    setSelectedDemanda(demanda);
    try {
      if (demanda.status === 'F' && demanda.termoEncerramento) {
        const blob = await termoEncerramentoDocService.downloadByTermoEncerramentoId(demanda.termoEncerramento.id);
        baixarArquivo(blob, getNomeArquivoDownload(demanda));
        return;
      }

      if (demanda.status === 'D' && demanda.termoPlanejamento) {
        const blob = await termoPlanejamentoDocService.downloadByTermoPlanejamentoId(demanda.termoPlanejamento.id);
        baixarArquivo(blob, getNomeArquivoDownload(demanda));
        return;
      }

      if (demanda.status === 'B' && demanda.termoAbertura) {
        const blob = await termoAberturaDocService.downloadByTermoAberturaId(demanda.termoAbertura.id);
        baixarArquivo(blob, getNomeArquivoDownload(demanda));
        return;
      }

      toast({
        title: t('common.error'),
        description: t('openingTerm.documentViewError'),
        variant: 'destructive',
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('openingTerm.documentViewError')),
        variant: 'destructive',
      });
    }
  }; 

  /**
   * 
   * @param demanda Subir o documento para gravação na tabela do termo correto da demanda conforme o status.
   */
  const upload = (demanda: DemandaTecnica) => {
    setSelectedDemanda(demanda);
    setPendingUploadDemanda(demanda);

    const config = getUploadTargetConfig(demanda);
    if (!config) {
      toast({
        title: t('common.error'),
        description: t('openingTerm.documentViewError'),
        variant: 'destructive',
      });
      return;
    }

    setSelectedUploadFile(null);
    setIsUploadConfirmOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: t('common.error'),
        description: 'O arquivo deve ser um PDF',
        variant: 'destructive',
      });
      return;
    }

    setSelectedUploadFile(file);
    setIsUploadConfirmOpen(true);
  };

  const confirmarUpload = async () => {
    if (!pendingUploadDemanda || !selectedUploadFile) return;

    const config = getUploadTargetConfig(pendingUploadDemanda);
    if (!config) {
      toast({
        title: t('common.error'),
        description: t('openingTerm.documentViewError'),
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const doc = await config.findByTermo(config.termoId);
      if (doc) {
        await config.update(doc.id, selectedUploadFile);
      } else {
        await config.upload(config.termoId, selectedUploadFile);
      }

      await demandaService.update(pendingUploadDemanda.id, { status: config.nextStatus });
      await reloadTable();

      setIsUploadConfirmOpen(false);
      setSelectedUploadFile(null);
      setPendingUploadDemanda(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      toast({
        title: t('common.success'),
        description: t(config.successI18n),
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t(config.errorI18n)),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };


   /**
   * 
   * @param demanda assinar o documento eletronicamente.
   */
  const reloadTable = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getDemandasEmFluxoPaginado(
        projetoId,
        currentPage,
        pageSize
      );
      const demandas = data.content as unknown as DemandaTecnica[];
      const checks = await Promise.all(
        demandas.map(async (demanda) => ({
          demanda,
          hasFile: await hasPhysicalTermFile(demanda),
        }))
      );
      const filteredContent = checks.filter((item) => item.hasFile).map((item) => item.demanda);

      setPage({
        ...(data as unknown as Page<DemandaTecnica>),
        content: filteredContent,
      });
      setTotalPages(data.totalPages);
      setTotalElements(filteredContent.length);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    reloadTable();
  }, [projetoId, currentPage, pageSize]); 

  return (

    <div className="space-y-8">
      <header className="flex items-center gap-2.5">
        <FileSignature className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-normal tracking-tight text-foreground">{t('home.technicalTermsForSignature')}</h1>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileSelected}
      />

      {loading && <p>{t('loading')}</p>}

      {page && (
        <>

        <div className="space-y-4">
          {page.content.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {page.content.map((demanda) => (
                <VisualizadorDemandaCard
                  key={demanda.id}
                  letter={getDemandaTermoLetter(demanda)}
                  title={demanda.codigo}
                  subtitle={`${t('common.date')}: ${formatDateTime(demanda.dataAbertura, 'dd/MM/yyyy')}`}
                  description={demanda.nome}
                  statusSlot={getStatusBadge(demanda.status ?? demanda.situacao, t)}
                  actions={
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            aria-label={t('openingTerm.viewDocumentTitle')}
                            onClick={() => void visualizarDocumento(demanda)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('openingTerm.viewDocumentTitle')}</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            aria-label={t('download')}
                            onClick={() => void download(demanda)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('download')}</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            aria-label={t('upload')}
                            onClick={() => upload(demanda)}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('upload')}</TooltipContent>
                      </Tooltip>
                    </>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('common.noRecordsFound')}</p>
          )}
        </div>
 
        <div>
          <PdfPreviewDialog
            open={isAssinarEletronicaOpen}
            onOpenChange={(next) => {
              if (!next) setAssinarEletronicaConfig(null);
              setIsAssinarEletronicaOpen(next);
            }}
            title={t('openingTerm.viewDocumentTitle')}
            description={documentoNome ?? undefined}
            fetchPdf={() => {
              if (!documentoFetcher) return Promise.reject(new Error('Documento indisponivel'));
              return documentoFetcher();
            }}
            loadingLabel={t('common.loading')}
            errorMessage={t('openingTerm.documentViewError')}
            onError={(err: unknown) =>
              toast({
                title: t('common.error'),
                description: getErrorMessage(err, t('openingTerm.documentViewError')),
                variant: 'destructive',
              })
            }
            assinarEletronica={assinarEletronicaConfig ?? undefined}
            onAssinaturaConcluida={() => {
              // Fecha o preview, limpa configuração de assinatura
              setIsAssinarEletronicaOpen(false);
              setAssinarEletronicaConfig(null);
              // Reseta para primeira página e recarrega como se estivesse entrando pela primeira vez
              setCurrentPage(0);
              reloadTable();
            }}

            /*
            renderSignButton={({ pdfBlob, openSignatureDialog }) => (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-3"
                disabled={!pdfBlob}
                onClick={openSignatureDialog}
              >
                {t('pdf.signButton')}
              </Button>
            )}
            */

          />
        </div>

        <Dialog
          open={isUploadConfirmOpen}
          onOpenChange={(next) => {
            if (isUploading) return;
            setIsUploadConfirmOpen(next);
            if (!next) setSelectedUploadFile(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('upload')}</DialogTitle>
              <DialogDescription>
                Confirme os dados do arquivo antes de enviar.
              </DialogDescription>
            </DialogHeader>
            {selectedUploadFile ? (
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Arquivo:</span> {selectedUploadFile.name}</p>
                <p><span className="font-semibold">Tipo:</span> {selectedUploadFile.type || 'application/pdf'}</p>
                <p><span className="font-semibold">Tamanho:</span> {(selectedUploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <p>
                  <span className="font-semibold">Última alteração:</span>{' '}
                  {formatDateTime(new Date(selectedUploadFile.lastModified), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => {
                  setIsUploadConfirmOpen(false);
                  setSelectedUploadFile(null);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                disabled={!selectedUploadFile || isUploading}
                onClick={() => void confirmarUpload()}
              >
                {isUploading ? t('common.processing') : t('upload')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
 
        </>

      )}
    </div>

  );
}
