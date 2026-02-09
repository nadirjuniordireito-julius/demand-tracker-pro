/**
 * TedHealthMapFilters — Filtros do TED Health Map
 *
 * Meta, Produto, Perfil profissional, Status, Período.
 * Perfil: não oculta bolhas; recalcula effortDeviationHours e financialDeviation
 * apenas para o perfil selecionado (lógica no hook/página).
 */

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter } from 'lucide-react';

export interface TedHealthMapFiltersState {
  metaId: string;
  produtoId: string;
  perfilId: string;
  status: string;
  periodStart: string;
  periodEnd: string;
}

interface TedHealthMapFiltersProps {
  filters: TedHealthMapFiltersState;
  onFiltersChange: (filters: TedHealthMapFiltersState) => void;
  metaOptions: { value: string; label: string }[];
  produtoOptions: { value: string; label: string }[];
  perfilOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
}

export function TedHealthMapFilters({
  filters,
  onFiltersChange,
  metaOptions,
  produtoOptions,
  perfilOptions,
  statusOptions,
}: TedHealthMapFiltersProps) {
  const update = (key: keyof TedHealthMapFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-normal">
          <Filter className="h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm">Meta</Label>
          <Select value={filters.metaId} onValueChange={(v) => update('metaId', v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {metaOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Produto</Label>
          <Select value={filters.produtoId} onValueChange={(v) => update('produtoId', v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {produtoOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Perfil profissional</Label>
          <Select value={filters.perfilId} onValueChange={(v) => update('perfilId', v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {perfilOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Recalcula desvios de esforço e custo para o perfil selecionado.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Status</Label>
          <Select value={filters.status} onValueChange={(v) => update('status', v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
