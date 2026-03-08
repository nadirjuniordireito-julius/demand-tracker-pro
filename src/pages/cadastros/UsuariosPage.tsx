import { useState, useMemo, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Edit, 
  Trash2, 
  Users,
  ArrowLeftRight,
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useApi } from '@/hooks/useApi';
import { usuarioSchema, usuarioCreateSchema, type UsuarioFormData } from '@/lib/validations';
import { usuarioService } from '@/services/usuarioService';
import { projetoService, usuarioProjetoService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import type { Usuario, UserProfile, UserStatus, PaginatedResponse, Projeto, UsuarioProjeto as UsuarioProjetoType } from '@/types';

const getProfileLabel = (perfil: UserProfile, t: (key: string) => string) => {
  const labels: Record<UserProfile, string> = {
    A: t('users.administrator'),
    O: t('users.operator'),
    V: t('users.viewer'),
  };
  return labels[perfil];
};

const getStatusBadge = (status: UserStatus, t: (key: string) => string) => {
  if (status === 'A') {
    return <Badge variant="default" className="bg-success text-success-foreground">{t('users.active')}</Badge>;
  }
  return <Badge variant="secondary">{t('users.inactive')}</Badge>;
};

export default function UsuariosPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [sortField, setSortField] = useState<'nome' | 'perfil'>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Se o usuário logado não for administrador, bloqueia acesso à página
  if (user && user.perfil !== 'A') {
    return <Navigate to="/" replace />;
  }

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<Usuario>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado para manutenção de projetos por usuário
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [projects, setProjects] = useState<Projeto[]>([]);
  const [usuarioProjetos, setUsuarioProjetos] = useState<UsuarioProjetoType[]>([]);
  const [assignedProjectIds, setAssignedProjectIds] = useState<number[]>([]);
  const [initialAssignedProjectIds, setInitialAssignedProjectIds] = useState<number[]>([]);
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<number[]>([]);
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<number[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSavingProjects, setIsSavingProjects] = useState(false);

  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(selectedUsuario ? usuarioSchema : usuarioCreateSchema),
    defaultValues: {
      nome: '',
      password: '',
      perfil: 'O',
      status: 'A',
    },
  });

  // Carrega dados iniciais
  const loadData = useCallback(async () => {
    const requestedPage = currentPage;
    await execute(
      () => usuarioService.findAll({ 
        nome: search || undefined,
        page: requestedPage + 1, // Backend espera 1-based
        size: pageSize,
        sort: `${sortField},${sortDirection}`
      }),
      {
        onSuccess: (data) => {
          setUsuarios(data.content);
          setTotalPages(data.totalPages);
          setTotalElements(data.totalElements);
        },
      }
    );
  }, [execute, search, currentPage, pageSize, sortField, sortDirection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const paginatedUsuarios = usuarios;

  const handleSort = (field: string) => {
    const sortFieldTyped = field as 'nome' | 'perfil';
    if (sortField === sortFieldTyped) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(sortFieldTyped);
      setSortDirection('asc');
    }
    setCurrentPage(0);
  };

  const handleAdd = () => {
    setSelectedUsuario(null);
    form.reset({ nome: '', password: '', perfil: 'O', status: 'A' });
    setIsFormOpen(true);
  };

  const handleEdit = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    form.reset({
      nome: usuario.nome,
      password: '',
      perfil: usuario.perfil,
      status: usuario.status,
    });
    setIsFormOpen(true);
  };

  const handleManageProjects = async (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setIsProjectsOpen(true);
    setIsLoadingProjects(true);
    setSelectedAvailableIds([]);
    setSelectedAssignedIds([]);

    try {
      // Carrega todos os projetos (página única grande)
      const projetosResponse = await projetoService.findAll({
        page: 0,
        size: 1000,
      });
      setProjects(projetosResponse.content);

      // Carrega vínculos do usuário
      const vinculos = await usuarioProjetoService.findByUsuario(usuario.id);
      setUsuarioProjetos(vinculos);

      const assignedIds = vinculos.map((v) => v.projetoId);
      setAssignedProjectIds(assignedIds);
      setInitialAssignedProjectIds(assignedIds);
    } catch (err) {
      console.warn('Erro ao carregar projetos do usuário:', err);
      setProjects([]);
      setUsuarioProjetos([]);
      setAssignedProjectIds([]);
      setInitialAssignedProjectIds([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleDelete = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setIsDeleteOpen(true);
  };

  // Definição das colunas da tabela
  const columns: Column<Usuario>[] = useMemo(() => [
    {
      key: 'nome',
      label: t('users.name'),
      sortable: true,
    },
    {
      key: 'perfil',
      label: t('users.profile'),
      sortable: true,
      render: (usuario) => getProfileLabel(usuario.perfil, t),
    },
    {
      key: 'status',
      label: t('users.status'),
      render: (usuario) => getStatusBadge(usuario.status, t),
    },
  ], [t]);

  // Definição das ações da tabela
  const actions: Action<Usuario>[] = useMemo(() => [
    {
      label: t('common.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
    },
    {
      label: t('users.manageProjects'),
      icon: <ArrowLeftRight className="h-4 w-4" />,
      onClick: handleManageProjects,
    },
    {
      label: t('common.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive',
      separator: true,
    },
  ], [t, handleEdit, handleDelete]);

  const onSubmit = async (data: UsuarioFormData) => {
    setIsSaving(true);
    try {
      if (selectedUsuario) {
        await usuarioService.update(selectedUsuario.id, {
          nome: data.nome,
          perfil: data.perfil,
          status: data.status,
          ...(data.password && { password: data.password }),
        });
      } else {
        await usuarioService.create({
          nome: data.nome,
          password: data.password,
          perfil: data.perfil,
          status: data.status,
        });
      }
      setIsFormOpen(false);
      form.reset();
      loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUsuario) return;
    
    setIsDeleting(true);
    try {
      await usuarioService.delete(selectedUsuario.id);
      setIsDeleteOpen(false);
      loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  const availableProjects = useMemo(
    () => projects.filter((p) => !assignedProjectIds.includes(p.id)),
    [projects, assignedProjectIds]
  );

  const assignedProjects = useMemo(
    () => projects.filter((p) => assignedProjectIds.includes(p.id)),
    [projects, assignedProjectIds]
  );

  const toggleSelection = (id: number, list: 'available' | 'assigned') => {
    if (list === 'available') {
      setSelectedAvailableIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      setSelectedAssignedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  };

  const moveToAssigned = () => {
    if (selectedAvailableIds.length === 0) return;
    setAssignedProjectIds((prev) => Array.from(new Set([...prev, ...selectedAvailableIds])));
    setSelectedAvailableIds([]);
  };

  const moveToAvailable = () => {
    if (selectedAssignedIds.length === 0) return;
    setAssignedProjectIds((prev) => prev.filter((id) => !selectedAssignedIds.includes(id)));
    setSelectedAssignedIds([]);
  };

  const handleSaveProjects = async () => {
    if (!selectedUsuario) return;

    setIsSavingProjects(true);
    try {
      const currentSet = new Set(assignedProjectIds);
      const initialSet = new Set(initialAssignedProjectIds);

      const toAdd = assignedProjectIds.filter((id) => !initialSet.has(id));
      const toRemove = initialAssignedProjectIds.filter((id) => !currentSet.has(id));

      // Cria novos vínculos
      await Promise.all(
        toAdd.map((projetoId) =>
          usuarioProjetoService.create({ usuarioId: selectedUsuario.id, projetoId })
        )
      );

      // Remove vínculos existentes
      if (toRemove.length > 0 && usuarioProjetos.length > 0) {
        const vinculosToRemove = usuarioProjetos.filter((v) => toRemove.includes(v.projetoId));
        await Promise.all(vinculosToRemove.map((v) => usuarioProjetoService.delete(v.id)));
      }

      setIsProjectsOpen(false);
    } catch (err) {
      console.warn('Erro ao salvar projetos do usuário:', err);
    } finally {
      setIsSavingProjects(false);
    }
  };



  // Estado de erro
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('users.title')} description={t('common.manageUsers')} />
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
        title={t('users.title')}
        description={t('common.manageUsers')}
        onAdd={handleAdd}
        addLabel={t('users.newUser')}
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setCurrentPage(0); }}
        searchPlaceholder={t('common.searchByName')}
        onRefresh={loadData}
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : usuarios.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description={t('common.noUsersFound')}
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          action={
            <Button onClick={handleAdd}>
              {t('users.newUser')}
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            data={paginatedUsuarios}
            columns={columns}
            actions={actions}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
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

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedUsuario ? t('users.editUser') : t('users.newUser')}
            </DialogTitle>
            <DialogDescription>
              {selectedUsuario 
                ? t('common.editUser')
                : t('common.fillUser')}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.username')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth.usernamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.password')} {!selectedUsuario && '*'}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={selectedUsuario ? t('common.passwordKeepBlank') : t('common.passwordPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="perfil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.profile')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">{t('users.administrator')}</SelectItem>
                        <SelectItem value="O">{t('users.operator')}</SelectItem>
                        <SelectItem value="V">{t('users.viewer')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {selectedUsuario && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users.status')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A">{t('users.active')}</SelectItem>
                          <SelectItem value="I">{t('users.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                /> 
              )}
              
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
            <DialogDescription>
              {t('users.deleteConfirm')}
            </DialogDescription>
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

      {/* Manage Projects Dialog */}
      <Dialog open={isProjectsOpen} onOpenChange={setIsProjectsOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{t('users.manageProjects')}</DialogTitle>
            <DialogDescription>
              {selectedUsuario?.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
            <div className="md:col-span-1">
              <h4 className="text-sm font-medium mb-2">{t('users.availableProjects')}</h4>
              <div className="border rounded-md h-64 overflow-auto">
                {isLoadingProjects ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    {t('common.loading')}...
                  </div>
                ) : availableProjects.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">
                    {t('common.noResults')}
                  </div>
                ) : (
                  <ul className="text-sm">
                    {availableProjects.map((p) => {
                      const selected = selectedAvailableIds.includes(p.id);
                      return (
                        <li
                          key={p.id}
                          className={`px-2 py-1 cursor-pointer flex items-center justify-between ${
                            selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleSelection(p.id, 'available')}
                        >
                          <span className="truncate">
                            {p.codTed} - {p.nome}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="md:col-span-1 flex flex-col items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={moveToAssigned}
                disabled={selectedAvailableIds.length === 0 || isLoadingProjects}
                aria-label="Adicionar"
              >
                &gt;
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={moveToAvailable}
                disabled={selectedAssignedIds.length === 0 || isLoadingProjects}
                aria-label="Remover"
              >
                &lt;
              </Button>
            </div>

            <div className="md:col-span-1">
              <h4 className="text-sm font-medium mb-2">{t('users.assignedProjects')}</h4>
              <div className="border rounded-md h-64 overflow-auto">
                {isLoadingProjects ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    {t('common.loading')}...
                  </div>
                ) : assignedProjects.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">
                    {t('common.noResults')}
                  </div>
                ) : (
                  <ul className="text-sm">
                    {assignedProjects.map((p) => {
                      const selected = selectedAssignedIds.includes(p.id);
                      return (
                        <li
                          key={p.id}
                          className={`px-2 py-1 cursor-pointer flex items-center justify-between ${
                            selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleSelection(p.id, 'assigned')}
                        >
                          <span className="truncate">
                            {p.codTed} - {p.nome}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProjectsOpen(false)}
              disabled={isSavingProjects}
            >
              {t('common.cancel')}
            </Button>
            <LoadingButton
              onClick={handleSaveProjects}
              isLoading={isSavingProjects}
              loadingText={t('common.saving')}
            >
              {t('common.save')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
