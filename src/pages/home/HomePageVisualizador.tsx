import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  FolderKanban,
  TrendingUp,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { dashboardService } from '@/services/dashboardService';
import { DemandaTecnicaDTO, Page } from '@/types';
import { useProject } from '@/contexts/ProjectContext';
import { TablePagination } from '@/components/common/PageComponents';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DemandaTecnica, TermoEncerramentoDocResponseDTO } from '@/types';
import { getStatusBadge } from '@/components/common/statusBadge';
import { formatDateTime } from '@/helpers/formatDate';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Signature, Download, Upload } from 'lucide-react';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import { termoAberturaDocService, termoPlanejamentoDocService, termoEncerramentoDocService } from '@/services/termoDocService';
import { TermoEncerramentoDoc, TermoPlanejamentoDoc, TermoAberturaDoc}  from '@/types';
import { useAuth } from '@/contexts/AuthContext';
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
  const [documento, setDocumento] = useState(null);
  const [termoEncerramentoDoc, setTermoEncerramentoDoc] = useState<TermoEncerramentoDocResponseDTO>();
  const [termoPlanejamentoDoc, setTermoPlanejamentoDoc] = useState<TermoPlanejamentoDoc>();
  const [termoAberturaDoc, setTermoAberturaDoc] = useState<TermoAberturaDoc>();
  const [assinarEletronicaConfig, setAssinarEletronicaConfig] = useState<{
    tipo: AssinarEletronicaTipo;
    docId: number;
    userId: number;
  } | null>(null);
  const { user } = useAuth();
  const columns: Column<DemandaTecnica>[] = useMemo(() => [
    {
      key: 'codigo',
      label: t('demands.code'),
    },
    {
      key: 'nome',
      label: t('demands.name'),
    },
    {
      key: 'dataAbertura',
      label: t('demands.openingDate'),
      render: (demanda) => format(new Date(demanda.dataAbertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      hideOnMobile: true,
    },
    {
      key: 'status',
      label: t('demands.status'),
      render: (demanda) => {
        const statusValue = demanda.status ?? demanda.situacao;
        return getStatusBadge(statusValue, t);
      },
    },
  ],[]);

  /**
   * 
   * @param demanda Abrir o visualizador de PDF com o termo especifico conforme status da demanda e permitir o download.
   */
  const download = (demanda: DemandaTecnica) => {
    setSelectedDemanda(demanda);
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
   const assinarEletronica = async (demanda: DemandaTecnica) => {
    setSelectedDemanda(demanda);
    setDocumento(null);
    setAssinarEletronicaConfig(null);

    if (demanda.status === 'F') {
      try {
        const doc1 = await termoEncerramentoDocService.findByTermoEncerramentoId(demanda.termoEncerramento!.id);
        setTermoEncerramentoDoc(doc1);
        setAssinarEletronicaConfig({ tipo: 'encerramento', docId: doc1.id, userId: user.id });
      } catch {
        setTermoEncerramentoDoc(undefined);
      }
      setDocumento(termoEncerramentoDocService.downloadByTermoEncerramentoId(demanda.termoEncerramento!.id));
    } else if (demanda.status === 'D') {
      try {
        const doc2 = await termoPlanejamentoDocService.findByTermoPlanejamentoId(demanda.termoPlanejamento!.id);
        setTermoPlanejamentoDoc(doc2);
        setAssinarEletronicaConfig({ tipo: 'planejamento', docId: doc2.id, userId: user.id });
      } catch {
        setTermoPlanejamentoDoc(undefined);
      }
      setDocumento(termoPlanejamentoDocService.downloadByTermoPlanejamentoId(demanda.termoPlanejamento!.id));
    } else if (demanda.status === 'B') {
      try {
        const doc3 = await termoAberturaDocService.findByTermoAberturaId(demanda.termoAbertura!.id);
        setTermoAberturaDoc(doc3);
        setAssinarEletronicaConfig({ tipo: 'abertura', docId: doc3.id, userId: user.id });
      } catch {
        setTermoAberturaDoc(undefined);
      }
      setDocumento(termoAberturaDocService.downloadByTermoAberturaId(demanda.termoAbertura!.id));
    }
    setIsAssinarEletronicaOpen(true);
  };

  const handleCloseAssinatura = () => {
    setIsAssinarEletronicaOpen(false);
  };

  const actions: Action<DemandaTecnica>[] = useMemo(() => [
    {
      label: t('assinaturaEletronica'),
      icon: <Signature className="h-4 w-4" />,
      onClick: assinarEletronica,
    },  {
      label: t('download'),
      icon: <Download className="h-4 w-4" />,
      onClick: download,
    },
    {
      label: t('upload'),
      icon: <Upload className="h-4 w-4" />,
      onClick: upload,
    },
    
  ], [t, assinarEletronica, download, upload]);

  const reloadTable = async () => {
    setLoading(true);
    const data = await dashboardService.getDemandasEmFluxoPaginado(
      projetoId,
      currentPage,
      pageSize
    );
    setPage(data as Page<DemandaTecnica>);
    setLoading(false);
  };
  
  useEffect(() => {
    reloadTable();
  }, [projetoId, currentPage, pageSize]); 

  return (

    <div className="space-y-8">

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-normal tracking-tight">
            {t('home.welcomeVisualizador')}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {t('home.descriptionVisualizador')}
        </p>
      </div>

      {loading && <p>Carregando...</p>}

      {page && (
        <>
 
        <div>
          <DataTable
            data={page.content}
            actions={actions}
            columns={columns}
          />
          <TablePagination 
            currentPage={currentPage + 1} 
            totalPages={totalPages} 
            pageSize={pageSize} 
            totalItems={totalElements} 
            onPageChange={(p) => setCurrentPage(p - 1)} 
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(0); }} 
          />
        </div>
        
        <div>
          <PdfPreviewDialog
            open={isAssinarEletronicaOpen}
            onOpenChange={(next) => {
              if (!next) setAssinarEletronicaConfig(null);
              setIsAssinarEletronicaOpen(next);
            }}
            title={t('openingTerm.viewDocumentTitle')}
            description={documento?.nomeArquivo}
            fetchPdf={() => documento}
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
          />
        </div>
 
        </>

      )}
    </div>

  );
}
