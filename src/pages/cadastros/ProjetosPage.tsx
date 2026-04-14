import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  FolderKanban,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { useApi } from '@/hooks/useApi';
import { projetoService } from '@/services/projetoService';
import { useProcessing } from '@/contexts/ProcessingContext';
import type { Projeto, PaginatedResponse } from '@/types';

type ProjetosListMemory = {
  search: string;
  currentPage: number;
  pageSize: number;
};

let projetosListMemory: ProjetosListMemory | null = null;

export default function ProjetosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { withProcessing } = useProcessing();
  const initialListState = projetosListMemory ?? {
    search: '',
    currentPage: 0,
    pageSize: 5,
  };
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [search, setSearch] = useState(initialListState.search);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [currentPage, setCurrentPage] = useState(initialListState.currentPage);
  const [pageSize, setPageSize] = useState(initialListState.pageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<Projeto>>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    const requestedPage = currentPage;
    await execute(
      () => projetoService.findAll({ 
        nome: search || undefined,
        page: requestedPage + 1, // Backend espera 1-based
        size: pageSize 
      }),
      {
        onSuccess: (data) => {
          setProjetos(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      }
    );
  }, [execute, search, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    projetosListMemory = {
      search,
      currentPage,
      pageSize,
    };
  }, [search, currentPage, pageSize]);

  const paginatedProjetos = projetos;

  // Evita deslocamento de timezone: "2025-01-15" sem hora é interpretado como UTC meia-noite,
  // o que em fusos como Brasil (UTC-3) exibe o dia anterior. Parse como data local.
  const parseDateOnly = (dateStr: string) => {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const formatDate = (dateStr: string) => format(parseDateOnly(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const handleAdd = () => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/cadastros/projetos/novo?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleEdit = (projeto: Projeto) => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/cadastros/projetos/${projeto.id}/editar?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleDelete = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    setIsDeleteOpen(true);
  };

  // Definição das colunas da tabela
  const columns: Column<Projeto>[] = useMemo(() => [
    {
      key: 'nome',
      label: t('projects.name'),
    },
    {
      key: 'codTed',
      label: t('projects.codeTed'),
      hideOnMobile: true,
    },
    {
      key: 'termoInicial',
      label: t('projects.startDate'),
      render: (projeto) => formatDate(projeto.termoInicial),
      hideOnMobile: true,
    },
    {
      key: 'termoFinal',
      label: t('projects.endDate'),
      render: (projeto) => formatDate(projeto.termoFinal),
      hideOnMobile: true,
    },
    {
      key: 'dataEfetivaInicio',
      label: t('projects.effectiveStartDate'),
      render: (projeto) => projeto.dataEfetivaInicio ? formatDate(projeto.dataEfetivaInicio) : '—',
      hideOnMobile: true,
    },
  ], [t]);

  const handleDocuments = (projeto: Projeto) => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/cadastros/projetos/${projeto.id}/documentos?returnTo=${encodeURIComponent(returnTo)}`);
  };

  // Definição das ações da tabela
  const actions: Action<Projeto>[] = useMemo(() => [
    {
      label: t('common.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
    },
    {
      label: t('projects.documents.label'),
      icon: <FileText className="h-4 w-4" />,
      onClick: handleDocuments,
    },
    {
      label: t('common.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive',
      separator: true,
    },
  ], [t, handleEdit, handleDelete, handleDocuments]);

  const handleConfirmDelete = async () => {
    if (!selectedProjeto) return;
    
    setIsDeleting(true);
    try {
      await withProcessing(async () => {
        await projetoService.delete(selectedProjeto!.id);
        setIsDeleteOpen(false);
        await loadData();
      }, t('common.deleting'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Estado de erro
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('projects.title')} description={t('common.manageProjects')} />
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadData}
          retryText={t('common.retry')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('projects.title')} 
        description={t('common.manageProjects')} 
        onAdd={handleAdd} 
        addLabel={t('projects.newProject')} 
      />
      
      <SearchFilterBar 
        searchValue={search} 
        onSearchChange={(v) => { setSearch(v); setCurrentPage(0); }} 
        searchPlaceholder={t('common.searchByNameOrCode')} 
        onRefresh={loadData} 
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : paginatedProjetos.length === 0 ? (
        <EmptyState 
          title={t('common.noResults')} 
          description={t('common.noProjectsFound')} 
          icon={<FolderKanban className="h-6 w-6 text-muted-foreground" />} 
          action={<Button onClick={handleAdd}>{t('projects.newProject')}</Button>} 
        />
      ) : (
        <>
          <DataTable
            data={paginatedProjetos}
            columns={columns}
            actions={actions}
            actionsLabel={t('common.actions')}
          />
          <TablePagination 
            currentPage={currentPage + 1} 
            totalPages={totalPages} 
            pageSize={pageSize} 
            totalItems={totalElements} 
            onPageChange={(p) => setCurrentPage(p - 1)} 
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(0); }} 
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('projects.deleteConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
              {t('common.cancel')}
            </Button>
            <LoadingButton 
              variant="destructive" 
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              loadingText={t('common.deleting')}
            >
              {t('common.delete')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
