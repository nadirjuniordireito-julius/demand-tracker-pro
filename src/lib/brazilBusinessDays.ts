/** Máximo de horas contabilizáveis por dia útil na sumarização de execução. */
export const HOURS_PER_BUSINESS_DAY = 8;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Domingo de Páscoa (calendário gregoriano). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return startOfDay(d);
}

function isFixedNationalHoliday(date: Date): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return (
    (m === 1 && d === 1) ||
    (m === 4 && d === 21) ||
    (m === 5 && d === 1) ||
    (m === 9 && d === 7) ||
    (m === 10 && d === 12) ||
    (m === 11 && d === 2) ||
    (m === 11 && d === 15) ||
    (m === 12 && d === 25)
  );
}

function isMovableNationalHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const easter = easterSunday(year);
  const movable = [
    addDays(easter, -48), // Segunda de Carnaval
    addDays(easter, -47), // Terça de Carnaval
    addDays(easter, -2), // Sexta-feira Santa
    addDays(easter, 60), // Corpus Christi
  ];
  return movable.some((h) => sameDay(h, date));
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isBrazilNationalHoliday(date: Date): boolean {
  const d = startOfDay(date);
  return isFixedNationalHoliday(d) || isMovableNationalHoliday(d);
}

export function isBusinessDay(date: Date): boolean {
  const d = startOfDay(date);
  return !isWeekend(d) && !isBrazilNationalHoliday(d);
}

/** Conta dias úteis entre start e end (inclusive). */
export function countBusinessDaysInclusive(start: Date, end: Date): number {
  const s = startOfDay(start);
  const e = startOfDay(end);
  if (e.getTime() < s.getTime()) return 0;

  let count = 0;
  const cursor = new Date(s.getTime());
  while (cursor.getTime() <= e.getTime()) {
    if (isBusinessDay(cursor)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Dias úteis do intervalo [rangeStart, rangeEnd] que caem no mês civil (month 0-indexed). */
export function countBusinessDaysInMonthOverlap(
  rangeStart: Date,
  rangeEnd: Date,
  year: number,
  month: number,
): number {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const overlapStart = rangeStart > monthStart ? rangeStart : monthStart;
  const overlapEnd = rangeEnd < monthEnd ? rangeEnd : monthEnd;
  if (overlapEnd.getTime() < overlapStart.getTime()) return 0;
  return countBusinessDaysInclusive(overlapStart, overlapEnd);
}
