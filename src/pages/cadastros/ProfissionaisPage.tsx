import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Briefcase, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { useApi } from '@/hooks/useApi';
import { profissionalService } from '@/services/profissionalService';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import type { Profissional, PaginatedResponse } from '@/types';

type ProfissionaisListMemory = {
  search: string;
  currentPage: number;
  pageSize: number;
};

let profissionaisListMemory: ProfissionaisListMemory | null = null;

const parseDateOnly = (dateStr: string) => {
  const part = String(dateStr).split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
};

export default function ProfissionaisPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProject } = useProject();
  const { toast } = useToast();
  const initialListState = profissionaisListMemory ?? {
    search: '',
    currentPage: 0,
    pageSize: 10,
  };
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [search, setSearch] = useState(initialListState.search);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  const [currentPage, setCurrentPage] = useState(initialListState.currentPage);
  const [pageSize, setPageSize] = useState(initialListState.pageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const { isLoading, error, execute } = useApi<PaginatedResponse<Profissional>>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    await execute(
      () =>
        profissionalService.findAll({
          nome: search || undefined,
          projetoId: selectedProject.id,
          page: currentPage,
          size: pageSize,
          sort: 'nome,asc',
        }),
      {
        onSuccess: (data) => {
          setProfissionais(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      }
    );
  }, [execute, search, selectedProject, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    profissionaisListMemory = {
      search,
      currentPage,
      pageSize,
    };
  }, [search, currentPage, pageSize]);

  const formatDate = (dateStr: string) =>
    format(parseDateOnly(dateStr) ?? new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleAdd = () => {
    if (!selectedProject) return;
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/cadastros/profissionais/novo?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleOpenCustosMensais = () => {
    navigate('/cadastros/profissionais/custos-mensais');
  };

  const handleEdit = (profissional: Profissional) => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/cadastros/profissionais/${profissional.id}/editar?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleDelete = (profissional: Profissional) => {
    setSelectedProfissional(profissional);
    setIsDeleteOpen(true);
  };

  const columns: Column<Profissional>[] = useMemo(
    () => [
      { key: 'nome', label: t('professionals.name') },
      {
        key: 'tipoPessoa',
        label: t('professionals.tipoPessoa'),
        render: (p) => (p.tipoPessoa === 'F' ? t('professionals.pessoaFisica') : t('professionals.pessoaJuridica')),
        hideOnMobile: true,
      },
      { key: 'documento', label: t('professionals.document'), hideOnMobile: true },
      {
        key: 'funcao',
        label: t('professionals.funcao'),
        render: (p) => p.funcao ?? '—',
        hideOnMobile: true,
      },
      {
        key: 'valorHora',
        label: t('professionals.valorHora'),
        render: (p) => (p.valorHora != null ? formatCurrency(p.valorHora) : '—'),
        hideOnMobile: true,
      },
      {
        key: 'dataInicioAtividade',
        label: t('professionals.dataInicioAtividade'),
        render: (p) => formatDate(p.dataInicioAtividade),
        hideOnMobile: true,
      },
    ],
    [t]
  );

  const actions: Action<Profissional>[] = useMemo(
    () => [
      { label: t('common.edit'), icon: <Edit className="h-4 w-4" />, onClick: handleEdit },
      {
        label: t('common.delete'),
        icon: <Trash2 className="h-4 w-4" />,
        onClick: handleDelete,
        variant: 'destructive',
        separator: true,
      },
    ],
    [t]
  );

  const handleConfirmDelete = async () => {
    if (!selectedProfissional) return;
    setIsDeleting(true);
    try {
      await profissionalService.delete(selectedProfissional.id);
      toast({ title: t('common.success'), description: t('professionals.deletedSuccess') });
      setIsDeleteOpen(false);
      loadData();
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('professionals.deleteError'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('professionals.title')} description={t('professionals.description')} />
        <ErrorState title={t('common.errorTitle')} message={error} onRetry={loadData} retryText={t('common.retry')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('professionals.title')}
        description={t('professionals.description')}
        onAdd={selectedProject ? handleAdd : undefined}
        addLabel={t('professionals.newProfessional')}
      >
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleOpenCustosMensais}
          disabled={!selectedProject}
        >
          <CalendarClock className="h-4 w-4" />
          {t('professionalMonthlyCost.title', 'Custo Mensal')}
        </Button>
      </PageHeader>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(0);
        }}
        searchPlaceholder={t('professionals.searchPlaceholder')}
        onRefresh={loadData}
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : profissionais.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description={t('professionals.noProfessionals')}
          icon={<Briefcase className="h-6 w-6 text-muted-foreground" />}
          action={selectedProject ? <Button onClick={handleAdd}>{t('professionals.newProfessional')}</Button> : undefined}
        />
      ) : (
        <>
          <DataTable
            data={profissionais}
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
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(0);
            }}
          />
        </>
      )}

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('professionals.deleteConfirm')}</DialogDescription>
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
