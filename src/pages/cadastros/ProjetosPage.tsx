import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Edit, 
  Trash2, 
  MoreHorizontal,
  FolderKanban,
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
import type { Projeto } from '@/types';

// Mock data
const mockProjetos: Projeto[] = [
  { 
    id: 1, 
    nome: 'Projeto Alpha', 
    codTed: 'TED-2024-001',
    termoInicial: '2024-01-15',
    termoFinal: '2024-12-31',
    dataUpdate: '2024-01-15T10:30:00',
    usuarioId: 1
  },
  { 
    id: 2, 
    nome: 'Projeto Beta', 
    codTed: 'TED-2024-002',
    termoInicial: '2024-02-01',
    termoFinal: '2024-11-30',
    dataUpdate: '2024-02-01T14:20:00',
    usuarioId: 2
  },
  { 
    id: 3, 
    nome: 'Projeto Gamma', 
    codTed: 'TED-2024-003',
    termoInicial: '2024-03-10',
    termoFinal: '2025-03-10',
    dataUpdate: '2024-03-10T09:15:00',
    usuarioId: 1
  },
];

export default function ProjetosPage() {
  const { t } = useTranslation();
  const [projetos, setProjetos] = useState<Projeto[]>(mockProjetos);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    codTed: '',
    termoInicial: undefined as Date | undefined,
    termoFinal: undefined as Date | undefined,
  });

  const filteredProjetos = projetos.filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.codTed.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const handleAdd = () => {
    setSelectedProjeto(null);
    setFormData({
      nome: '',
      codTed: '',
      termoInicial: undefined,
      termoFinal: undefined,
    });
    setIsFormOpen(true);
  };

  const handleEdit = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    setFormData({
      nome: projeto.nome,
      codTed: projeto.codTed,
      termoInicial: new Date(projeto.termoInicial),
      termoFinal: new Date(projeto.termoFinal),
    });
    setIsFormOpen(true);
  };

  const handleDelete = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    setIsDeleteOpen(true);
  };

  const handleSave = () => {
    if (!formData.termoInicial || !formData.termoFinal) return;
    
    if (selectedProjeto) {
      setProjetos(projetos.map(p => 
        p.id === selectedProjeto.id 
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
      const newProjeto: Projeto = {
        id: Math.max(...projetos.map(p => p.id)) + 1,
        nome: formData.nome,
        codTed: formData.codTed,
        termoInicial: formData.termoInicial!.toISOString().split('T')[0],
        termoFinal: formData.termoFinal!.toISOString().split('T')[0],
        dataUpdate: new Date().toISOString(),
        usuarioId: 1,
      };
      setProjetos([...projetos, newProjeto]);
    }
    setIsFormOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedProjeto) {
      setProjetos(projetos.filter(p => p.id !== selectedProjeto.id));
    }
    setIsDeleteOpen(false);
  };

  const isFormValid = formData.nome && formData.codTed && formData.termoInicial && formData.termoFinal;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('projects.title')}
        description="Gerencie os projetos do sistema"
        onAdd={handleAdd}
        addLabel={t('projects.newProject')}
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou código..."
        onRefresh={() => {}}
      />

      {filteredProjetos.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description="Nenhum projeto encontrado com os filtros aplicados"
          icon={<FolderKanban className="h-6 w-6 text-muted-foreground" />}
          action={
            <Button onClick={handleAdd}>
              {t('projects.newProject')}
            </Button>
          }
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('projects.name')}</TableHead>
                <TableHead>{t('projects.codeTed')}</TableHead>
                <TableHead>{t('projects.startDate')}</TableHead>
                <TableHead>{t('projects.endDate')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjetos.map((projeto) => (
                <TableRow key={projeto.id}>
                  <TableCell className="font-medium">{projeto.nome}</TableCell>
                  <TableCell>{projeto.codTed}</TableCell>
                  <TableCell>{formatDate(projeto.termoInicial)}</TableCell>
                  <TableCell>{formatDate(projeto.termoFinal)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(projeto)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(projeto)}
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
              {selectedProjeto ? t('projects.editProject') : t('projects.newProject')}
            </DialogTitle>
            <DialogDescription>
              {selectedProjeto 
                ? 'Edite as informações do projeto abaixo.'
                : 'Preencha as informações para criar um novo projeto.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">{t('projects.name')} *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do projeto"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="codTed">{t('projects.codeTed')} *</Label>
              <Input
                id="codTed"
                value={formData.codTed}
                onChange={(e) => setFormData({ ...formData, codTed: e.target.value })}
                placeholder="TED-2024-XXX"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('projects.startDate')} *</Label>
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
                <Label>{t('projects.endDate')} *</Label>
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
              {t('projects.deleteConfirm')}
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
