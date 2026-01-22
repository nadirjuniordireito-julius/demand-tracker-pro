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
import type { Usuario, UserProfile, UserStatus } from '@/types';

// Mock data
const mockUsuarios: Usuario[] = [
  { id: 1, nome: 'João Silva', perfil: 'A', status: 'A' },
  { id: 2, nome: 'Maria Santos', perfil: 'O', status: 'A' },
  { id: 3, nome: 'Pedro Oliveira', perfil: 'V', status: 'A' },
  { id: 4, nome: 'Ana Costa', perfil: 'O', status: 'I' },
  { id: 5, nome: 'Carlos Souza', perfil: 'V', status: 'A' },
  { id: 6, nome: 'Fernanda Lima', perfil: 'O', status: 'A' },
  { id: 7, nome: 'Ricardo Mendes', perfil: 'V', status: 'A' },
  { id: 8, nome: 'Paula Ferreira', perfil: 'A', status: 'I' },
  { id: 9, nome: 'Bruno Alves', perfil: 'O', status: 'A' },
  { id: 10, nome: 'Camila Rodrigues', perfil: 'V', status: 'A' },
  { id: 11, nome: 'Diego Nascimento', perfil: 'O', status: 'A' },
  { id: 12, nome: 'Elena Martins', perfil: 'V', status: 'I' },
];

// Simula delay de API
const simulateApiCall = <T,>(data: T, delay = 800): Promise<T> => 
  new Promise((resolve) => setTimeout(() => resolve(data), delay));

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // API states
  const { isLoading, error, execute } = useApi<Usuario[]>(null);
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
      () => simulateApiCall(mockUsuarios),
      {
        onSuccess: (data) => setUsuarios(data),
      }
    );
  }, [execute]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsuarios = useMemo(() => {
    return usuarios
      .filter((u) => u.nome.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        const direction = sortDirection === 'asc' ? 1 : -1;
        return aValue.localeCompare(bValue) * direction;
      });
  }, [usuarios, search, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredUsuarios.length / pageSize);
  
  const paginatedUsuarios = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsuarios.slice(start, start + pageSize);
  }, [filteredUsuarios, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredUsuarios.length, currentPage, totalPages]);

  const handleSort = (field: 'nome' | 'perfil') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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
      await simulateApiCall(null, 1000);
      
      if (selectedUsuario) {
        setUsuarios(usuarios.map(u => 
          u.id === selectedUsuario.id 
            ? { ...u, nome: data.nome, perfil: data.perfil, status: data.status }
            : u
        ));
      } else {
        const newUsuario: Usuario = {
          id: Math.max(...usuarios.map(u => u.id)) + 1,
          nome: data.nome,
          perfil: data.perfil,
          status: data.status,
        };
        setUsuarios([...usuarios, newUsuario]);
      }
      setIsFormOpen(false);
      form.reset();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUsuario) return;
    
    setIsDeleting(true);
    try {
      await simulateApiCall(null, 800);
      setUsuarios(usuarios.filter(u => u.id !== selectedUsuario.id));
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
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
        onSearchChange={(value) => { setSearch(value); setCurrentPage(1); }}
        searchPlaceholder="Buscar por nome..."
        onRefresh={loadData}
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : filteredUsuarios.length === 0 ? (
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
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredUsuarios.length}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
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
