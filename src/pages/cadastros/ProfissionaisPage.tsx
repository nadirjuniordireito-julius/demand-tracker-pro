import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Briefcase, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PageHeader, SearchFilterBar, EmptyState, FilterSelect, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import { useApi } from '@/hooks/useApi';
import { profissionalService } from '@/services/profissionalService';
import { perfilService } from '@/services/perfilService';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import type { Perfil, Profissional, PaginatedResponse } from '@/types';

type ProfissionaisListMemory = {
  search: string;
  perfilFilter: string;
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
    perfilFilter: 'all',
    currentPage: 0,
    pageSize: 10,
  };
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [search, setSearch] = useState(initialListState.search);
  const [perfilFilter, setPerfilFilter] = useState(initialListState.perfilFilter ?? 'all');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  const [currentPage, setCurrentPage] = useState(initialListState.currentPage);
  const [pageSize, setPageSize] = useState(initialListState.pageSize);
  const requestSeqRef = useRef(0);

  const { isLoading, error, execute } = useApi<PaginatedResponse<Profissional>>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const perfilById = useMemo(() => {
    const map = new Map<number, string>();
    perfis.forEach((perfil) => map.set(perfil.id, perfil.nome));
    return map;
  }, [perfis]);

  const filteredProfissionais = useMemo(() => {
    if (perfilFilter === 'all' || !perfilFilter) return profissionais;
    const perfilId = Number(perfilFilter);
    return profissionais.filter((p) => p.perfilId === perfilId);
  }, [profissionais, perfilFilter]);

  const totalElements = filteredProfissionais.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));

  const paginatedProfissionais = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredProfissionais.slice(start, start + pageSize);
  }, [filteredProfissionais, currentPage, pageSize]);

  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    const requestId = ++requestSeqRef.current;

    await execute(
      () =>
        profissionalService.findAll({
          nome: search || undefined,
          projetoId: selectedProject.id,
          // Workaround definitivo: paginação local para contornar inconsistência do endpoint.
          page: 1,
          size: 1000,
          sort: 'nome,asc',
        }),
      {
        onSuccess: (data) => {
          // Evita race condition: ignora respostas antigas que chegam depois.
          if (requestId !== requestSeqRef.current) return;
          setProfissionais(data.content);
        },
      }
    );
  }, [execute, search, selectedProject]);

  const loadPerfis = useCallback(async () => {
    if (!selectedProject) {
      setPerfis([]);
      return;
    }
    try {
      const response = await perfilService.findAll({
        projetoId: selectedProject.id,
        size: 1000,
        sort: 'nome,asc',
      });
      setPerfis(response.content);
    } catch (err) {
      console.warn('Erro ao carregar perfis para filtro de profissionais:', err);
      setPerfis([]);
    }
  }, [selectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    void loadPerfis();
  }, [loadPerfis]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalElements, pageSize, currentPage, totalPages]);

  useEffect(() => {
    setPerfilFilter('all');
    setCurrentPage(0);
  }, [selectedProject?.id]);

  useEffect(() => {
    profissionaisListMemory = {
      search,
      perfilFilter,
      currentPage,
      pageSize,
    };
  }, [search, perfilFilter, currentPage, pageSize]);

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
        key: 'perfilId',
        label: t('professionals.perfil'),
        render: (p) => perfilById.get(p.perfilId) ?? '—',
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
    [t, perfilById]
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
        onRefresh={() => {
          void loadPerfis();
          void loadData();
        }}
      >
        {perfis.length > 0 && (
          <FilterSelect
            value={perfilFilter}
            onValueChange={(v) => {
              setPerfilFilter(v);
              setCurrentPage(0);
            }}
            placeholder={t('professionals.perfil')}
            options={[
              { value: 'all', label: t('common.all') },
              ...perfis.map((perfil) => ({
                value: String(perfil.id),
                label: perfil.nome,
              })),
            ]}
          />
        )}
      </SearchFilterBar>

      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : filteredProfissionais.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description={t('professionals.noProfessionals')}
          icon={<Briefcase className="h-6 w-6 text-muted-foreground" />}
          action={selectedProject ? <Button onClick={handleAdd}>{t('professionals.newProfessional')}</Button> : undefined}
        />
      ) : (
        <>
          <DataTable
            data={paginatedProfissionais}
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
