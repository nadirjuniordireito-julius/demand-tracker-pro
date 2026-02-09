import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Trash2, Target, ChevronDown, ChevronRight, Package, Plus, CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
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
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { useApi } from '@/hooks/useApi';
import { projetoMetaSchema, type ProjetoMetaFormData, metaProdutoSchema, type MetaProdutoFormData } from '@/lib/validations';
import { projetoMetaService } from '@/services/projetoMetaService';
import { metaProdutoService } from '@/services/metaProdutoService';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/apiErrorHandler';
import type { ProjetoMeta, MetaProduto, PaginatedResponse } from '@/types';

const getStatusBadge = (status: 'A' | 'I', t: (key: string) => string) => {
  if (status === 'A') {
    return <Badge variant="default" className="bg-success text-success-foreground">{t('common.active')}</Badge>;
  }
  return <Badge variant="secondary">{t('common.inactive')}</Badge>;
};

/** Converte número de enfrentamento (1, 2, 3...) em MM/AAAA a partir da data base do projeto (dataEfetivaInicio). */
const formatInicioFimFromBase = (baseDateStr: string | undefined, monthOrdinal: number): string => {
  if (!baseDateStr || monthOrdinal == null || monthOrdinal < 1) return '—';
  const part = String(baseDateStr).split('T')[0];
  const [y, m] = part.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m)) return '—';
  const date = new Date(y, m - 1 + (monthOrdinal - 1), 1);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${String(month).padStart(2, '0')}/${year}`;
};

export default function ProjetoMetaPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const { toast } = useToast();
  const [projetoMetas, setProjetoMetas] = useState<ProjetoMeta[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<ProjetoMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [produtosByMeta, setProdutosByMeta] = useState<Record<number, MetaProduto[]>>({});
  const [loadingProdutos, setLoadingProdutos] = useState<Record<number, boolean>>({});
  
  // Estados para produto
  const [isProdutoFormOpen, setIsProdutoFormOpen] = useState(false);
  const [isProdutoDeleteOpen, setIsProdutoDeleteOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<MetaProduto | null>(null);
  const [currentMetaId, setCurrentMetaId] = useState<number | null>(null);
  const [isSavingProduto, setIsSavingProduto] = useState(false);
  const [isDeletingProduto, setIsDeletingProduto] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<ProjetoMeta>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form para produto
  const produtoForm = useForm<MetaProdutoFormData>({
    resolver: zodResolver(metaProdutoSchema),
    defaultValues: {
      codigo: '',
      nome: '',
      descricao: '',
      unidadeMedida: '',
      quantidade: 0,
      valorUnitario: 0,
      inicio: 0,
      fim: 0,
      status: 'A',
    },
  });
  
  // Carrega produtos de uma meta
  const loadProdutos = useCallback(async (metaId: number, forceReload = false) => {
    if (!forceReload && produtosByMeta[metaId]) {
      return; // Já carregado
    }
    
    setLoadingProdutos(prev => ({ ...prev, [metaId]: true }));
    try {
      const produtos = await metaProdutoService.findByProjetoMeta(metaId);
      setProdutosByMeta(prev => ({ ...prev, [metaId]: produtos }));
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('common.errorMessage')),
        variant: 'destructive',
      });
    } finally {
      setLoadingProdutos(prev => ({ ...prev, [metaId]: false }));
    }
  }, [produtosByMeta, toast, t]);
  
  // Toggle expand/collapse row
  const toggleRow = useCallback((metaId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metaId)) {
        newSet.delete(metaId);
      } else {
        newSet.add(metaId);
        loadProdutos(metaId);
      }
      return newSet;
    });
  }, [loadProdutos]);

  const form = useForm<ProjetoMetaFormData>({
    resolver: zodResolver(projetoMetaSchema),
    defaultValues: { codigo: '', nome: '', descricao: '', status: 'A' },
  });


  // Carrega metas filtradas por projeto
  const loadData = useCallback(async () => {
    if (!selectedProject) {
      setProjetoMetas([]);
      setTotalPages(0);
      setTotalElements(0);
      return;
    }

    const requestedPage = currentPage;
    await execute(
      () => projetoMetaService.findAll({ 
        nome: search || undefined,
        projetoId: selectedProject.id,
        page: requestedPage + 1, // Backend espera 1-based
        size: pageSize 
      }),
      {
        onSuccess: (data) => {
          setProjetoMetas(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
          data.content.forEach((meta) => loadProdutos(meta.id));
        },
      }
    );
  }, [execute, search, currentPage, pageSize, selectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Metas ordenadas por código (ordem natural: 1, 1.1, 2, 2.1, ...)
  const paginatedMetas = useMemo(
    () => [...projetoMetas].sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true })),
    [projetoMetas]
  );

  // Somatório dos valores totais de todas as metas (cada meta = soma de quantidade * valorUnitario dos produtos)
  const valorTotalMetas = useMemo(() => {
    return paginatedMetas.reduce((acc, meta) => {
      const produtos = produtosByMeta[meta.id];
      const metaTotal = !produtos || produtos.length === 0
        ? 0
        : produtos.reduce((s, p) => s + (p.quantidade ?? 0) * (p.valorUnitario ?? 0), 0);
      return acc + metaTotal;
    }, 0);
  }, [paginatedMetas, produtosByMeta]);

  const handleAdd = () => {
    if (!selectedProject) {
      toast({
        title: t('common.error'),
        description: t('projects.selectProject'),
        variant: 'destructive',
      });
      return;
    }
    setSelectedMeta(null);
    form.reset({ codigo: '', nome: '', descricao: '', status: 'A' });
    setIsFormOpen(true);
  };

  const handleEdit = (meta: ProjetoMeta) => {
    setSelectedMeta(meta);
    form.reset({
      codigo: meta.codigo,
      nome: meta.nome,
      descricao: meta.descricao || '',
      status: meta.status,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (meta: ProjetoMeta) => {
    setSelectedMeta(meta);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (data: ProjetoMetaFormData) => {
    if (!selectedProject) {
      toast({
        title: t('common.error'),
        description: t('projects.selectProject'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedMeta) {
        await projetoMetaService.update(selectedMeta.id, {
          codigo: data.codigo,
          nome: data.nome,
          descricao: data.descricao || undefined,
          status: data.status,
        });
        toast({
          title: t('common.success'),
          description: t('projectMeta.updatedSuccess'),
        });
      } else {
        await projetoMetaService.create({
          projetoId: selectedProject.id,
          codigo: data.codigo,
          nome: data.nome,
          descricao: data.descricao || undefined,
          status: data.status,
        });
        toast({
          title: t('common.success'),
          description: t('projectMeta.createdSuccess'),
        });
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('common.errorMessage')),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedMeta) return;
    setIsDeleting(true);
    try {
      await projetoMetaService.delete(selectedMeta.id);
      toast({
        title: t('common.success'),
        description: t('projectMeta.deletedSuccess'),
      });
      setIsDeleteOpen(false);
      loadData();
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('common.errorMessage')),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handlers para produtos
  const handleAddProduto = (metaId: number) => {
    // Salva a posição de scroll antes de abrir o modal
    setScrollPosition(window.scrollY);
    setSelectedProduto(null);
    setCurrentMetaId(metaId);
    produtoForm.reset({
      codigo: '',
      nome: '',
      descricao: '',
      unidadeMedida: '',
      quantidade: 0,
      valorUnitario: 0,
      inicio: 0,
      fim: 0,
      status: 'A',
    });
    setIsProdutoFormOpen(true);
  };

  const handleEditProduto = (produto: MetaProduto, metaId: number) => {
    // Salva a posição de scroll antes de abrir o modal
    setScrollPosition(window.scrollY);
    setSelectedProduto(produto);
    setCurrentMetaId(metaId);
    produtoForm.reset({
      codigo: produto.codigo,
      nome: produto.nome,
      descricao: produto.descricao || '',
      unidadeMedida: produto.unidadeMedida,
      quantidade: produto.quantidade,
      valorUnitario: produto.valorUnitario,
      inicio: produto.inicio,
      fim: produto.fim,
      status: produto.status,
    });
    setIsProdutoFormOpen(true);
  };

  const handleDeleteProduto = (produto: MetaProduto, metaId: number) => {
    // Salva a posição de scroll antes de abrir o modal
    setScrollPosition(window.scrollY);
    setSelectedProduto(produto);
    setCurrentMetaId(metaId);
    setIsProdutoDeleteOpen(true);
  };

  const onSubmitProduto = async (data: MetaProdutoFormData) => {
    if (!currentMetaId) return;

    setIsSavingProduto(true);
    try {
      if (selectedProduto?.id) {
        await metaProdutoService.update(selectedProduto.id, {
          codigo: data.codigo,
          nome: data.nome,
          descricao: data.descricao || undefined,
          unidadeMedida: data.unidadeMedida,
          quantidade: data.quantidade,
          valorUnitario: data.valorUnitario,
          inicio: data.inicio,
          fim: data.fim,
          status: data.status,
        });
        toast({
          title: t('common.success'),
          description: t('common.success'),
        });
      } else {
        await metaProdutoService.create({
          projetoMetaId: currentMetaId,
          codigo: data.codigo,
          nome: data.nome,
          descricao: data.descricao || undefined,
          unidadeMedida: data.unidadeMedida,
          quantidade: data.quantidade,
          valorUnitario: data.valorUnitario,
          inicio: data.inicio,
          fim: data.fim,
          status: data.status,
        });
        toast({
          title: t('common.success'),
          description: t('common.success'),
        });
      }
      setIsProdutoFormOpen(false);
      // Garante que a linha da meta esteja expandida
      setExpandedRows(prev => {
        const newSet = new Set(prev);
        newSet.add(currentMetaId);
        return newSet;
      });
      // Força recarregamento dos produtos da meta
      await loadProdutos(currentMetaId, true);
      // Restaura a posição de scroll após um pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 100);
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('common.errorMessage')),
        variant: 'destructive',
      });
    } finally {
      setIsSavingProduto(false);
    }
  };

  const handleConfirmDeleteProduto = async () => {
    if (!selectedProduto || !currentMetaId) return;
    setIsDeletingProduto(true);
    try {
      await metaProdutoService.delete(selectedProduto.id);
        toast({
          title: t('common.success'),
          description: t('common.success'),
        });
      setIsProdutoDeleteOpen(false);
      // Garante que a linha da meta esteja expandida
      setExpandedRows(prev => {
        const newSet = new Set(prev);
        newSet.add(currentMetaId);
        return newSet;
      });
      // Força recarregamento dos produtos da meta
      await loadProdutos(currentMetaId, true);
      // Restaura a posição de scroll após um pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 100);
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: getErrorMessage(err, t('common.errorMessage')),
        variant: 'destructive',
      });
    } finally {
      setIsDeletingProduto(false);
    }
  };

  // Definição das colunas da tabela
  const columns: Column<ProjetoMeta>[] = useMemo(() => [
    {
      key: 'expand',
      label: '',
      render: (meta) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label={expandedRows.has(meta.id) ? t('common.collapseDetails') : t('common.expandDetails')}
          onClick={(e) => {
            e.stopPropagation();
            toggleRow(meta.id);
          }}
        >
          {expandedRows.has(meta.id) ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      ),
    },
    {
      key: 'codigo',
      label: t('projectMeta.code'),
    },
    {
      key: 'nome',
      label: t('projectMeta.name'),
    },
    {
      key: 'status',
      label: t('common.status'),
      render: (meta) => getStatusBadge(meta.status, t),
    },
    {
      key: 'valor',
      label: t('projectMeta.value'),
      hideOnMobile: true,
      render: (meta) => {
        const produtos = produtosByMeta[meta.id];
        if (!produtos || produtos.length === 0) return '—';
        const total = produtos.reduce(
          (acc, p) => acc + (p.quantidade ?? 0) * (p.valorUnitario ?? 0),
          0
        );
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(total);
      },
    },
  ], [t, expandedRows, toggleRow, produtosByMeta]);

  // Definição das ações da tabela
  const actions: Action<ProjetoMeta>[] = useMemo(() => [
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
    },
  ], [t]);

  // Estado de erro
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('projectMeta.title')} description={t('common.manageProjectMetas')} />
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
        title={t('projectMeta.title')} 
        description={t('common.manageProjectMetas')} 
        onAdd={handleAdd} 
        addLabel={t('projectMeta.newMeta')} 
      />
      
      {selectedProject ? (
        <>
          <SearchFilterBar 
            searchValue={search} 
            onSearchChange={(v) => { setSearch(v); setCurrentPage(0); }} 
            searchPlaceholder={t('common.searchByName')} 
            onRefresh={loadData} 
          />

          {isLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : paginatedMetas.length === 0 ? (
            <EmptyState 
              title={t('common.noResults')} 
              description={t('projectMeta.noMetasFound')} 
              icon={<Target className="h-6 w-6 text-muted-foreground" />} 
              action={<Button onClick={handleAdd}>{t('projectMeta.newMeta')}</Button>} 
            />
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm" aria-label={t('projectMeta.totalValueOfMetas')}>
                <CircleDollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t('projectMeta.totalValueOfMetas')}:
                </span>
                <span className="font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(valorTotalMetas)}
                </span>
              </div>
              <div className="border rounded-lg overflow-hidden w-full">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      {actions && actions.length > 0 && (
                        <TableHead 
                          className="h-8 py-2 sticky left-0 z-10 bg-background w-[80px] sm:w-[100px] px-2 sm:px-4 border-r"
                          style={{ minWidth: '80px' }}
                        >
                          <span className="text-xs sm:text-sm font-medium">{t('common.actions')}</span>
                        </TableHead>
                      )}
                      {columns.map((column) => (
                        <TableHead
                          key={column.key}
                          className={`
                            ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                            px-2 sm:px-4
                            whitespace-nowrap
                          `}
                          style={{ 
                            minWidth: column.minWidth || '120px',
                          }}
                        >
                          <span className="text-xs sm:text-sm font-medium">{column.label}</span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMetas.map((meta) => (
                      <React.Fragment key={meta.id}>
                        <TableRow>
                          {actions && actions.length > 0 && (
                            <TableCell 
                              className="py-2 sticky left-0 z-10 bg-background px-2 sm:px-4 border-r"
                              style={{ minWidth: '80px' }}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label={t('common.actions')}
                                  >
                                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[120px]">
                                  {actions.map((action, index) => (
                                    <div key={index}>
                                      {action.separator && index > 0 && <DropdownMenuSeparator />}
                                      <DropdownMenuItem
                                        onClick={() => action.onClick(meta)}
                                        className={action.variant === 'destructive' ? 'text-destructive' : ''}
                                      >
                                        {action.icon && (
                                          <span className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 inline-flex items-center">
                                            {action.icon}
                                          </span>
                                        )}
                                        <span className="text-xs sm:text-sm">{action.label}</span>
                                      </DropdownMenuItem>
                                    </div>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                          {columns.map((column) => (
                            <TableCell 
                              key={column.key}
                              className={`
                                py-2
                                ${column.key === columns[0]?.key ? 'font-medium' : ''}
                                ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                                px-2 sm:px-4
                                text-xs sm:text-sm
                              `}
                              style={{ 
                                minWidth: column.minWidth || '120px',
                              }}
                            >
                              {column.render ? column.render(meta) : (meta[column.key] as React.ReactNode)}
                            </TableCell>
                          ))}
                        </TableRow>
                        {/* Expanded row with produtos */}
                        {expandedRows.has(meta.id) && (
                          <TableRow>
                            <TableCell 
                              colSpan={columns.length + (actions ? 1 : 0)} 
                              className="p-0 bg-muted/20"
                            >
                              <div className="p-4">
                                <div className="flex justify-between items-center mb-4">
                                  <h4 className="text-sm font-medium">{t('nav.products')}</h4>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddProduto(meta.id)}
                                    className="h-8"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t('common.add')}
                                  </Button>
                                </div>
                                {loadingProdutos[meta.id] ? (
                                  <div className="text-center py-4 text-sm text-muted-foreground">
                                    {t('common.loading')}...
                                  </div>
                                ) : (produtosByMeta[meta.id] || []).length === 0 ? (
                                  <div className="text-center py-4 text-sm text-muted-foreground">
                                    {t('common.noRecordsFound')}
                                  </div>
                                ) : (
                                  <div className="border rounded-md overflow-hidden bg-background">
                                    <table className="w-full">
                                      <thead className="bg-muted/50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground" style={{ minWidth: '80px' }}>
                                            {t('common.actions')}
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                                            {t('projectMeta.code')}
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                                            {t('projectMeta.productName')}
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                                            {t('common.unit')}
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                                            {t('common.quantity')}
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                                            {t('common.unitValue')}
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                                            {t('common.totalValue')}
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                                            {t('common.start')}
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                                            {t('common.end')}
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                                            {t('common.status')}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {([...(produtosByMeta[meta.id] || [])]
                                            .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true }))
                                            .map((produto) => (
                                          <tr key={produto.id} className="border-t hover:bg-muted/30">
                                            <td className="px-4 py-2">
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    aria-label={t('common.actions')}
                                                  >
                                                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="min-w-[120px]">
                                                  <DropdownMenuItem
                                                    onClick={() => handleAddProduto(meta.id)}
                                                  >
                                                    <Plus className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                    <span className="text-xs sm:text-sm">{t('common.add')}</span>
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={() => handleEditProduto(produto, meta.id)}
                                                  >
                                                    <Edit className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                    <span className="text-xs sm:text-sm">{t('common.edit')}</span>
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={() => handleDeleteProduto(produto, meta.id)}
                                                    className="text-destructive"
                                                  >
                                                    <Trash2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                    <span className="text-xs sm:text-sm">{t('common.delete')}</span>
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </td>
                                            <td className="px-4 py-2 text-sm">
                                              {produto.codigo}
                                            </td>
                                            <td className="px-4 py-2 text-sm font-medium">
                                              {produto.nome}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-muted-foreground hidden sm:table-cell">
                                              {produto.unidadeMedida}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-muted-foreground hidden sm:table-cell">
                                              {produto.quantidade}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-muted-foreground hidden sm:table-cell">
                                              {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                              }).format(produto.valorUnitario)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-muted-foreground hidden sm:table-cell font-medium">
                                              {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                              }).format((produto.quantidade ?? 0) * (produto.valorUnitario ?? 0))}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-muted-foreground hidden sm:table-cell">
                                              {formatInicioFimFromBase(selectedProject?.dataEfetivaInicio, produto.inicio ?? 0)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-muted-foreground hidden sm:table-cell">
                                              {formatInicioFimFromBase(selectedProject?.dataEfetivaInicio, produto.fim ?? 0)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-muted-foreground hidden sm:table-cell">
                                              {getStatusBadge(produto.status, t)}
                                            </td>
                                          </tr>
                                        )))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
        </>
      ) : (
        <EmptyState 
          title={t('projectMeta.selectProjectFirst')} 
          description={t('projectMeta.selectProjectDescription')} 
          icon={<Target className="h-6 w-6 text-muted-foreground" />} 
        />
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeaderStandard
            title={selectedMeta ? t('projectMeta.editMeta') : t('projectMeta.newMeta')}
            description={selectedMeta ? t('common.editInformation') : t('common.fillInformation')}
          />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  control={form.control} 
                  name="codigo" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('projectMeta.code')} *</FormLabel>
                      <FormControl><Input placeholder={t('projectMeta.codePlaceholder')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={form.control} 
                  name="status" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.status')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.selectStatus')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A">{t('common.active')}</SelectItem>
                          <SelectItem value="I">{t('common.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </div>
              <FormField 
                control={form.control} 
                name="nome" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projectMeta.name')} *</FormLabel>
                    <FormControl><Input placeholder={t('projectMeta.namePlaceholder')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <FormField 
                control={form.control} 
                name="descricao" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projectMeta.description')}</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder={t('projectMeta.descriptionPlaceholder')}
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
                <LoadingButton type="submit" isLoading={isSaving} loadingText={t('common.saving')}>
                  {t('common.save')}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('projectMeta.deleteConfirm')}</DialogDescription>
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

      {/* Produto Form Dialog */}
      <Dialog 
        open={isProdutoFormOpen} 
        onOpenChange={(open) => {
          setIsProdutoFormOpen(open);
          if (!open) {
            // Restaura a posição de scroll quando o modal é fechado
            setTimeout(() => {
              window.scrollTo(0, scrollPosition);
            }, 100);
          }
        }}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeaderStandard
            title={selectedProduto ? t('common.edit') : t('common.add')}
            description={selectedProduto ? t('common.editInformation') : t('common.fillInformation')}
          />
          <Form {...produtoForm}>
            <form onSubmit={produtoForm.handleSubmit(onSubmitProduto)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  control={produtoForm.control} 
                  name="codigo" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('projectMeta.code')} *</FormLabel>
                      <FormControl><Input placeholder={t('projectMeta.codePlaceholder')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={produtoForm.control} 
                  name="status" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.status')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.selectStatus')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A">{t('common.active')}</SelectItem>
                          <SelectItem value="I">{t('common.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </div>
              <FormField 
                control={produtoForm.control} 
                name="nome" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projectMeta.productName')} *</FormLabel>
                    <FormControl><Input placeholder={t('projectMeta.namePlaceholder')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <FormField 
                control={produtoForm.control} 
                name="descricao" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projectMeta.description')}</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder={t('projectMeta.descriptionPlaceholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  control={produtoForm.control} 
                  name="unidadeMedida" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.unit')} *</FormLabel>
                      <FormControl><Input placeholder={t('common.unit')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={produtoForm.control} 
                  name="quantidade" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.quantity')} *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder={t('common.quantity')} 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </div>
              <FormField 
                control={produtoForm.control} 
                name="valorUnitario" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.unitValue')} *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder={t('common.unitValue')} 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  control={produtoForm.control} 
                  name="inicio" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.start')} *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder={t('common.start')} 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={produtoForm.control} 
                  name="fim" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.end')} *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder={t('common.end')} 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsProdutoFormOpen(false)} disabled={isSavingProduto}>
                  {t('common.cancel')}
                </Button>
                <LoadingButton type="submit" isLoading={isSavingProduto} loadingText={t('common.saving')}>
                  {t('common.save')}
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Produto Delete Confirmation Dialog */}
      <Dialog 
        open={isProdutoDeleteOpen} 
        onOpenChange={(open) => {
          setIsProdutoDeleteOpen(open);
          if (!open) {
            // Restaura a posição de scroll quando o modal é fechado
            setTimeout(() => {
              window.scrollTo(0, scrollPosition);
            }, 100);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('common.confirmDelete')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProdutoDeleteOpen(false)} disabled={isDeletingProduto}>
              {t('common.cancel')}
            </Button>
            <LoadingButton 
              variant="destructive" 
              onClick={handleConfirmDeleteProduto}
              isLoading={isDeletingProduto}
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
