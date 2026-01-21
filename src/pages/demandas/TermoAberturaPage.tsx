import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Edit, 
  Trash2, 
  MoreHorizontal,
  FilePlus,
  CheckCircle
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader, SearchFilterBar, EmptyState } from '@/components/common/PageComponents';
import type { TermoAbertura } from '@/types';

// Mock data
const mockTermos: TermoAbertura[] = [
  { 
    id: 1, 
    demandaTecnicaId: 1,
    descricao: 'Este termo formaliza a abertura da demanda para desenvolvimento do módulo de relatórios gerenciais.',
    dataAbertura: '2024-01-20T10:30:00',
    usuarioId: 1,
    dataAssinatura: '2024-01-21T14:00:00',
  },
  { 
    id: 2, 
    demandaTecnicaId: 2,
    descricao: 'Termo de abertura para integração com sistema externo de gestão financeira.',
    dataAbertura: '2024-02-15T14:00:00',
    usuarioId: 2,
    dataAssinatura: null,
  },
];

const mockDemandas = [
  { id: 1, codigo: 'DEM-2024-001', nome: 'Desenvolvimento do Módulo de Relatórios' },
  { id: 2, codigo: 'DEM-2024-002', nome: 'Integração com Sistema Externo' },
  { id: 3, codigo: 'DEM-2024-003', nome: 'Implementação de Dashboard' },
  { id: 4, codigo: 'DEM-2024-004', nome: 'Migração de Dados' },
];

export default function TermoAberturaPage() {
  const { t } = useTranslation();
  const [termos, setTermos] = useState<TermoAbertura[]>(mockTermos);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<TermoAbertura | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    demandaTecnicaId: '',
    descricao: '',
  });

  const filteredTermos = termos.filter((termo) => {
    const demanda = mockDemandas.find(d => d.id === termo.demandaTecnicaId);
    return demanda?.nome.toLowerCase().includes(search.toLowerCase()) ||
           demanda?.codigo.toLowerCase().includes(search.toLowerCase());
  });

  const formatDateTime = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getDemandaNome = (demandaId: number) => {
    const demanda = mockDemandas.find(d => d.id === demandaId);
    return demanda ? `${demanda.codigo} - ${demanda.nome}` : '-';
  };

  const handleAdd = () => {
    setSelectedTermo(null);
    setFormData({ demandaTecnicaId: '', descricao: '' });
    setIsFormOpen(true);
  };

  const handleEdit = (termo: TermoAbertura) => {
    setSelectedTermo(termo);
    setFormData({
      demandaTecnicaId: String(termo.demandaTecnicaId),
      descricao: termo.descricao,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (termo: TermoAbertura) => {
    setSelectedTermo(termo);
    setIsDeleteOpen(true);
  };

  const handleSign = (termo: TermoAbertura) => {
    setTermos(termos.map(t => 
      t.id === termo.id 
        ? { ...t, dataAssinatura: new Date().toISOString() }
        : t
    ));
  };

  const handleSave = () => {
    if (selectedTermo) {
      setTermos(termos.map(t => 
        t.id === selectedTermo.id 
          ? { 
              ...t, 
              demandaTecnicaId: Number(formData.demandaTecnicaId),
              descricao: formData.descricao,
            }
          : t
      ));
    } else {
      const newTermo: TermoAbertura = {
        id: Math.max(...termos.map(t => t.id), 0) + 1,
        demandaTecnicaId: Number(formData.demandaTecnicaId),
        descricao: formData.descricao,
        dataAbertura: new Date().toISOString(),
        usuarioId: 1,
        dataAssinatura: null,
      };
      setTermos([...termos, newTermo]);
    }
    setIsFormOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedTermo) {
      setTermos(termos.filter(t => t.id !== selectedTermo.id));
    }
    setIsDeleteOpen(false);
  };

  const isFormValid = formData.demandaTecnicaId && formData.descricao;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('openingTerm.title')}
        description="Gerencie os termos de abertura das demandas"
        onAdd={handleAdd}
        addLabel={t('openingTerm.newTerm')}
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por demanda..."
        onRefresh={() => {}}
      />

      {filteredTermos.length === 0 ? (
        <EmptyState
          title={t('common.noResults')}
          description="Nenhum termo de abertura encontrado"
          icon={<FilePlus className="h-6 w-6 text-muted-foreground" />}
          action={
            <Button onClick={handleAdd}>
              {t('openingTerm.newTerm')}
            </Button>
          }
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('openingTerm.demand')}</TableHead>
                <TableHead>{t('openingTerm.openingDate')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('openingTerm.signatureDate')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTermos.map((termo) => (
                <TableRow key={termo.id}>
                  <TableCell className="font-medium max-w-[300px] truncate">
                    {getDemandaNome(termo.demandaTecnicaId)}
                  </TableCell>
                  <TableCell>{formatDateTime(termo.dataAbertura)}</TableCell>
                  <TableCell>
                    {termo.dataAssinatura ? (
                      <Badge className="bg-success text-success-foreground">
                        {t('openingTerm.signed')}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {t('openingTerm.notSigned')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {termo.dataAssinatura ? formatDateTime(termo.dataAssinatura) : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(termo)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        {!termo.dataAssinatura && (
                          <DropdownMenuItem onClick={() => handleSign(termo)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t('openingTerm.sign')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(termo)}
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTermo ? t('openingTerm.editTerm') : t('openingTerm.newTerm')}
            </DialogTitle>
            <DialogDescription>
              {selectedTermo 
                ? 'Edite as informações do termo abaixo.'
                : 'Preencha as informações para criar um novo termo.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="demanda">{t('openingTerm.demand')} *</Label>
              <Select 
                value={formData.demandaTecnicaId} 
                onValueChange={(value) => setFormData({ ...formData, demandaTecnicaId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma demanda" />
                </SelectTrigger>
                <SelectContent>
                  {mockDemandas.map((demanda) => (
                    <SelectItem key={demanda.id} value={String(demanda.id)}>
                      {demanda.codigo} - {demanda.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="descricao">{t('openingTerm.description')} *</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o objetivo e escopo desta demanda..."
                rows={6}
              />
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
              {t('openingTerm.deleteConfirm')}
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
