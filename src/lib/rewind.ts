import type { UserState } from '@/data/types';
import { currentStreak, dayKey } from './dates';
import { BENCHMARKS } from './finance';

const DAY = 24 * 3600 * 1000;

export interface RewindData {
  monthLabel: string;
  daysSaved: number;
  daysInWindow: number;
  totalSaved: number;
  /** market earnings over the window (value change minus contributions) */
  earned: number;
  topAssetLabel: string | null;
  streakNow: number;
  /** what the same deposits would have earned in an FD over the window */
  fdWouldHaveEarned: number;
  hasWithdrawal: boolean;
}

/**
 * Aggregates the last 30 days into the Rewind story. Pure and total: any
 * user state produces a valid (possibly sparse) rewind; the UI decides
 * which slides make sense to show.
 */
export function buildRewind(user: UserState, now: number): RewindData {
  const windowStart = now - 30 * DAY;
  const inWindow = user.txns.filter((t) => t.date >= windowStart);

  const saves = inWindow.filter((t) => t.type === 'sip' || t.type === 'topup');
  const totalSaved = saves.reduce((s, t) => s + t.amount, 0);
  const daysSaved = new Set(saves.map((t) => dayKey(t.date))).size;
  const hasWithdrawal = inWindow.some((t) => t.type === 'withdrawal');

  // Approximate market earnings: assume the pot's average annual growth,
  // scaled to the window. In production this comes from NAV history; the
  // mock keeps it consistent with yesterdayEarnings.
  const earned = user.yesterdayEarnings * 30;

  const topAsset =
    user.holdings.length > 0
      ? user.holdings.reduce((a, b) => (b.dayChange > a.dayChange ? b : a))
      : null;

  const fdWouldHaveEarned = totalSaved * (BENCHMARKS.fd / 100) * (30 / 365) * 0.5; // avg deployment half-window

  return {
    monthLabel: new Date(now).toLocaleDateString('en-IN', { month: 'long' }),
    daysSaved,
    daysInWindow: 30,
    totalSaved,
    earned,
    topAssetLabel: topAsset ? topAsset.label : null,
    streakNow: currentStreak(user.saveTimestamps, now).length,
    fdWouldHaveEarned,
    hasWithdrawal,
  };
}
