import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Edit, 
  Trash2, 
  MoreHorizontal,
  UserCircle,
  Calendar
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PageHeader, SearchFilterBar, EmptyState } from '@/components/common/PageComponents';
import { cn } from '@/lib/utils';
import type { Perfil } from '@/types';

// Mock data
const mockPerfis: Perfil[] = [
  { 
    id: 1, 
    nome: 'Analista Sênior', 
    codTed: 'PERF-001',
    termoInicial: '2024-01-01',
    termoFinal: '2024-12-31',
    dataUpdate: '2024-01-01T10:00:00',
    usuarioId: 1
  },
  { 
    id: 2, 
    nome: 'Desenvolvedor Pleno', 
    codTed: 'PERF-002',
    termoInicial: '2024-01-01',
    termoFinal: '2024-12-31',
    dataUpdate: '2024-01-01T10:00:00',
    usuarioId: 1
  },
  { 
    id: 3, 
    nome: 'Gerente de Projetos', 
    codTed: 'PERF-003',
    termoInicial: '2024-01-01',
    termoFinal: '2024-12-31',
    dataUpdate: '2024-01-01T10:00:00',
    usuarioId: 1
  },
  { 
    id: 4, 
    nome: 'Consultor Técnico', 
    codTed: 'PERF-004',
    termoInicial: '2024-02-01',
    termoFinal: '2024-11-30',
    dataUpdate: '2024-02-01T14:00:00',
    usuarioId: 2
  },
];

export default function PerfisPage() {
  const { t } = useTranslation();
  const [perfis, setPerfis] = useState<Perfil[]>(mockPerfis);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState<Perfil | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    codTed: '',
    termoInicial: undefined as Date | undefined,
    termoFinal: undefined as Date | undefined,
  });

  const filteredPerfis = perfis.filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.codTed.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const handleAdd = () => {
    setSelectedPerfil(null);
    setFormData({
      nome: '',
      codTed: '',
      termoInicial: undefined,
      termoFinal: undefined,
    });
    setIsFormOpen(true);
  };

  const handleEdit = (perfil: Perfil) => {
    setSelectedPerfil(perfil);
    setFormData({
      nome: perfil.nome,
      codTed: perfil.codTed,
      termoInicial: new Date(perfil.termoInicial),
      termoFinal: new Date(perfil.termoFinal),
    });
    setIsFormOpen(true);
  };

  const handleDelete = (perfil: Perfil) => {
    setSelectedPerfil(perfil);
    setIsDeleteOpen(true);
  };

  const handleSave = () => {
    if (!formData.termoInicial || !formData.termoFinal) return;
    
    if (selectedPerfil) {
      setPerfis(perfis.map(p => 
        p.id === selectedPerfil.id 
          ? { 
              ...p, 
              nome: formData.nome,
              codTed: formData.codTed,
              termoInicial: formData.termoInicial!.toISOString().split('T')[0],
              termoFinal: formData.termoFinal!.toISOString().split('T')[0],
              dataUpdate: new Date().toISOString(),
            }
          : p
      ));
    } else {
      const newPerfil: Perfil = {
        id: Math.max(...perfis.map(p => p.id)) + 1,
        nome: formData.nome,
        codTed: formData.codTed,
        termoInicial: formData.termoInicial!.toISOString().split('T')[0],
        termoFinal: formData.termoFinal!.toISOString().split('T')[0],
        dataUpdate: new Date().toISOString(),
        usuarioId: 1,
      };
      setPerfis([...perfis, newPerfil]);
    }
    setIsFormOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedPerfil) {
      setPerfis(perfis.filter(p => p.id !== selectedPerfil.id));
    }
    setIsDeleteOpen(false);
  };

  const isFormValid = formData.nome && formData.codTed && formData.termoInicial && formData.termoFinal;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('profiles.title')}
        description="Gerencie os perfis de custo do sistema"
        onAdd={handleAdd}
        addLabel={t('profiles.newProfile')}
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou código..."
        onRefresh={() => {}}
      />

      {filteredPerfis.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description="Nenhum perfil encontrado com os filtros aplicados"
          icon={<UserCircle className="h-6 w-6 text-muted-foreground" />}
          action={
            <Button onClick={handleAdd}>
              {t('profiles.newProfile')}
            </Button>
          }
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('profiles.name')}</TableHead>
                <TableHead>{t('profiles.codeTed')}</TableHead>
                <TableHead>{t('profiles.startDate')}</TableHead>
                <TableHead>{t('profiles.endDate')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPerfis.map((perfil) => (
                <TableRow key={perfil.id}>
                  <TableCell className="font-medium">{perfil.nome}</TableCell>
                  <TableCell>{perfil.codTed}</TableCell>
                  <TableCell>{formatDate(perfil.termoInicial)}</TableCell>
                  <TableCell>{formatDate(perfil.termoFinal)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(perfil)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(perfil)}
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedPerfil ? t('profiles.editProfile') : t('profiles.newProfile')}
            </DialogTitle>
            <DialogDescription>
              {selectedPerfil 
                ? 'Edite as informações do perfil abaixo.'
                : 'Preencha as informações para criar um novo perfil.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">{t('profiles.name')} *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do perfil"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="codTed">{t('profiles.codeTed')} *</Label>
              <Input
                id="codTed"
                value={formData.codTed}
                onChange={(e) => setFormData({ ...formData, codTed: e.target.value })}
                placeholder="PERF-XXX"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('profiles.startDate')} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !formData.termoInicial && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.termoInicial 
                        ? format(formData.termoInicial, "dd/MM/yyyy")
                        : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.termoInicial}
                      onSelect={(date) => setFormData({ ...formData, termoInicial: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid gap-2">
                <Label>{t('profiles.endDate')} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !formData.termoFinal && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.termoFinal 
                        ? format(formData.termoFinal, "dd/MM/yyyy")
                        : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.termoFinal}
                      onSelect={(date) => setFormData({ ...formData, termoFinal: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!isFormValid}>
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
              {t('profiles.deleteConfirm')}
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
