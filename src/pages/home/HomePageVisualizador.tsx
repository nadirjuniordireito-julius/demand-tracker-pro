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
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Signature, Download, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import { termoAberturaDocService, termoPlanejamentoDocService, termoEncerramentoDocService } from '@/services/termoDocService';
import { LoadingButton } from '@/components/common/LoadingStates';
import { TermoEncerramentoDoc, TermoPlanejamentoDoc, TermoAberturaDoc}  from '@/types';
import { request } from 'http';
import { useAuth } from '@/contexts/AuthContext';

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
   * assinar internamente o documento
   */
  async function gerarHash(file: Blob | Promise<Blob>) {
    const blob = await file; // se já for Blob, passa; se for Promise, resolve
    const buffer = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buffer);
  
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const assinar = async () =>{

    const st = selectedDemanda?.status;
    if(st === 'F') {
      const hashPdf = await gerarHash( termoEncerramentoDocService.downloadById(termoEncerramentoDoc!.id) );
      const usuarioId = user.id;
      termoEncerramentoDocService.assinar(termoEncerramentoDoc!.id, hashPdf, usuarioId);
    } else if(st === 'D') {
      const hashPdf = await gerarHash( termoPlanejamentoDocService.downloadById(termoPlanejamentoDoc!.id) );
      const usuarioId = user.id;
      termoPlanejamentoDocService.assinar(termoPlanejamentoDoc!.id, hashPdf, usuarioId);
    } else if(st === 'B') {
      const hashPdf = await gerarHash( termoAberturaDocService.downloadById(termoAberturaDoc!.id) );
      const usuarioId = user.id;
      termoAberturaDocService.assinar(termoAberturaDoc!.id, hashPdf, usuarioId);
    }
    /**
     * dados para rastreabilidade e assinatura
     */

   
    toast({
      title: t('common.success'),
      description: t('common.documentSignedSuccessfully'),
    });
    setIsAssinarEletronicaOpen(false);

     await reloadTable();

  }

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
   
    if(demanda.status === 'F') {

      try {
        const doc1 = await termoEncerramentoDocService.findByTermoEncerramentoId(demanda.termoEncerramento!.id);
        setTermoEncerramentoDoc(doc1);
      } catch {
        setTermoEncerramentoDoc(null);
      } 
      setDocumento(termoEncerramentoDocService.downloadByTermoEncerramentoId(demanda.termoEncerramento!.id));
    } else if(demanda.status === 'D') {
      
      try {
        const doc2 = await termoPlanejamentoDocService.findByTermoPlanejamentoId(demanda.termoPlanejamento!.id);
        setTermoPlanejamentoDoc(doc2);
      } catch {
        setTermoPlanejamentoDoc(null);
      } 
      setDocumento(termoPlanejamentoDocService.downloadByTermoPlanejamentoId(demanda.termoPlanejamento!.id));
    } else if(demanda.status === 'B') {
     
      try {
        const doc3 = await termoAberturaDocService.findByTermoAberturaId(demanda.termoAbertura!.id);
        setTermoAberturaDoc(doc3);
      } catch {
        setTermoAberturaDoc(null);
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
            onOpenChange={setIsAssinarEletronicaOpen}
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
            customFooter={
              <DialogFooter>
                <Button variant="default" onClick={() => assinar()}>
                  {t('assinar')}
                </Button>
                <Button variant="ghost" onClick={() => setIsAssinarEletronicaOpen(false)}>
                  {t('common.close')}
                </Button>
              </DialogFooter>
            }
          />
        </div>
 
        </>

      )}
    </div>

  );
}
