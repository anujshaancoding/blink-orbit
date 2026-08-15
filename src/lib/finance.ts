/**
 * Financial math for the Orbit experience.
 * All functions are pure so they can be unit-tested and reused in worklets.
 */

export interface CashFlow {
  /** epoch ms */
  date: number;
  /** negative = money in (investment), positive = money out (withdrawal/current value) */
  amount: number;
}

/**
 * XIRR via bisection on the NPV function. Bisection over Newton because it
 * cannot diverge on the short, irregular flow histories personas produce.
 * Returns annualised rate as a fraction (0.142 = 14.2%), or null when no
 * sign change exists (e.g. brand-new user with no value yet).
 */
export function xirr(flows: CashFlow[], guessLow = -0.95, guessHigh = 10): number | null {
  if (flows.length < 2) return null;
  const t0 = flows[0].date;
  const years = (ms: number) => (ms - t0) / (365.25 * 24 * 3600 * 1000);

  const npv = (rate: number) =>
    flows.reduce((acc, f) => acc + f.amount / Math.pow(1 + rate, years(f.date)), 0);

  let lo = guessLow;
  let hi = guessHigh;
  let nLo = npv(lo);
  const nHi = npv(hi);
  if (nLo * nHi > 0) return null;

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const nMid = npv(mid);
    if (Math.abs(nMid) < 1e-7) return mid;
    if (nLo * nMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      nLo = nMid;
    }
  }
  return (lo + hi) / 2;
}

/** Simple interest accrued on a drawn amount, day-count ACT/365. */
export function interestAccrued(principal: number, annualRatePct: number, sinceMs: number, nowMs: number): number {
  const days = Math.max(0, (nowMs - sinceMs) / (24 * 3600 * 1000));
  return principal * (annualRatePct / 100) * (days / 365);
}

export const LAMF = {
  /** Minimum pledgeable portfolio before a credit line can open (category floor). */
  unlockFloor: 50_000,
  /** Max draw as a fraction of pledged portfolio value. */
  ltv: 0.8,
  /** Annual interest on drawn amount. */
  ratePct: 9.99,
  /** Collateral-fall thresholds (fractions) at which lenders act. */
  marginCallAt: 0.15,
  forcedSellAt: 0.2,
} as const;

export interface CrashOutcome {
  portfolioAfter: number;
  borrowPowerAfter: number;
  status: 'safe' | 'margin_call' | 'forced_sell';
  /** How much the user would need to top up (or repay) to get back to safe. */
  topUpNeeded: number;
}

/**
 * What actually happens to a pledge when the market falls `dropPct` percent.
 * `drawn` is the amount currently borrowed against the pledge.
 */
export function simulateCrash(portfolio: number, drawn: number, dropPct: number): CrashOutcome {
  const after = portfolio * (1 - dropPct / 100);
  const borrowPowerAfter = Math.max(0, after * LAMF.ltv - drawn);

  let status: CrashOutcome['status'] = 'safe';
  const fall = dropPct / 100;
  if (drawn > 0 && fall >= LAMF.forcedSellAt) status = 'forced_sell';
  else if (drawn > 0 && fall >= LAMF.marginCallAt) status = 'margin_call';

  // Top-up that restores drawn <= ltv * (after + topUp)
  const topUpNeeded =
    status === 'safe' ? 0 : Math.max(0, drawn / LAMF.ltv - after);

  return { portfolioAfter: after, borrowPowerAfter, status, topUpNeeded };
}

/** Current unlocked borrow power for a portfolio (0 until the floor is crossed). */
export function borrowPower(portfolio: number): number {
  if (portfolio < LAMF.unlockFloor) return 0;
  return portfolio * LAMF.ltv;
}

/** Progress (0–1) toward unlocking the credit line. Clamped. */
export function unlockProgress(portfolio: number): number {
  return Math.min(1, Math.max(0, portfolio / LAMF.unlockFloor));
}

/** Benchmark rates used by the Truth panel (annual %, conservative public figures). */
export const BENCHMARKS = {
  fd: 7.1,
  inflation: 5.4,
  savingsAccount: 3.0,
} as const;

/**
 * Future value of a daily SIP at a given annual rate — powers the
 * "where does ₹21/day take me" projection. Monthly compounding approximation.
 */
export function projectDailySip(perDay: number, annualRatePct: number, yearsAhead: number): number {
  const monthly = perDay * 30.4;
  const r = annualRatePct / 100 / 12;
  const n = Math.round(yearsAhead * 12);
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}
