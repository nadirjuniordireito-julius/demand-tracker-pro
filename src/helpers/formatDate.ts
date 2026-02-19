// src/lib/date.ts
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatDateTime = (
  date: string | Date | null | undefined,
  pattern: string,
  locale = ptBR
) => {
  if (!date) return "-";

  const parsed = typeof date === "string" ? new Date(date) : date;

  if (isNaN(parsed.getTime())) return "-";

  return format(parsed, pattern, { locale });
};
