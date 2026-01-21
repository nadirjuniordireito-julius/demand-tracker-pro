import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Eye,
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader, SearchFilterBar, EmptyState } from '@/components/common/PageComponents';
import type { Usuario, UserProfile, UserStatus } from '@/types';

// Mock data
const mockUsuarios: Usuario[] = [
  { id: 1, nome: 'João Silva', perfil: 'A', status: 'A' },
  { id: 2, nome: 'Maria Santos', perfil: 'O', status: 'A' },
  { id: 3, nome: 'Pedro Oliveira', perfil: 'V', status: 'A' },
  { id: 4, nome: 'Ana Costa', perfil: 'O', status: 'I' },
  { id: 5, nome: 'Carlos Souza', perfil: 'V', status: 'A' },
];

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
  const [usuarios, setUsuarios] = useState<Usuario[]>(mockUsuarios);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [sortField, setSortField] = useState<'nome' | 'perfil'>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    password: '',
    perfil: 'O' as UserProfile,
    status: 'A' as UserStatus,
  });

  const filteredUsuarios = usuarios
    .filter((u) => u.nome.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;
      return aValue.localeCompare(bValue) * direction;
    });

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
    setFormData({ nome: '', password: '', perfil: 'O', status: 'A' });
    setIsFormOpen(true);
  };

  const handleEdit = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setFormData({
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

  const handleSave = () => {
    if (selectedUsuario) {
      setUsuarios(usuarios.map(u => 
        u.id === selectedUsuario.id 
          ? { ...u, ...formData }
          : u
      ));
    } else {
      const newUsuario: Usuario = {
        id: Math.max(...usuarios.map(u => u.id)) + 1,
        ...formData,
      };
      setUsuarios([...usuarios, newUsuario]);
    }
    setIsFormOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedUsuario) {
      setUsuarios(usuarios.filter(u => u.id !== selectedUsuario.id));
    }
    setIsDeleteOpen(false);
  };

  const SortIcon = ({ field }: { field: 'nome' | 'perfil' }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

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
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome..."
        onRefresh={() => {}}
      />

      {filteredUsuarios.length === 0 ? (
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
              {filteredUsuarios.map((usuario) => (
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
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">{t('users.name')} *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password">{t('users.password')} {!selectedUsuario && '*'}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={selectedUsuario ? 'Deixe em branco para manter' : 'Senha'}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="perfil">{t('users.profile')} *</Label>
              <Select 
                value={formData.perfil} 
                onValueChange={(value: UserProfile) => setFormData({ ...formData, perfil: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">{t('users.administrator')}</SelectItem>
                  <SelectItem value="O">{t('users.operator')}</SelectItem>
                  <SelectItem value="V">{t('users.viewer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">{t('users.status')} *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: UserStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">{t('users.active')}</SelectItem>
                  <SelectItem value="I">{t('users.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!formData.nome}>
              {t('common.save')}
            </Button>
          </DialogFooter>
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
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
