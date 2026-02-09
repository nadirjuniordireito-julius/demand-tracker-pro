import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T) => React.ReactNode;
  hideOnMobile?: boolean; // Oculta coluna em telas pequenas
  minWidth?: string; // Largura mínima da coluna
}

export interface Action<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive';
  separator?: boolean;
  disabled?: (item: T) => boolean;
  visible?: (item: T) => boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  getRowId?: (item: T) => string | number;
  actionsLabel?: string;
  /**
   * Conteúdo opcional para ser exibido em uma linha logo abaixo da linha principal.
   * Usado, por exemplo, para mostrar detalhes/custos adicionais.
   */
  rowDetail?: (item: T) => React.ReactNode;
  /**
   * Conjunto/array de IDs de linhas que devem exibir o detalhe.
   */
  expandedRowIds?: Set<string | number> | Array<string | number>;
  /**
   * Elemento opcional renderizado dentro da célula de ações, logo após o botão de ações.
   * Útil para botões de expandir/colapsar linha.
   */
  rowSuffixInActions?: (item: T) => React.ReactNode;
}

const SortIcon = ({ 
  field, 
  sortField, 
  sortDirection 
}: { 
  field: string; 
  sortField?: string; 
  sortDirection?: 'asc' | 'desc' 
}) => {
  if (sortField !== field) return null;
  return sortDirection === 'asc' ? (
    <ChevronUp className="h-4 w-4" />
  ) : (
    <ChevronDown className="h-4 w-4" />
  );
};

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  actions,
  sortField,
  sortDirection,
  onSort,
  getRowId = (item) => (item as { id?: string | number }).id ?? '',
  actionsLabel,
  rowDetail,
  expandedRowIds,
  rowSuffixInActions,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const defaultActionsLabel = actionsLabel || t('common.actions');

  return (
    <div className="border rounded-lg overflow-hidden w-full">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            {actions && actions.length > 0 && (
              <TableHead 
                className="h-8 py-2 sticky left-0 z-10 bg-background w-[80px] sm:w-[100px] px-2 sm:px-4 border-r"
                style={{ minWidth: '80px' }}
              >
                <span className="text-xs sm:text-sm">{defaultActionsLabel}</span>
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={`
                  ${column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''} 
                  ${column.className || ''}
                  ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                  px-2 sm:px-4
                  whitespace-nowrap
                `}
                style={{ 
                  minWidth: column.minWidth || '120px',
                }}
                onClick={column.sortable && onSort ? () => onSort(column.key) : undefined}
              >
                {column.sortable ? (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm">{column.label}</span>
                    <SortIcon field={column.key} sortField={sortField} sortDirection={sortDirection} />
                  </div>
                ) : (
                  <span className="text-xs sm:text-sm">{column.label}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length + (actions ? 1 : 0)} 
                className="text-center text-muted-foreground py-8 px-2 sm:px-4"
              >
                <span className="text-xs sm:text-sm">{t('common.noRecordsFound')}</span>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const rowId = getRowId(item);
              const isExpanded = expandedRowIds
                ? expandedRowIds instanceof Set
                  ? expandedRowIds.has(rowId)
                  : Array.isArray(expandedRowIds)
                    ? expandedRowIds.includes(rowId)
                    : false
                : false;

              return (
                <React.Fragment key={rowId}>
                  <TableRow>
                    {actions && actions.length > 0 && (
                      <TableCell 
                        className="py-2 sticky left-0 z-10 bg-background px-2 sm:px-4 border-r"
                        style={{ minWidth: '80px' }}
                      >
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            aria-label={defaultActionsLabel}
                          >
                            <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[120px]">
                          {actions.filter((a) => a.visible === undefined || a.visible(item)).map((action, index) => {
                            const isDisabled = action.disabled ? action.disabled(item) : false;
                            return (
                              <div key={index}>
                                {action.separator && index > 0 && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                  onClick={() => action.onClick(item)}
                                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                                  disabled={isDisabled}
                                >
                                  {action.icon && (
                                    <span className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 inline-flex items-center">
                                      {action.icon}
                                    </span>
                                  )}
                                  <span className="text-xs sm:text-sm">{action.label}</span>
                                </DropdownMenuItem>
                              </div>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {rowSuffixInActions && rowSuffixInActions(item)}
                    </div>
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell 
                        key={column.key}
                        className={`
                          py-2
                          ${column.key === columns[0]?.key ? 'font-normal' : ''}
                          ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                          px-2 sm:px-4
                          text-xs sm:text-sm
                        `}
                        style={{ 
                          minWidth: column.minWidth || '120px',
                        }}
                      >
                        {column.render ? column.render(item) : (item[column.key] as React.ReactNode)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {rowDetail && isExpanded && (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length + (actions ? 1 : 0)}
                        className="bg-muted/30 px-2 sm:px-4 py-3"
                      >
                        {rowDetail(item)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
