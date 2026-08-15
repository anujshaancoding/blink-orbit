/**
 * Streak & day-boundary logic.
 *
 * Streaks count *calendar days in the user's local timezone* — a save at
 * 11:59 PM and the next at 12:01 AM are two consecutive days. We deliberately
 * never compare raw 24h windows, which is the classic streak bug.
 */

/** Local-midnight key like 20260815 — stable across DST/timezone-of-day. */
export function dayKey(ms: number): number {
  const d = new Date(ms);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function shiftDays(ms: number, days: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/**
 * Current streak in days given save timestamps (any order, duplicates fine).
 * A streak is alive if the most recent save was today or yesterday —
 * yesterday keeps it alive because today's auto-debit may not have run yet.
 */
export function currentStreak(saveTimestamps: number[], nowMs: number): { length: number; savedToday: boolean } {
  if (saveTimestamps.length === 0) return { length: 0, savedToday: false };
  const keys = new Set(saveTimestamps.map(dayKey));
  const todayKey = dayKey(nowMs);
  const savedToday = keys.has(todayKey);

  let cursor = savedToday ? nowMs : shiftDays(nowMs, -1);
  if (!keys.has(dayKey(cursor))) return { length: 0, savedToday: false };

  let length = 0;
  while (keys.has(dayKey(cursor))) {
    length++;
    cursor = shiftDays(cursor, -1);
  }
  return { length, savedToday };
}

/** Longest streak ever, for milestone cards. */
export function longestStreak(saveTimestamps: number[]): number {
  if (saveTimestamps.length === 0) return 0;
  const keys = [...new Set(saveTimestamps.map(dayKey))].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    // consecutive calendar days ⇢ reconstruct dates and diff
    const prev = keyToDate(keys[i - 1]);
    const next = keyToDate(keys[i]);
    const diffDays = Math.round((next - prev) / (24 * 3600 * 1000));
    run = diffDays === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

function keyToDate(key: number): number {
  const y = Math.floor(key / 10000);
  const m = Math.floor((key % 10000) / 100) - 1;
  const d = key % 100;
  return new Date(y, m, d).getTime();
}

/** "6:42 AM" greeting-aware label for the pulse moment. */
export function pulseGreeting(nowMs: number): string {
  const h = new Date(nowMs).getHours();
  if (h < 4) return 'While you were up late';
  if (h < 12) return 'While you slept';
  if (h < 17) return 'Since this morning';
  return 'Today, quietly';
}
