import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingButton } from '@/components/common/LoadingStates';
import type { Profissional } from '@/types';

export interface CustoProfissionalItem {
  profissionalId: string;
  qtdeHora: string;
  valorHora: string;
}

interface CustoProfissionaisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nome do perfil desta linha de custo (para exibir no subtítulo). */
  perfilNome: string;
  /** Horas previstas para este perfil no termo de planejamento (exibido no subtítulo). */
  qtdePrevistaHoras?: number | null;
  /** Lista de profissionais do projeto (para seleção). */
  profissionais: Profissional[];
  /** Itens atuais (ao abrir o modal). */
  initialItems: CustoProfissionalItem[];
  /** Chamado ao confirmar com a lista atualizada. */
  onConfirm: (items: CustoProfissionalItem[]) => void;
  /** Desabilita edição (ex.: status da demanda não permite). */
  disabled?: boolean;
}

const emptyItem = (): CustoProfissionalItem => ({
  profissionalId: '',
  qtdeHora: '',
  valorHora: '',
});

export function CustoProfissionaisModal({
  open,
  onOpenChange,
  perfilNome,
  qtdePrevistaHoras,
  profissionais,
  initialItems,
  onConfirm,
  disabled = false,
}: CustoProfissionaisModalProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<CustoProfissionalItem[]>(() =>
    initialItems.length > 0 ? initialItems.map((i) => ({ ...i })) : [emptyItem()]
  );
  // Ao abrir o modal, sempre recalcular a tabela com os dados atuais do custo (initialItems)
  useEffect(() => {
    if (open) {
      setItems(
        initialItems.length > 0
          ? initialItems.map((i) => ({ ...i }))
          : [emptyItem()]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só sincronizar ao abrir (open -> true); initialItems do render atual; evita resetar enquanto o usuário edita
  }, [open]);

  const totalHoras = items.reduce(
    (acc, i) => acc + (Number(i.qtdeHora) || 0),
    0
  );

  const handleAdd = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  const handleRemove = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleChange = useCallback(
    (index: number, field: keyof CustoProfissionalItem, value: string) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;
          const next = { ...item, [field]: value };
          if (field === 'profissionalId') {
            const prof = profissionais.find((p) => p.id === Number(value));
            if (prof && prof.valorHora != null) {
              next.valorHora = String(prof.valorHora);
            }
          }
          return next;
        })
      );
    },
    [profissionais]
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setItems(
          initialItems.length > 0 ? initialItems.map((i) => ({ ...i })) : [emptyItem()]
        );
      }
      onOpenChange(next);
    },
    [initialItems, onOpenChange]
  );

  const handleConfirm = useCallback(() => {
    const valid = items.filter(
      (i) => i.profissionalId && Number(i.qtdeHora) > 0 && Number(i.valorHora) > 0
    );
    if (valid.length === 0) {
      onConfirm([]);
    } else {
      onConfirm(
        valid.map((i) => ({
          profissionalId: i.profissionalId,
          qtdeHora: i.qtdeHora,
          valorHora: i.valorHora,
        }))
      );
    }
    onOpenChange(false);
  }, [items, onConfirm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('closingTerm.costProfessionals.title')}</DialogTitle>
          <DialogDescription>
            {t('closingTerm.costProfessionals.subtitleWithPlanned', {
              nome: perfilNome || '—',
              horas: qtdePrevistaHoras != null ? String(qtdePrevistaHoras) : '—',
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAdd}
              disabled={disabled || profissionais.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('closingTerm.costProfessionals.addProfessional')}
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[280px]">{t('closingTerm.costProfessionals.professional')}</TableHead>
                  <TableHead className="w-[120px]">{t('closingTerm.costProfessionals.hours')}</TableHead>
                  <TableHead className="w-[80px]" aria-hidden />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="min-w-[280px]">
                      <Select
                        value={item.profissionalId}
                        onValueChange={(v) => handleChange(index, 'profissionalId', v)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-8 w-full">
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                        <SelectContent>
                          {profissionais.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="h-8"
                        value={item.qtdeHora}
                        onChange={(e) => handleChange(index, 'qtdeHora', e.target.value)}
                        placeholder="0"
                        disabled={disabled}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(index)}
                        disabled={disabled || items.length <= 1}
                        aria-label={t('common.remove')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end text-sm">
            <span className="text-muted-foreground">
              {t('closingTerm.costProfessionals.totalHours')}: <strong>{totalHoras.toFixed(2)}</strong>
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <LoadingButton
            type="button"
            onClick={handleConfirm}
            disabled={
              disabled ||
              items.every(
                (i) => !i.profissionalId || Number(i.qtdeHora) <= 0 || Number(i.valorHora) <= 0
              )
            }
          >
            {t('common.confirm')}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
