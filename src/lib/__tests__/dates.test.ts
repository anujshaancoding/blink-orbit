import { currentStreak, dayKey, longestStreak, pulseGreeting } from '../dates';

/** Local time constructor to keep tests timezone-independent. */
function at(y: number, m: number, d: number, h = 12): number {
  return new Date(y, m - 1, d, h).getTime();
}

describe('dayKey', () => {
  it('separates days at local midnight, not by 24h windows', () => {
    const lateNight = at(2026, 8, 14, 23);
    const earlyMorning = at(2026, 8, 15, 0) + 60 * 1000; // 12:01 AM
    expect(dayKey(lateNight)).not.toBe(dayKey(earlyMorning));
  });
});

describe('currentStreak', () => {
  const now = at(2026, 8, 15, 9);

  it('is zero with no saves', () => {
    expect(currentStreak([], now)).toEqual({ length: 0, savedToday: false });
  });

  it('counts consecutive days ending today', () => {
    const saves = [at(2026, 8, 13, 7), at(2026, 8, 14, 7), at(2026, 8, 15, 7)];
    expect(currentStreak(saves, now)).toEqual({ length: 3, savedToday: true });
  });

  it('the 11:59 PM save still counts for its calendar day', () => {
    const saves = [at(2026, 8, 14, 23, /* h */), at(2026, 8, 15, 7)];
    expect(currentStreak(saves, now).length).toBe(2);
  });

  it('stays alive if the last save was yesterday (today’s debit pending)', () => {
    const saves = [at(2026, 8, 13, 7), at(2026, 8, 14, 7)];
    expect(currentStreak(saves, now)).toEqual({ length: 2, savedToday: false });
  });

  it('breaks after a full missed day', () => {
    const saves = [at(2026, 8, 12, 7), at(2026, 8, 13, 7)];
    expect(currentStreak(saves, now).length).toBe(0);
  });

  it('ignores duplicate saves on the same day', () => {
    const saves = [at(2026, 8, 15, 7), at(2026, 8, 15, 8), at(2026, 8, 14, 7)];
    expect(currentStreak(saves, now).length).toBe(2);
  });
});

describe('longestStreak', () => {
  it('finds the best run even when the current streak is broken', () => {
    const saves: number[] = [];
    // 5-day run, gap, 3-day run
    for (let d = 0; d < 5; d++) saves.push(at(2026, 7, 1 + d));
    for (let d = 0; d < 3; d++) saves.push(at(2026, 7, 10 + d));
    expect(longestStreak(saves)).toBe(5);
  });

  it('handles month boundaries', () => {
    const saves = [at(2026, 7, 31), at(2026, 8, 1), at(2026, 8, 2)];
    expect(longestStreak(saves)).toBe(3);
  });
});

describe('pulseGreeting', () => {
  it('greets by time of day', () => {
    expect(pulseGreeting(at(2026, 8, 15, 7))).toBe('While you slept');
    expect(pulseGreeting(at(2026, 8, 15, 14))).toBe('Since this morning');
    expect(pulseGreeting(at(2026, 8, 15, 21))).toBe('Today, quietly');
    expect(pulseGreeting(at(2026, 8, 15, 2))).toBe('While you were up late');
  });
});
