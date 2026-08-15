import { LAMF } from '@/lib/finance';
import type { AssetClass, Holding, PersonaId, Txn, UserState } from './types';

/**
 * Deterministic persona generation. A seeded RNG (mulberry32) keeps every
 * persona's history stable across reloads so demos are reproducible, while
 * still looking organic (jittered growth, weekend market pauses).
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 24 * 3600 * 1000;

const ASSET_META: Record<AssetClass, { label: string; weight: number; vol: number }> = {
  stocks: { label: 'Stocks', weight: 0.38, vol: 1.6 },
  fd: { label: 'Fixed Deposit', weight: 0.22, vol: 0.05 },
  gold: { label: 'Gold', weight: 0.2, vol: 0.7 },
  realEstate: { label: 'Real Estate', weight: 0.12, vol: 0.3 },
  fno: { label: 'F&O', weight: 0.08, vol: 2.4 },
};

interface BuildOpts {
  personaId: PersonaId;
  name: string;
  seed: number;
  daysActive: number;
  dailySip: number;
  /** local day-offsets (from today) on which the SIP was skipped */
  skippedDays?: Set<number>;
  /** one-off top-ups: [dayOffset, amount] */
  topUps?: [number, number][];
  /** withdrawals: [dayOffset, amount] */
  withdrawals?: [number, number][];
  /** annualised growth rate applied to the pot, % */
  growthPct: number;
  activeDraw?: { amount: number; daysAgo: number };
  referralCode: string;
}

function build(opts: BuildOpts, now: number): UserState {
  const rand = mulberry32(opts.seed);
  const txns: Txn[] = [];
  const saveTimestamps: number[] = [];
  let invested = 0;
  let value = 0;
  let yesterdayEarnings = 0;

  const dailyGrowth = opts.growthPct / 100 / 365;

  for (let offset = opts.daysActive; offset >= 0; offset--) {
    const dayStart = startOfDay(now - offset * DAY);
    // Market movement on the existing pot (jittered around the mean rate).
    const jitter = (rand() - 0.46) * 4; // slight positive skew
    const dayReturn = value * dailyGrowth * (1 + jitter);
    value += dayReturn;
    if (offset === 1) yesterdayEarnings = dayReturn;

    if (!opts.skippedDays?.has(offset)) {
      const at = dayStart + 7 * 3600 * 1000; // 7 AM auto-debit
      txns.push({ id: `sip-${offset}`, type: 'sip', amount: opts.dailySip, date: at });
      saveTimestamps.push(at);
      invested += opts.dailySip;
      value += opts.dailySip;
    }

    for (const [tOffset, amount] of opts.topUps ?? []) {
      if (tOffset === offset) {
        const at = dayStart + 11 * 3600 * 1000;
        txns.push({ id: `topup-${offset}`, type: 'topup', amount, date: at });
        invested += amount;
        value += amount;
      }
    }
    for (const [wOffset, amount] of opts.withdrawals ?? []) {
      if (wOffset === offset) {
        const at = dayStart + 19 * 3600 * 1000;
        txns.push({ id: `wd-${offset}`, type: 'withdrawal', amount: -amount, date: at });
        value -= amount;
      }
    }
  }

  const holdings: Holding[] = (Object.keys(ASSET_META) as AssetClass[]).map((asset) => {
    const meta = ASSET_META[asset];
    const drift = (rand() - 0.5) * 0.04;
    const allocation = meta.weight + drift;
    return {
      asset,
      label: meta.label,
      value: value * allocation,
      allocation,
      dayChange: yesterdayEarnings * allocation * (1 + (rand() - 0.5) * meta.vol),
    };
  });
  // Normalise allocations so they sum to exactly 1.
  const totalAlloc = holdings.reduce((s, h) => s + h.allocation, 0);
  holdings.forEach((h) => {
    h.allocation /= totalAlloc;
    h.value = value * h.allocation;
  });

  return {
    personaId: opts.personaId,
    name: opts.name,
    joinedAt: startOfDay(now - opts.daysActive * DAY),
    dailySip: opts.dailySip,
    portfolioValue: Math.max(0, value),
    investedTotal: invested,
    yesterdayEarnings,
    holdings,
    txns: txns.reverse(),
    saveTimestamps,
    activeDraw: opts.activeDraw
      ? {
          amount: opts.activeDraw.amount,
          since: now - opts.activeDraw.daysAgo * DAY,
          ratePct: LAMF.ratePct,
        }
      : null,
    referralCode: opts.referralCode,
  };
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function buildPersona(id: PersonaId, now: number): UserState {
  switch (id) {
    case 'new':
      return {
        personaId: 'new',
        name: 'Aarav',
        joinedAt: now,
        dailySip: 21,
        portfolioValue: 0,
        investedTotal: 0,
        yesterdayEarnings: 0,
        holdings: [],
        txns: [],
        saveTimestamps: [],
        activeDraw: null,
        referralCode: 'AARAV21',
      };

    case 'steady':
      return build(
        {
          personaId: 'steady',
          name: 'Priya',
          seed: 214,
          daysActive: 214,
          dailySip: 51,
          topUps: [[100, 6000]],
          growthPct: 14.2,
          referralCode: 'PRIYA51',
        },
        now,
      );

    case 'lapsed': {
      // Saved for 90 days, but missed days 3, 4 and 71 (best run = 62 in the middle).
      const skipped = new Set([3, 4, 71]);
      return build(
        {
          personaId: 'lapsed',
          name: 'Kabir',
          seed: 90,
          daysActive: 90,
          dailySip: 34,
          skippedDays: skipped,
          growthPct: 12.1,
          referralCode: 'KABIR34',
        },
        now,
      );
    }

    case 'withdrawal':
      return build(
        {
          personaId: 'withdrawal',
          name: 'Meera',
          seed: 300,
          daysActive: 300,
          dailySip: 101,
          topUps: [[210, 15000]],
          withdrawals: [[26, 18000]],
          growthPct: 11.4,
          referralCode: 'MEERA101',
        },
        now,
      );

    case 'whale':
      return build(
        {
          personaId: 'whale',
          name: 'Zoya',
          seed: 777,
          daysActive: 420,
          dailySip: 2001,
          topUps: [
            [400, 40_00_000],
            [260, 30_00_000],
            [120, 22_00_000],
          ],
          growthPct: 15.6,
          activeDraw: { amount: 3_20_000, daysAgo: 37 },
          referralCode: 'ZOYA2001',
        },
        now,
      );
  }
}
