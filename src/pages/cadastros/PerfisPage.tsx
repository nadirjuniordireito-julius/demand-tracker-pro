import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation, useNavigate } from 'react-router-dom';
import { Edit, Trash2, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { useApi } from '@/hooks/useApi';
import { perfilService } from '@/services/perfilService';
import { useProject } from '@/contexts/ProjectContext';
import type { Perfil, PaginatedResponse } from '@/types';

type PerfisListMemory = {
  search: string;
  currentPage: number;
  pageSize: number;
};

let perfisListMemory: PerfisListMemory | null = null;

export default function PerfisPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProject } = useProject();
  const initialListState = perfisListMemory ?? {
    search: '',
    currentPage: 0,
    pageSize: 5,
  };
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [search, setSearch] = useState(initialListState.search);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState<Perfil | null>(null);
  const [currentPage, setCurrentPage] = useState(initialListState.currentPage);
  const [pageSize, setPageSize] = useState(initialListState.pageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<Perfil>>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carrega dados iniciais - filtra apenas perfis do projeto selecionado
  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    const requestedPage = currentPage;
    // Backend espera página 1-based (1 = primeira, 2 = segunda)
    const pageParam = requestedPage + 1;
    await execute(
      () => perfilService.findAll({ 
        nome: search || undefined,
        projetoId: selectedProject.id,
        page: pageParam,
        size: pageSize 
      }),
      {
        onSuccess: (data) => {
          setPerfis(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      }
    );
  }, [execute, search, currentPage, pageSize, selectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    perfisListMemory = {
      search,
      currentPage,
      pageSize,
    };
  }, [search, currentPage, pageSize]);

  const paginatedPerfis = perfis;

  // Mesmo parse da ProjetosPage: evita deslocamento de timezone (ISO sem hora = UTC meia-noite)
  const parseDateOnly = (dateStr: string) => {
    const part = String(dateStr).split('T')[0];
    const [y, m, d] = part.split('-').map(Number);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
    return new Date(y, m - 1, d);
  };

  const formatDate = (dateStr: string) => format(parseDateOnly(dateStr) ?? new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAdd = () => {
    if (!selectedProject) return;
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/cadastros/perfis/novo?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleEdit = (perfil: Perfil) => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/cadastros/perfis/${perfil.id}/editar?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleDelete = (perfil: Perfil) => {
    setSelectedPerfil(perfil);
    setIsDeleteOpen(true);
  };

  // Definição das colunas da tabela
  const columns: Column<Perfil>[] = useMemo(() => [
    {
      key: 'nome',
      label: t('profiles.name'),
    },
    {
      key: 'valor',
      label: t('planningTerm.hourlyRate'),
      render: (perfil) => perfil.valor ? formatCurrency(perfil.valor) : '-',
      hideOnMobile: true,
    },
    {
      key: 'termoInicial',
      label: t('profiles.startDate'),
      render: (perfil) => formatDate(perfil.termoInicial),
      hideOnMobile: true,
    },
    {
      key: 'termoFinal',
      label: t('profiles.endDate'),
      render: (perfil) => formatDate(perfil.termoFinal),
      hideOnMobile: true,
    },
  ], [t]);

  // Definição das ações da tabela
  const actions: Action<Perfil>[] = useMemo(() => [
    {
      label: t('common.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
    },
    {
      label: t('common.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive',
      separator: true,
    },
  ], [t, handleEdit, handleDelete]);

  const handleConfirmDelete = async () => {
    if (!selectedPerfil) return;
    
    setIsDeleting(true);
    try {
      await perfilService.delete(selectedPerfil.id);
      setIsDeleteOpen(false);
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  // Estado de erro
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('profiles.title')} description={t('common.manageProfiles')} />
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
        title={t('profiles.title')} 
          description={t('common.manageProfiles')}
        onAdd={handleAdd} 
        addLabel={t('profiles.newProfile')} 
      />
      
      <SearchFilterBar 
        searchValue={search} 
        onSearchChange={(v) => { setSearch(v); setCurrentPage(0); }} 
        searchPlaceholder={t('common.searchByName')} 
        onRefresh={loadData} 
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : paginatedPerfis.length === 0 ? (
        <EmptyState 
          title={t('common.noResults')} 
          description={t('common.noProfilesFound')} 
          icon={<UserCircle className="h-6 w-6 text-muted-foreground" />} 
          action={<Button onClick={handleAdd}>{t('profiles.newProfile')}</Button>} 
        />
      ) : (
        <>
          <DataTable
            data={paginatedPerfis}
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
            <DialogDescription>{t('profiles.deleteConfirm')}</DialogDescription>
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
