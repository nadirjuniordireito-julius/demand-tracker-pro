import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DialogHeaderStandard } from '@/components/common/DialogHeaderStandard';
import { LoadingButton } from '@/components/common/LoadingStates';
import { cn } from '@/lib/utils';
import { diaNaoUtilFormSchema, type DiaNaoUtilFormData } from '@/lib/validations';
import type { DiaNaoUtil } from '@/types';

function parseDateOnly(dateStr: string): Date | undefined {
  const part = String(dateStr).split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

interface DiaNaoUtilFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DiaNaoUtil | null;
  onSubmit: (data: { data: string; descricao: string }) => Promise<void>;
  saving: boolean;
}

export function DiaNaoUtilFormModal({
  open,
  onOpenChange,
  item,
  onSubmit,
  saving,
}: DiaNaoUtilFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!item;

  const form = useForm<DiaNaoUtilFormData>({
    resolver: zodResolver(diaNaoUtilFormSchema),
    defaultValues: {
      data: undefined,
      descricao: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (item) {
      form.reset({
        data: parseDateOnly(item.data),
        descricao: item.descricao,
      });
    } else {
      form.reset({
        data: undefined,
        descricao: '',
      });
    }
  }, [open, item, form]);

  const handleSubmit = async (data: DiaNaoUtilFormData) => {
    await onSubmit({
      data: format(data.data, 'yyyy-MM-dd'),
      descricao: data.descricao.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeaderStandard
          title={isEdit ? t('diasNaoUteis.edit') : t('diasNaoUteis.new')}
          description={t('diasNaoUteis.formDescription')}
        />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('diasNaoUteis.colDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value
                            ? format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                            : t('common.select')}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('diasNaoUteis.colDescription')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      maxLength={500}
                      placeholder={t('diasNaoUteis.descriptionPlaceholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <LoadingButton type="submit" isLoading={saving}>
                {t('common.save')}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
