import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { cn } from '@/lib/utils';
import { projetoSchema, type ProjetoFormData } from '@/lib/validations';
import type { Projeto } from '@/types';

// Mock data
const mockProjetos: Projeto[] = [
  { id: 1, nome: 'Projeto Alpha', codTed: 'TED-2024-001', termoInicial: '2024-01-15', termoFinal: '2024-12-31', dataUpdate: '2024-01-15T10:30:00', usuarioId: 1 },
  { id: 2, nome: 'Projeto Beta', codTed: 'TED-2024-002', termoInicial: '2024-02-01', termoFinal: '2024-11-30', dataUpdate: '2024-02-01T14:20:00', usuarioId: 2 },
  { id: 3, nome: 'Projeto Gamma', codTed: 'TED-2024-003', termoInicial: '2024-03-10', termoFinal: '2025-03-10', dataUpdate: '2024-03-10T09:15:00', usuarioId: 1 },
  { id: 4, nome: 'Projeto Delta', codTed: 'TED-2024-004', termoInicial: '2024-04-01', termoFinal: '2024-09-30', dataUpdate: '2024-04-01T11:00:00', usuarioId: 2 },
  { id: 5, nome: 'Projeto Epsilon', codTed: 'TED-2024-005', termoInicial: '2024-05-15', termoFinal: '2025-05-15', dataUpdate: '2024-05-15T08:30:00', usuarioId: 1 },
  { id: 6, nome: 'Projeto Zeta', codTed: 'TED-2024-006', termoInicial: '2024-06-01', termoFinal: '2024-12-31', dataUpdate: '2024-06-01T14:00:00', usuarioId: 3 },
];

export default function ProjetosPage() {
  const { t } = useTranslation();
  const [projetos, setProjetos] = useState<Projeto[]>(mockProjetos);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<ProjetoFormData>({
    resolver: zodResolver(projetoSchema),
    defaultValues: { nome: '', codTed: '', termoInicial: undefined, termoFinal: undefined },
  });

  const filteredProjetos = useMemo(() => {
    return projetos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()) || p.codTed.toLowerCase().includes(search.toLowerCase()));
  }, [projetos, search]);

  const totalPages = Math.ceil(filteredProjetos.length / pageSize);
  const paginatedProjetos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjetos.slice(start, start + pageSize);
  }, [filteredProjetos, currentPage, pageSize]);

  const formatDate = (dateStr: string) => format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });

  const handleAdd = () => { setSelectedProjeto(null); form.reset({ nome: '', codTed: '', termoInicial: undefined, termoFinal: undefined }); setIsFormOpen(true); };
  const handleEdit = (projeto: Projeto) => { setSelectedProjeto(projeto); form.reset({ nome: projeto.nome, codTed: projeto.codTed, termoInicial: new Date(projeto.termoInicial), termoFinal: new Date(projeto.termoFinal) }); setIsFormOpen(true); };
  const handleDelete = (projeto: Projeto) => { setSelectedProjeto(projeto); setIsDeleteOpen(true); };

  const onSubmit = (data: ProjetoFormData) => {
    if (selectedProjeto) {
      setProjetos(projetos.map(p => p.id === selectedProjeto.id ? { ...p, nome: data.nome, codTed: data.codTed, termoInicial: data.termoInicial.toISOString().split('T')[0], termoFinal: data.termoFinal.toISOString().split('T')[0], dataUpdate: new Date().toISOString() } : p));
    } else {
      setProjetos([...projetos, { id: Math.max(...projetos.map(p => p.id)) + 1, nome: data.nome, codTed: data.codTed, termoInicial: data.termoInicial.toISOString().split('T')[0], termoFinal: data.termoFinal.toISOString().split('T')[0], dataUpdate: new Date().toISOString(), usuarioId: 1 }]);
    }
    setIsFormOpen(false); form.reset();
  };

  const handleConfirmDelete = () => { if (selectedProjeto) setProjetos(projetos.filter(p => p.id !== selectedProjeto.id)); setIsDeleteOpen(false); };

  return (
    <div className="space-y-6">
      <PageHeader title={t('projects.title')} description="Gerencie os projetos do sistema" onAdd={handleAdd} addLabel={t('projects.newProject')} />
      <SearchFilterBar searchValue={search} onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }} searchPlaceholder="Buscar por nome ou código..." onRefresh={() => {}} />

      {filteredProjetos.length === 0 ? (
        <EmptyState title={t('common.noResults')} description="Nenhum projeto encontrado" icon={<FolderKanban className="h-6 w-6 text-muted-foreground" />} action={<Button onClick={handleAdd}>{t('projects.newProject')}</Button>} />
      ) : (
        <>
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
                {paginatedProjetos.map((projeto) => (
                  <TableRow key={projeto.id}>
                    <TableCell className="font-medium">{projeto.nome}</TableCell>
                    <TableCell>{projeto.codTed}</TableCell>
                    <TableCell>{formatDate(projeto.termoInicial)}</TableCell>
                    <TableCell>{formatDate(projeto.termoFinal)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(projeto)}><Edit className="h-4 w-4 mr-2" />{t('common.edit')}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(projeto)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />{t('common.delete')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={filteredProjetos.length} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }} />
        </>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedProjeto ? t('projects.editProject') : t('projects.newProject')}</DialogTitle>
            <DialogDescription>{selectedProjeto ? 'Edite as informações do projeto.' : 'Preencha as informações para criar um novo projeto.'}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>{t('projects.name')} *</FormLabel><FormControl><Input placeholder="Nome do projeto" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="codTed" render={({ field }) => (<FormItem><FormLabel>{t('projects.codeTed')} *</FormLabel><FormControl><Input placeholder="TED-2024-XXX" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="termoInicial" render={({ field }) => (
                  <FormItem><FormLabel>{t('projects.startDate')} *</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><Calendar className="mr-2 h-4 w-4" />{field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar"}</Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="termoFinal" render={({ field }) => (
                  <FormItem><FormLabel>{t('projects.endDate')} *</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><Calendar className="mr-2 h-4 w-4" />{field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar"}</Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>{t('common.cancel')}</Button><Button type="submit">{t('common.save')}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent><DialogHeader><DialogTitle>{t('common.confirmDelete')}</DialogTitle><DialogDescription>{t('projects.deleteConfirm')}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setIsDeleteOpen(false)}>{t('common.cancel')}</Button><Button variant="destructive" onClick={handleConfirmDelete}>{t('common.delete')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
