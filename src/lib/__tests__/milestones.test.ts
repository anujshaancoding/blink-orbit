import type { UserState } from '@/data/types';
import { computeMilestones, nextMilestone, uncelebrated } from '../milestones';

const DAY = 24 * 3600 * 1000;
const NOW = new Date(2026, 7, 15, 12).getTime();

function makeUser(portfolioValue: number, streakDays: number): UserState {
  const saveTimestamps = Array.from({ length: streakDays }, (_, i) => NOW - i * DAY);
  return {
    personaId: 'steady',
    name: 'T',
    joinedAt: NOW - 300 * DAY,
    dailySip: 51,
    portfolioValue,
    investedTotal: portfolioValue,
    yesterdayEarnings: 0,
    holdings: [],
    txns: [],
    saveTimestamps,
    activeDraw: null,
    referralCode: 'T51',
  };
}

describe('computeMilestones', () => {
  it('marks achieved thresholds and clamps progress', () => {
    const ms = computeMilestones(makeUser(12_000, 10), NOW);
    const p1k = ms.find((m) => m.id === 'p-1000')!;
    const p10k = ms.find((m) => m.id === 'p-10000')!;
    const p25k = ms.find((m) => m.id === 'p-25000')!;
    expect(p1k.achieved).toBe(true);
    expect(p1k.progress).toBe(1);
    expect(p10k.achieved).toBe(true);
    expect(p25k.achieved).toBe(false);
    expect(p25k.progress).toBeCloseTo(12000 / 25000);
  });

  it('streak milestones use the BEST streak — achievements never un-achieve', () => {
    // 40-day historical run, currently broken (0 current streak).
    const user = makeUser(5_000, 0);
    user.saveTimestamps = Array.from({ length: 40 }, (_, i) => NOW - (i + 10) * DAY);
    const ms = computeMilestones(user, NOW);
    expect(ms.find((m) => m.id === 's-30')!.achieved).toBe(true);
    expect(ms.find((m) => m.id === 's-7')!.achieved).toBe(true);
  });

  it('a zero user has nothing achieved and sane progress', () => {
    const ms = computeMilestones(makeUser(0, 0), NOW);
    expect(ms.every((m) => !m.achieved)).toBe(true);
    expect(ms.every((m) => m.progress === 0)).toBe(true);
  });
});

describe('nextMilestone', () => {
  it('picks the closest unachieved milestone', () => {
    const ms = computeMilestones(makeUser(48_000, 3), NOW);
    // 48K/50K = 96% toward unlock — closer than any other pending milestone.
    expect(nextMilestone(ms)!.id).toBe('p-50000');
  });

  it('returns null when everything is achieved', () => {
    const ms = computeMilestones(makeUser(2_00_00_000, 400), NOW);
    expect(nextMilestone(ms)).toBeNull();
  });
});

describe('uncelebrated', () => {
  it('only surfaces achieved milestones not yet seen', () => {
    const ms = computeMilestones(makeUser(12_000, 10), NOW);
    const fresh = uncelebrated(ms, ['p-1000', 's-7']);
    expect(fresh.map((m) => m.id)).toEqual(['p-10000']);
  });

  it('returns empty when everything achieved is seen', () => {
    const ms = computeMilestones(makeUser(1_500, 0), NOW);
    expect(uncelebrated(ms, ['p-1000'])).toEqual([]);
  });
});
