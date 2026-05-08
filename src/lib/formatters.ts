/**
 * Helpers de formatação compartilhados entre componentes do dashboard.
 * Concentrados aqui para evitar duplicação e manter consistência visual.
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Converte uma string de data (ISO ou YYYY-MM-DD) em Date no fuso local. */
export const parseDateOnly = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  if ([y, m, d].some((n) => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d);
};

/** Formata uma data isolada no formato MM/yyyy. Retorna `—` se inválida. */
export const formatMonthYear = (dateStr?: string | null): string => {
  const d = parseDateOnly(dateStr);
  if (!d) return '—';
  return format(d, 'MM/yyyy', { locale: ptBR });
};

/** Formata um intervalo `start a fim` no formato MM/yyyy. */
export const formatMonthYearRange = (
  start?: string | null,
  end?: string | null,
  separator = 'a',
): string => {
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  if (!s || !e) return '—';
  return `${format(s, 'MM/yyyy', { locale: ptBR })} ${separator} ${format(e, 'MM/yyyy', {
    locale: ptBR,
  })}`;
};

/** Formata um número como moeda BRL completa (com símbolo). */
export const formatCurrency = (value?: number | null): string =>
  typeof value === 'number'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    : '—';

/** Formata um número como moeda BRL sem o símbolo. */
export const formatCurrencyWithoutSymbol = (value?: number | null): string =>
  typeof value === 'number'
    ? new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : '—';

/** Formata um número 0..100 como percentual inteiro. */
export const formatPercent = (value?: number | null): string =>
  typeof value === 'number' ? `${Math.round(value)}%` : '—';

type NumberWordsLang = 'pt' | 'en' | 'es';

const NUMBER_WORDS: Record<NumberWordsLang, {
  units: string[];
  teens: string[];
  tens: string[];
  join: string;
}> = {
  pt: {
    units: ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'],
    teens: [
      'dez',
      'onze',
      'doze',
      'treze',
      'quatorze',
      'quinze',
      'dezesseis',
      'dezessete',
      'dezoito',
      'dezenove',
    ],
    tens: ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'],
    join: ' e ',
  },
  en: {
    units: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
    teens: [
      'ten',
      'eleven',
      'twelve',
      'thirteen',
      'fourteen',
      'fifteen',
      'sixteen',
      'seventeen',
      'eighteen',
      'nineteen',
    ],
    tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
    join: '-',
  },
  es: {
    units: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'],
    teens: [
      'diez',
      'once',
      'doce',
      'trece',
      'catorce',
      'quince',
      'dieciséis',
      'diecisiete',
      'dieciocho',
      'diecinueve',
    ],
    tens: ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'],
    join: ' y ',
  },
};

const ES_TWENTIES: Record<number, string> = {
  1: 'veintiuno',
  2: 'veintidós',
  3: 'veintitrés',
  4: 'veinticuatro',
  5: 'veinticinco',
  6: 'veintiséis',
  7: 'veintisiete',
  8: 'veintiocho',
  9: 'veintinueve',
};

/** Converte um número inteiro 0..99 para sua forma por extenso em pt/en/es. Fallback: numeral. */
export const numberToWords = (n: number, langInput: string): string => {
  if (!Number.isInteger(n) || n < 0 || n > 99) {
    const fallback = String(n);
    return fallback;
  }

  const langKey = langInput.split('-')[0] as NumberWordsLang;
  const dict = NUMBER_WORDS[langKey] ?? NUMBER_WORDS.pt;
  const fallbackLanguageUsed = !NUMBER_WORDS[langKey];

  if (n < 10) {
    const output = dict.units[n];
    return output;
  }
  if (n < 20) {
    const output = dict.teens[n - 10];
    
    return output;
  }

  const tens = Math.floor(n / 10);
  const units = n % 10;
  if (units === 0) {
    const output = dict.tens[tens];
    
    return output;
  }
  if (langKey === 'es' && tens === 2) {
    const output = ES_TWENTIES[units];
   
    return output;
  }
  const output = `${dict.tens[tens]}${dict.join}${dict.units[units]}`;
  
  return output;
};

/** Calcula os meses transcorridos (inclusivo) entre uma data inicial e a data atual, mês a mês. */
export const monthsElapsedInclusive = (start: Date, now: Date): number => {
  const diff =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
  return Math.max(0, diff);
};
