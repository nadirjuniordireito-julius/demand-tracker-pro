import { Badge } from '@/components/ui/badge';
import { DemandStatus } from '@/types';

const STATUS_KEY_MAP: Record<string, string> = {
  A: 'demands.statusA',
  B: 'demands.statusB',
  C: 'demands.statusC',
  D: 'demands.statusD',
  E: 'demands.statusE',
  F: 'demands.statusF',
  G: 'demands.statusG',
  Z: 'demands.statusZ',

  opened: 'demands.statusC',
  closed: 'demands.statusG',
  inPlanning: 'demands.statusD',
  inExecution: 'demands.statusF',
};

export const getStatusBadge = (
  status: DemandStatus | string | undefined,
  t: (key: string) => string
) => {
  const raw = (status ?? '').toString().trim();
  const code = raw.toUpperCase();

  const key =
    STATUS_KEY_MAP[raw] ??
    STATUS_KEY_MAP[code] ??
    'demands.statusA';

  const label = t(key);

  const variant =
    code === 'G' || raw === 'closed'
      ? 'default'
      : code === 'Z'
      ? 'destructive'
      : code === 'C' || code === 'E' || raw === 'opened'
      ? 'secondary'
      : 'outline';

  const className =
    code === 'G' || raw === 'closed'
      ? 'bg-success text-success-foreground'
      : code === 'Z'
      ? 'bg-destructive text-destructive-foreground'
      : code === 'D' ||
        code === 'F' ||
        raw === 'inPlanning' ||
        raw === 'inExecution'
      ? 'bg-info text-info-foreground'
      : '';

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};
