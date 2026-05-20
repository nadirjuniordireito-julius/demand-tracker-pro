export function toDateOnly(value?: string | null): string | null {
  if (!value) return null;
  return String(value).split('T')[0] || null;
}

export function parseDate(value?: string | null): Date | null {
  const part = toDateOnly(value);
  if (!part) return null;
  const [y, m, d] = part.split('-').map(Number);
  if ([y, m, d].some(Number.isNaN)) return null;
  return new Date(y, m - 1, d);
}

export function formatDateBr(value?: string | null): string {
  const d = parseDate(value);
  if (!d) return '—';
  return formatDateBrFromDate(d);
}

export function formatDateBrFromDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateTimeBr(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR');
}

export function diffDaysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}
