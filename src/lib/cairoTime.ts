/**
 * Cairo Time Zone Utilities (Africa/Cairo)
 * Canonical handling of church liturgical day boundaries, prayer streaks, and calendar dates.
 * Prevents UTC-drift errors at local midnight.
 */

export const CAIRO_TIMEZONE = 'Africa/Cairo';

/**
 * Formats a given timestamp or current time into Cairo local Date components
 */
export function getCairoDateParts(inputDate: Date | string | number = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateString: string; // YYYY-MM-DD in Cairo
  timeString: string; // HH:MM:SS in Cairo
} {
  const d = typeof inputDate === 'string' || typeof inputDate === 'number' ? new Date(inputDate) : inputDate;
  const safeDate = isNaN(d.getTime()) ? new Date() : d;

  // Use Intl.DateTimeFormat with Africa/Cairo timeZone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CAIRO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(safeDate);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      partMap[p.type] = p.value;
    }
  }

  const year = parseInt(partMap.year || '2026', 10);
  const month = parseInt(partMap.month || '1', 10);
  const day = parseInt(partMap.day || '1', 10);
  const hour = parseInt(partMap.hour || '0', 10);
  const minute = parseInt(partMap.minute || '0', 10);
  const second = parseInt(partMap.second || '0', 10);

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const dateString = `${year}-${pad(month)}-${pad(day)}`;
  const timeString = `${pad(hour)}:${pad(minute)}:${pad(second)}`;

  return { year, month, day, hour, minute, second, dateString, timeString };
}

/**
 * Returns today's canonical Cairo calendar date in "YYYY-MM-DD" format
 */
export function getCairoDateString(inputDate: Date | string | number = new Date()): string {
  return getCairoDateParts(inputDate).dateString;
}

/**
 * Check if two dates fall on the same Cairo calendar day
 */
export function isSameCairoDay(dateA: Date | string | number, dateB: Date | string | number): boolean {
  return getCairoDateString(dateA) === getCairoDateString(dateB);
}

/**
 * Checks if laterDate is exactly the consecutive next calendar day after earlierDate in Cairo
 */
export function isConsecutiveCairoDay(earlierDate: Date | string, laterDate: Date | string): boolean {
  const earlierParts = getCairoDateParts(earlierDate);
  const laterParts = getCairoDateParts(laterDate);

  const date1 = new Date(earlierParts.year, earlierParts.month - 1, earlierParts.day);
  const date2 = new Date(laterParts.year, laterParts.month - 1, laterParts.day);

  const diffMs = date2.getTime() - date1.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Return previous calendar day in "YYYY-MM-DD" format using pure UTC date arithmetic
 */
export function getPreviousCairoDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prevMs = Date.UTC(y, m - 1, d) - 86400000;
  const prev = new Date(prevMs);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}-${pad(prev.getUTCDate())}`;
}

/**
 * Return next calendar day in "YYYY-MM-DD" format using pure UTC date arithmetic
 */
export function getNextCairoDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const nextMs = Date.UTC(y, m - 1, d) + 86400000;
  const next = new Date(nextMs);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/**
 * Authoritative streak calculation evaluated using Cairo local days.
 * 
 * Rules:
 * - 0 if no qualifying activity has ever occurred.
 * - If last activity is older than yesterday, the active streak has lapsed (returns 0).
 * - If last activity was yesterday, returns current streak (pending today's completion).
 * - If active today, returns streak count ending today.
 * - Increments by 1 on consecutive Cairo-local days.
 * - Multiple activities on the same Cairo day count as 1 day.
 */
export function calculateCairoStreak(historyDateStrings: string[]): {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  lastActiveCairoDate: string;
} {
  if (!historyDateStrings || historyDateStrings.length === 0) {
    return { currentStreak: 0, longestStreak: 0, isActiveToday: false, lastActiveCairoDate: '' };
  }

  // Deduplicate and sort descending by Cairo calendar date string
  const uniqueCairoDays = Array.from(
    new Set(historyDateStrings.map(d => (typeof d === 'string' && d.includes('T') ? getCairoDateString(d) : d)))
  ).filter(Boolean).sort().reverse();

  if (uniqueCairoDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, isActiveToday: false, lastActiveCairoDate: '' };
  }

  const todayCairo = getCairoDateString();
  const yesterdayCairo = getPreviousCairoDay(todayCairo);
  const mostRecent = uniqueCairoDays[0];
  const isActiveToday = (mostRecent === todayCairo);
  const isAlive = (mostRecent === todayCairo || mostRecent === yesterdayCairo);

  let currentStreak = 0;
  if (isAlive) {
    currentStreak = 1;
    let expectedPrev = getPreviousCairoDay(mostRecent);
    for (let i = 1; i < uniqueCairoDays.length; i++) {
      if (uniqueCairoDays[i] === expectedPrev) {
        currentStreak++;
        expectedPrev = getPreviousCairoDay(expectedPrev);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak across entire student history
  let longestStreak = currentStreak;
  let tempStreak = 1;
  const ascendingDays = [...uniqueCairoDays].reverse();
  for (let i = 0; i < ascendingDays.length - 1; i++) {
    const nextExpected = getNextCairoDay(ascendingDays[i]);
    if (ascendingDays[i + 1] === nextExpected) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 1;
    }
  }
  if (longestStreak < currentStreak) {
    longestStreak = currentStreak;
  }

  return {
    currentStreak,
    longestStreak,
    isActiveToday,
    lastActiveCairoDate: mostRecent
  };
}

