import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  MoreHorizontal,
  FileText,
  Eye,
  FilePlus,
  FileCheck,
  FileX
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
import { PageHeader, SearchFilterBar, EmptyState, FilterSelect } from '@/components/common/PageComponents';
import type { DemandaTecnica, DemandStatus } from '@/types';

// Mock data
const mockDemandas: DemandaTecnica[] = [
  { 
    id: 1, 
    projetoId: 1,
    codigo: 'DEM-2024-001',
    nome: 'Desenvolvimento do Módulo de Relatórios',
    dataAbertura: '2024-01-20T10:30:00',
    usuarioId: 1,
    status: 'closed',
  },
  { 
    id: 2, 
    projetoId: 1,
    codigo: 'DEM-2024-002',
    nome: 'Integração com Sistema Externo',
    dataAbertura: '2024-02-15T14:00:00',
    usuarioId: 2,
    status: 'inExecution',
  },
  { 
    id: 3, 
    projetoId: 2,
    codigo: 'DEM-2024-003',
    nome: 'Implementação de Dashboard',
    dataAbertura: '2024-03-01T09:00:00',
    usuarioId: 1,
    status: 'inPlanning',
  },
  { 
    id: 4, 
    projetoId: 2,
    codigo: 'DEM-2024-004',
    nome: 'Migração de Dados',
    dataAbertura: '2024-03-10T11:30:00',
    usuarioId: 3,
    status: 'opened',
  },
];

const mockProjetos = [
  { id: 1, nome: 'Projeto Alpha' },
  { id: 2, nome: 'Projeto Beta' },
  { id: 3, nome: 'Projeto Gamma' },
];

const getStatusBadge = (status: DemandStatus, t: (key: string) => string) => {
  const statusConfig: Record<DemandStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    opened: { label: t('demands.opened'), variant: 'outline' },
    inPlanning: { label: t('demands.inPlanning'), variant: 'secondary' },
    inExecution: { label: t('demands.inExecution'), variant: 'default' },
    closed: { label: t('demands.closed'), variant: 'default' },
  };
  
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant}
      className={status === 'closed' ? 'bg-success text-success-foreground' : 
                 status === 'inExecution' ? 'bg-info text-info-foreground' : ''}
    >
      {config.label}
    </Badge>
  );
};

export default function DemandasPage() {
  const { t } = useTranslation();
  const [demandas, setDemandas] = useState<DemandaTecnica[]>(mockDemandas);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDemanda, setSelectedDemanda] = useState<DemandaTecnica | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    projetoId: '',
  });

  const filteredDemandas = demandas.filter((d) => {
    const matchesSearch = 
      d.codigo.toLowerCase().includes(search.toLowerCase()) ||
      d.nome.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDateTime = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getProjetoNome = (projetoId: number) => {
    return mockProjetos.find(p => p.id === projetoId)?.nome || '-';
  };

  const handleAdd = () => {
    setSelectedDemanda(null);
    setFormData({ codigo: '', nome: '', projetoId: '' });
    setIsFormOpen(true);
  };

  const handleEdit = (demanda: DemandaTecnica) => {
    setSelectedDemanda(demanda);
    setFormData({
      codigo: demanda.codigo,
      nome: demanda.nome,
      projetoId: String(demanda.projetoId),
    });
    setIsFormOpen(true);
  };

  const handleDelete = (demanda: DemandaTecnica) => {
    setSelectedDemanda(demanda);
    setIsDeleteOpen(true);
  };

  const handleSave = () => {
    if (selectedDemanda) {
      setDemandas(demandas.map(d => 
        d.id === selectedDemanda.id 
          ? { 
              ...d, 
              codigo: formData.codigo,
              nome: formData.nome,
              projetoId: Number(formData.projetoId),
            }
          : d
      ));
    } else {
      const newDemanda: DemandaTecnica = {
        id: Math.max(...demandas.map(d => d.id)) + 1,
        codigo: formData.codigo,
        nome: formData.nome,
        projetoId: Number(formData.projetoId),
        dataAbertura: new Date().toISOString(),
        usuarioId: 1,
        status: 'opened',
      };
      setDemandas([...demandas, newDemanda]);
    }
    setIsFormOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedDemanda) {
      setDemandas(demandas.filter(d => d.id !== selectedDemanda.id));
    }
    setIsDeleteOpen(false);
  };

  const isFormValid = formData.codigo && formData.nome && formData.projetoId;

  const statusOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'opened', label: t('demands.opened') },
    { value: 'inPlanning', label: t('demands.inPlanning') },
    { value: 'inExecution', label: t('demands.inExecution') },
    { value: 'closed', label: t('demands.closed') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('demands.title')}
        description="Gerencie as demandas técnicas do sistema"
        onAdd={handleAdd}
        addLabel={t('demands.newDemand')}
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por código ou nome..."
        onRefresh={() => {}}
      >
        <FilterSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder={t('common.status')}
          options={statusOptions}
        />
      </SearchFilterBar>

      {filteredDemandas.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description="Nenhuma demanda encontrada com os filtros aplicados"
          icon={<FileText className="h-6 w-6 text-muted-foreground" />}
          action={
            <Button onClick={handleAdd}>
              {t('demands.newDemand')}
            </Button>
          }
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('demands.code')}</TableHead>
                <TableHead>{t('demands.name')}</TableHead>
                <TableHead>{t('demands.project')}</TableHead>
                <TableHead>{t('demands.openingDate')}</TableHead>
                <TableHead>{t('demands.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDemandas.map((demanda) => (
                <TableRow key={demanda.id}>
                  <TableCell className="font-medium">{demanda.codigo}</TableCell>
                  <TableCell>{demanda.nome}</TableCell>
                  <TableCell>{getProjetoNome(demanda.projetoId)}</TableCell>
                  <TableCell>{formatDateTime(demanda.dataAbertura)}</TableCell>
                  <TableCell>{getStatusBadge(demanda.status!, t)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/demandas/${demanda.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.view')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(demanda)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to={`/demandas/termo-abertura?demandaId=${demanda.id}`}>
                            <FilePlus className="h-4 w-4 mr-2" />
                            {t('nav.openingTerm')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/demandas/termo-planejamento?demandaId=${demanda.id}`}>
                            <FileCheck className="h-4 w-4 mr-2" />
                            {t('nav.planningTerm')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/demandas/termo-encerramento?demandaId=${demanda.id}`}>
                            <FileX className="h-4 w-4 mr-2" />
                            {t('nav.closingTerm')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(demanda)}
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
              {selectedDemanda ? t('demands.editDemand') : t('demands.newDemand')}
            </DialogTitle>
            <DialogDescription>
              {selectedDemanda 
                ? 'Edite as informações da demanda abaixo.'
                : 'Preencha as informações para criar uma nova demanda.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="codigo">{t('demands.code')} *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="DEM-2024-XXX"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="nome">{t('demands.name')} *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome da demanda"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="projeto">{t('demands.project')} *</Label>
              <Select 
                value={formData.projetoId} 
                onValueChange={(value) => setFormData({ ...formData, projetoId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {mockProjetos.map((projeto) => (
                    <SelectItem key={projeto.id} value={String(projeto.id)}>
                      {projeto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {t('demands.deleteConfirm')}
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
