// Calendar dates are "YYYY-MM-DD" strings handled in UTC so no timezone shifts creep in.

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = utc(year, month, 1);
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return utc(year, month, 1 + offset + 7 * (n - 1));
}

function lastWeekday(year: number, month: number, weekday: number): Date {
  const last = utc(year, month + 1, 0);
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return utc(year, month, last.getUTCDate() - offset);
}

// 5 U.S.C. 6103: a holiday on Saturday is observed Friday, on Sunday observed Monday.
function observed(d: Date): Date {
  const day = d.getUTCDay();
  if (day === 6) return new Date(d.getTime() - 86_400_000);
  if (day === 0) return new Date(d.getTime() + 86_400_000);
  return d;
}

export function federalHolidays(year: number): Set<string> {
  const MON = 1;
  const THU = 4;
  return new Set(
    [
      observed(utc(year, 1, 1)),
      nthWeekday(year, 1, MON, 3),
      nthWeekday(year, 2, MON, 3),
      lastWeekday(year, 5, MON),
      observed(utc(year, 6, 19)),
      observed(utc(year, 7, 4)),
      nthWeekday(year, 9, MON, 1),
      nthWeekday(year, 10, MON, 2),
      observed(utc(year, 11, 11)),
      nthWeekday(year, 11, THU, 4),
      observed(utc(year, 12, 25)),
      // Next year's Jan 1 can be observed on Dec 31 of this year.
      observed(utc(year + 1, 1, 1)),
    ].map(ymd),
  );
}

export function isBusinessDay(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !federalHolidays(d.getUTCFullYear()).has(date);
}

export function addBusinessDays(date: string, days: number): string {
  let d = new Date(`${date}T00:00:00Z`);
  let left = days;
  while (left > 0) {
    d = new Date(d.getTime() + 86_400_000);
    if (isBusinessDay(ymd(d))) left -= 1;
  }
  return ymd(d);
}

export function hoursBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / 3_600_000;
}

export function formatDuration(hours: number): string {
  const totalMin = Math.round(Math.abs(hours) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${String(m).padStart(2, "0")}m`;
}

// Local calendar date of an ISO timestamp with offset, e.g. "2026-09-14T23:30:00-07:00" -> "2026-09-14".
export function localDate(iso: string): string {
  return iso.slice(0, 10);
}
