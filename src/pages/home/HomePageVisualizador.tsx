import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { dashboardService } from '@/services/dashboardService';
import { Page } from '@/types';
import { useProject } from '@/contexts/ProjectContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DemandaTecnica } from '@/types';
import { getStatusBadge } from '@/components/common/statusBadge';
import { Button } from '@/components/ui/button';
import { Eye, Download, Upload } from 'lucide-react';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import { termoAberturaDocService, termoPlanejamentoDocService, termoEncerramentoDocService } from '@/services/termoDocService';
import type { AssinarEletronicaTipo } from '@/components/common/PdfSignaturePositionDialog';

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
    await ajustarDocumentoParaTrabalho(demanda);
  }; 

  /**
   * 
   * @param demanda Subir o documento para gravação na tabela do termo correto da demanda conforme o status.
   */
  const upload = (demanda: DemandaTecnica) => {
    setSelectedDemanda(demanda);
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
      setPage(data as Page<DemandaTecnica>);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    reloadTable();
  }, [projetoId, currentPage, pageSize]); 

  return (

    <div className="space-y-8">

      {loading && <p>{t('loading')}</p>}

      {page && (
        <>
 
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {page.content.map((demanda) => (
              <Card key={demanda.id} className="flex flex-col overflow-hidden">
                <CardHeader className="space-y-2 pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base font-medium leading-snug">
                      {demanda.codigo}
                    </CardTitle>
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-2">{demanda.nome}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(demanda.status ?? demanda.situacao, t)}
                  </div>
                </CardHeader>
                <CardFooter className="mt-auto flex justify-end gap-1 border-t bg-muted/30 px-3 py-3 sm:px-4">
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
                  
                  <Tooltip visible={false}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        aria-label={t('download')}
                        onClick={() => download(demanda)}
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
                </CardFooter>
              </Card>
            ))}
          </div>
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
 
        </>

      )}
    </div>

  );
}
