import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { Edit, Trash2, FileText, FilePlus, FileCheck, FileX, ChevronRight, ChevronDown, XCircle, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { getStatusBadge } from '@/components/common/statusBadge';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { PageHeader, SearchFilterBar, EmptyState, FilterSelect, TablePagination } from '@/components/common/PageComponents';
import { TableSkeleton, ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { DataTable, type Column, type Action } from '@/components/common/DataTable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useApi } from '@/hooks/useApi';
import { demandaService } from '@/services/demandaService';
import { projetoMetaService, metaProdutoService, termoEncerramentoService, termoPlanejamentoService } from '@/services';
import { demandaExecucaoService } from '@/modules/execucaoDemanda/services/demandaExecucaoService';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { demandaSchema, type DemandaFormData } from '@/lib/validations';
import { canCancelDemanda, canDeleteDemanda, canAvaliarDemanda, isDemandaEncerrada, normalizeDemandaStatus } from '@/lib/demandaStatus';
import type { DemandaTecnica, DemandStatus, PaginatedResponse, ProjetoMeta, MetaProduto, TermoEncerramento, TermoPlanejamento } from '@/types';

// Mapeamento: códigos novos (A-Z) + formato antigo do backend (opened, inPlanning, inExecution, closed)
const STATUS_KEY_MAP: Record<string, string> = {
  A: 'demands.statusA', B: 'demands.statusB', C: 'demands.statusC', D: 'demands.statusD',
  E: 'demands.statusE', F: 'demands.statusF', G: 'demands.statusG', Z: 'demands.statusZ',
  opened: 'demands.statusB', inPlanning: 'demands.statusD', inExecution: 'demands.statusF', closed: 'demands.statusG',
};

type DemandasListMemory = {
  search: string;
  statusFilter: string;
  selectedMetaId: string;
  currentPage: number;
  pageSize: number;
};

// Memória em runtime para restaurar posição da lista ao voltar de páginas filhas.
let demandasListMemory: DemandasListMemory | null = null;

export default function DemandasPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const selectedProjectId = selectedProject?.id;
  const initialListState = demandasListMemory ?? {
    search: '',
    statusFilter: 'all',
    selectedMetaId: 'all',
    currentPage: 0,
    pageSize: 20,
  };
  const isListRoute = /^\/demandas\/?$/.test(location.pathname);
  const [demandas, setDemandas] = useState<DemandaTecnica[]>([]);
  const [search, setSearch] = useState(initialListState.search);
  const [statusFilter, setStatusFilter] = useState<string>(initialListState.statusFilter);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedDemanda, setSelectedDemanda] = useState<DemandaTecnica | null>(null);
  const [currentPage, setCurrentPage] = useState(initialListState.currentPage);
  const [pageSize, setPageSize] = useState(initialListState.pageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Expansão de linha para custos (Termo de Planejamento + Termo de Encerramento)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [planejamentosByDemanda, setPlanejamentosByDemanda] = useState<Record<number, TermoPlanejamento | null>>({});
  const [encerramentosByDemanda, setEncerramentosByDemanda] = useState<Record<number, TermoEncerramento | null>>({});
  const [loadingPlanejamento, setLoadingPlanejamento] = useState<Record<number, boolean>>({});
  const [loadingEncerramento, setLoadingEncerramento] = useState<Record<number, boolean>>({});
  const [execucaoExistsByDemandaId, setExecucaoExistsByDemandaId] = useState<Record<number, boolean | undefined>>({});
  const execucaoExistsRef = useRef<Record<number, boolean | undefined>>({});
  const execucaoCheckPendingRef = useRef<Set<number>>(new Set());

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<DemandaTecnica>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Metas e produtos do projeto selecionado
  const [metasProdutos, setMetasProdutos] = useState<{ meta: ProjetoMeta; produtos: MetaProduto[] }[]>([]);
  const [isLoadingProdutos, setIsLoadingProdutos] = useState(false);

  // Lista de metas para filtro principal
  const [metasFiltro, setMetasFiltro] = useState<ProjetoMeta[]>([]);
  const [selectedMetaId, setSelectedMetaId] = useState<string>(initialListState.selectedMetaId);
  const listContextRef = useRef({
    search: '',
    statusFilter: 'all',
    selectedMetaId: 'all',
    currentPage: 0,
    pageSize: 20,
  });

  const form = useForm<DemandaFormData>({
    resolver: zodResolver(demandaSchema),
    defaultValues: { codigo: '', nome: '', projetoId: '', descricao: '' }
  });

  const ensureExecucaoChecked = useCallback(async (demandaId: number) => {
    if (execucaoExistsRef.current[demandaId] !== undefined) return;
    if (execucaoCheckPendingRef.current.has(demandaId)) return;

    execucaoCheckPendingRef.current.add(demandaId);
    try {
      const execucao = await demandaExecucaoService.getByDemandaId(demandaId);
      const exists = execucao != null;
      execucaoExistsRef.current[demandaId] = exists;
      setExecucaoExistsByDemandaId((prev) => ({ ...prev, [demandaId]: exists }));
    } finally {
      execucaoCheckPendingRef.current.delete(demandaId);
    }
  }, []);

  const handleActionsMenuOpen = useCallback(
    (demanda: DemandaTecnica, open: boolean) => {
      if (open) void ensureExecucaoChecked(demanda.id);
    },
    [ensureExecucaoChecked],
  );

  // Carrega dados iniciais - filtra apenas demandas do projeto selecionado
  const loadData = useCallback(async (context?: {
    search: string;
    statusFilter: string;
    selectedMetaId: string;
    currentPage: number;
    pageSize: number;
  }) => {
    if (!selectedProjectId || !isListRoute) return;

    execucaoExistsRef.current = {};
    setExecucaoExistsByDemandaId({});

    const effective = context ?? {
      search,
      statusFilter,
      selectedMetaId,
      currentPage,
      pageSize,
    };

    const isFilteringByMeta = effective.selectedMetaId !== 'all' && !!effective.selectedMetaId;
    const requestedPage = isFilteringByMeta ? 0 : effective.currentPage;
    const requestedSize = isFilteringByMeta ? 1000 : effective.pageSize;
    await execute(
      () => demandaService.findAll({ 
        codigo: effective.search.trim() || undefined,
        projetoId: selectedProjectId,
        status: effective.statusFilter !== 'all' ? effective.statusFilter as DemandStatus : undefined,
        page: requestedPage + 1, // Backend espera 1-based
        size: requestedSize,
      }),
      {
        onSuccess: (data) => {
          // Quando filtrando por meta, carregamos tudo em uma única "página" grande
          if (isFilteringByMeta) {
            setDemandas(data.content);
            setTotalPages(1);
            setTotalElements(data.content.length);
          } else {
            setDemandas(data.content);
            setTotalPages(data.totalPages);
            setTotalElements(data.totalElements);
          }
        },
      }
    );
  }, [execute, search, statusFilter, currentPage, pageSize, selectedProjectId, selectedMetaId, isListRoute]);

  useEffect(() => {
    listContextRef.current = {
      search,
      statusFilter,
      selectedMetaId,
      currentPage,
      pageSize,
    };

    demandasListMemory = {
      search,
      statusFilter,
      selectedMetaId,
      currentPage,
      pageSize,
    };
  }, [search, statusFilter, selectedMetaId, currentPage, pageSize]);

  // Carrega metas e produtos vinculados ao projeto selecionado
  const loadMetasProdutos = useCallback(async () => {
    if (!selectedProjectId) {
      setMetasProdutos([]);
      return;
    }

    setIsLoadingProdutos(true);
    try {
      // Busca metas do projeto
      const metas = await projetoMetaService.findByProjeto(selectedProjectId);
      // Ordena metas pelo código para facilitar a visualização
      const metasOrdenadas = [...metas].sort((a, b) => a.codigo.localeCompare(b.codigo));

      const grupos = await Promise.all(
        metasOrdenadas.map(async (meta) => {
          const produtos = await metaProdutoService.findByProjetoMeta(meta.id);
          // Ordena produtos pelo código
          const produtosOrdenados = [...produtos].sort((a, b) => a.codigo.localeCompare(b.codigo));
          return { meta, produtos: produtosOrdenados };
        })
      );

      // Mantém apenas metas que possuem produtos
      setMetasProdutos(grupos.filter((g) => g.produtos.length > 0));
    } catch (err) {
      console.warn('Erro ao carregar metas/produtos para demandas:', err);
      setMetasProdutos([]);
    } finally {
      setIsLoadingProdutos(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recarrega metas/produtos sempre que o form abrir e houver projeto selecionado
  useEffect(() => {
    if (isFormOpen) {
      loadMetasProdutos();
    }
  }, [isFormOpen, loadMetasProdutos]);

  // Também carrega metas/produtos ao mudar de projeto, para exibir a coluna Meta no DataTable
  useEffect(() => {
    loadMetasProdutos();
  }, [loadMetasProdutos]);

  // Carrega metas para filtro principal sempre que o projeto mudar
  useEffect(() => {
    const loadMetasFiltro = async () => {
      if (!selectedProjectId) {
        setMetasFiltro([]);
        setSelectedMetaId('all');
        return;
      }
      try {
        const metas = await projetoMetaService.findByProjeto(selectedProjectId);
        const ordenadas = [...metas].sort((a, b) => a.codigo.localeCompare(b.codigo));
        setMetasFiltro(ordenadas);
        // Default de entrada: pré-seleciona a primeira meta quando ainda não há escolha do usuário.
        if (ordenadas.length > 0 && (selectedMetaId === 'all' || !selectedMetaId)) {
          setSelectedMetaId(String(ordenadas[0].id));
          setCurrentPage(0);
        }
      } catch (err) {
        console.warn('Erro ao carregar metas para filtro de demandas:', err);
        setMetasFiltro([]);
      }
    };

    loadMetasFiltro();
  }, [selectedProjectId]);

  // Aplica filtro por meta (cliente) nas demandas já carregadas
  const paginatedDemandas = useMemo(() => {
    if (selectedMetaId === 'all' || !selectedMetaId) {
      return demandas;
    }
    const metaIdNumber = Number(selectedMetaId);
    return demandas.filter((d) => d.metaProduto?.projetoMetaId === metaIdNumber);
  }, [demandas, selectedMetaId]);

   // Carrega Termo de Planejamento com custos para uma demanda específica
  const loadPlanejamento = useCallback(async (demandaId: number) => {
    setLoadingPlanejamento(prev => ({ ...prev, [demandaId]: true }));
    try {
      const termo = await termoPlanejamentoService.findByDemandaId(demandaId);
      setPlanejamentosByDemanda(prev => ({ ...prev, [demandaId]: termo }));
    } catch (err) {
      console.warn('Erro ao carregar termo de planejamento da demanda:', err);
      setPlanejamentosByDemanda(prev => ({ ...prev, [demandaId]: null }));
    } finally {
      setLoadingPlanejamento(prev => ({ ...prev, [demandaId]: false }));
    }
  }, []);

  // Carrega Termo de Encerramento com custos para uma demanda específica
  const loadEncerramento = useCallback(async (demandaId: number) => {
    setLoadingEncerramento(prev => ({ ...prev, [demandaId]: true }));
    try {
      const termo = await termoEncerramentoService.findByDemandaId(demandaId);
      setEncerramentosByDemanda(prev => ({ ...prev, [demandaId]: termo }));
    } catch (err) {
      console.warn('Erro ao carregar termo de encerramento da demanda:', err);
      setEncerramentosByDemanda(prev => ({ ...prev, [demandaId]: null }));
    } finally {
      setLoadingEncerramento(prev => ({ ...prev, [demandaId]: false }));
    }
  }, []);

  const handleAdd = () => {
    if (!selectedProject) {
      // TODO: Mostrar mensagem de erro ou redirecionar para seleção de projeto
      return;
    }
    setSelectedDemanda(null);
    form.reset({ codigo: '', nome: '', projetoId: String(selectedProject.id), descricao: '', metaProdutoId: '' });
    setIsFormOpen(true);
  };

  const handleEdit = (demanda: DemandaTecnica) => {
    const returnTo = `${location.pathname}${location.search}`;
    navigate(`/demandas/${demanda.id}/editar?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleDelete = (demanda: DemandaTecnica) => {
    setSelectedDemanda(demanda);
    setIsDeleteOpen(true);
  };

  const handleCancel = (demanda: DemandaTecnica) => {
    if (!canCancelDemanda(demanda.status ?? demanda.situacao)) {
      return; // Não deve aparecer se regra estiver correta
    }
    setSelectedDemanda(demanda);
    setIsCancelOpen(true);
  };

  // Definição das colunas da tabela
  const columns: Column<DemandaTecnica>[] = useMemo(() => [
    {
      key: 'produto',
      label: 'Prod',
      render: (demanda) => demanda.metaProduto?.codigo ?? '-',
      hideOnMobile: true,
      minWidth: '64px',
      className: 'w-[72px]',
    },    {
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
  ], [t]);

  // Definição das ações da tabela
  const actions: Action<DemandaTecnica>[] = useMemo(() => [
    {
      label: t('common.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
    },
    {
      label: t('nav.openingTerm'),
      icon: <FilePlus className="h-4 w-4" />,
      onClick: (demanda) => {
        const returnTo = `${location.pathname}${location.search}`;
        navigate(`/demandas/termo-abertura?demandaId=${demanda.id}&returnTo=${encodeURIComponent(returnTo)}`);
      },
      separator: true,
    },
    {
      label: t('nav.planningTerm'),
      icon: <FileCheck className="h-4 w-4" />,
      onClick: (demanda) => {
        const returnTo = `${location.pathname}${location.search}`;
        navigate(`/demandas/termo-planejamento?demandaId=${demanda.id}&returnTo=${encodeURIComponent(returnTo)}`);
      },
    },
    {
      label: t('nav.closingTerm'),
      icon: <FileX className="h-4 w-4" />,
      onClick: (demanda) => {
        const returnTo = `${location.pathname}${location.search}`;
        navigate(`/demandas/termo-encerramento?demandaId=${demanda.id}&returnTo=${encodeURIComponent(returnTo)}`);
      },
    },
    {
      label: t('avaliacaoDemanda.actionLabel'),
      icon: <ClipboardList className="h-4 w-4" />,
      onClick: (demanda) => navigate(`/demandas/avaliacao?demandaId=${demanda.id}`),
      visible: (demanda) => canAvaliarDemanda(demanda),
    },
    {
      label: t('execucao.manageExecution', 'Execução'),
      icon: <ClipboardList className="h-4 w-4" />,
      onClick: (demanda) => navigate(`/execucao-demandas/${demanda.id}`),
      visible: (demanda) => execucaoExistsByDemandaId[demanda.id] === true,
    },
    {
      label: t('demands.cancelDemand'),
      icon: <XCircle className="h-4 w-4" />,
      onClick: handleCancel,
      variant: 'destructive',
      visible: (demanda) => canCancelDemanda(demanda.status ?? demanda.situacao),
    },
    {
      label: t('common.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive',
      separator: true,
      visible: (demanda) => canDeleteDemanda(demanda.status ?? demanda.situacao),
    },
  ], [t, navigate, handleEdit, handleDelete, execucaoExistsByDemandaId]);

  const onSubmit = async (data: DemandaFormData) => {
    if (!user || !selectedProject) return;
    
    setIsSaving(true);
    try {
      await demandaService.create({
        nome: data.nome,
        projetoId: selectedProject.id,
        usuarioId: user.id,
        descricao: data.descricao,
        metaProdutoId: data.metaProdutoId ? Number(data.metaProdutoId) : null,
      });
      setIsFormOpen(false);
      form.reset();
      await loadData(listContextRef.current);
    } catch (error) {
      // Erro já é tratado automaticamente pela API (toast será exibido)
      // Aqui apenas evitamos que o erro quebre o fluxo da aplicação
    } finally {
      setIsSaving(false);
    }
  };

  // Renderiza a caixa de custos (planejados ou finais) com mesma estrutura
  const renderCostsBox = (
    title: string,
    custos: Array<{ id: number; perfil?: { nome?: string }; qtdeHora: number; valorHora: number }>,
    emptyMessage: string,
    noTermMessage: string,
    hasTerm: boolean,
    isLoading: boolean
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground min-h-[80px]">
          {t('common.loadingData')}
        </div>
      );
    }

    if (!hasTerm) {
      return (
        <div className="py-4 text-sm text-muted-foreground min-h-[80px]">
          {noTermMessage}
        </div>
      );
    }

    if (!custos || custos.length === 0) {
      return (
        <div className="py-4 text-sm text-muted-foreground min-h-[80px]">
          {emptyMessage}
        </div>
      );
    }

    const totalGeral = custos.reduce((acc, c) => acc + c.qtdeHora * c.valorHora, 0);

    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('profiles.name')}</TableHead>
                <TableHead>{t('common.quantity')}</TableHead>
                <TableHead>{t('common.unitValue')}</TableHead>
                <TableHead>{t('common.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custos.map((custo) => {
                const linhaTotal = custo.qtdeHora * custo.valorHora;
                return (
                  <TableRow key={custo.id}>
                    <TableCell>{custo.perfil?.nome ?? '-'}</TableCell>
                    <TableCell>{custo.qtdeHora}</TableCell>
                    <TableCell>
                      {custo.valorHora.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>
                    <TableCell>
                      {linhaTotal.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  {t('common.total')}:
                </TableCell>
                <TableCell className="font-normal">
                  {totalGeral.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // Renderiza a linha de detalhes com custos planejados (esquerda) e custos finais (direita)
  const renderFinalCostsRow = (demanda: DemandaTecnica) => {
    const planej = planejamentosByDemanda[demanda.id];
    const enc = encerramentosByDemanda[demanda.id];
    const isLoadingPlanej = loadingPlanejamento[demanda.id];
    const isLoadingEnc = loadingEncerramento[demanda.id];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
        {/* Caixa esquerda: Custos Planejados (Termo de Planejamento) */}
        <div className="border rounded-lg p-3 bg-muted/30">
          {renderCostsBox(
            t('demands.plannedCostsTitle'),
            planej?.custos || [],
            t('demands.noPlannedCosts'),
            t('demands.noPlanningTerm'),
            !!planej,
            isLoadingPlanej
          )}
        </div>
        {/* Caixa direita: Custos Finais (Termo de Encerramento) */}
        <div className="border rounded-lg p-3 bg-muted/30">
          {renderCostsBox(
            t('demands.finalCostsTitle'),
            enc?.custos || [],
            t('demands.noFinalCosts'),
            t('demands.noClosingTerm'),
            !!enc,
            isLoadingEnc
          )}
        </div>
      </div>
    );
  };

  const handleConfirmDelete = async () => {
    if (!selectedDemanda) return;
    if (!canDeleteDemanda(selectedDemanda.status ?? selectedDemanda.situacao)) return;
    
    setIsDeleting(true);
    try {
      await demandaService.delete(selectedDemanda.id);
      setIsDeleteOpen(false);
      loadData();
    } catch (error) {
      // Erro já é tratado automaticamente pela API (toast será exibido)
      // Aqui apenas evitamos que o erro quebre o fluxo da aplicação
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedDemanda || !canCancelDemanda(selectedDemanda.status ?? selectedDemanda.situacao)) return;
    
    setIsCancelling(true);
    try {
      await demandaService.cancel(selectedDemanda.id);
      setIsCancelOpen(false);
      loadData();
    } catch (error) {
      // Erro já é tratado automaticamente pela API (toast será exibido)
    } finally {
      setIsCancelling(false);
    }
  };

  const statusOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'A', label: t('demands.statusA') },
    { value: 'B', label: t('demands.statusB') },
    { value: 'C', label: t('demands.statusC') },
    { value: 'D', label: t('demands.statusD') },
    { value: 'E', label: t('demands.statusE') },
    { value: 'F', label: t('demands.statusF') },
    { value: 'G', label: t('demands.statusG') },
    { value: 'Z', label: t('demands.statusZ') },
  ];

  // Estado de erro
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('demands.title')} description={t('common.manageDemands')} />
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
        title={t('demands.title')} 
        description={t('common.manageDemands')} 
        onAdd={handleAdd} 
        addLabel={t('demands.newDemand')} 
      />
      
      <SearchFilterBar 
        searchValue={search} 
        onSearchChange={(v) => { setSearch(v); setCurrentPage(0); }} 
        searchPlaceholder={t('demands.searchByCode')} 
        onRefresh={loadData}
      >
        <FilterSelect 
          value={statusFilter} 
          onValueChange={(v) => { setStatusFilter(v); setCurrentPage(0); }} 
          placeholder={t('common.status')} 
          options={statusOptions} 
        />
        {metasFiltro.length > 0 && (
          <FilterSelect
            value={selectedMetaId}
            onValueChange={(v) => { setSelectedMetaId(v); setCurrentPage(0); }}
            placeholder={t('demands.meta')}
            options={[
              { value: 'all', label: t('common.all') },
              ...metasFiltro.map((meta) => ({
                value: String(meta.id),
                label: `${meta.codigo} - ${meta.nome}`,
              })),
            ]}
          />
        )}
      </SearchFilterBar>

      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : paginatedDemandas.length === 0 ? (
        <EmptyState 
          title={t('common.noResults')} 
          description={t('common.noDemandsFound')} 
          icon={<FileText className="h-6 w-6 text-muted-foreground" />} 
          action={<Button onClick={handleAdd}>{t('demands.newDemand')}</Button>} 
        />
      ) : (
        <>
          <DataTable
            data={paginatedDemandas}
            columns={columns}
            actions={actions}
            actionsLabel={t('common.actions')}
            onActionsMenuOpen={handleActionsMenuOpen}
            rowSuffixInActions={(demanda) => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label={expandedRows.has(demanda.id) ? t('common.collapseDetails') : t('common.expandDetails')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedRows(prev => {
                        const next = new Set(prev);
                        if (next.has(demanda.id)) {
                          next.delete(demanda.id);
                        } else {
                          next.add(demanda.id);
                          if (!planejamentosByDemanda[demanda.id]) {
                            void loadPlanejamento(demanda.id);
                          }
                          if (!encerramentosByDemanda[demanda.id]) {
                            void loadEncerramento(demanda.id);
                          }
                        }
                        return next;
                      });
                    }}
                  >
                    {expandedRows.has(demanda.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('demands.plannedActualCostsTooltip')}
                </TooltipContent>
              </Tooltip>
            )}
            rowDetail={renderFinalCostsRow}
            expandedRowIds={expandedRows}
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

      {/* Form Dialog - fecha pelo X do header ou botões (regra global no DialogContent) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeaderStandard
            title={t('demands.newDemand')}
            description={t('common.fillDemand')}
          />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField 
                  control={form.control} 
                  name="codigo" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('demands.code')}</FormLabel>
                      <FormControl>
                          <Input disabled  placeholder={t('common.demandCodePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={form.control} 
                  name="nome" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('demands.name')} *</FormLabel>
                      <FormControl><Input placeholder={t('common.demandNamePlaceholder')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField
                  control={form.control}
                  name="metaProdutoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('demands.product')}</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          value={field.value || ''}
                          onChange={field.onChange}
                        >
                          <option value="">{t('demands.selectProductPlaceholder')}</option>
                          {metasProdutos.map((grupo) => (
                            <optgroup
                              key={grupo.meta.id}
                              label={`${grupo.meta.codigo} - ${grupo.meta.nome}`}
                            >
                              {grupo.produtos.map((produto) => (
                                <option key={produto.id} value={String(produto.id)}>
                                  {produto.codigo} - {produto.nome}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </FormControl>
                      {isLoadingProdutos && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('demands.loadingProducts')}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField 
                control={form.control} 
                name="descricao" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('openingTerm.description')}</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder={t('common.descriptionPlaceholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                  {t('common.cancel')}
                </Button>
                <LoadingButton 
                  type="submit" 
                  isLoading={isSaving} 
                  loadingText={t('common.saving')}
                >
                  {t('common.save')}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('demands.cancelDemand')}</DialogTitle>
            <DialogDescription>
              {t('demands.cancelDemandConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelOpen(false)} disabled={isCancelling}>
              {t('common.cancel')}
            </Button>
            <LoadingButton 
              variant="destructive" 
              onClick={handleConfirmCancel}
              isLoading={isCancelling}
              loadingText={t('common.processing')}
            >
              {t('demands.cancelDemand')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('demands.deleteConfirm')}</DialogDescription>
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
