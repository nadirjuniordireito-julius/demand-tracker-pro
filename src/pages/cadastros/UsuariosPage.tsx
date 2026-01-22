import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  ChevronUp,
  ChevronDown,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useApi } from '@/hooks/useApi';
import { usuarioSchema, usuarioCreateSchema, type UsuarioFormData } from '@/lib/validations';
import { usuarioService } from '@/services/usuarioService';
import type { Usuario, UserProfile, UserStatus, PaginatedResponse } from '@/types';

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

  // API states
  const { isLoading, error, execute } = useApi<PaginatedResponse<Usuario>>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    await execute(
      () => usuarioService.findAll({ 
        nome: search || undefined,
        page: currentPage, 
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

  const handleSort = (field: 'nome' | 'perfil') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
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

  const handleDelete = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setIsDeleteOpen(true);
  };

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


  const SortIcon = ({ field }: { field: 'nome' | 'perfil' }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Estado de erro
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('users.title')} description="Gerencie os usuários do sistema" />
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
        description="Gerencie os usuários do sistema"
        onAdd={handleAdd}
        addLabel={t('users.newUser')}
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setCurrentPage(0); }}
        searchPlaceholder="Buscar por nome..."
        onRefresh={loadData}
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : usuarios.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description="Nenhum usuário encontrado com os filtros aplicados"
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          action={
            <Button onClick={handleAdd}>
              {t('users.newUser')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('nome')}
                  >
                    <div className="flex items-center gap-2">
                      {t('users.name')}
                      <SortIcon field="nome" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('perfil')}
                  >
                    <div className="flex items-center gap-2">
                      {t('users.profile')}
                      <SortIcon field="perfil" />
                    </div>
                  </TableHead>
                  <TableHead>{t('users.status')}</TableHead>
                  <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.nome}</TableCell>
                    <TableCell>{getProfileLabel(usuario.perfil, t)}</TableCell>
                    <TableCell>{getStatusBadge(usuario.status, t)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(usuario)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(usuario)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
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

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedUsuario ? t('users.editUser') : t('users.newUser')}
            </DialogTitle>
            <DialogDescription>
              {selectedUsuario 
                ? 'Edite as informações do usuário abaixo.'
                : 'Preencha as informações para criar um novo usuário.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('users.name')} *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
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
                        placeholder={selectedUsuario ? 'Deixe em branco para manter' : 'Senha'}
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
    </div>
  );
}
