import type { UserState } from '@/data/types';
import { currentStreak, longestStreak } from './dates';
import { LAMF } from './finance';

export interface Milestone {
  id: string;
  title: string;
  detail: string;
  /** emoji shown in celebrations and the milestone card */
  glyph: string;
  kind: 'portfolio' | 'streak' | 'unlock';
  /** 0–1 progress toward this milestone (1 = achieved) */
  progress: number;
  achieved: boolean;
}

const PORTFOLIO_STEPS: { at: number; title: string; detail: string; glyph: string }[] = [
  { at: 1_000, title: 'First ₹1,000', detail: 'The habit is real now.', glyph: '🌱' },
  { at: 10_000, title: '₹10K orbit', detail: 'Five figures, built daily.', glyph: '🪐' },
  { at: 25_000, title: 'Halfway to power', detail: '₹25K — the ring is half closed.', glyph: '⚡' },
  {
    at: LAMF.unlockFloor,
    title: 'Credit line unlocked',
    detail: 'You now carry an emergency fund in your pocket — without selling a unit.',
    glyph: '🔓',
  },
  { at: 1_00_000, title: '₹1 Lakh club', detail: 'Six figures of quiet compounding.', glyph: '🏆' },
  { at: 10_00_000, title: '₹10 Lakh', detail: 'This is generational-habit territory.', glyph: '🚀' },
  { at: 1_00_00_000, title: 'Crore club', detail: 'From ₹-a-day to eight digits.', glyph: '👑' },
];

const STREAK_STEPS: { at: number; title: string; detail: string; glyph: string }[] = [
  { at: 7, title: '7-day streak', detail: 'One full week of showing up.', glyph: '🔥' },
  { at: 30, title: '30-day streak', detail: 'A month. This is a system now.', glyph: '🗓️' },
  { at: 100, title: '100-day streak', detail: 'Top-percentile consistency.', glyph: '💯' },
  { at: 365, title: 'One full year', detail: '365 days without missing once.', glyph: '🎂' },
];

/**
 * All milestones with progress, achieved-or-not. Uses the BEST streak so an
 * earned streak milestone is never revoked by a later miss — achievements
 * don't un-achieve (that would be a dark pattern in reverse).
 */
export function computeMilestones(user: UserState, now: number): Milestone[] {
  const best = Math.max(longestStreak(user.saveTimestamps), currentStreak(user.saveTimestamps, now).length);

  const portfolio: Milestone[] = PORTFOLIO_STEPS.map((s) => ({
    id: `p-${s.at}`,
    title: s.title,
    detail: s.detail,
    glyph: s.glyph,
    kind: s.at === LAMF.unlockFloor ? 'unlock' : 'portfolio',
    progress: Math.min(1, user.portfolioValue / s.at),
    achieved: user.portfolioValue >= s.at,
  }));

  const streaks: Milestone[] = STREAK_STEPS.map((s) => ({
    id: `s-${s.at}`,
    title: s.title,
    detail: s.detail,
    glyph: s.glyph,
    kind: 'streak' as const,
    progress: Math.min(1, best / s.at),
    achieved: best >= s.at,
  }));

  return [...portfolio, ...streaks];
}

/** The next milestone worth chasing (highest-progress unachieved). */
export function nextMilestone(milestones: Milestone[]): Milestone | null {
  const pending = milestones.filter((m) => !m.achieved);
  if (pending.length === 0) return null;
  return pending.reduce((a, b) => (b.progress > a.progress ? b : a));
}

/** Newly achieved milestones that haven't been celebrated yet. */
export function uncelebrated(milestones: Milestone[], seenIds: string[]): Milestone[] {
  const seen = new Set(seenIds);
  return milestones.filter((m) => m.achieved && !seen.has(m.id));
}
