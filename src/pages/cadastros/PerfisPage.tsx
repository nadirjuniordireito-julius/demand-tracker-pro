import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, MoreHorizontal, UserCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageHeader, SearchFilterBar, EmptyState, TablePagination } from '@/components/common/PageComponents';
import { cn } from '@/lib/utils';
import { perfilSchema, type PerfilFormData } from '@/lib/validations';
import type { Perfil } from '@/types';

const mockPerfis: Perfil[] = [
  { id: 1, nome: 'Analista Sênior', codTed: 'PERF-001', termoInicial: '2024-01-01', termoFinal: '2024-12-31', dataUpdate: '2024-01-01T10:00:00', usuarioId: 1 },
  { id: 2, nome: 'Desenvolvedor Pleno', codTed: 'PERF-002', termoInicial: '2024-01-01', termoFinal: '2024-12-31', dataUpdate: '2024-01-01T10:00:00', usuarioId: 1 },
  { id: 3, nome: 'Gerente de Projetos', codTed: 'PERF-003', termoInicial: '2024-01-01', termoFinal: '2024-12-31', dataUpdate: '2024-01-01T10:00:00', usuarioId: 1 },
  { id: 4, nome: 'Consultor Técnico', codTed: 'PERF-004', termoInicial: '2024-02-01', termoFinal: '2024-11-30', dataUpdate: '2024-02-01T14:00:00', usuarioId: 2 },
  { id: 5, nome: 'Arquiteto de Soluções', codTed: 'PERF-005', termoInicial: '2024-03-01', termoFinal: '2025-02-28', dataUpdate: '2024-03-01T09:00:00', usuarioId: 1 },
  { id: 6, nome: 'DevOps Engineer', codTed: 'PERF-006', termoInicial: '2024-04-01', termoFinal: '2024-12-31', dataUpdate: '2024-04-01T11:00:00', usuarioId: 2 },
];

export default function PerfisPage() {
  const { t } = useTranslation();
  const [perfis, setPerfis] = useState<Perfil[]>(mockPerfis);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState<Perfil | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<PerfilFormData>({ resolver: zodResolver(perfilSchema), defaultValues: { nome: '', codTed: '', termoInicial: undefined, termoFinal: undefined } });

  const filteredPerfis = useMemo(() => perfis.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()) || p.codTed.toLowerCase().includes(search.toLowerCase())), [perfis, search]);
  const totalPages = Math.ceil(filteredPerfis.length / pageSize);
  const paginatedPerfis = useMemo(() => { const start = (currentPage - 1) * pageSize; return filteredPerfis.slice(start, start + pageSize); }, [filteredPerfis, currentPage, pageSize]);

  const formatDate = (dateStr: string) => format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  const handleAdd = () => { setSelectedPerfil(null); form.reset({ nome: '', codTed: '', termoInicial: undefined, termoFinal: undefined }); setIsFormOpen(true); };
  const handleEdit = (perfil: Perfil) => { setSelectedPerfil(perfil); form.reset({ nome: perfil.nome, codTed: perfil.codTed, termoInicial: new Date(perfil.termoInicial), termoFinal: new Date(perfil.termoFinal) }); setIsFormOpen(true); };
  const handleDelete = (perfil: Perfil) => { setSelectedPerfil(perfil); setIsDeleteOpen(true); };

  const onSubmit = (data: PerfilFormData) => {
    if (selectedPerfil) { setPerfis(perfis.map(p => p.id === selectedPerfil.id ? { ...p, nome: data.nome, codTed: data.codTed, termoInicial: data.termoInicial.toISOString().split('T')[0], termoFinal: data.termoFinal.toISOString().split('T')[0], dataUpdate: new Date().toISOString() } : p)); }
    else { setPerfis([...perfis, { id: Math.max(...perfis.map(p => p.id)) + 1, nome: data.nome, codTed: data.codTed, termoInicial: data.termoInicial.toISOString().split('T')[0], termoFinal: data.termoFinal.toISOString().split('T')[0], dataUpdate: new Date().toISOString(), usuarioId: 1 }]); }
    setIsFormOpen(false); form.reset();
  };

  const handleConfirmDelete = () => { if (selectedPerfil) setPerfis(perfis.filter(p => p.id !== selectedPerfil.id)); setIsDeleteOpen(false); };

  return (
    <div className="space-y-6">
      <PageHeader title={t('profiles.title')} description="Gerencie os perfis de custo do sistema" onAdd={handleAdd} addLabel={t('profiles.newProfile')} />
      <SearchFilterBar searchValue={search} onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }} searchPlaceholder="Buscar por nome ou código..." onRefresh={() => {}} />

      {filteredPerfis.length === 0 ? (
        <EmptyState title={t('common.noResults')} description="Nenhum perfil encontrado" icon={<UserCircle className="h-6 w-6 text-muted-foreground" />} action={<Button onClick={handleAdd}>{t('profiles.newProfile')}</Button>} />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader><TableRow><TableHead>{t('profiles.name')}</TableHead><TableHead>{t('profiles.codeTed')}</TableHead><TableHead>{t('profiles.startDate')}</TableHead><TableHead>{t('profiles.endDate')}</TableHead><TableHead className="w-[100px]">{t('common.actions')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {paginatedPerfis.map((perfil) => (
                  <TableRow key={perfil.id}>
                    <TableCell className="font-medium">{perfil.nome}</TableCell><TableCell>{perfil.codTed}</TableCell><TableCell>{formatDate(perfil.termoInicial)}</TableCell><TableCell>{formatDate(perfil.termoFinal)}</TableCell>
                    <TableCell>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleEdit(perfil)}><Edit className="h-4 w-4 mr-2" />{t('common.edit')}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(perfil)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />{t('common.delete')}</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={filteredPerfis.length} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }} />
        </>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{selectedPerfil ? t('profiles.editProfile') : t('profiles.newProfile')}</DialogTitle><DialogDescription>{selectedPerfil ? 'Edite as informações do perfil.' : 'Preencha as informações para criar um novo perfil.'}</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>{t('profiles.name')} *</FormLabel><FormControl><Input placeholder="Nome do perfil" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="codTed" render={({ field }) => (<FormItem><FormLabel>{t('profiles.codeTed')} *</FormLabel><FormControl><Input placeholder="PERF-XXX" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="termoInicial" render={({ field }) => (<FormItem><FormLabel>{t('profiles.startDate')} *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><Calendar className="mr-2 h-4 w-4" />{field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar"}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="termoFinal" render={({ field }) => (<FormItem><FormLabel>{t('profiles.endDate')} *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><Calendar className="mr-2 h-4 w-4" />{field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar"}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>{t('common.cancel')}</Button><Button type="submit">{t('common.save')}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}><DialogContent><DialogHeader><DialogTitle>{t('common.confirmDelete')}</DialogTitle><DialogDescription>{t('profiles.deleteConfirm')}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsDeleteOpen(false)}>{t('common.cancel')}</Button><Button variant="destructive" onClick={handleConfirmDelete}>{t('common.delete')}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
